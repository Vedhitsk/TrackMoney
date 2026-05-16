import { and, desc, eq, gte } from "drizzle-orm";
import { DeviceEventEmitter, NativeModules, Platform, PermissionsAndroid } from "react-native";

import { db } from "@/db/client";
import { smsLog, transactions } from "@/db/schema";
import { insertTransaction } from "@/db/queries/transactions";
import { parseSmsOffline, looksLikeTransactionMessage } from "@/lib/sms/smsParser";
import { parseSmsWithAi } from "@/lib/sms/aiParser";
import { logAppEvent } from "@/lib/logger";
import { ensureTablesExist } from "@/db/init";
import { hasAnyAiKey } from "@/lib/config";
import type { TransactionDraft } from "@/types";

// ─── Event emitted to notify UI of new pending transactions ───────────────────
export const SMS_TRANSACTION_EVENT = 'newTransactionSaved';

// ─── Context Memory: look up last known category/account for a merchant ───────
async function lookupMerchantContext(
  merchant: string
): Promise<{ categoryId: number | null; accountId: number | null } | null> {
  if (!merchant || merchant === 'Unknown') return null;
  try {
    const rows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.merchant, merchant), eq(transactions.source, 'manual')))
      .orderBy(desc(transactions.createdAt))
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0];
    const cId = r.categoryId ? Number(r.categoryId) : null;
    const aId = r.accountId ? Number(r.accountId) : null;
    if (!cId && !aId) return null;
    return { categoryId: cId, accountId: aId };
  } catch {
    return null;
  }
}

// ─── 3-Layer Parsing Pipeline ────────────────────────────────────────────────
//
// Layer 1: Regex (fast, offline, handles common formats)
//   → complete: save with parsedBy="regex"
//   → partial/null: go to Layer 2
//
// Layer 2: AI (Groq → Gemini, needs internet)
//   → success: merge with regex data, save with parsedBy="groq"/"gemini"
//   → fail: go to Layer 3
//
// Layer 3: Fallback (save whatever we have as needs_review)

// ─── Processing Lock ─────────────────────────────────────────────────────────

const processingLock = new Set<string>();

