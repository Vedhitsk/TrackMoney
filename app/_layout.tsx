import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import React from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { sqlite } from "@/db/client";
import { startSmsAutoIngestion, stopSmsAutoIngestion } from "@/lib/sms/smsIngestion";
import { AppColors } from "@/constants/theme";

const MyMoneyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: AppColors.background,
    card: AppColors.surface,
    text: AppColors.text,
    border: AppColors.border,
    primary: AppColors.primary,
  },
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  React.useEffect(() => {
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
  `);

    const safeAlter = (sql: string) => {
      try { sqlite.execSync(sql); } catch (_) { /* column exists */ }
    };
    safeAlter(`ALTER TABLE transactions ADD COLUMN account_id INTEGER;`);
    safeAlter(`ALTER TABLE transactions ADD COLUMN to_account_id INTEGER;`);

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
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== "android") return;
    void startSmsAutoIngestion();
    return () => stopSmsAutoIngestion();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : MyMoneyLightTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: AppColors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction/new" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="transaction/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_left" }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
