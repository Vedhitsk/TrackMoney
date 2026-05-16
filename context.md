# TrackMoney — Full Project Context

> **Last updated:** 2026-05-11 after UI/UX & Recoveries implementation sprint.

## What the App Is
Personal finance tracker for Android. Core USP is **automatic SMS-based transaction detection** — it reads bank SMS messages and creates pending transactions that the user can review and accept with one tap. Manual entry is also supported.

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 54), Expo Router v6 |
| Language | TypeScript |
| Database | SQLite via `expo-sqlite` + Drizzle ORM |
| State Management | Zustand |
| Background Tasks | Android HeadlessJsTaskService (custom native Java) |
| Native Bridge | Custom Expo Config Plugin (`withBackgroundSms.js`) |
| Build System | EAS Build |
| Package | `com.trackmoney.app` |

---

## App Architecture Overview

```
index.js (Entry Point)
    │
    ├── AppRegistry.registerHeadlessTask('BackgroundSmsTask', processSmsBackground)
    │       ↑ Must be FIRST before Expo Router loads
    │
    └── expo-router/entry → app/_layout.tsx
            │
            ├── ensureTablesExist() → DB init + migration + seeding
            ├── checkPermissions() → PermissionsAndroid (READ_SMS, RECEIVE_SMS, POST_NOTIFICATIONS)
            ├── PermissionModal → explains why permissions are needed
            ├── handleGrantPermissions() → requests permissions + battery optimization prompt
            └── ensureSmsPermissions().then(() => backfillFromInbox())
                    ↑ On every app open: catch-up for missed SMS
```

---

## SMS Ingestion — Full Execution Flow

### Real-Time Path (BroadcastReceiver — works in all states: open, background, killed)

```
SMS Arrives on Device
        ↓
SmsBackgroundReceiver.java (BroadcastReceiver)
    - Listens for: android.provider.Telephony.SMS_RECEIVED only
    - NO BOOT_COMPLETED (removed for YONO SBI compliance)
    - Extracts body + sender from PDU
        ↓
SmsHeadlessTaskService.java (TRANSIENT ForegroundService)
    - onCreate() → startForeground() with notification "TrackMoney / Checking for new transactions"
    - getTaskConfig() → returns HeadlessJsTaskConfig('BackgroundSmsTask', sms data, 15s timeout)
    - onHeadlessJsTaskFinish() → stopSelf()  ← KEY: service dies after JS task completes
        ↓
index.js → processSmsBackground(taskData)
        ↓
lib/sms/smsIngestion.ts → processSms(sender, body)
```

### On App Open Path (Inbox Backfill — covers reboot gap)

```
App Opens → _layout.tsx
        ↓
ensureSmsPermissions() → PermissionsAndroid.requestMultiple()
        ↓
backfillFromInbox()
    - Calls NativeModules.SmsInboxModule.getRecentSms(24)
    - SmsInboxModule.java reads content://sms/inbox for last 24 hours
    - Filters: looksLikeTransactionMessage()
    - Dedup: checks sms_log table (exact match, no time window)
    - Processes each missed SMS through processSms()
```

### 3-Layer Processing Pipeline (processSms in smsIngestion.ts)

