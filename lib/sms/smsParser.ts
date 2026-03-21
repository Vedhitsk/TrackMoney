import type { TransactionDraft } from "@/types";

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function extractFirstAmount(text: string): number | null {
  const normalized = text.replace(/,/g, ",");

  const patterns: RegExp[] = [
    /₹\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /Rs\.?\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /INR\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const re of patterns) {
    const m = normalized.match(re);
    if (!m) continue;
    const amount = Number(m[1]);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return null;
}

function detectExpenseOrIncome(body: string): "expense" | "income" | null {
  const t = body.toLowerCase();

  const incomeHints = ["credited", "received", "refund", "reverted", "returned", "credited to"];
  const expenseHints = ["debited", "spent", "paid", "payment", "withdrawn", "purchase", "charge"];

  const incomeScore = incomeHints.reduce((acc, h) => (t.includes(h) ? acc + 1 : acc), 0);
  const expenseScore = expenseHints.reduce((acc, h) => (t.includes(h) ? acc + 1 : acc), 0);

  if (incomeScore === 0 && expenseScore === 0) return null;
  if (incomeScore >= expenseScore) return "income";
  return "expense";
}

function guessMerchant(address: string, body: string) {
  const addr = address.trim();
  if (addr.length > 0 && /[a-zA-Z]/.test(addr)) return addr;

  const m = body.match(/(?:to|merchant)\s*:?[ ]*([A-Za-z0-9&.\- ]{2,})/i);
  if (m?.[1]) return normalizeText(m[1]).slice(0, 40);

  return "Unknown";
}

function guessNotes(body: string) {
  return body.slice(0, 200);
}

export function parseSmsToTransactionDraft(params: {
  rawSms: string;
  senderAddress: string;
  body: string;
  source: "sms";
}): Omit<TransactionDraft, "id"> | null {
  const body = normalizeText(params.body);
  if (!body) return null;

  const amount = extractFirstAmount(body);
  if (!amount) return null;

  const direction = detectExpenseOrIncome(body);
  if (!direction) return null;

  return {
    rawAmount: amount,
    actualAmount: amount,
    isShared: false,
    type: direction,
    categoryId: null,
    accountId: null,
    toAccountId: null,
    merchant: guessMerchant(params.senderAddress, body),
    notes: guessNotes(body),
    date: new Date(),
    source: params.source,
    isExcluded: direction !== "expense",
  };
}
