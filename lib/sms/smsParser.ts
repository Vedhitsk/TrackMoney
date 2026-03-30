import { db } from "@/db/client";
import { sqlite } from "@/db/client";
import type { TransactionDraft } from "@/types";
import { logAppEvent } from "@/lib/logger";

// ─── Pure offline regex parser — zero network calls, works in background ────

function normalizeText(t: string) {
  return t.trim().replace(/\s+/g, " ");
}

// ─── 1. Transaction Detection ────────────────────────────────────────────────

const TRANSACTION_MARKERS = [
  "debited", "credited", "debit", "credit",
  "transferred", "paid", "received", "withdrawn",
  "upi", "neft", "imps", "rtgs",
  "a/c", "a/c no", "rs.", "rs ", "inr", "₹",
  "balance",
];

export function looksLikeTransactionMessage(body: string): boolean {
  const lower = body.toLowerCase();
  return TRANSACTION_MARKERS.some((m) => lower.includes(m));
}

// ─── 2. Amount Extraction ────────────────────────────────────────────────────

function extractAmount(body: string): number | null {
  const patterns = [
    // ₹500, ₹ 500.00
    /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/,
    // Rs.500, Rs 500, RS.500
    /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // INR 500
    /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "debited by 150.00" / "credited by Rs.1"
    /(?:debited|credited|paid|received|spent)\s+(?:by|of)?\s*Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "debited by 150.00" (no currency prefix)
    /(?:debited|credited|paid|received|spent)\s+(?:by|of)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    // "for 150.00"
    /for\s+([0-9,]+\.[0-9]{1,2})/i,
  ];

  for (const re of patterns) {
    const m = body.match(re);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > 0) return val;
    }
  }
  return null;
}

// ─── 3. Transaction Type ─────────────────────────────────────────────────────

function detectType(body: string): "expense" | "income" | null {
  const lower = body.toLowerCase();

  const incomeWords = ["credited", "received", "refund", "reverted", "cashback", "reversed"];
  const expenseWords = ["debited", "spent", "paid", "withdrawn", "deducted", "charged"];

  let incScore = 0;
  let expScore = 0;

  for (const w of incomeWords) if (lower.includes(w)) incScore++;
  for (const w of expenseWords) if (lower.includes(w)) expScore++;

  if (incScore === 0 && expScore === 0) return null;
  return incScore >= expScore ? "income" : "expense";
}

// ─── 4. Merchant Extraction ──────────────────────────────────────────────────

