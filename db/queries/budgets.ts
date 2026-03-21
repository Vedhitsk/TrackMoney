import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { budgets, categories } from "@/db/schema";

import type { Budget } from "@/types";

export type BudgetWithCategory = Budget & {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
};

export async function listTemplates(): Promise<Budget[]> {
  const rows = await db.select().from(budgets).where(eq(budgets.isTemplate, true));
  return rows.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    monthlyLimit: Number(r.monthlyLimit),
    month: r.month,
    year: r.year,
    isTemplate: Boolean(r.isTemplate),
    createdAt: r.createdAt ?? new Date(),
  }));
}

export async function listBudgetsForMonth(year: number, month: number): Promise<BudgetWithCategory[]> {
  const rows = await db
    .select({
      budget: budgets,
      category: categories,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(eq(budgets.year, year), eq(budgets.month, month), eq(budgets.isTemplate, false)))
    .orderBy(categories.name);

  return rows.map(({ budget, category }) => ({
    id: budget.id,
    categoryId: budget.categoryId,
    monthlyLimit: Number(budget.monthlyLimit),
    month: budget.month,
    year: budget.year,
    isTemplate: Boolean(budget.isTemplate),
    createdAt: budget.createdAt ?? new Date(),
    categoryName: category.name,
    categoryIcon: category.icon,
    categoryColor: category.color,
  }));
}

export async function upsertBudgetForMonth(input: {
  categoryId: number;
  year: number;
  month: number;
  monthlyLimit: number;
}): Promise<void> {
  // Replace the month budget for this category (simple and predictable for local self-use).
  await db
    .delete(budgets)
    .where(
      and(
        eq(budgets.categoryId, input.categoryId),
        eq(budgets.year, input.year),
        eq(budgets.month, input.month),
        eq(budgets.isTemplate, false),
      ),
    );

  await db.insert(budgets).values({
    categoryId: input.categoryId,
    monthlyLimit: input.monthlyLimit,
    month: input.month,
    year: input.year,
    isTemplate: false,
  });
}

export async function upsertTemplateForCategory(input: {
  categoryId: number;
  monthlyLimit: number;
}): Promise<void> {
  // Ensure there is only one template per category.
  await db
    .delete(budgets)
    .where(and(eq(budgets.categoryId, input.categoryId), eq(budgets.isTemplate, true)));

  const now = new Date();
  await db.insert(budgets).values({
    categoryId: input.categoryId,
    monthlyLimit: input.monthlyLimit,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    isTemplate: true,
  });
}

export async function deleteBudget(id: number): Promise<void> {
  await db.delete(budgets).where(eq(budgets.id, id));
}

export async function copyBudgetsFromPreviousMonth(year: number, month: number): Promise<number> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const prevBudgets = await listBudgetsForMonth(prevYear, prevMonth);
  if (prevBudgets.length === 0) return 0;

  await db
    .delete(budgets)
    .where(and(eq(budgets.year, year), eq(budgets.month, month), eq(budgets.isTemplate, false)));

  for (const b of prevBudgets) {
    await db.insert(budgets).values({
      categoryId: b.categoryId,
      monthlyLimit: b.monthlyLimit,
      month,
      year,
      isTemplate: false,
    });
  }

  return prevBudgets.length;
}

export async function applyTemplatesToMonth(year: number, month: number): Promise<void> {
  const templates = await listTemplates();
  if (templates.length === 0) return;

  // Replace all category budgets for this month.
  await db
    .delete(budgets)
    .where(and(eq(budgets.year, year), eq(budgets.month, month), eq(budgets.isTemplate, false)));

  for (const t of templates) {
    await db.insert(budgets).values({
      categoryId: t.categoryId,
      monthlyLimit: t.monthlyLimit,
      month,
      year,
      isTemplate: false,
    });
  }
}

