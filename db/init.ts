import { sqlite } from "./client";

export function ensureTablesExist() {
  sqlite.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '💰',
      color TEXT NOT NULL DEFAULT '#6366f1',
      keywords TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_amount REAL NOT NULL,
      actual_amount REAL NOT NULL,
      is_shared INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      account_id INTEGER,
      to_account_id INTEGER,
      merchant TEXT NOT NULL DEFAULT 'Unknown',
      notes TEXT DEFAULT '',
      date INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      is_excluded INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      monthly_limit REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      is_template INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sms_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_sms TEXT NOT NULL,
      parsed INTEGER NOT NULL DEFAULT 0,
      is_processed INTEGER NOT NULL DEFAULT 0,
      sms_date INTEGER,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '💳',
      initial_balance REAL NOT NULL DEFAULT 0,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS app_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_tx_id INTEGER NOT NULL REFERENCES transactions(id),
      expense_tx_id INTEGER NOT NULL REFERENCES transactions(id),
      amount REAL NOT NULL,
      created_at INTEGER
    );
  `);

  const safeAlter = (sql: string) => {
    try { sqlite.execSync(sql); } catch (_) { /* column exists */ }
  };
  safeAlter(`ALTER TABLE transactions ADD COLUMN account_id INTEGER;`);
  safeAlter(`ALTER TABLE transactions ADD COLUMN to_account_id INTEGER;`);
  safeAlter(`ALTER TABLE transactions ADD COLUMN parsed_by TEXT;`);
  safeAlter(`ALTER TABLE transactions ADD COLUMN parse_status TEXT NOT NULL DEFAULT 'complete';`);

  // Migrate old type values: debit -> expense, credit -> income
  try {
    sqlite.execSync(`UPDATE transactions SET type = 'expense' WHERE type = 'debit';`);
    sqlite.execSync(`UPDATE transactions SET type = 'income' WHERE type = 'credit';`);
  } catch (_) { /* already migrated */ }

  // Seed default accounts if none exist
  const accountCount = sqlite.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM accounts`
  );
  if (accountCount && accountCount.cnt === 0) {
    sqlite.execSync(`
      INSERT INTO accounts (name, icon, initial_balance) VALUES ('Card', '💳', 0);
      INSERT INTO accounts (name, icon, initial_balance) VALUES ('Cash', '💵', 0);
      INSERT INTO accounts (name, icon, initial_balance) VALUES ('Wallet', '👛', 0);
    `);
  }

  // Seed default categories if none exist
  const catCount = sqlite.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM categories`
  );
  if (catCount && catCount.cnt === 0) {
    sqlite.execSync(`
      INSERT INTO categories (name, icon, color, keywords) VALUES ('Food & Dining', '🍔', '#f97316', '["swiggy", "zomato", "restaurant", "cafe", "mcdonalds", "food", "dominos", "kfc", "blinkit", "instamart"]');
      INSERT INTO categories (name, icon, color, keywords) VALUES ('Transport', '🚕', '#3b82f6', '["uber", "ola", "petrol", "fuel", "transit", "train", "rapido", "metro", "cab"]');
      INSERT INTO categories (name, icon, color, keywords) VALUES ('Shopping', '🛍️', '#ec4899', '["amazon", "flipkart", "myntra", "store", "mall", "meesho", "ajio", "nykaa"]');
      INSERT INTO categories (name, icon, color, keywords) VALUES ('Utilities', '💡', '#8b5cf6', '["electricity", "water", "internet", "recharge", "jio", "airtel", "bsnl", "broadband"]');
      INSERT INTO categories (name, icon, color, keywords) VALUES ('Entertainment', '🍿', '#14b8a6', '["movie", "netflix", "prime", "spotify", "game", "hotstar", "youtube", "pvr", "inox"]');
      INSERT INTO categories (name, icon, color, keywords) VALUES ('Salary', '💰', '#22c55e', '["salary", "payroll", "wage"]');
    `);
  } else {
    // Reset keywords to clean defaults (removes any pollution from old full-body keyword injection)
    const CLEAN_KEYWORDS: Record<string, string> = {
      'Food & Dining': '["swiggy", "zomato", "restaurant", "cafe", "mcdonalds", "food", "dominos", "kfc", "blinkit", "instamart"]',
      'Transport': '["uber", "ola", "petrol", "fuel", "transit", "train", "rapido", "metro", "cab"]',
      'Shopping': '["amazon", "flipkart", "myntra", "store", "mall", "meesho", "ajio", "nykaa"]',
      'Utilities': '["electricity", "water", "internet", "recharge", "jio", "airtel", "bsnl", "broadband"]',
      'Entertainment': '["movie", "netflix", "prime", "spotify", "game", "hotstar", "youtube", "pvr", "inox"]',
      'Salary': '["salary", "payroll", "wage"]',
    };
    for (const [name, kw] of Object.entries(CLEAN_KEYWORDS)) {
      try {
        sqlite.runSync(`UPDATE categories SET keywords = ? WHERE name = ?`, [kw, name]);
      } catch (_) { /* category may have been deleted by user */ }
    }
  }
}