function extractMerchant(body: string, senderAddress: string): string {
  // Patterns ordered by specificity (most specific first)
  const patterns = [
    // "trf to VARAKS ENJOY BRI Refno" / "transfer to X Ref"
    /trf\s+to\s+([A-Z0-9 &'./-]+?)(?:\s+(?:Refno|Ref No|Ref|UPI|IMPS|at|on|\d{6,}))/i,
    // "transfer from VEDANT SURESH Ref"
    /transfer\s+from\s+([A-Z][A-Z0-9 .'-]+?)(?:\s+(?:Ref|Utr|on|\d{6,}|-))/i,
    // "sent to MERCHANT"
    /sent\s+to\s+([A-Z][A-Z0-9 .'-]+?)(?:\s+(?:on|via|Ref|UPI|from))/i,
    // "at MERCHANT" (POS transactions)
    /at\s+([A-Z][A-Z0-9 &'./-]{3,30}?)(?:\s+(?:on|for|Ref|with|\d))/i,
    // "Info: SWIGGY" / "Desc: SWIGGY"
    /(?:Info|Desc|Description|Narr):\s*([A-Z0-9 &'./-]+?)(?:\s*[.;,]|$)/i,
    // "to MERCHANT via UPI"
    /\bto\s+([A-Z][A-Z0-9 .'-]{3,30}?)\s+(?:via|using|through)/i,
    // "to MERCHANT" at end or before Ref/on
    /\bto\s+([A-Z][A-Z0-9 .'-]{3,25}?)(?:\s+(?:Ref|Refno|on|at|\d{4,}))/i,
  ];

  for (const re of patterns) {
    const m = body.match(re);
    if (m && m[1]) {
      const cleaned = m[1].trim().replace(/\s+/g, " ");
      if (cleaned.length >= 2) return cleaned;
    }
  }

  // Fallback: if sender is not a number/short code, use it
  const trimmedSender = senderAddress.trim();
  if (trimmedSender && !/^\d+$/.test(trimmedSender) && trimmedSender.length > 2) {
    return trimmedSender;
  }

  return "Unknown";
}

// ─── 5. Category Matching (DB keyword lookup) ────────────────────────────────

function findCategoryId(body: string, merchant: string): number | null {
  try {
    type Row = { id: number; keywords: string };
    const rows = sqlite.getAllSync<Row>(
      "SELECT id, keywords FROM categories ORDER BY name"
    );

    // Only match the merchant name — not the full SMS body.
    // Matching the full body causes words like 'ref', 'sbi', 'transfer' to incorrectly hit categories.
    const merchantLower = merchant.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const merchantTokens = new Set(merchantLower.split(/\s+/).filter((t) => t.length > 2));

    // Common banking words that should never trigger a category match even if they appear as keywords
    const STOP_WORDS = new Set([
      "sbi", "hdfc", "icici", "axis", "kotak", "upi", "neft", "imps",
      "ref", "dear", "user", "bank", "your", "act", "aval", "bal",
      "from", "transfer", "debit", "credit",
    ]);

    let bestId: number | null = null;
    let bestScore = 0;

    for (const row of rows) {
      let keywords: string[] = [];
      try {
        keywords = JSON.parse(row.keywords);
      } catch {
        continue;
      }

      let score = 0;
      for (const kw of keywords) {
        const norm = kw.trim().toLowerCase();
        // Skip very short or stop-word keywords from matching
        if (norm.length < 3) continue;
        if (STOP_WORDS.has(norm)) continue;
        if (merchantTokens.has(norm)) score += 2; // exact token match is worth more
        else if (norm.length >= 4 && merchantLower.includes(norm)) score += 1; // substring match
      }

      if (score > bestScore) {
        bestScore = score;
        bestId = row.id;
      }
    }

    // Require at least 2 points to avoid weak matches
    return bestScore >= 2 ? bestId : null;
  } catch {
    return null;
  }
}

// ─── 6. Account Matching (DB name lookup) ───────────────────────────────────

function findAccountId(body: string): number | null {
  try {
    type Row = { id: number; name: string };
    const rows = sqlite.getAllSync<Row>("SELECT id, name FROM accounts ORDER BY name");
    const lower = body.toLowerCase();

    // Look for account name as substring of SMS (e.g. "SBI", "HDFC", "Card")
    for (const row of rows) {
      const name = row.name.trim().toLowerCase();
      if (name.length >= 2 && lower.includes(name)) {
        return row.id;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function parseSmsOffline(params: {
  senderAddress: string;
  body: string;
  source: "sms";
}): Omit<TransactionDraft, "id"> | null {
  const body = normalizeText(params.body);

  if (!looksLikeTransactionMessage(body)) return null;

  const amount = extractAmount(body);
  const type = detectType(body);

  if (!amount || !type) return null;

  const merchant = extractMerchant(body, params.senderAddress);
  const categoryId = findCategoryId(body, merchant);
  const accountId = findAccountId(body);

  return {
    rawAmount: amount,
    actualAmount: amount,
    isShared: false,
    type,
    categoryId,
    accountId,
    toAccountId: null,
    merchant,
    notes: body.slice(0, 300),
    date: new Date(),
    source: params.source,
    isExcluded: false,
  };
}

// Keep a thin async wrapper for places that still call the old signature
export async function parseSmsToTransactionDraft(params: {
  rawSms: string;
  senderAddress: string;
  body: string;
  source: "sms";
}): Promise<Omit<TransactionDraft, "id"> | null> {
  try {
    const result = parseSmsOffline(params);
    if (result) {
      await logAppEvent("info", "Parser: Extracted transaction", {
        amount: result.actualAmount,
        type: result.type,
        merchant: result.merchant,
        categoryId: result.categoryId,
        accountId: result.accountId,
      });
    } else {
      await logAppEvent("info", "Parser: Not a transaction SMS, ignored.");
    }
    return result;
  } catch (err) {
    await logAppEvent("error", "Parser: Crashed", err instanceof Error ? err.message : String(err));
    return null;
  }
}