```
processSms(senderAddress, body)
    │
    ├── 1. In-memory lock check (processingLock Set) → prevents concurrent duplicate processing
    │
    ├── 2. looksLikeTransactionMessage() → keyword filter (OTPs/promos exit here)
    │       Keywords: debited, credited, upi, neft, imps, rs., ₹, nach, a/c, etc.
    │
    ├── 3. DB dedup check → sms_log table, 60-second window
    │
    ├── ─── LAYER 1: REGEX (offline, always runs first) ───
    │   parseSmsOffline()
    │   ├── extractAmount() → 7 patterns (₹/Rs/INR prefix, SBI "of Rs X", verb-amount)
    │   ├── detectType() → income/expense scoring from keyword lists
    │   ├── extractMerchant() → 12 patterns (NACH format, UPI VPA, trf to, Info:, at X, etc.)
    │   ├── findCategoryId() → DB keyword match against merchant name only (not full body)
    │   └── findAccountId() → DB name match
    │   Returns: { draft, status: "complete"|"partial", missingFields[] }
    │
    │   If status === "complete" → INSERT transaction + sms_log → DONE
    │
    ├── ─── LAYER 2: AI (needs internet, only if keys configured) ───
    │   parseSmsWithAi(body)
    │   ├── isInternetAvailable() → HEAD request to google.com/generate_204, 3s timeout
    │   ├── callGroq() → llama-3.1-8b-instant, 10s timeout, JSON validated
    │   └── callGemini() → gemini-2.0-flash, 10s timeout, JSON validated (fallback)
    │   Returns: { amount, type, merchant, bank, balance, parsedBy }
    │
    │   Merge: Regex data takes priority, AI fills missing fields
    │   Result marked parsedBy="groq"/"gemini", parseStatus="complete"|"partial"
    │
    └── ─── LAYER 3: FALLBACK ───
        If regex partial result exists → save as needs_review + parsedBy="regex"
        If nothing at all → save amount=0, merchant="Unknown", needs_review
        User manually fills it in the Pending Dashboard
```

---

## Database Schema

### Tables

**`transactions`** — Core table
```
id, raw_amount, actual_amount, is_shared, type(expense|income|transfer|ignored|settlement),
category_id, account_id, to_account_id, merchant, notes, date,
source(sms|pdf|manual),     ← sms=pending, manual=accepted
parsed_by(regex|groq|gemini|manual),
parse_status(complete|partial|needs_review),
is_excluded, created_at
```
> **Key logic:** `source="sms"` = in Pending Dashboard. `source="manual"` = in Records tab.
> User pressing ACCEPT calls `updateTransaction(id, { source: "manual" })`.

**`sms_log`** — Dedup registry
```
id, raw_sms (key = "[sender, body]"), parsed, is_processed, sms_date, created_at
```

**`categories`**
```
id, name, icon, color, keywords (JSON array string), created_at
```
Default categories: Food & Dining, Transport, Shopping, Utilities, Entertainment, Salary

**`accounts`**
```
id, name, icon, initial_balance, created_at
```
Default accounts: Card 💳, Cash 💵, Wallet 👛

**`budgets`**
```
id, category_id, monthly_limit, month, year, is_template, created_at
```

**`app_logs`** — System logs visible in-app
```
id, level(info|warn|error), message, details, created_at
```

### Migrations (via `db/init.ts`)
- `ensureTablesExist()` — idempotent, uses `CREATE TABLE IF NOT EXISTS`
- `safeAlter()` — wraps `ALTER TABLE ADD COLUMN` in try/catch for existing installs
- Columns migrated: `account_id`, `to_account_id`, `parsed_by`, `parse_status`
- Data migration: debit→expense, credit→income type rename
- Category keyword reset on every boot (prevents pollution from old buggy code)

---

## Screens & Navigation

### Bottom Tabs
| Tab | File | Purpose |
|---|---|---|
| Records | `app/(tabs)/index.tsx` | All accepted transactions, filterable by day/week/month/year |
| Analysis | `app/(tabs)/analysis.tsx` | Charts, spending breakdown by category |
| Budgets | `app/(tabs)/budgets.tsx` | Monthly budget limits per category |
| Accounts | `app/(tabs)/accounts.tsx` | Account management + balance tracking |
| Categories | `app/(tabs)/categories.tsx` | Custom categories with keywords + colors |

### Stack Screens
| Route | File | Purpose |
|---|---|---|
| `/transaction/new` | `new.tsx` | Manual transaction entry (Calculator pad, date/time picker, shared expense) |
| `/transaction/[id]` | `[id].tsx` | Edit SMS-parsed transaction before accepting |
| `/transaction/pending` | `pending.tsx` | Pending Dashboard — review/accept/discard SMS transactions |
| `/settings` | `settings.tsx` | Export, Import, Simulate SMS, Logs link |
| `/settings/logs` | `settings/logs.tsx` | System Logs viewer (last 200 entries, clearable) |

