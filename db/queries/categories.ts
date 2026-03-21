import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";

import type { Category } from "@/types";

function parseKeywords(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

function stringifyKeywords(keywords: string[]) {
  return JSON.stringify(keywords);
}

function normalizeToken(token: string) {
  return token.trim().toLowerCase();
}

export async function listCategories(): Promise<Category[]> {
  const rows = await db.select().from(categories).orderBy(categories.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    keywords: parseKeywords(r.keywords),
    createdAt: r.createdAt ?? new Date(),
  }));
}

export async function getCategoryById(categoryId: number): Promise<Category | null> {
  const rows = await db.select().from(categories).where(eq(categories.id, categoryId));
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    keywords: parseKeywords(r.keywords),
    createdAt: r.createdAt ?? new Date(),
  };
}

export async function createCategory(input: {
  name: string;
  icon?: string;
  color?: string;
  keywords?: string[];
}): Promise<Category> {
  const inserted = await db
    .insert(categories)
    .values({
      name: input.name,
      icon: input.icon ?? "💰",
      color: input.color ?? "#6366f1",
      keywords: stringifyKeywords(input.keywords ?? []),
    })
    .returning();

  const row = inserted[0];
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    keywords: parseKeywords(row.keywords),
    createdAt: row.createdAt ?? new Date(),
  };
}

export async function updateCategory(
  id: number,
  patch: { name?: string; icon?: string; color?: string; keywords?: string[] },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.icon !== undefined) set.icon = patch.icon;
  if (patch.color !== undefined) set.color = patch.color;
  if (patch.keywords !== undefined) set.keywords = stringifyKeywords(patch.keywords);
  await db.update(categories).set(set as any).where(eq(categories.id, id));
}

export async function deleteCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function addKeywordsToCategory(
  categoryId: number,
  tokensToAdd: string[],
): Promise<void> {
  const row = await getCategoryById(categoryId);
  if (!row) return;

  const existing = new Set(row.keywords.map(normalizeToken));
  const normalizedToAdd = tokensToAdd.map(normalizeToken).filter((t) => t.length > 1);

  for (const token of normalizedToAdd) {
    if (!existing.has(token)) existing.add(token);
  }

  await db
    .update(categories)
    .set({ keywords: stringifyKeywords(Array.from(existing)) })
    .where(eq(categories.id, categoryId));
}

