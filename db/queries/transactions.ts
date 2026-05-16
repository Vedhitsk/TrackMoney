import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { transactions } from "@/db/schema";

import type { Transaction, TransactionDraft, TransactionSource, TransactionType, ParsedBy, ParseStatus } from "@/types";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(Number(value));
  return new Date();
}

function mapTransactionRow(r: any): Transaction {
  return {
    id: Number(r.id),
    rawAmount: Number(r.rawAmount),
    actualAmount: Number(r.actualAmount),
    isShared: r.isShared === true || r.isShared === 1,
    type: r.type as TransactionType,
    categoryId: r.categoryId == null ? null : Number(r.categoryId),
    accountId: r.accountId == null ? null : Number(r.accountId),
    toAccountId: r.toAccountId == null ? null : Number(r.toAccountId),
    merchant: r.merchant ?? "Unknown",
    notes: r.notes ?? "",
    date: toDate(r.date),
    source: r.source as TransactionSource,
    parsedBy: (r.parsedBy as ParsedBy) ?? null,
    parseStatus: (r.parseStatus as ParseStatus) ?? "complete",
    isExcluded: r.isExcluded === true || r.isExcluded === 1,
    createdAt: toDate(r.createdAt),
  };
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  const rows = await db.select().from(transactions).where(eq(transactions.id, id));
  const r = rows[0];
  if (!r) return null;
  return mapTransactionRow(r);
}

export async function listPendingTransactions(): Promise<Transaction[]> {
  const rows = await db.select().from(transactions);
  const filtered = rows.filter((r: any) => r.source !== "manual");
  return filtered.map(mapTransactionRow).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function insertTransaction(draft: Omit<TransactionDraft, "id">): Promise<Transaction> {
  const inserted = await db
    .insert(transactions)
    .values({
      rawAmount: draft.rawAmount,
      actualAmount: draft.actualAmount,
      isShared: draft.isShared,
      type: draft.type,
      categoryId: draft.categoryId,
      accountId: draft.accountId,
      toAccountId: draft.toAccountId,
      merchant: draft.merchant,
      notes: draft.notes,
      date: draft.date,
      source: draft.source,
      parsedBy: draft.parsedBy,
      parseStatus: draft.parseStatus,
      isExcluded: draft.isExcluded,
    })
    .returning();

  return mapTransactionRow(inserted[0]);
}

export async function updateTransaction(
  id: number,
  patch: Partial<Omit<TransactionDraft, "id" | "date">> & { date?: Date },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (patch.rawAmount !== undefined) set.rawAmount = patch.rawAmount;
  if (patch.actualAmount !== undefined) set.actualAmount = patch.actualAmount;
  if (patch.isShared !== undefined) set.isShared = patch.isShared;
  if (patch.type !== undefined) set.type = patch.type;
  if (patch.categoryId !== undefined) set.categoryId = patch.categoryId;
  if (patch.accountId !== undefined) set.accountId = patch.accountId;
  if (patch.toAccountId !== undefined) set.toAccountId = patch.toAccountId;
  if (patch.merchant !== undefined) set.merchant = patch.merchant;
  if (patch.notes !== undefined) set.notes = patch.notes;
  if (patch.source !== undefined) set.source = patch.source;
  if (patch.parsedBy !== undefined) set.parsedBy = patch.parsedBy;
  if (patch.parseStatus !== undefined) set.parseStatus = patch.parseStatus;
  if (patch.isExcluded !== undefined) set.isExcluded = patch.isExcluded;
  if (patch.date !== undefined) set.date = patch.date;

  await db.update(transactions).set(set as any).where(eq(transactions.id, id));
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const rows = await db.select().from(transactions);
  // Only show accepted (manual) transactions in the main Records tab.
  // SMS-sourced transactions stay in Pending until user taps Accept.
  const accepted = rows.filter((r: any) => r.source === "manual");
  return accepted.map(mapTransactionRow).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function listExpensesForMonth(year: number, month: number): Promise<Transaction[]> {
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();

  const rows = await db.select().from(transactions).where(
    and(eq(transactions.type, "expense"), eq(transactions.isExcluded, false))
  );

  const filtered = rows.filter((r: any) => {
    if (r.categoryId == null) return false;
    const dateMs = r.date instanceof Date ? r.date.getTime() : typeof r.date === "number" ? r.date : new Date(r.date).getTime();
    return dateMs >= start && dateMs < end;
  });

  return filtered.map(mapTransactionRow).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function sumSpendTotalsForMonth(year: number, month: number): Promise<{
  total: number;
  byCategoryId: Array<{ categoryId: number; amount: number }>;
}> {
  const expenses = await listExpensesForMonth(year, month);
  const sums = new Map<number, number>();
  let total = 0;

  for (const tx of expenses) {
    if (!tx.categoryId) continue;
    total += tx.actualAmount;
    sums.set(tx.categoryId, (sums.get(tx.categoryId) ?? 0) + tx.actualAmount);
  }

  const byCategoryId = Array.from(sums.entries())
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { total, byCategoryId };
}