### Records Tab (index.tsx) Features
- Filter by Day/Week/Month/Year with prev/next navigation
- Shows income total, expense total, net balance for selected range
- Pending transactions badge (tappable, goes to Pending Dashboard)
- Grouped by date, sorted newest first
- Each card shows: category icon, merchant, account, amount (green/red)
- Filter preference persisted to AsyncStorage via `recordsFilterPrefs.ts`

### Pending Dashboard (pending.tsx) Features
- Lists all `source="sms"` transactions
- Each card shows parse status badge: COMPLETE (green), PARTIAL (orange), NEEDS REVIEW (red)
- Shows `parsedBy` source (REGEX, GROQ, GEMINI)
- For NEEDS_REVIEW: shows raw SMS content prominently, red left border
- For incomplete: shows "Tap to assign category/account" hint
- ACCEPT button: greyed out if category/account missing (requires edit first)
- DISCARD: deletes the transaction
- ACCEPT: sets `source="manual"` — moves to Records tab
- **RECOVER button** (income txs only): opens modal to map the credit to pending shared expenses
- **Real-time updates via `DeviceEventEmitter`**: when the background task saves a new transaction, it emits `'newTransactionSaved'` → pending.tsx subscribes and refreshes instantly without needing to switch tabs
- **`useFocusEffect`** also refreshes when navigating back from the edit screen

### Recoveries Screen (recoveries.tsx) Features
- Lists all shared expenses where `rawAmount > actualAmount`
- For each: Total Paid, My Share, To Recover, Already Recovered, Remaining
- Progress bar showing recovery percentage
- History of mapped credit payments below each card
- Accessible from Accounts tab via "View Pending Recoveries (N)" button with badge count
- Fully settled expenses show a green "SETTLED" badge

### Transaction Edit ([id].tsx) Features
- Pre-filled from parsed data
- All fields editable: amount, type, category, account, merchant, notes, date/time
- Shared expense toggle (splits amount, user enters actual amount paid)
- Settlement type support

### New Transaction (new.tsx) Features
- Calculator pad for amount input
- Type: Income / Expense / Transfer / Settlement
- Transfer: from account → to account
- Shared expense: raw amount + actual amount fields
- Date + Time pickers

---

## Key Files Map

