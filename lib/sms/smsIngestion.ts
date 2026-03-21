import { eq } from "drizzle-orm";
import { NativeModules, Platform } from "react-native";

import { db } from "@/db/client";
import { smsLog } from "@/db/schema";
import { listCategories } from "@/db/queries/categories";
import { insertTransaction } from "@/db/queries/transactions";
import type { Category, TransactionDraft } from "@/types";

import { parseSmsToTransactionDraft } from "@/lib/sms/smsParser";

function hasSmsNativeModule(): boolean {
  return !!(NativeModules as any).RNExpoReadSms;
}

function parseSmsCallbackString(sms: unknown): { senderAddress: string; body: string; rawSms: string } | null {
  const rawSms = typeof sms === "string" ? sms : JSON.stringify(sms);
  const m = rawSms.match(/^\[(.*?),\s*([\s\S]*)\]$/);
  if (!m) {
    return { senderAddress: "", body: rawSms, rawSms };
  }
  const senderAddress = (m[1] ?? "").trim();
  const body = (m[2] ?? "").trim();
  return { senderAddress, body, rawSms };
}

function normalizeToken(token: string) {
  return token.trim().toLowerCase();
}

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

function suggestCategoryId(params: {
  merchant: string;
  notes: string;
  categories: Category[];
}): number | null {
  const tokens = new Set([...extractTokens(params.merchant), ...extractTokens(params.notes)]);
  if (tokens.size === 0) return null;

  let bestCategoryId: number | null = null;
  let bestScore = 0;

  for (const c of params.categories) {
    const keywords = c.keywords ?? [];
    let score = 0;
    for (const kw of keywords) {
      const norm = normalizeToken(kw);
      if (norm.length < 3) continue;
      if (tokens.has(norm)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategoryId = c.id;
    }
  }

  return bestScore >= 1 ? bestCategoryId : null;
}

export async function startSmsAutoIngestion(): Promise<void> {
  if (Platform.OS !== "android" || !hasSmsNativeModule()) {
    return;
  }

  try {
    const {
      checkIfHasSMSPermission,
      requestReadSMSPermission,
      startReadSMS,
    } = await import("@maniac-tech/react-native-expo-read-sms");

    const perm = await checkIfHasSMSPermission();
    if (!perm.hasReadSmsPermission || !perm.hasReceiveSmsPermission) {
      const granted = await requestReadSMSPermission();
      if (!granted) return;
    }

    let categoriesCache: Category[] = [];

    const handler = async (status: string, sms: unknown, _error: unknown) => {
      if (status !== "success" || !sms) return;

      const parsed = parseSmsCallbackString(sms);
      if (!parsed) return;

      const rawSms = parsed.rawSms;

      const existing = await db.select().from(smsLog).where(eq(smsLog.rawSms, rawSms));
      if (existing.length > 0) return;

      await db.insert(smsLog).values({
        rawSms,
        parsed: 0,
        isProcessed: 0,
        smsDate: Date.now(),
      });

      try {
        const draft = parseSmsToTransactionDraft({
          rawSms,
          senderAddress: parsed.senderAddress,
          body: parsed.body,
          source: "sms",
        });

        if (!draft) {
          await db.update(smsLog).set({ parsed: 1, isProcessed: 1 }).where(eq(smsLog.rawSms, rawSms));
          return;
        }

        if (categoriesCache.length === 0) {
          categoriesCache = await listCategories();
        }

        const suggestedCategoryId = suggestCategoryId({
          merchant: draft.merchant,
          notes: draft.notes,
          categories: categoriesCache,
        });

        const enrichedDraft: Omit<TransactionDraft, "id"> = {
          ...draft,
          categoryId: suggestedCategoryId,
        };

        await insertTransaction(enrichedDraft);

        await db
          .update(smsLog)
          .set({ parsed: 1, isProcessed: 1 })
          .where(eq(smsLog.rawSms, rawSms));
      } catch {
        await db.update(smsLog).set({ parsed: 1, isProcessed: 1 }).where(eq(smsLog.rawSms, rawSms));
      }
    };

    startReadSMS(handler as any);
  } catch {
    // SMS native module not available (Expo Go) -- silently skip
  }
}

export function stopSmsAutoIngestion() {
  try {
    const maybe = (NativeModules as any).RNExpoReadSms;
    if (maybe?.stopReadSMS) {
      maybe.stopReadSMS();
    }
  } catch {
    // Swallow during dev/unmount
  }
}
