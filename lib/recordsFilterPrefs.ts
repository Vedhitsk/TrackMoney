import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_MODE = "records_filter_mode";
const KEY_ANCHOR_MS = "records_anchor_ms";

export type RecordsFilterMode = "day" | "week" | "month" | "year";

const MODES: RecordsFilterMode[] = ["day", "week", "month", "year"];

function isMode(v: string): v is RecordsFilterMode {
  return MODES.includes(v as RecordsFilterMode);
}

export async function loadRecordsFilterPrefs(): Promise<{
  filterMode: RecordsFilterMode;
  anchor: Date;
} | null> {
  try {
    const [modeRaw, msRaw] = await AsyncStorage.multiGet([KEY_MODE, KEY_ANCHOR_MS]);
    const mode = modeRaw[1];
    const ms = msRaw[1];
    const filterMode = mode && isMode(mode) ? mode : "month";
    const anchor =
      ms != null && ms !== "" && Number.isFinite(Number(ms)) ? new Date(Number(ms)) : new Date();
    return { filterMode, anchor };
  } catch {
    return null;
  }
}

export async function saveRecordsFilterPrefs(filterMode: RecordsFilterMode, anchor: Date): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEY_MODE, filterMode],
      [KEY_ANCHOR_MS, String(anchor.getTime())],
    ]);
  } catch {
    // ignore
  }
}