```
index.js                        → Entry point, HeadlessTask registration
app/_layout.tsx                 → Root layout, DB init, permissions, backfill trigger
app/(tabs)/_layout.tsx          → Bottom tab navigator + BackHandler (exits app on back press)
app/(tabs)/index.tsx            → Records screen (useFocusEffect + DeviceEventEmitter for live pending count)
app/(tabs)/analysis.tsx         → Spending analysis + charts (useFocusEffect)
app/(tabs)/budgets.tsx          → Budget management (useFocusEffect)
app/(tabs)/accounts.tsx         → Account management (useFocusEffect + Recoveries button with badge)
app/(tabs)/categories.tsx       → Category management (KeyboardAvoidingView in modal)
app/transaction/new.tsx         → Manual transaction entry
app/transaction/[id].tsx        → Transaction edit (for pending SMS transactions)
app/transaction/pending.tsx     → Pending dashboard (DeviceEventEmitter + useFocusEffect + Map to Recovery)
app/recoveries.tsx              → Shared Expenses Recoveries screen
app/settings.tsx                → Settings + simulate SMS
app/settings/logs.tsx           → System logs viewer

db/client.ts                    → SQLite + Drizzle setup (trackmoney.db)
db/schema.ts                    → Drizzle schema definitions (incl. settlements table)
db/init.ts                      → ensureTablesExist() — tables + migrations + seeding
db/queries/transactions.ts      → CRUD for transactions
db/queries/categories.ts        → CRUD for categories
db/queries/accounts.ts          → CRUD for accounts
db/queries/budgets.ts           → CRUD for budgets
db/queries/settlements.ts       → CRUD for settlements (many-to-many recovery mappings)

lib/sms/smsParser.ts            → Offline regex parser (3-layer result)
lib/sms/aiParser.ts             → Groq + Gemini AI parser with timeouts
lib/sms/smsIngestion.ts         → 3-layer pipeline + backfillFromInbox + processSmsBackground
                                  + context memory (lookupMerchantContext)
                                  + DeviceEventEmitter.emit('newTransactionSaved') after each save
lib/logger.ts                   → logAppEvent() → app_logs table
lib/config.ts                   → API key reader (EXPO_PUBLIC_ env vars)
lib/recordsFilterPrefs.ts       → AsyncStorage for filter mode persistence
lib/serialization/trackmoney.ts → Export/import all data as JSON

store/useTransactionStore.ts    → Zustand store (transactions, categories, accounts, pending)

types/index.ts                  → All TypeScript types (Transaction, Category, Account, etc.)
constants/theme.ts              → AppColors, Fonts

withBackgroundSms.js            → Expo Config Plugin:
                                    - Writes SmsBackgroundReceiver.java
                                    - Writes SmsHeadlessTaskService.java
                                    - Writes SmsInboxModule.java + SmsInboxPackage.java
                                    - Registers permissions in AndroidManifest.xml
                                    - Registers package in MainApplication
```

---

## Native Android Components (auto-generated by withBackgroundSms.js)

### `SmsBackgroundReceiver.java`
- Extends `BroadcastReceiver`
- Listens for `SMS_RECEIVED` only (NO boot)
- Extracts PDU → sender + body
- Calls `ContextCompat.startForegroundService()` (required for Android O+)
- Acquires WakeLock via `HeadlessJsTaskService.acquireWakeLockNow()`

### `SmsHeadlessTaskService.java`
- Extends `HeadlessJsTaskService`
- `onCreate()` → creates notification channel + calls `startForeground()`
- `getTaskConfig()` → returns `HeadlessJsTaskConfig("BackgroundSmsTask", data, 15s, allowInForeground=true)`
- `onHeadlessJsTaskFinish()` → **`stopSelf()`** ← makes service TRANSIENT

### `SmsInboxModule.java` (ReactContextBaseJavaModule)
- Name: `SmsInboxModule`
- `getRecentSms(hoursAgo, promise)` → queries `content://sms/inbox` with date filter
- Returns array of `{ sender, body, date }` to JS

### `SmsInboxPackage.java`
- Wraps `SmsInboxModule` as a `ReactPackage`
- Auto-registered in `MainApplication` by the config plugin

---

## Android Manifest Permissions
```xml
RECEIVE_SMS        ← Required for BroadcastReceiver
READ_SMS           ← Required for inbox backfill
FOREGROUND_SERVICE ← Required to start service
FOREGROUND_SERVICE_DATA_SYNC  ← Required for Android 14+
WAKE_LOCK          ← Keeps CPU alive during processing
POST_NOTIFICATIONS ← Required for foreground service notification (Android 13+)
```
**NOT present:** `RECEIVE_BOOT_COMPLETED` (removed to reduce YONO SBI risk score)

---

## Environment Variables (`.env`)
```
EXPO_PUBLIC_GROQ_API_KEY=gsk_...   ← Groq API key (already set)
EXPO_PUBLIC_GEMINI_API_KEY=        ← Gemini key (user needs to fill in)
```
Read via `lib/config.ts` → `getGroqApiKey()`, `getGeminiApiKey()`, `hasAnyAiKey()`

---

## AI Parser Details (`lib/sms/aiParser.ts`)

