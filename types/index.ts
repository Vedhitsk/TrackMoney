export type TransactionType = "expense" | "income" | "transfer" | "ignored" | "settlement";
export type TransactionSource = "sms" | "pdf" | "manual";
export type ParsedBy = "regex" | "groq" | "gemini" | "manual";
export type ParseStatus = "complete" | "partial" | "needs_review";

export type Account = {
  id: number;
  name: string;
  icon: string;
  initialBalance: number;
  createdAt: Date;
};

export type Category = {
  id: number;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
  createdAt: Date;
};

export type Budget = {
  id: number;
  categoryId: number;
  monthlyLimit: number;
  month: number;
  year: number;
  isTemplate: boolean;
  createdAt: Date;
};

export type Transaction = {
  id: number;
  rawAmount: number;
  actualAmount: number;
  isShared: boolean;
  type: TransactionType;
  categoryId: number | null;
  accountId: number | null;
  toAccountId: number | null;
  merchant: string;
  notes: string;
  date: Date;
  source: TransactionSource;
  parsedBy: ParsedBy | null;
  parseStatus: ParseStatus;
  isExcluded: boolean;
  createdAt: Date;
};

export type TransactionDraft = {
  id?: number;
  rawAmount: number;
  actualAmount: number;
  isShared: boolean;
  type: TransactionType;
  categoryId: number | null;
  accountId: number | null;
  toAccountId: number | null;
  merchant: string;
  notes: string;
  date: Date;
  source: TransactionSource;
  parsedBy: ParsedBy | null;
  parseStatus: ParseStatus;
  isExcluded: boolean;
};

export type SmsParseResult = {
  rawSms: string;
  parsedDebitCredit: "expense" | "income";
  amount: number;
  merchant: string;
  notes?: string;
  date: Date;
};

export function formatMoneyINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}
