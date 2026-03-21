import { int, text, real, sqliteTable } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("💰"),
  color: text("color").notNull().default("#6366f1"),
  keywords: text("keywords").notNull().default("[]"),
  createdAt: int("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const accounts = sqliteTable("accounts", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("💳"),
  initialBalance: real("initial_balance").notNull().default(0),
  createdAt: int("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const transactions = sqliteTable("transactions", {
  id: int("id").primaryKey({ autoIncrement: true }),
  rawAmount: real("raw_amount").notNull(),
  actualAmount: real("actual_amount").notNull(),
  isShared: int("is_shared", { mode: "boolean" }).notNull().default(false),
  type: text("type", {
    enum: ["expense", "income", "transfer", "ignored", "settlement"],
  }).notNull(),
  categoryId: int("category_id").references(() => categories.id),
  accountId: int("account_id").references(() => accounts.id),
  toAccountId: int("to_account_id").references(() => accounts.id),
  merchant: text("merchant").notNull().default("Unknown"),
  notes: text("notes").default(""),
  date: int("date", { mode: "timestamp" }).notNull(),
  source: text("source", { enum: ["sms", "pdf", "manual"] })
    .notNull()
    .default("manual"),
  isExcluded: int("is_excluded", { mode: "boolean" }).notNull().default(false),
  createdAt: int("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const budgets = sqliteTable("budgets", {
  id: int("id").primaryKey({ autoIncrement: true }),
  categoryId: int("category_id")
    .references(() => categories.id)
    .notNull(),
  monthlyLimit: real("monthly_limit").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  isTemplate: int("is_template", { mode: "boolean" }).notNull().default(false),
  createdAt: int("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const smsLog = sqliteTable("sms_log", {
  id: int("id").primaryKey({ autoIncrement: true }),
  rawSms: text("raw_sms").notNull(),
  parsed: int("parsed", { mode: "boolean" }).notNull().default(false),
  isProcessed: int("is_processed", { mode: "boolean" })
    .notNull()
    .default(false),
  smsDate: int("sms_date", { mode: "timestamp" }),
  createdAt: int("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});
