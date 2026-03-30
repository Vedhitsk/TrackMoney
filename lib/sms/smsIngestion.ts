import { and, eq, gte } from "drizzle-orm";

import { NativeModules, Platform } from "react-native";

import { db } from "@/db/client";
import { smsLog } from "@/db/schema";
import { insertTransaction } from "@/db/queries/transactions";
import { parseSmsOffline, looksLikeTransactionMessage } from "@/lib/sms/smsParser";
import { logAppEvent } from "@/lib/logger";
import { ensureTablesExist } from "@/db/init";


// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasSmsNativeModule(): boolean {
  return !!(NativeModules as any).RNExpoReadSms;
}

// The native SMS library wraps data as "[sender, body]"
function parseSmsPayload(sms: unknown): { senderAddress: string; body: string } | null {
  const raw = typeof sms === "string" ? sms : JSON.stringify(sms);
  const m = raw.match(/^\[(.*?),\s*([\s\S]*)\]$/);
  if (m) {
    return { senderAddress: (m[1] ?? "").trim(), body: (m[2] ?? "").trim() };
  }
  return { senderAddress: "", body: raw.trim() };
}

// ─── Core processor (shared by foreground and background) ────────────────────

async function processSms(senderAddress: string, body: string): Promise<void> {
  if (!looksLikeTransactionMessage(body)) {
    await logAppEvent("info", "SMS Processor: Ignored non-transaction SMS.");
    return;
  }

  const amount = parseSmsOffline({ senderAddress, body, source: "sms" })?.actualAmount ?? 0;
  const rawSms = `[${senderAddress}, ${body}, ${amount}]`;

  // Deduplicate: Check if a similar SMS arrived in the last 60 seconds
  const oneMinuteAgo = new Date(Date.now() - 60000);
  const existing = await db.select().from(smsLog).where(
    and(
      eq(smsLog.rawSms, rawSms),
      gte(smsLog.smsDate, oneMinuteAgo)
    )
  );

  if (existing.length > 0) {
    await logAppEvent("info", "SMS Processor: Duplicate SMS in 60s window, skipping.");
    return;
  }


  // Log receipt
  await logAppEvent("info", "SMS Processor: New transaction SMS received", {
    sender: senderAddress,
    preview: body.slice(0, 60) + "...",
  });

  // Parse offline — no network, instant, safe in background
  const draft = parseSmsOffline({ senderAddress, body, source: "sms" });

  if (!draft) {
    await logAppEvent("info", "SMS Processor: Could not extract transaction details.");
    // Still log the SMS so the user can see it was received
    await db.insert(smsLog).values({
      rawSms,
      parsed: false,
      isProcessed: true, // mark processed (it was just non-parseable, not an error)
      smsDate: new Date(),
    });
    return;
  }

  await logAppEvent("info", "SMS Processor: Extracted transaction", {
    amount: draft.actualAmount,
    type: draft.type,
    merchant: draft.merchant,
    categoryId: draft.categoryId,
    accountId: draft.accountId,
  });

  // Save transaction to pending dashboard
  await insertTransaction(draft);

  // Log the raw SMS
  await db.insert(smsLog).values({
    rawSms,
    parsed: true,
    isProcessed: true,
    smsDate: new Date(),
  });

  await logAppEvent("info", "SMS Processor: Transaction saved successfully.");
}

// ─── Foreground Listener (app open) ──────────────────────────────────────────

export async function startSmsAutoIngestion(): Promise<void> {
  if (Platform.OS !== "android" || !hasSmsNativeModule()) return;

  try {
    const {
      checkIfHasSMSPermission,
      requestReadSMSPermission,
      startReadSMS,
      // @ts-ignore
    } = await import("@maniac-tech/react-native-expo-read-sms");

    const perm = await checkIfHasSMSPermission();
    if (!perm.hasReadSmsPermission || !perm.hasReceiveSmsPermission) {
      const granted = await requestReadSMSPermission();
      if (!granted) return;
    }

    const handler = async (status: string, sms: unknown, _error: unknown) => {
      if (status !== "success" || !sms) {
        if (status === "error") {
          await logAppEvent("error", "Foreground SMS listener error", String(_error));
        }
        return;
      }

      const parsed = parseSmsPayload(sms);
      if (!parsed) return;

      try {
        await processSms(parsed.senderAddress, parsed.body);
      } catch (err) {
        await logAppEvent("error", "Foreground: processSms failed", String(err));
      }
    };

    startReadSMS(handler as any);
    await logAppEvent("info", "SMS Auto-Ingestion: Listener started.");
  } catch (err) {
    await logAppEvent("error", "SMS Auto-Ingestion: Failed to start listener", String(err));
  }
}

export function stopSmsAutoIngestion() {
  try {
    const maybe = (NativeModules as any).RNExpoReadSms;
    if (maybe?.stopReadSMS) maybe.stopReadSMS();
  } catch {
    // ignore
  }
}

// ─── Background Headless JS Task (app killed) ─────────────────────────────────
// This now parses AND saves inline — safe because parseSmsOffline() is
// 100% synchronous and makes zero network calls. Android can't kill it.

export const processSmsBackground = async (taskData: any) => {
  try {
    // Ensure tables exist in background process (it might start before the UI)
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
