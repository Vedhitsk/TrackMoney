import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

export const sqlite = SQLite.openDatabaseSync("trackmoney.db");
export const db = drizzle(sqlite, { schema });
