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

## 6. Key Work Completed — Full UI/UX Redesign Sprint (2026-09-04 → 2026-09-05)

### A. Context & Process
User supplied 5 reference mockup images (`ui designs/*.png`, an unnamed fintech-style app in both light and dark theme) and asked for the entire app to be redesigned to match, "as a senior UI/UX engineer." This ran through **multiple rounds**: an initial full redesign, then two rounds of screenshot-driven correction feedback (the user attached actual screenshots of the running app showing exactly what looked wrong). Treat this section as the source of truth over any earlier BMad UX artifacts under `planning_artifacts/` — those predate the redesign and were not used to drive it.

### B. Navigation Restructure (5 tabs → 4 tabs + FAB)
Old: Records / Analysis / Budgets / Accounts / Categories (5 tabs, each with its own local FAB).
New: **Home / Activity / Insights / Manage**, with a single floating center **FAB** (opens `/transaction/new` directly — an action, not a route) via a custom `components/tab-bar.tsx` replacing Expo Router's default tab bar.
- **Home** (`app/(tabs)/index.tsx`) — new dashboard: masked net-cash-flow hero (tap to reveal, auto-hides on tab blur / app background via `AppState`), `CashFlowLineChart`, Week/Month/Year toggle, in/out cards, spending-breakdown donut. `ScrollView` with `flexGrow:1` (scrolls only if content overflows, e.g. the pending-review banner).
- **Activity** (`app/(tabs)/activity.tsx`) — old Records list logic, restyled: search + type-filter chips, per-date section totals (always neutral grey, computed per the active filter), each transaction its own card with visible gaps.
- **Insights** (`app/(tabs)/insights.tsx`) — merges old Analysis + Budgets behind an Analysis/Budgets segmented control. Budgets pane has a fixed footer (Copy previous month / Add budget) that only renders in that pane — this was double-checked twice after user confusion about it "showing on Analytics," confirmed correctly scoped both times.
- **Manage** (`app/(tabs)/manage.tsx`) — new menu tab: Accounts / Categories / Pending Review (live count badge) / Settings. `accounts.tsx` and `categories.tsx` moved out of the tab bar into top-level stack routes.
- Goals and an "Ask AI" chat screen appear in the mockups but were **explicitly scoped out** by the user (not real features, no backing schema/data).

### C. Design System (`constants/theme.ts`, `components/ui/*`)
Built a full token system from scratch (previously just two flat `LightColors`/`DarkColors` color maps, no spacing/radius/typography scale, no shared components at all):
- `Spacing`, `Radius`, `Typography`, `IconPalette` (curated 8-color set for menu-row icons).
- **Primary accent went through 3 iterations**: original green → richer copper-amber (user still called it "flat yellow") → **final: rich violet-purple**, `#7C3AED` light / `#9D6FFF` dark. This one token drives the FAB, Save buttons, active-chart accents, total-balance cards.
- `ringTrack` — translucent version of `text` (not a fixed grey) for two-tone donut "unfilled" segments, so it never blends into the background in either theme (category-details' dual donut had this bug twice before the fix landed).
- New shared component library under `components/ui/`: `Card`, `SegmentedControl` (pill toggle with an **animated sliding indicator**, `Animated.Value` + spring — used everywhere a pill toggle appears), `Chip`, `ProgressBar`, `Badge`, `CountBadge`, `ListRow`, `IconTile`, `AmountText`, `SectionLabel`, `InsightCard` (reused for real notices, not generated AI text — no AI-insights feature exists), `DonutLegend`, `CashFlowLineChart`, `BarChart` (both hand-built on `react-native-svg`, no charting library added).
- `components/app-alert.tsx` + `store/useAlertStore.ts` — replaced the native `Alert.alert` app-wide with an app-styled modal (`showAppAlert()` is a drop-in same-signature replacement, so every call site only needed an import swap).

### D. Add Transaction Rework (`components/transaction-form-layout.tsx`, shared by `transaction/new.tsx` + `[id].tsx`)
Went through several structural revisions to match the reference exactly:
- No top X/Save bar. A drag handle at the top supports both tap-to-dismiss and a real `PanResponder`-driven swipe-down gesture (distance/velocity threshold, springs back otherwise). Route also uses `presentation:"modal"` + `gestureDirection:"vertical"`.
- Big amount readout below the Expense/Income/Transfer/Settle pill. Account (or From/To) and Category are separate horizontal chip sections (**not** inside the Date/Time/Note card — this flip-flopped once based on user feedback, current state is the final one).
- Numpad (`components/calculator-pad.tsx`) had its **arithmetic operators removed entirely** per explicit user request — it's now plain 1-9/0/./backspace only, matching the reference (the original app's calculator supported +-×÷= expressions; that's gone now). Backspace icon must be `"backspace"` (plain `MaterialIcons`) — `"backspace-outline"` doesn't exist in that icon set and silently renders as a tofu box.
- Numpad + a full-width bottom action button ("Enter an amount" → "Save") are fixed outside the scrollable content area specifically so they can never overlap the shared-expense checkbox or get squeezed by keyboard-avoidance.
- Wrapped in `KeyboardAvoidingView` + `ScrollView` (`flexGrow:1`) so focusing the Note field can scroll it above the keyboard without the page visibly scrolling in the normal case.

### E. Verification Gap (important — read before assuming this works)
**All of the above was implemented in a sandboxed environment with no network access to the npm registry** — `npm install` failed with `ECONNRESET` on every attempt, so `npx tsc --noEmit` and `npx expo start` could never be run. Everything was manually code-reviewed instead, across a very large diff. **A real device/emulator pass has not happened yet.** Priorities for that first pass: the Add Transaction swipe-to-dismiss gesture and FAB press animation (both hand-rolled with core `PanResponder`/`Animated`, not the already-installed `react-native-gesture-handler`/`reanimated`), and general light/dark parity across every screen.

---

## 7. Outstanding Tasks & Handoff Summary
1. **Run the redesign on a real device/emulator** — nothing in section 6 has been executed, only reviewed. Start with Add Transaction (all 4 types, both themes) and the FAB.
2. **Remote Push:** Run `git push origin master` in an authenticated terminal.
3. **Release Build & Verification:** Build `--variant release` to verify all latest features.
