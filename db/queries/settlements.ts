import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { settlements, transactions } from "@/db/schema";
import type { Transaction } from "@/types";

export type SettlementRow = {
  id: number;
  incomeTxId: number;
  expenseTxId: number;
  amount: number;
  createdAt: Date;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  return new Date();
}

function mapRow(r: any): SettlementRow {
  return {
    id: Number(r.id),
    incomeTxId: Number(r.incomeTxId),
    expenseTxId: Number(r.expenseTxId),
    amount: Number(r.amount),
    createdAt: toDate(r.createdAt),
  };
}

// ─── Pending Recoveries ───────────────────────────────────────────────────────
// Shared expenses where rawAmount > actualAmount (user paid more than their share)

export type PendingRecovery = {
  tx: Transaction;
  totalPaid: number;       // rawAmount — what user actually paid
  myShare: number;         // actualAmount — user's real share
  pendingRecovery: number; // rawAmount - actualAmount — what others owe
  alreadyRecovered: number; // sum of settlements mapped so far
  remaining: number;       // pendingRecovery - alreadyRecovered
  settlements: SettlementRow[];
};

export async function listPendingRecoveries(): Promise<PendingRecovery[]> {
  // Get all shared expense transactions where user paid more than their share
  const allTx = await db.select().from(transactions);
  const sharedExpenses = allTx.filter(
    (r: any) =>
      Number(r.rawAmount) > Number(r.actualAmount) &&
      r.type === "expense"
  );

  if (sharedExpenses.length === 0) return [];

  const expenseIds = sharedExpenses.map((r: any) => Number(r.id));

  // Get all settlements for these expenses
  const allSettlements = await db
    .select()
    .from(settlements)
    .where(inArray(settlements.expenseTxId, expenseIds));

  // Build PendingRecovery for each shared expense
  const results: PendingRecovery[] = [];

  for (const r of sharedExpenses) {
    const txId = Number(r.id);
    const totalPaid = Number(r.rawAmount);
    const myShare = Number(r.actualAmount);
    const pendingRecovery = totalPaid - myShare;

    const relatedSettlements = allSettlements
      .filter((s: any) => Number(s.expenseTxId) === txId)
      .map(mapRow);

    const alreadyRecovered = relatedSettlements.reduce((s, sl) => s + sl.amount, 0);
    const remaining = Math.max(0, pendingRecovery - alreadyRecovered);

    const tx: Transaction = {
      id: txId,
      rawAmount: totalPaid,
      actualAmount: myShare,
      isShared: r.isShared === true || r.isShared === 1,
      type: r.type as any,
      categoryId: r.categoryId ? Number(r.categoryId) : null,
      accountId: r.accountId ? Number(r.accountId) : null,
      toAccountId: r.toAccountId ? Number(r.toAccountId) : null,
      merchant: r.merchant ?? "Unknown",
      notes: r.notes ?? "",
      date: toDate(r.date),
      source: r.source as any,
      parsedBy: r.parsedBy ?? null,
      parseStatus: r.parseStatus ?? "complete",
      isExcluded: r.isExcluded === true || r.isExcluded === 1,
      createdAt: toDate(r.createdAt),
    };

    results.push({ tx, totalPaid, myShare, pendingRecovery, alreadyRecovered, remaining, settlements: relatedSettlements });
  }

  // Sort: active recoveries first, completed last
  return results.sort((a, b) => b.remaining - a.remaining);
}

// ─── Create Settlement Records ────────────────────────────────────────────────
// Called when user maps a credit transaction to one or more recoveries.
// Each mapping = one row in settlements table.

export type SettlementInput = {
  incomeTxId: number;
  expenseTxId: number;
  amount: number;
};

export async function createSettlements(inputs: SettlementInput[]): Promise<void> {
  if (inputs.length === 0) return;
  await db.insert(settlements).values(
    inputs.map((s) => ({
      incomeTxId: s.incomeTxId,
      expenseTxId: s.expenseTxId,
      amount: s.amount,
    }))
  );
}

// ─── List settlements for a specific income transaction ───────────────────────

export async function listSettlementsForIncomeTx(incomeTxId: number): Promise<SettlementRow[]> {
  const rows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.incomeTxId, incomeTxId));
  return rows.map(mapRow);
}

// ─── Delete all settlements for an income or expense tx ───────────────────────
// Called when user discards/deletes the transaction

export async function deleteSettlementsForTx(txId: number): Promise<void> {
  // Delete both sides
  await db.delete(settlements).where(eq(settlements.incomeTxId, txId));
  await db.delete(settlements).where(eq(settlements.expenseTxId, txId));
}

// ─── Count of active (remaining > 0) pending recoveries ─────────────────────

export async function countActiveRecoveries(): Promise<number> {
  const all = await listPendingRecoveries();
  return all.filter((r) => r.remaining > 0).length;
}