### Groq
- Model: `llama-3.1-8b-instant`
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`
- Timeout: 10 seconds hard
- Returns: `{ amount, type: "credit"|"debit", merchant, bank, balance }`

### Gemini (backup)
- Model: `gemini-2.0-flash`
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Timeout: 10 seconds hard

### Validation
- JSON must have valid `amount > 0` to be accepted
- Strips markdown code fences if present
- Merges with regex results (regex takes priority for fields it found)

---

## Problems Faced & How We Fixed Them

### 1. App Crash — `IllegalStateException: Not allowed to start service Intent` (Android 8+)
**Problem:** `BroadcastReceiver` called `startService()` instead of `startForegroundService()` when app was killed.
**Fix:** Switched to `ContextCompat.startForegroundService()` + added `startForeground()` in `SmsHeadlessTaskService.onCreate()`.

### 2. Background Task Not Found — `No task registered for key BackgroundSmsTask`
**Problem:** `AppRegistry.registerHeadlessTask()` was called inside `_layout.tsx`, which only runs when the React tree initializes. When the app is killed, only `index.js` runs — the task was never registered.
**Fix:** Moved registration to `index.js` as the very first line, before `expo-router/entry` import.

### 3. DB Not Initialized in Background
**Problem:** Background task tried to use DB without tables existing.
**Fix:** `ensureTablesExist()` extracted to `db/init.ts` and called at the top of `processSmsBackground()`. It's synchronous and idempotent.

### 4. Double SMS Processing
**Problem:** Two SMS ingestion paths existed simultaneously — the native `BroadcastReceiver` AND the `@maniac-tech/react-native-expo-read-sms` foreground listener. Both fired for the same SMS.
**Fix:** Removed the `@maniac-tech` library entirely. BroadcastReceiver handles all states (open, background, killed). Added in-memory `processingLock` Set as extra safety.

### 5. YONO SBI Banking App Warning — "Suspicious accessibility service detected"
**Problem:** The app was flagged by YONO SBI due to three risk signals:
1. `RECEIVE_BOOT_COMPLETED` (auto-start on reboot = malware signal)
2. Persistent foreground service (never stopped itself after processing)
3. Sideloaded APK (unknown developer signature)

**Fix:**
- Removed `RECEIVE_BOOT_COMPLETED` permission + intent-filter
- Added `onHeadlessJsTaskFinish() → stopSelf()` — service is now transient (5-15 seconds)
- Removed `@maniac-tech` library (potential manifest pollution risk)
- Added **inbox backfill** to cover the reboot gap: on every app open, reads last 24h of SMS inbox, finds missed transactions, processes them

### 6. Category Keyword Pollution
**Problem:** Old version matched keywords against the FULL SMS body (e.g., "balance" matched Salary category). This caused wrong categories.
**Fix:** `findCategoryId()` now matches keywords against merchant name only. Added stop-word list (bank names, generic banking terms). Requires score ≥ 2 to match. Category keywords reset to clean defaults on every DB init.

### 7. Groq API Crashes
**Problem:** Groq API calls were crashing the background task because no timeout was set and no error handling existed.
**Fix:** Removed Groq temporarily, then re-added with: 10s hard timeout via `AbortController`, full try/catch, JSON validation before accepting, and Gemini as fallback. The background task wraps the entire pipeline in try/catch so no error can crash it.

### 8. SBI NACH Format Not Parsed
**Problem:** `"has a credit by NACH- REC LIMITED of Rs 6.40"` — merchant not extracted.
**Fix:** Added specific regex pattern: `/credit\s+by\s+([A-Z0-9 &'./-]+?)\s+of\s+Rs/i` in `extractMerchant()`. Also added `"of Rs X"` amount pattern for SBI format.

### 9. Share Expense Missing on Some Transactions
**Problem:** Edit screen for pending transactions didn't always show the shared expense option.
**Fix:** Shared expense toggle added to `transaction/[id].tsx` edit screen for all transaction types.

---

## Data Flow: SMS → Records Tab (Complete)

```
1. SMS arrives on device (any app state)
2. SmsBackgroundReceiver.java wakes up
3. SmsHeadlessTaskService.java starts as foreground service (brief notification visible)
4. processSmsBackground() called from index.js registered HeadlessTask
5. ensureTablesExist() → DB safe to use
6. processSms(sender, body):
   a. looksLikeTransactionMessage() → filter non-transaction SMS
   b. 60s dedup check against sms_log
   c. Layer 1: parseSmsOffline() → regex
   d. lookupMerchantContext(merchant) → inherit categoryId/accountId from last manual tx with same merchant (CONTEXT MEMORY)
   e. If partial: Layer 2: parseSmsWithAi() → Groq → Gemini + context memory applied
   f. If all fail: Layer 3: save as needs_review + context memory applied
7. insertTransaction(draft) → transaction saved with source="sms"
8. db.insert(smsLog) → dedup entry added
9. DeviceEventEmitter.emit('newTransactionSaved') ← signals UI
   → pending.tsx listener fires → refreshPendingTransactions()
   → index.tsx listener fires → refreshPendingTransactions() (badge count updates)
10. SmsHeadlessTaskService.onHeadlessJsTaskFinish() → stopSelf()
11. logAppEvent() entries written throughout

--- USER ACTION ---

12. User is on Pending Dashboard (or switches to it)
13. Transaction appears in list instantly (DeviceEventEmitter) or on next focus (useFocusEffect)
14. For INCOME transactions: "RECOVER" button available → opens Map to Recovery modal
15. User enters allocation amounts per recovery → SAVE MAPPING
    → createSettlements() called (many-to-many records created)
    → updateTransaction(id, { type: 'settlement', source: 'manual', isExcluded: true })
    → Transaction accepted, does NOT appear in income analysis but IS counted in balance
16. For EXPENSE transactions: ACCEPT → updateTransaction(id, { source: 'manual' }) → moves to Records tab
17. Accounts tab reloads on focus → balance updated
18. Recoveries screen (Accounts → View Pending Recoveries) shows updated state
```

---

## Known Current State / Pending Items

- **Gemini API key** not yet filled in `.env` (Groq key is set)
- **New APK build needed** after the YONO SBI compliance changes (BOOT_COMPLETED removal, stopSelf, SmsInboxModule) — these are native changes that require `eas build`
- `SmsParseResult` type in `types/index.ts` is a leftover (unused, was from old parser API)
- `useTransactionStore.loadTransactionById` does not populate `parsedBy`/`parseStatus` in the draft — this may cause edit screen to lose those values on save
- `listPendingTransactions()` uses JS filter instead of SQL WHERE clause (minor perf issue for large datasets)
- The Recoveries screen is read-only — you can view progress but can only MAP credits from the Pending Dashboard (the correct intended flow)
- `MaterialIcons` does not include a `handshake` icon — if it errors, use `"people"` or `"compare-arrows"` as fallback

---

## Database Schema — settlements table

```
settlements
  id              INTEGER PRIMARY KEY
  income_tx_id    INTEGER NOT NULL (FK → transactions.id) — the credit that paid you back
  expense_tx_id   INTEGER NOT NULL (FK → transactions.id) — the shared expense being recovered
  amount          REAL NOT NULL                           — how much of this credit settles this expense
  created_at      INTEGER
```

**Many-to-many:** One income tx can have multiple settlement rows (splitting across recoveries). One expense tx can have multiple settlement rows (multiple friends paying back).

**When a credit is mapped:** its type changes from `"income"` to `"settlement"` and `isExcluded=true` — this means it counts in balance calculations (`listAccountsWithBalances`) but NOT in income analysis (`listExpensesForMonth` filters `isExcluded`).

---

## Build & Run

```bash
# Dev
npm start
npm run android

# Release APK (EAS)
eas build -p android --profile preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

EAS project ID: `1af0a8d9-23f3-4f52-9f8f-bf547aaa169b`
Android package: `com.trackmoney.app`
