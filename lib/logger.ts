import { db } from "@/db/client";
import { appLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export type LogLevel = "info" | "warn" | "error";

/**
 * Write a log entry to the app_logs table.
 * - INFO: brief milestone (e.g. "SMS received", "parsed amount=150")
 * - WARN: something unexpected that was handled (e.g. "duplicate SMS skipped")
 * - ERROR: requires attention — include the full error message + any relevant context
 */
export async function logAppEvent(
  level: LogLevel,
  message: string,
  details?: Record<string, any> | string | null,
) {
  try {
    let detailsStr: string | null = null;

    if (details != null) {
      if (typeof details === "string") {
        detailsStr = details;
      } else {
        // Flatten for readability in the Logs screen
        detailsStr = Object.entries(details)
          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join("\n");
      }
    }

    await db.insert(appLogs).values({ level, message, details: detailsStr });

    // Mirror to console (errors are highlighted)
    if (level === "error") {
      console.error(`[TRACKMONEY ERROR] ${message}`, details ?? "");
    } else if (level === "warn") {
      console.warn(`[TRACKMONEY WARN] ${message}`);
    } else {
      console.log(`[TRACKMONEY] ${message}`);
    }
  } catch {
    // If the log table itself isn't ready, fall back to console silently
    console.error(`[LOG WRITE FAILED] ${message}`);
  }
}

export async function listAppLogs(limit = 200) {
  return await db
    .select()
    .from(appLogs)
    .orderBy(desc(appLogs.createdAt))
    .limit(limit);
}

export async function clearAppLogs() {
  await db.delete(appLogs);
}
