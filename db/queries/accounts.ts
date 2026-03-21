import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import type { Account } from "@/types";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  return new Date();
}

function mapAccountRow(r: any): Account {
  return {
    id: Number(r.id),
    name: r.name ?? "Unknown",
    icon: r.icon ?? "💳",
    initialBalance: Number(r.initialBalance ?? 0),
    createdAt: toDate(r.createdAt),
  };
}

export async function listAccounts(): Promise<Account[]> {
  const rows = await db.select().from(accounts);
  return rows.map(mapAccountRow);
}

export async function getAccountById(id: number): Promise<Account | null> {
  const rows = await db.select().from(accounts).where(eq(accounts.id, id));
  const r = rows[0];
  if (!r) return null;
  return mapAccountRow(r);
}

export async function createAccount(data: {
  name: string;
  icon?: string;
  initialBalance?: number;
}): Promise<Account> {
  const inserted = await db
    .insert(accounts)
    .values({
      name: data.name,
      icon: data.icon ?? "💳",
      initialBalance: data.initialBalance ?? 0,
    })
    .returning();
  return mapAccountRow(inserted[0]);
}

export async function updateAccount(
  id: number,
  patch: { name?: string; icon?: string; initialBalance?: number },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.icon !== undefined) set.icon = patch.icon;
  if (patch.initialBalance !== undefined) set.initialBalance = patch.initialBalance;
  await db.update(accounts).set(set as any).where(eq(accounts.id, id));
}

export async function deleteAccount(id: number): Promise<void> {
  await db.delete(accounts).where(eq(accounts.id, id));
}

export type AccountWithBalance = Account & { currentBalance: number };

export async function listAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const accts = await listAccounts();
  const allTx = await db.select().from(transactions);

  return accts.map((acct) => {
    let balance = acct.initialBalance;
    for (const tx of allTx) {
      const accountId = tx.accountId ? Number(tx.accountId) : null;
      const toAccountId = tx.toAccountId ? Number(tx.toAccountId) : null;
      const amount = Number(tx.actualAmount ?? tx.rawAmount ?? 0);
      const type = tx.type as string;

      if (accountId === acct.id) {
        if (type === "expense" || type === "transfer") balance -= amount;
        if (type === "income") balance += amount;
      }
      if (toAccountId === acct.id && type === "transfer") {
        balance += amount;
      }
    }
    return { ...acct, currentBalance: balance };
  });
}
