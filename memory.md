# Session Memory — TrackMoney

*This document captures critical technical context, architectural invariants, compliance constraints, and completed work across chat sessions. Always read this file at the start of a new chat.*

---

## 1. Project Overview & Future Vision
- **App:** TrackMoney — Android-only, offline-first personal finance tracking via real-time SMS ingestion.
- **Stack:** Expo SDK 54 (React Native), TypeScript, Drizzle ORM, SQLite (`expo-sqlite`), Zustand.
- **Target:** Production launch on Google Play Store (Android-only due to SMS permission requirements).
- **Future Milestone:** Integration with an on-device Small Language Model (e.g., Gemma) so that transaction SMS parsing never leaves the user's device, ensuring complete privacy.

---

## 2. Hard Compliance & Native Architecture Constraints
*Crucial rules to prevent banking app malware flags (e.g., YONO SBI) and Android OS crashes:*
- **No Boot Persistence:** NEVER add `RECEIVE_BOOT_COMPLETED` permission or persistent background daemons.
- **Service Transience:** `SmsHeadlessTaskService` must remain strictly transient and invoke `stopSelf()` immediately upon completing background SMS processing.
- **Android 8+ Service Invocation:** Never use `startService()`; always use `ContextCompat.startForegroundService()`.
- **No Third-Party SMS Libraries:** Custom Expo config plugin (`withBackgroundSms.js`) + native `BroadcastReceiver` handle incoming messages.
- **AI Network Invariants:** All remote AI parser calls (Groq / Gemini) must have a hard 10-second `AbortController` timeout, wrapped in try/catch, and always return `SUCCESS` to background tasks to prevent infinite retries or crashes.
- **Headless DB Access:** Background tasks run outside the React UI tree; SQLite tables must be initialized via `ensureTablesExist()`.

---

## 3. Core Architectural Decisions (from `ARCHITECTURE-SPINE.md`)
- **AD-1 (State Ownership):** SQLite is the absolute single source of truth. Zustand serves solely as an ephemeral UI draft store and read-cache. Background services write directly to SQLite and emit a `DeviceEventEmitter` event (`newTransactionSaved`); the UI re-queries SQLite rather than receiving transaction payloads through the event bus.
- **AD-2 (Pure Parser Boundaries):** Regex and AI parsers are pure functions/modules (no DB access). A separate Ingestion Coordinator layer coordinates raw extraction, queries the database for merchant context, and persists records.
- **AD-3 (Privacy & Remote Masking):** Parsers adhere to a common interface. Remote implementations (Groq/Gemini) scrub sensitive PII (account numbers) before network transit. Future on-device SLM parsers can bypass scrubbing since processing stays local.

---

## 4. Key Work Completed in Recent Session

### A. Navigation & Touch Responsiveness Optimization
- **Problem:** Main records screen (`app/(tabs)/index.tsx`) felt laggy on button clicks in release builds due to whole-store destructuring from `useTransactionStore`.
- **Fix:** Switched `index.tsx` to use Zustand's `useShallow` selector map.
- **Commit:** `213309f`

### B. Merchant Context Memory & Learning Fix
- **Problem:** Subsequent SMS from a merchant did not inherit manual user-assigned categories.
- **Fix:** Made `lookupMerchantContext` query case-insensitive and ensured historical DB memory strictly overrides AI guesses.
- **Commit:** `79297a8`

### C. Repository Structure & BMad Setup
- Configured BMad workspace, `AGENTS.md`, `rules.md`, `spec.md`, `skills.md`, and created architecture spine in `planning_artifacts/architecture/`.
- **Commit:** `b81fba8`

### D. Category Details Screen & Log Details Modal
- **Feature Overview:**
  - Added dedicated drill-down Category Details screen (`app/category-details.tsx`) accessible by tapping categories in Analytics (`app/(tabs)/analysis.tsx`) and budget cards in Budgets (`app/(tabs)/budgets.tsx`).
  - Added a dedicated edit button on budget cards so card body click exclusively handles drill-down navigation.