async function processSms(senderAddress: string, body: string): Promise<void> {
  const rawSmsKey = `[${senderAddress}, ${body}]`;

  if (processingLock.has(rawSmsKey)) {
    await logAppEvent("info", "SMS Processor: Already processing this SMS, skipping.");
    return;
  }
  processingLock.add(rawSmsKey);

  try {
    // ── Pre-filter: is this even a transaction SMS? ──
    if (!looksLikeTransactionMessage(body)) {
      await logAppEvent("info", "SMS Processor: Ignored non-transaction SMS.");
      return;
    }

    // ── Dedup check (Database level) ──
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const existing = await db.select().from(smsLog).where(
      and(
        eq(smsLog.rawSms, rawSmsKey),
        gte(smsLog.smsDate, oneMinuteAgo)
      )
    );

    if (existing.length > 0) {
      await logAppEvent("info", "SMS Processor: Duplicate SMS in 60s window, skipping.");
      return;
    }

    await logAppEvent("info", "SMS Processor: New transaction SMS received", {
      sender: senderAddress,
      preview: body.slice(0, 60) + "...",
    });

    // ── LAYER 1: Regex Parser ──
    const regexResult = parseSmsOffline({ senderAddress, body, source: "sms" });

    if (regexResult && regexResult.status === "complete") {
      await logAppEvent("info", "SMS Processor: Regex parsed COMPLETELY", {
        amount: regexResult.draft.actualAmount,
        type: regexResult.draft.type,
      });

      // Context memory: inherit category/account from previous manual transaction with same merchant
      const ctx = await lookupMerchantContext(regexResult.draft.merchant);
      const draftWithCtx = ctx
        ? {
            ...regexResult.draft,
            categoryId: regexResult.draft.categoryId ?? ctx.categoryId,
            accountId: regexResult.draft.accountId ?? ctx.accountId,
          }
        : regexResult.draft;
      if (ctx) {
        await logAppEvent("info", "SMS Processor: Context memory applied", { merchant: draftWithCtx.merchant });
      }

      await insertTransaction(draftWithCtx);
      await db.insert(smsLog).values({ rawSms: rawSmsKey, parsed: true, isProcessed: true, smsDate: new Date() });
      await logAppEvent("info", "SMS Processor: Transaction saved (regex complete).");
      DeviceEventEmitter.emit(SMS_TRANSACTION_EVENT);
      return;
    }

    const regexDraft = regexResult?.draft ?? null;
    const missingFields = regexResult?.missingFields ?? ["all"];

    await logAppEvent("info", "SMS Processor: Regex incomplete", {
      status: regexResult?.status ?? "null",
      missing: missingFields.join(", "),
    });

    // ── LAYER 2: AI Parser ──
    let finalDraft: Omit<TransactionDraft, "id"> | null = null;

    if (hasAnyAiKey()) {
      try {
        const aiResult = await parseSmsWithAi(body);

        if (aiResult && aiResult.amount) {
          await logAppEvent("info", `SMS Processor: AI parsed by ${aiResult.parsedBy}`, {
            amount: aiResult.amount,
            type: aiResult.type,
          });

          const amount = regexDraft?.actualAmount ?? aiResult.amount;
          const type = (regexDraft?.type && regexDraft.type !== "expense")
            ? regexDraft.type
            : aiResult.type === "credit" ? "income"
              : aiResult.type === "debit" ? "expense"
                : regexDraft?.type ?? "expense";

          const merchant = (regexDraft?.merchant && regexDraft.merchant !== "Unknown")
            ? regexDraft.merchant
            : aiResult.merchant ?? "Unknown";

          finalDraft = {
            rawAmount: amount,
            actualAmount: amount,
            isShared: false,
            type: type as "expense" | "income",
            categoryId: regexDraft?.categoryId ?? null,
            accountId: regexDraft?.accountId ?? null,
            toAccountId: null,
            merchant,
            notes: body.slice(0, 300),
            date: new Date(),
            source: "sms",
            parsedBy: aiResult.parsedBy,
            parseStatus: (regexDraft?.categoryId && regexDraft?.accountId && merchant !== "Unknown") ? "complete" : "partial",
            isExcluded: false,
          };
        }
      } catch (err) {
        await logAppEvent("error", "SMS Processor: AI parsing failed", String(err));
      }
    }

    // ── LAYER 3: Fallback ──
    if (!finalDraft) {
      if (regexDraft) {
        finalDraft = { ...regexDraft, parseStatus: "needs_review", parsedBy: "regex" };
      } else {
        finalDraft = {
          rawAmount: 0,
          actualAmount: 0,
          isShared: false,
          type: "expense",
          categoryId: null,
          accountId: null,
          toAccountId: null,
          merchant: "Unknown",
          notes: body.slice(0, 300),
          date: new Date(),
          source: "sms",
          parsedBy: null,
          parseStatus: "needs_review",
          isExcluded: false,
        };
      }
    }

    // Context memory: inherit category/account from previous manual transaction with same merchant
    const ctxFallback = await lookupMerchantContext(finalDraft.merchant);
    if (ctxFallback) {
      finalDraft = {
        ...finalDraft,
        categoryId: finalDraft.categoryId ?? ctxFallback.categoryId,
        accountId: finalDraft.accountId ?? ctxFallback.accountId,
      };
      await logAppEvent("info", "SMS Processor: Context memory applied (fallback path)", { merchant: finalDraft.merchant });
    }

    await insertTransaction(finalDraft);
    await db.insert(smsLog).values({
      rawSms: rawSmsKey,
      parsed: finalDraft.parseStatus !== "needs_review",
      isProcessed: true,
      smsDate: new Date(),
    });

    await logAppEvent("info", `SMS Processor: Transaction saved (${finalDraft.parsedBy ?? "unknown"}).`);
    DeviceEventEmitter.emit(SMS_TRANSACTION_EVENT);
  } finally {
    setTimeout(() => processingLock.delete(rawSmsKey), 5000);
  }
}

