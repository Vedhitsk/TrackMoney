import { db } from "@/db/client";
import { budgets, categories, smsLog, transactions } from "@/db/schema";
import type { TransactionType, TransactionSource } from "@/types";

type ExportPayload = {
  version: 1;
  exportedAt: number;
  categories: Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
    keywords: string[];
    createdAt: number;
  }>;
  budgets: Array<{
    id: number;
    categoryId: number;
    monthlyLimit: number;
    month: number;
    year: number;
    isTemplate: boolean;
    createdAt: number;
  }>;
  transactions: Array<{
    id: number;
    rawAmount: number;
    actualAmount: number;
    isShared: boolean;
    type: TransactionType;
    categoryId: number | null;
    merchant: string;
    notes: string;
    date: number;
    source: TransactionSource;
    isExcluded: boolean;
    createdAt: number;
  }>;
  sms_log: Array<{
    id: number;
    rawSms: string;
    parsed: boolean;
    isProcessed: boolean;
    smsDate: number | null;
    createdAt: number;
  }>;
};

function dateToMs(v: unknown): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") return new Date(v).getTime();
  return 0;
}

function parseKeywords(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // ignore
  }
  return [];
}

export async function exportTrackMoneyData(): Promise<ExportPayload> {
  const categoriesRows = await db.select().from(categories);
  const budgetsRows = await db.select().from(budgets);
  const transactionsRows = await db.select().from(transactions);
  const smsRows = await db.select().from(smsLog);

  return {
    version: 1,
    exportedAt: Date.now(),
    categories: categoriesRows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      icon: r.icon,
      color: r.color,
      keywords: parseKeywords(r.keywords),
      createdAt: dateToMs(r.createdAt),
    })),
    budgets: budgetsRows.map((r: any) => ({
      id: Number(r.id),
      categoryId: Number(r.categoryId),
      monthlyLimit: Number(r.monthlyLimit),
      month: Number(r.month),
      year: Number(r.year),
      isTemplate: r.isTemplate === true || r.isTemplate === 1,
      createdAt: dateToMs(r.createdAt),
    })),
    transactions: transactionsRows.map((r: any) => ({
      id: Number(r.id),
      rawAmount: Number(r.rawAmount),
      actualAmount: Number(r.actualAmount),
      isShared: r.isShared === true || r.isShared === 1,
      type: r.type as TransactionType,
      categoryId: r.categoryId === null || r.categoryId === undefined ? null : Number(r.categoryId),
      merchant: r.merchant ?? "Unknown",
      notes: r.notes ?? "",
      date: dateToMs(r.date),
      source: r.source as TransactionSource,
      isExcluded: r.isExcluded === true || r.isExcluded === 1,
      createdAt: dateToMs(r.createdAt),
    })),
    sms_log: smsRows.map((r: any) => ({
      id: Number(r.id),
      rawSms: r.rawSms,
      parsed: r.parsed === true || r.parsed === 1,
      isProcessed: r.isProcessed === true || r.isProcessed === 1,
      smsDate: r.smsDate === null || r.smsDate === undefined ? null : dateToMs(r.smsDate),
      createdAt: dateToMs(r.createdAt),
    })),
  };
}

export async function importTrackMoneyData(payload: ExportPayload): Promise<void> {
  if (!payload || payload.version !== 1) {
    throw new Error("Unsupported export format");
  }

  // Replace (strategy: default for self-use).
  await db.transaction(async (tx) => {
    await tx.delete(smsLog);
    await tx.delete(transactions);
    await tx.delete(budgets);
    await tx.delete(categories);

    // Insert with explicit IDs to keep referential integrity stable.
    await tx.insert(categories).values(
      payload.categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        keywords: JSON.stringify(c.keywords),
        createdAt: c.createdAt,
      })),
    );

    await tx.insert(budgets).values(
      payload.budgets.map((b) => ({
        id: b.id,
        categoryId: b.categoryId,
        monthlyLimit: b.monthlyLimit,
        month: b.month,
        year: b.year,
        isTemplate: b.isTemplate ? 1 : 0,
        createdAt: b.createdAt,
      })),
    );

    await tx.insert(transactions).values(
      payload.transactions.map((t) => ({
        id: t.id,
        rawAmount: t.rawAmount,
        actualAmount: t.actualAmount,
        isShared: t.isShared ? 1 : 0,
        type: t.type,
        categoryId: t.categoryId,
        merchant: t.merchant,
        notes: t.notes,
        date: t.date,
        source: t.source,
        isExcluded: t.isExcluded ? 1 : 0,
        createdAt: t.createdAt,
      })),
    );

    await tx.insert(smsLog).values(
      payload.sms_log.map((s) => ({
        id: s.id,
        rawSms: s.rawSms,
        parsed: s.parsed ? 1 : 0,
        isProcessed: s.isProcessed ? 1 : 0,
        smsDate: s.smsDate,
        createdAt: s.createdAt,
      })),
    );
  });
}