- **Category Details Layout & Functionality:**
  - **Header:** Clean top app bar showing category icon and category name.
  - **Dual Donut Chart Card (Dark Theme Card):**
    - Left Donut: Category Expense % relative to the entire month's total expenses across all categories.
    - Right Donut: Category Income % relative to the entire month's total income across all categories.
    - Top of card: Displays the active month (e.g., "September 2026") followed by a subtle horizontal divider line.
    - Footer: Shows `Total Amount: +/-<amount>` (net: Income - Expense), colored green for positive and red for negative.
  - **Record Count & Cycle Sort:** Header displays `{count} records` and a cycle sort button toggling between `NEW TO OLD` ➔ `OLD TO NEW` ➔ `ONLY EXPENSES` ➔ `ONLY INCOME`.
  - **Transaction List:** Grouped by date, lists both income (`+`) and expense (`-`) transactions without notes. Explicitly displays "My share: +/-₹X" under the account name for shared expenses where `actualAmount !== rawAmount`.
- **Log Details Popup (`components/log-details-modal.tsx`):**
  - Displays full transaction details upon tapping a log item (type, date/time, bold semibold amount, account badge, category badge, and full SMS/notes text).
  - Contains Edit and Delete actions (with confirmation dialog). Omitted duplicate action icon.
- **Component & Query Updates:**
  - Added `getCategoryTransactions(categoryId, year, month)` in `db/queries/transactions.ts`.
  - Added `centerTextColor` prop to `components/donut-chart.tsx` to ensure high contrast text inside dark and light containers.

---

## 5. Key Work Completed in Current Session (Goal 2: Dark Mode)

### Full Dark Mode Implementation & UI Polish
- **Theme Definition:** Refactored `constants/theme.ts` to export `LightColors` and `DarkColors` with a cohesive palette, and aliased them under `ThemeColors`.
- **Dynamic Hooks:** Created `hooks/useAppTheme.ts` to combine `useThemeStore` and `react-native`'s `useColorScheme`, returning the active dynamic palette based on OS setting or explicit user choice (Light/Dark/System).
- **Global Refactoring:** Programmatically refactored 17 screens and components (including `index.tsx`, `settings.tsx`, modals, charts, etc.) using a Python script. All `StyleSheet.create` instances were converted to dynamic `getStyles(theme)` generators, and functional components were updated to inject `const theme = useAppTheme(); const styles = getStyles(theme);`.
- **Status & Navigation Bar:** Updated `app/_layout.tsx` to dynamically switch the `StatusBar` style (`light` vs `dark`) and `ThemeProvider` based on the active scheme to prevent camouflage. Wrapped the navigation `<Stack>` in a `<View>` with `theme.background` to prevent grey screen glitches during native stack transitions.
- **Interactive Toggle:** Added an "Appearance" section in `app/settings.tsx` with a beautifully animated Theme slider button (Sun/Moon icons) powered by Zustand. Corrected outputRange padding for perfect symmetry.
- **UI Readability Polish:** Enhanced `app/category-details.tsx` by adding dynamic borders (`theme.borderLight`) to separate list items and section headers. Updated the donut chart card to use `theme.surface` and explicit borders. Fixed total balance text contrast on the Accounts screen by enforcing `theme.white` over the primary card background.
- **Tab Header Layout:** Centered all tab titles (`Analysis`, `Budgets`, `Accounts`, `Categories`). For the main `Records` tab, placed the Settings gear icon on the top-left and the Search icon on the top-right. Restored `slide_from_left` animation for the Settings screen to intuitively match the icon's physical location.

---

## 6. Outstanding Tasks & Handoff Summary
1. **Remote Push:** Run `git push origin master` in an authenticated terminal.
2. **Release Build & Verification:** Build `--variant release` to verify all latest features.