// ─── Permissions (uses standard PermissionsAndroid — no third-party library) ─

export async function ensureSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  try {
    const result = await PermissionsAndroid.requestMultiple([
      "android.permission.RECEIVE_SMS" as any,
      "android.permission.READ_SMS" as any,
    ]);
    const granted =
      result["android.permission.RECEIVE_SMS"] === "granted" &&
      result["android.permission.READ_SMS"] === "granted";

    if (granted) {
      await logAppEvent("info", "SMS Permissions: Granted.");
    } else {
      await logAppEvent("warn", "SMS Permissions: Not fully granted.", result as any);
    }
    return granted;
  } catch (err) {
    await logAppEvent("error", "SMS Permissions: Failed to request", String(err));
    return false;
  }
}

// ─── Inbox Backfill (runs on every app open) ─────────────────────────────────
//
// Reads the SMS inbox for the last 24 hours and processes any transaction
// messages that are NOT already in our database. This covers:
//   1. Phone reboot gap (BroadcastReceiver not registered until app opens)
//   2. Aggressive battery management killing the receiver
//   3. Any edge case where a real-time broadcast was missed
//
// This is a ONE-TIME read on app open, not continuous scanning.

export async function backfillFromInbox(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    const SmsInboxModule = NativeModules.SmsInboxModule;

    if (!SmsInboxModule) {
      await logAppEvent("warn", "Backfill: SmsInboxModule not available (native module not linked).");
      return;
    }

    await logAppEvent("info", "Backfill: Checking inbox for missed transactions (last 24h)...");

    const recentSms: Array<{ sender: string; body: string; date: number }> =
      await SmsInboxModule.getRecentSms(24);

    if (!recentSms || recentSms.length === 0) {
      await logAppEvent("info", "Backfill: No recent SMS in inbox.");
      return;
    }

    await logAppEvent("info", `Backfill: Found ${recentSms.length} SMS in last 24h. Filtering...`);

    let processed = 0;

    for (const sms of recentSms) {
      const { sender, body } = sms;

      // Skip non-transaction SMS (OTPs, promos, etc.)
      if (!looksLikeTransactionMessage(body)) continue;

      // Check if we already have this SMS in our log (full dedup, not time-windowed)
      const rawSmsKey = `[${sender}, ${body}]`;
      const existing = await db.select().from(smsLog).where(eq(smsLog.rawSms, rawSmsKey));
      if (existing.length > 0) continue;

      // This is a missed transaction SMS — process it through the full pipeline
      await processSms(sender, body);
      processed++;
    }

    if (processed > 0) {
      await logAppEvent("info", `Backfill: Processed ${processed} missed transaction(s).`);
    } else {
      await logAppEvent("info", "Backfill: No missed transactions found. All caught up.");
    }
  } catch (err) {
    await logAppEvent("error", "Backfill: Failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Never crash — backfill is best-effort
  }
}

// ─── Background Headless JS Task (app killed) ─────────────────────────────────

export const processSmsBackground = async (taskData: any) => {
  try {
    ensureTablesExist();

    await logAppEvent("info", "Background Task: Headless JS task started.");

    const body: string = taskData?.sms_body ?? "";
    const senderAddress: string = taskData?.sms_sender ?? "";

    if (!body) {
      await logAppEvent("warn", "Background Task: Received empty SMS body.");
      return;
    }

    await processSms(senderAddress, body);

    await logAppEvent("info", "Background Task: Completed successfully.");
  } catch (err) {
    await logAppEvent("error", "Background Task: CRASHED", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
};
