# TrackMoney â€” Experience & Interaction Specification

> **Version:** 1.0 | **Date:** 2026-09-01 | **Author:** Vedant
> **Visual identity reference:** `DESIGN.md` â€” all token names (colours, spacing, typography, shapes) in this document use the `{token}` notation and are defined there.
> **Companion:** This document covers behaviour, flows, states, and microcopy. DESIGN.md covers appearance.

---

## 1. Foundation

### Platform & Runtime

| Property | Value |
|---|---|
| Platform | **Android only** (SMS READ permission is Android-exclusive) |
| Expo SDK | **54** |
| React Native | 0.74.x (Expo-managed) |
| Navigation | Expo Router (file-based) |
| State | Zustand (UI draft + cache); SQLite (source of truth) |
| Database | `expo-sqlite` via Drizzle ORM |
| Persistence | Offline-first; all data stored locally in SQLite |
| AI parsing | Groq / Gemini â€” remote, optional, with 10s timeout |
| Language | TypeScript, strict mode |

### Compliance Non-Negotiables

- **No boot persistence:** `RECEIVE_BOOT_COMPLETED` permission is **never** added. It triggers banking app malware flags (YONO SBI, PhonePe, etc.).
- **Transient services only:** `SmsHeadlessTaskService` calls `stopSelf()` immediately on task completion.
- **No `startService()`:** Always use `ContextCompat.startForegroundService()` on Android 8+.
- **Headless tasks cannot touch the React UI tree.** All DB access in background tasks goes directly through `ensureTablesExist()` + raw Drizzle queries.
- **AI parse failures always return `SUCCESS`** to the background worker â€” never throw or reject.

### Design Identity Reference

All visual decisions â€” colour tokens, typography, shape radii, elevation â€” are defined in `DESIGN.md`. This document uses `{colors.primary}`, `{spacing.lg}`, `{rounded.pill}`, `{type.amountHero}` etc. as shorthand throughout.

---

## 2. Information Architecture

### Screen Tree

```
App Root (_layout.tsx)
â”œâ”€â”€ (tabs)/                          â† Bottom tab navigator (floating pill nav)
â”‚   â”œâ”€â”€ index.tsx                    â† Records (SMS transaction list)  [Tab 1]
â”‚   â”œâ”€â”€ analysis.tsx                 â† Analysis (charts + breakdowns)  [Tab 2]
â”‚   â”œâ”€â”€ budgets.tsx                  â† Budgets (progress cards)        [Tab 3]
â”‚   â”œâ”€â”€ accounts.tsx                 â† Accounts (balance cards)        [Tab 4]
â”‚   â””â”€â”€ categories.tsx               â† Category management grid        [Tab 5]
â”‚
â”œâ”€â”€ category-details.tsx             â† Stack screen â€” drill-down from Analysis/Budgets
â”œâ”€â”€ settings.tsx                     â† Stack screen â€” from Records gear icon (top-left)
â”‚
â””â”€â”€ Modals / Overlays (rendered above tabs):
    â”œâ”€â”€ log-details-modal.tsx        â† Bottom sheet â€” from any transaction item tap
    â”œâ”€â”€ permission-modal.tsx         â† Bottom sheet â€” SMS permission onboarding
    â”œâ”€â”€ [transaction-edit]           â† Stack screen â€” from FAB Manual Entry
    â””â”€â”€ [recovery-details]           â† Stack screen â€” Recoveries sub-screen
```

### Tab Hierarchy

| Tab | Icon | Label | Primary Purpose |
|---|---|---|---|
| Records | list icon | Records | Main transaction log. Default tab on app open. |
| Analysis | chart icon | Analysis | Monthly summary with dual donut and category breakdown. |
| Budgets | target icon | Budgets | Spending limits with animated progress bars. |
| Accounts | bank icon | Accounts | Account balance cards; aggregate net worth. |
| Categories | tag icon | Categories | Create, edit, delete categories; view spend by category. |

### Modal Layers (z-order, low to high)

1. **Main content** â€” tab screens.
2. **FAB** â€” floats above main content, below sheets.
3. **FAB expanded tray** â€” above FAB, with `{colors.overlay}` scrim over main content.
4. **Bottom sheet (Log Details)** â€” slides up over everything with `{colors.overlay}` scrim.
5. **Permission Modal** â€” highest z-order; cannot be dismissed by tapping outside.

### Navigation Rules

- **Back gesture / hardware back:** Maps to bottom sheet dismiss (swipe down or pop sheet). On full-screen stack screens, maps to stack pop with `slide_from_left` reverse animation.
- **Settings icon position:** Top-left of the Records header (gear icon). Its physical left position signals that navigating to it uses `slide_from_left` animation â€” a deliberate spatial metaphor.
- **Deep link from Analysis to Category Details:** Push `category-details.tsx` onto the navigation stack with `categoryId` + `month` + `year` params. Back arrow returns to Analysis.
- **Deep link from Budgets to Category Details:** Same pattern; back arrow returns to Budgets.
- **Tab switching:** No animation â€” instant. Active tab indicator transitions with spring animation.

---

## 3. Voice and Tone

### Microcopy Guidelines

1. **Sentence case for all UI labels.** Not title case. "Add transaction" not "Add Transaction".
2. **No ellipses on buttons.** "Save" not "Save...". Actions are immediate.
3. **No corporate speak.** "TrackMoney couldn't load that" not "An error has occurred."
4. **Indian context:** Use "lakh" and "crore" when writing about large sums in descriptive text. In code, format using the Indian grouping system.
5. **Vedant is an engineer** â€” error messages can be slightly technical if they help debugging (e.g., "DB query failed â€” pull to retry").

### Number Formatting

All rupee amounts use the Indian grouping system (en-IN locale). Examples:

- Full detail views: Rs.1,23,456.78 (two decimal places always)
- Chart labels (space-constrained): Rs.1.2L (lakh), Rs.1.2Cr (crore), Rs.1.2K (thousand)

All Text components displaying currency amounts must include `fontVariant: ['tabular-nums']`.

### Date Formatting

| Context | Format | Example |
|---|---|---|
| Transaction list group header | DD MMM YYYY (uppercase) | TODAY, YESTERDAY, 02 SEP 2026 |
| Transaction list item timestamp | h:mm a (12hr) | 9:43 am |
| Log details modal | EEE, DD MMM YYYY Â· h:mm a | Mon, 02 Sep 2026 Â· 9:43 am |
| Analysis month picker | MMMM YYYY | September 2026 |
| Budget card (period) | MMM YYYY | Sep 2026 |
| Category details header | MMMM YYYY | September 2026 |

Use `date-fns` for all formatting. Do NOT use `moment.js` (large bundle).

### Empty State Messages

| Screen | Empty Headline | Empty Body |
|---|---|---|
| Records (All) | "No transactions yet" | "Your SMS income and expenses will appear here automatically." |
| Records (Expenses only) | "No expenses this month" | "Expense transactions from SMS will appear here." |
| Records (Income only) | "No income this month" | "Income transactions from SMS will appear here." |
| Analysis | "No data for this month" | "Switch to a month with transactions to see your spending breakdown." |
| Budgets | "No budgets set" | "Tap + to create your first budget and start tracking spending." |
| Accounts | "No accounts yet" | "Accounts are detected automatically from your payment SMS messages." |
| Categories | "No categories" | "Tap + to add a category and start organising your transactions." |
| Category Details | "No transactions" | "No {category} transactions recorded for {month}." |

---

## 4. Component Patterns

> Colour tokens use {colors.X} notation. All values defined in DESIGN.md.

### 4.1 Transaction List Item â€” Behaviour

**Data binding:**
- `merchant`: Primary label from parsed SMS or manual description. Truncated to 1 line.
- `amount`: Formatted INR. Positive = `{colors.income}`, Negative = `{colors.expense}`.
- `category`: Shows category emoji + name chip. If uncategorised, shows [?] chip with `{colors.textMuted}` bg and "Uncategorised" label.
- `account`: Short account name badge. If no account detected, omit the badge entirely (do not show "Unknown").
- `timestamp`: Relative on same day ("9:43 am"), absolute on older dates ("2 Sep").

**Tap** opens `log-details-modal.tsx` â€” push transaction ID as param, sheet slides up.

**Scroll performance:** Use FlatList with `getItemLayout` for fixed-height optimisation. Item height: 72dp for single-line merchants, up to 88dp for badges wrapping to a second line. `keyExtractor` = transaction ID string.

**Pull-to-refresh:** Triggers `refetchTransactions()` from Zustand action, which re-queries SQLite. Spinner tint colour: `{colors.primary}`. Refresh control `progressBackgroundColor = {colors.surface}`.

---

### 4.2 Account Card â€” Behaviour

**Data binding:**
- `accountName`: Parsed from SMS (e.g., "HDFC Bank", "SBI", "Paytm").
- `balance`: Latest computed balance from SUM(amount) query on transactions for this account.
- `transactionCount`: COUNT of transactions for this account.
- `lastUpdated`: Timestamp of the most recent transaction for this account.

**Gradient assignment:** Accounts receive a gradient pair index on creation, stored in the `accounts` table. The same gradient pair is always used â€” no random re-assignment on re-render.

**Balance text colour:** Always near-white (F0F0F2) regardless of light/dark mode, because the gradient background provides sufficient contrast.

**Tap:** Currently navigates to a placeholder view (future feature). Interim: a bottom toast â€” "Transaction filter by account â€” coming soon."

---

### 4.3 Budget Card â€” Behaviour

**Data binding:**
- `budgetAmount`: User-set limit for the category in the period.
- `spentAmount`: SUM(amount) for expense transactions in this category for the current month.
- `percent`: spentAmount / budgetAmount * 100.

**State thresholds:**
- `percent < 80`: Normal â€” `{colors.primary}` fill, `{colors.primaryMuted}` remaining badge.
- `80 <= percent < 100`: Warning â€” `{colors.warning}` fill, `{colors.warningMuted}` badge.
- `percent >= 100`: Over-budget â€” `{colors.expense}` fill, `{colors.expenseMuted}` badge, single attention pulse on mount (border opacity 0.4 to 0, 600ms ease-out, does NOT loop).

**Progress animation:** On screen mount, fill width animates from 0 to min(percent, 100)% using `Animated.spring({ stiffness: 120, damping: 20 })`.

**Edit action:** Inline form â€” card expands to show a budgetAmount text input using the Calculator Pad. Confirm saves to SQLite; Cancel reverts. No navigation required.

---

### 4.4 FAB â€” Behaviour

**Visibility rules:** Shown on Records screen only. Auto-hides when FlatList scrolls down more than 100dp; re-appears when scrolling back to top or list is at rest.

**Scroll detection:** Use FlatList `onScroll` with `scrollEventThrottle={16}`. Track `scrollY` with `Animated.Value`. Hide FAB when scrollY > 100. Use `Animated.spring(mass=1, damping=15, stiffness=200)` for both show and hide.

**Tap to expand:**
1. Scrim fades in at `{colors.overlay}` over 150ms.
2. Tray scales from 0.8 to 1 + fade-in, `Animated.spring(mass=1, damping=14, stiffness=180)`.
3. FAB icon cross-fades from + to X over 150ms with a 45-degree rotation.
4. Tapping scrim or X: reverse of above.

**Manual Entry tap:** Tray dismisses (reverse animation), then `router.push('/transaction-edit')` after 100ms delay.

---

### 4.5 Bottom Sheet (Log Details) â€” Behaviour

**Opening:** Tap any transaction list item. Sheet slides up from bottom using `Animated.spring(mass=0.9, damping=20, stiffness=200)`. Scrim fades in simultaneously over 250ms.

**Snap points:** 30% / 70% / 100% of screen height.
- Default open: 70%.
- Drag up past 85%: snaps to 100%.
- Drag down below 50%: snaps to dismiss.

**Snap logic:**
```javascript
const SNAP_POINTS = [0.30, 0.70, 1.00];
const onRelease = (velocity, currentFraction) => {
  if (velocity > 0.5 || currentFraction < 0.50) return dismiss();
  if (currentFraction > 0.85 || velocity < -0.5) return snapTo(1.00);
  snapTo(0.70);
};
```

Snap animation: `Animated.spring(translateY, { stiffness: 300, damping: 30, mass: 0.8, useNativeDriver: true })`.

**Dismiss triggers:** Swipe down below 50% threshold; tap scrim; hardware back; successful delete action.

**Data loading:** Data already in memory (passed from the list). No async fetch for initial render.

---

### 4.6 Segmented Control â€” Behaviour

**State:** Controlled by `filterMode: 'all' | 'expense' | 'income'` in Zustand store (not local state â€” persists across session).

**Animation:** Slider position as `Animated.Value` (0, 1, 2 mapped to x-position). On segment tap:
```javascript
Animated.spring(sliderPosition, {
  toValue: segmentIndex * segmentWidth,
  stiffness: 260,
  damping: 22,
  mass: 0.8,
  useNativeDriver: true,
});
```

Label colour cross-fades over 150ms simultaneously. FlatList re-renders with a 200ms cross-fade on data change.

---

### 4.7 Category Grid â€” Behaviour

**Add category:** A "+" tile at the end of the grid (same dimensions, dashed `{colors.border}` outline, centered "+" in `{colors.primary}`). Tapping opens an inline create form at the bottom of the screen â€” emoji picker, name field, colour picker (chart0â€“7 swatches), confirm button.

**Long-press (edit mode):**
1. Haptic `Haptics.impactAsync('medium')`.
2. Card gets `{colors.borderFocus}` 2px outline, scale 0.97.
3. Action bar below: [Edit] + [Delete] buttons.
4. Tapping outside any card in edit mode exits edit mode.

**Spend amounts:** Loaded from `getSummaryByCategory(currentMonth, currentYear)`. Refreshed on screen focus with `useFocusEffect`.

---

### 4.8 Settings â€” Behaviour

**Sections and rows:**

| Section | Rows |
|---|---|
| Appearance | Theme Preview Card; "Use System Default" button |
| Data | "Export as CSV" (nav row); "Clear all data" (destructive row) |
| SMS Parsing | "AI parser" toggle; "Parser timeout" (nav row to sub-setting) |
| About | "Version" (static value row); "Privacy Policy" (nav row to WebView) |

**Theme toggle:** Tapping dark half calls `setThemeMode('dark')`, light half calls `setThemeMode('light')`, "Use System Default" calls `setThemeMode('system')`. Change applies immediately. No app restart.

**"Clear all data" flow:**
1. Tap row (destructive, `{colors.expense}` colour).
2. Bottom sheet rises with warning text + [Cancel] + [Delete Everything] (full-width, `{colors.expense}` bg).
3. On confirm: full-screen loading indicator, DB wipe, navigate to Records empty state.

---

### 4.9 Tab Bar â€” Behaviour

**Active tab persistence:** Navigation state managed by Expo Router. Cold start defaults to Records (index 0).

**Tap active tab:** Scrolls that screen's FlatList to the top using a registered `scrollToIndex` ref.

**Keyboard avoidance:** When keyboard is shown, tab bar hides (`translateY` animated to `tabBarHeight + insets.bottom + 20`, spring). Restores on keyboard dismiss.

**Safe area:** `bottom: insets.bottom + 16px`. Scroll views: `paddingBottom: tabBarHeight + insets.bottom + 24px`.

---

### 4.10 Donut Chart â€” Behaviour

**Data source:** `getCategoryBreakdown(month, year, type)` â€” categories with totals, sorted descending.

**Render logic:**
- More than 8 categories: merge beyond 8th into "Others" (`{colors.textMuted}`).
- Category < 2% of total: merged into "Others" regardless.
- Total = 0: single grey full circle, "Rs.0" center, no tap interaction.

**Animation on mount:** Each segment sweeps in sequentially (staggered 40ms per segment), 300ms ease-out per segment.

**Month change:** Previous donut fades out (150ms), skeleton ring shown during load, new donut fades in (150ms).

**Segment tap:** Segment scales to 1.05, others dim to 0.6 opacity. Tooltip above donut: `{colors.surfaceElevated}` bubble, `{rounded.md}` radius â€” category name + amount + percentage. Second tap deselects.

---

## 5. State Patterns

### Per-Screen States

#### Records (index.tsx)

| State | Treatment |
|---|---|
| Loading | Three pulsing card skeletons (`{colors.surfaceSubtle}` with shimmer) |
| Empty | Centered large emoji + headline + body per section 3 + "Add manually" CTA button |
| Error | Inline error row at top of list: `{colors.expenseMuted}` bg, `{colors.expense}` text, "Couldn't load transactions. Pull to retry." |

**Special â€” SMS permission denied banner:**
- Persistent banner below header, above filter control.
- Background: `{colors.warningMuted}`, left border 3px `{colors.warning}`.
- Text: "SMS access needed to auto-import transactions." + "Grant access" link in `{colors.primary}`.
- Dismissible (tap X). Re-appears on next app open if permission still denied.

**Special â€” Background processing indicator:**
- Slim 4dp indeterminate progress bar at very top of screen, below status bar.
- Background: `{colors.primaryMuted}`. Fill bar: `{colors.primary}`.
- Animation: `Animated.loop(Animated.timing(translateX, { toValue: screenWidth, duration: 1200, easing: Easing.linear }))`.
- Appears on `DeviceEventEmitter` event `smsProcessingStarted`. Dismisses on `smsProcessingComplete` or `smsProcessingFailed`.

#### Analysis (analysis.tsx)

| State | Treatment |
|---|---|
| Loading | Two side-by-side donut ring skeletons (circular shimmer) + three list row skeletons |
| Empty | Single grey full-circle donuts + "No data for this month" |
| Error | Error card below month picker: "Couldn't load analysis. Tap to retry." |

#### Budgets (budgets.tsx)

| State | Treatment |
|---|---|
| Loading | Three pulsing progress card skeletons |
| Empty | Centered target emoji + "No budgets set" + body + FAB-style Add button |
| Error | Inline error row matching Records error pattern |
| Over-budget (per card) | Expense-coloured fill; expenseMuted badge; single border pulse on mount; warning icon next to budget name |

#### Accounts (accounts.tsx)

| State | Treatment |
|---|---|
| Loading | Two full-width card skeletons with gradient shimmer |
| Empty | Centered bank emoji + "No accounts yet" + "Accounts appear automatically from SMS." |
| Error | Error card with pull-to-retry instruction |

**Net worth row (top, above cards):** SUM of all account balances. `{type.amountLarge}`, `{colors.income}` if positive, `{colors.expense}` if negative. Fixed header row, not part of the scrollable list.

#### Categories (categories.tsx)

| State | Treatment |
|---|---|
| Loading | Six half-width card skeletons in 2-column grid |
| Empty | Centered tag emoji + "No categories" + "Tap + to add" + inline "+" card in grid |
| Error | Error toast below header |

#### Category Details (category-details.tsx)

| State | Treatment |
|---|---|
| Loading | Donut card skeleton + three transaction row skeletons |
| Empty | Zero-state donuts (grey rings) + "No {category} transactions for {month}." |
| Error | Inline error card below the donut card |

#### Log Details Modal (log-details-modal.tsx)

| State | Behaviour |
|---|---|
| Loading | Skeleton rows for each detail field |
| Loaded | Full detail layout per DESIGN.md section 7.5 |
| Delete in progress | Spinner replaces Delete button; other buttons disabled |
| Delete success | Sheet dismisses; list item fades out (150ms opacity 0) |
| Edit | Push transaction-edit screen with pre-filled values; sheet closes |

---

## 6. Interaction Primitives

### Gestures

| Gesture | Target | Action |
|---|---|---|
| Tap | Transaction list item | Opens Log Details bottom sheet |
| Tap | FAB (collapsed) | Expands FAB tray |
| Tap | FAB tray "Manual Entry" | Dismisses tray + pushes transaction-edit |
| Tap | Scrim (FAB tray backdrop) | Collapses tray |
| Tap | Segmented control segment | Slides control, filters list |
| Tap | Donut segment | Highlights segment, shows tooltip |
| Tap | Category detail chip (in modal) | Navigates to category-details |
| Tap | Month picker arrows | Navigates previous/next month |
| Tap | Month picker label | Expands month grid popup |
| Long-press | Category grid card | Enters edit mode for that card |
| Pull-to-refresh | Records FlatList | Triggers refetchTransactions() |
| Swipe down | Bottom sheet | Dismisses if dragged below 50% height |
| Hardware back | Bottom sheet open | Dismisses bottom sheet |
| Hardware back | FAB tray open | Collapses FAB tray |
| Hardware back | Stack screen | Pops to previous screen |
| Scroll down >100dp | Records FlatList | Auto-hides FAB (scale 0, spring) |
| Scroll up / at rest | Records FlatList | Re-shows FAB (scale 1, spring) |

### Press States

| Component | Press Treatment |
|---|---|
| Transaction list item | Ripple `{colors.primaryDim}` at 12% opacity; bg flashes `{colors.surfaceSubtle}` |
| Account card | White at 10% opacity ripple; gradient lightens slightly |
| Budget card body | Ripple `{colors.primaryDim}` at 12% opacity; bg `{colors.surfaceSubtle}` |
| Category grid card | Ripple `{colors.primaryDim}` at 10% opacity |
| Settings row | `{colors.surfaceSubtle}` flood fill, 150ms |
| FAB | Scale 0.93 over 80ms, spring back on release |
| Tab bar item | Icon colour transitions, 100ms |
| Calculator key | `{colors.surfaceSubtle}` flood fill, 80ms |

### FAB Spring Animation Specification

```javascript
// FAB mount / unmount / scroll-hide (scale)
Animated.spring(fabScale, {
  toValue: 1,        // or 0 for dismiss/hide
  mass: 1,
  damping: 15,
  stiffness: 200,
  useNativeDriver: true,
});

// FAB tray expand (scale + opacity)
Animated.parallel([
  Animated.spring(trayScale, {
    toValue: 1,      // or 0 for collapse
    mass: 1,
    damping: 14,
    stiffness: 180,
    useNativeDriver: true,
  }),
  Animated.timing(trayOpacity, {
    toValue: 1,      // or 0 for collapse
    duration: 150,
    useNativeDriver: true,
  }),
]);
```

### Segment Slide Animation Specification

```javascript
// Segment slider
Animated.spring(sliderPosition, {
  toValue: segmentIndex * segmentWidth,
  stiffness: 260,
  damping: 22,
  mass: 0.8,
  useNativeDriver: true,  // translateX only
});

// Label colour cross-fade
Animated.timing(labelOpacity, {
  toValue: isActive ? 1 : 0.5,
  duration: 150,
  useNativeDriver: true,
});
```

### Bottom Sheet Snap Points

| Snap Point | Height | Use case |
|---|---|---|
| Dismiss | < 50% screen | User drags down â€” sheet exits |
| Default | 70% screen | Default open state for Log Details |
| Expanded | 100% screen | Long SMS text or drag past 85% |

Snap animation: `Animated.spring(translateY, { stiffness: 300, damping: 30, mass: 0.8, useNativeDriver: true })`.

### Number Counter Animation (Summary Card)

When summary card net balance updates after a new SMS is ingested, the number counter animates from old to new value:

```javascript
const animatedValue = useRef(new Animated.Value(oldValue)).current;

Animated.timing(animatedValue, {
  toValue: newValue,
  duration: 800,
  easing: Easing.out(Easing.cubic),
  useNativeDriver: false,  // animating derived text â€” must be false
}).start();

animatedValue.addListener(({ value }) => {
  setDisplayValue(formatINR(value));
});
```

Uses `{type.amountHero}` with `fontVariant: ['tabular-nums']` so digit widths stay stable (no horizontal jitter during animation).

---

## 7. Accessibility Floor

### Touch Targets

- **Minimum:** 48x48dp for all interactive elements.
- Use `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}` on smaller icon buttons to reach 48dp.
- FAB collapsed: 56dp tall â€” within target.
- Calculator keys: 56dp tall â€” within target.
- Tab bar items: fill their equal flex:1 region (~64dp wide) â€” within target.

### Color Independence

Every colour-coded piece of information must be paired with a text label and/or icon:
- Transaction type: "CREDIT" / "DEBIT" badge text alongside green/red colour.
- Budget status: "â‚¹X left" / "â‚¹X over" text alongside progress bar colour.
- Income/expense amount: "+" prefix for income, "âˆ’" prefix for expense alongside colour.
- Never rely on colour alone.

### Dynamic Text Support

- All font sizes defined in sp (scaleable pixels), not dp. Android font size accessibility setting scales them.
- Minimum `lineHeight` always = `fontSize * 1.3` to prevent clipping at large text sizes.
- `amountHero` (40sp) and `amountLarge` (28sp) may cause layout overflow at 200% system text scale. Use `adjustsFontSizeToFit` + `minimumFontScale={0.7}` on the summary card hero amount as a fallback.
- Card heights use `minHeight` (not fixed `height`) so they expand when text scales.
- Test at 130%, 150%, and 200% system font scale before shipping.

### Screen Reader Labels

| Element | accessibilityLabel |
|---|---|
| Transaction list item | "{merchant}, {type}, {amount}, {category}, {timestamp}" |
| Account card | "{accountName}, balance {amount}, {transactionCount} transactions" |
| Budget card | "{budgetName} budget, {percent}% used, {spent} of {total}, {remaining} remaining" |
| Income donut | "Income breakdown donut chart. Total income: {amount}." |
| Expense donut | "Expense breakdown donut chart. Total expenses: {amount}." |
| FAB | "Add transaction" |
| Active tab | "{tabName}, selected, tab N of 5" |
| Segmented control active | "{label} filter, selected" |
| Summary card balance | "Net balance this month: {amount}" |

### Focus Order (per screen)

Ensure focus order follows visual top-to-bottom, left-to-right:
1. Screen title / month picker
2. Summary / hero card
3. Filter / segmented control
4. List content (first item gets initial focus)
5. FAB (last in order, before tab bar)

---

## 8. SMS Ingestion UX

### The Ingestion Pipeline (Background to UI)

The SMS ingestion runs as a transient SmsHeadlessTaskService. Communication contract:

1. **BroadcastReceiver** fires on incoming SMS (real-time path) or **Inbox Backfill** runs on app open.
2. `processingLock` Set + `sms_log` DB check prevents double-processing.
3. Headless task: parses SMS (regex â†’ AI if needed), writes to SQLite, calls `stopSelf()`.
4. **`DeviceEventEmitter.emit('newTransactionSaved', { transactionId })`** fires from the native bridge.
5. UI (Records screen) listens via `DeviceEventEmitter.addListener('newTransactionSaved', handler)`.
6. Handler: re-queries SQLite, updates Zustand store, triggers list re-render.

### Processing States

**State 1 â€” Processing (SMS received, parse in flight):**

A slim 4dp indeterminate progress bar appears at the very top of the Records screen (below status bar, above header).
- Background: `{colors.primaryMuted}`
- Animated fill bar: `{colors.primary}`
- Animation: `Animated.loop(Animated.timing(translateX, { toValue: screenWidth, duration: 1200, easing: Easing.linear }))`
- Triggered by `DeviceEventEmitter` event: `smsProcessingStarted`
- Dismissed by: `smsProcessingComplete` or `smsProcessingFailed` events

**State 2 â€” Success (transaction saved):**

Progress bar disappears (fade-out 150ms). A **toast banner** slides down from the top of the screen:
- Background: `{colors.surface}`, `{rounded.md}` radius, `{colors.border}` border, elevation 6
- Left accent bar: 3dp, `{colors.primary}`, full-height, pill radius on right edge
- Content: merchant name (`{type.labelM}`, `{colors.textPrimary}`) + amount (`{type.amountSmall}`, `{colors.income}` or `{colors.expense}`)
- Animation: `translateY` from -80dp to 0dp using spring (stiffness 280, damping 22)
- Auto-dismisses after 3000ms by reversing
- The toast is **not a modal** â€” it does not block interaction

The new transaction simultaneously appears at the **top of the Records list**:
- Slides in from the top: `Animated.spring` on `translateY` (-40dp to 0) + opacity fade (0 to 1), ~350ms
- Left edge: 3dp `{colors.primary}` accent bar
- `NEW` badge: top-right corner, `{colors.primaryMuted}` bg, `{colors.primary}` text, `{rounded.pill}` radius
- `NEW` badge auto-fades after 3s: `Animated.timing(opacity, { toValue: 0, delay: 2000, duration: 800 })`
- Summary card net balance counter animates from old to new value (see section 6 Number Counter Animation)

**State 3 â€” Parse failure (SMS received but unparseable):**

Progress bar disappears. Toast banner slides in with:
- Left accent bar: `{colors.warning}` (amber instead of mint)
- Content: "New SMS â€” needs review" (`{type.labelM}`, `{colors.textPrimary}`) + "Tap to categorise" (`{type.bodyS}`, `{colors.textSecondary}`)
- Tapping the toast opens the saved-but-unprocessed transaction in the Log Details bottom sheet

The transaction appears in the list with a `NEEDS REVIEW` badge:
- `{colors.warningMuted}` bg, `{colors.warning}` text, `{rounded.pill}` radius
- Persists (does not auto-fade) until the user manually assigns a category and account
- If AI parser timed out: item saved with whatever regex extracted (amount + raw SMS). AI retry is NOT automatic (battery drain concern)

### Double-Processing Prevention

```
Before any parse attempt:
1. Is smsId in processingLock Set? â†’ Skip
2. Is smsId already in sms_log DB table? â†’ Skip
If both pass: add to processingLock â†’ process â†’ write to DB â†’ remove from processingLock
```

Prevents duplicates from the two simultaneous paths (BroadcastReceiver real-time + Inbox Backfill) running on the same SMS.

---

## 9. Key Flows

### Flow A â€” Priya (28, software engineer) â€” Salary SMS ingestion

**Persona:** Priya receives her monthly salary SMS from SBI at 9:03am on 1st September. She is on her commute, phone in hand.

**Step-by-step:**

1. **9:03am â€” SMS arrives.** BroadcastReceiver fires. SmsHeadlessTaskService starts (transient).
2. **Background parse:** Regex extracts Rs.1,23,456. AI parser confirms: merchant = "SBI SALARY", category = "Income / Salary", account = "SBI â€¢â€¢5678". Task writes to SQLite. Calls `stopSelf()`.
3. **DeviceEventEmitter fires `newTransactionSaved`.** App is open on Records screen:
   - Slim mint processing bar (shown during parse) fades out.
   - Toast banner slides in: "SBI SALARY Â· +Rs.1,23,456" with mint left accent.
   - New transaction card slides in from the top of the list with `NEW` badge and 3dp mint left edge.
   - Summary card net balance counter animates upward to the new balance.
4. **Priya taps the transaction card.** Log Details bottom sheet slides up (70% snap point).
5. **Sheet shows:** +Rs.1,23,456 in `{type.amountLarge}` mint, [CREDIT] badge, "SBI â€¢â€¢5678" account, "Salary" category, timestamp.
6. **Priya swipes down.** Sheet dismisses.
7. **Priya taps the Budgets tab** in the floating pill nav.
8. **Budgets screen loads.** "Dining" budget at 34% used, "Transport" at 67%, "Entertainment" at 12%.
9. **Satisfied.** Returns to Records.

**What went right:** Ingestion was invisible and instant. Toast was non-intrusive. Number counter gave satisfying feedback. Log Details sheet provided full confidence without leaving the screen. Budgets gave a quick monthly status check.

---

### Flow B â€” Arjun (35, freelancer) â€” Manual offline expense entry

**Persona:** Arjun pays Rs.340 cash for coffee. No SMS for this. He wants to log it manually while offline.

**Step-by-step:**

1. **Arjun opens TrackMoney on the Records tab.** He sees today's transactions at the top.
2. **He taps the FAB** (the "+ Add" pill at bottom-centre).
   - FAB morphs to "X". Tray expands with spring animation. Scrim covers the list.
3. **He taps "Manual Entry".** Tray collapses, Transaction Edit screen pushes in from the right.
4. **Transaction Edit screen:**
   - **Calculator Pad** is immediately visible. Arjun taps 3, 4, 0. Display shows Rs.340.00.
   - **Type toggle:** "Expense" / "Income" segmented control. Already on "Expense" (default).
   - **Category picker:** Horizontal scroll row of chips. He taps "Dining". Chip gets `{colors.primary}` outline.
   - **Account picker:** He taps "Cash" (a manually created account). Selected.
   - **Date/time:** Pre-filled to current time (2 Sep 2026, 11:23 am). He leaves it.
   - **Notes (optional):** He types "Coffee at Third Wave". `{type.bodyM}`, `{colors.textPrimary}`.
5. **He taps "Save".** Button shows spinner (150ms), then "Saved check" with mint check icon (300ms). Screen pops back to Records.
6. **New entry appears at the top of the Records list.** No `NEW` badge (intentional manual entry). Has Dining emoji, "Coffee at Third Wave" label, "-Rs.340.00" in `{colors.expense}`, "Cash" badge.
7. **Arjun has no internet** â€” AI parser not called. All data in SQLite. Works offline.

**What went right:** No internet required. Calculator Pad was immediately ready. Category and account pickers are touch-friendly horizontal scrolls. Save had clear tactile feedback.

---

### Flow C â€” Meera (42, homemaker) â€” Month-end review and duplicate deletion

**Persona:** Meera opens the app on September 30 to review September spending. She navigates to Analysis, finds a suspiciously large Dining total, drills in, spots a duplicate transaction, and deletes it.

**Step-by-step:**

1. **Meera opens TrackMoney.** She taps the **Analysis tab** in the pill nav. Icon transitions to `{colors.primary}`.
2. **Analysis screen.** Month picker shows "September 2026". Dual donut chart appears with staggered segment sweep animations. Expense total: Rs.34,280. Income total: Rs.82,000.
3. **Category breakdown list below the chart.** "Dining" shows Rs.12,450 with an amber bar â€” the longest. Seems high.
4. **She taps the "Dining" row.** Screen pushes to `category-details.tsx`. Header: "Dining". Month: "September 2026".
5. **Category Details screen:**
   - Dual donut shows Dining's large share of total expenses.
   - Footer: "Total Amount: -Rs.12,450" in red.
   - Transaction list sorted "NEW TO OLD". 24 records.
   - She scrolls down. Two entries for "SWIGGY ORDER" on 23 Sep â€” both Rs.2,340, two minutes apart.
6. **She taps the second (duplicate) entry.** Log Details bottom sheet slides up.
7. **She reviews:** Amount Rs.2,340, time 7:47pm vs the first at 7:45pm. Same merchant, same amount. Likely a duplicate SMS from a network retry.
8. **She taps "Delete".** Button label changes to "Confirm delete?" (red). She taps again within 3 seconds. Sheet dismisses. List item fades out (150ms opacity 0).
9. **Category Details list now shows 23 records.** Donut chart updates â€” Dining segment is slightly smaller.
10. **She taps the back arrow.** Returns to Analysis. Expense donut now shows Rs.10,110 for Dining â€” corrected total. Category bar is shorter.
11. **Satisfied.** She taps Records to confirm transaction history is clean.

**What went right:** The month-end review was entirely within the app. The Dining drill-down was one tap from the Analysis chart. The duplicate was visible because of consistent timestamp display. The double-tap deletion confirmation prevented accidental deletion. Real-time donut update after deletion gave instant confidence.

---

## 10. Inspiration & Anti-Patterns

### What the Reference Designs Do Well (Monarch Money / Copilot Finance Style)

| Pattern | What they do | How TrackMoney applies it |
|---|---|---|
| Rich dark surfaces | Charcoal (not black) creates depth without eye strain | `{colors.background}` = #0D0D0F, `{colors.surface}` = #18181C â€” two-stop depth |
| Electric accent on key actions | Vivid mint/green pops on a near-neutral base | `{colors.primary}` = #00E5A0 â€” reserved for primary actions and income only |
| Amber/gold as secondary chart accent | Warm complement to cool mint | `{colors.chart1}` = #F59E0B â€” expense/budget chart lead colour |
| Tabular lining numerals | Digit columns align; counters do not jitter | `fontVariant: ['tabular-nums']` on all amount Text components |
| Floating center FAB | Primary action reachable at all times | Pill FAB above tab bar, auto-hides on scroll |
| Category rows with coloured progress bars | Dense, scannable â€” no wasted space | Budget cards and category breakdown list use horizontal progress bars |
| Card elevation with subtle borders | Cards feel distinct without heavy shadows | elevation:2 + 1px `{colors.border}` on all cards |
| Green income / muted coral expense | Clear financial polarity without aggression | `{colors.income}` = #00E5A0, `{colors.expense}` = #FF5C5C (muted coral, not harsh red) |

### Anti-Patterns â€” What to Avoid

| Anti-Pattern | Why | TrackMoney rule |
|---|---|---|
| Pure black #000000 backgrounds | Harsh contrast; OLED halo effect | Always use `{colors.background}` = #0D0D0F |
| Oversaturated accent everywhere | Mint loses meaning if used decoratively | `{colors.primary}` reserved for: active state, FAB, income amounts, CTAs only |
| Animation overkill | Delays frustrate power users | No primary interaction animation exceeds 400ms. Charts and FAB are exceptions. |
| Flat list without date grouping | Long lists become unscannable | Always group Records by date header (TODAY, YESTERDAY, DD MMM YYYY) |
| Amount in proportional fonts | Digits shift width during animation | `fontVariant: ['tabular-nums']` on every currency Text |
| Modal confirmation dialogs | Block UI for simple confirmations | Double-tap destructive confirm pattern on buttons only |
| Western thousands-grouping | 1,234,567 is incorrect for Indian users | Always use en-IN locale: 1,23,456 (lakh grouping) |
| Persistent background services | Triggers malware detection by banking apps | Transient headless tasks only, `stopSelf()` immediately on completion |
| Swipe-to-delete on transaction items | High accidental deletion risk in scrolling list | Deletion only from Log Details bottom sheet, double-tap confirm |
| Auto-dismiss notifications < 3s | User may be mid-reading | All toasts persist minimum 3000ms before auto-dismiss |
| Blank screen during data load | Jarring; makes app feel slow | Skeleton loaders on all async content |

---

## 11. Responsive & Platform (Android-Specific)

### Status Bar

- **Dark mode:** `StatusBar style="light"` (white icons on dark).
- **Light mode:** `StatusBar style="dark"` (dark icons on light).
- Both managed in `_layout.tsx` via `useAppTheme()` â€” changes immediately with theme toggle.
- `StatusBar backgroundColor="transparent"` + `translucent={true}` enables edge-to-edge layout.

### Edge-to-Edge

- `android:windowLayoutInDisplayCutoutMode="shortEdges"` in AndroidManifest.xml (via Expo config plugin).
- All screens use `useSafeAreaInsets()` to pad content below the status bar and above the navigation bar.
- Floating pill tab bar positioned at `bottom: insets.bottom + 16px` â€” always above the gesture bar.
- `{colors.background}` canvas extends into system bar areas for a full edge-to-edge feel.

### Back Button Behaviour (Hardware Back)

| Screen state | Hardware back action |
|---|---|
| Records tab (default) | Exits the app (standard Android back-stack exit) |
| Any other tab active | Navigates back to Records tab |
| Log Details bottom sheet open | Dismisses the bottom sheet (does NOT pop the tab stack) |
| FAB tray open | Collapses the FAB tray |
| Settings screen (stack) | Pops to Records tab |
| Category Details screen (stack) | Pops to Analysis or Budgets (whichever triggered navigation) |
| Transaction Edit screen (stack) | Pops to Records tab; if form is dirty, shows discard-changes confirmation |
| Permission Modal open | Does NOT dismiss (user must interact with the modal buttons) |

### Keyboard Avoiding (Forms)

- All form screens use `KeyboardAvoidingView` with `behavior="padding"` on Android.
- Tab bar hides when keyboard is visible: `Keyboard.addListener('keyboardDidShow', hideTabBar)` / `Keyboard.addListener('keyboardDidHide', showTabBar)`.
- Tab bar hide animation: `Animated.spring(tabBarTranslateY, { toValue: tabBarHeight + insets.bottom + 20 })`.
- On keyboard dismiss, tab bar re-appears with the same spring spec.
- The Calculator Pad is a native view (not a system keyboard) â€” `KeyboardAvoidingView` is NOT needed for amount entry. The Calculator Pad is always visible at a fixed position at the bottom of the transaction-edit screen.

### Navigation Transitions

- **Stack push (Settings, Category Details, Transaction Edit):** Default horizontal slide-in from the right.
- **Settings specifically:** Uses `slide_from_left` animation â€” Settings icon is physically on the left, a deliberate spatial metaphor.
- **Tab switch:** No animation (instant). Active indicator transitions with spring.
- **Bottom sheet open/close:** Spring from bottom â€” not a stack animation.
- **Root `<Stack>` in `_layout.tsx`** is wrapped in `<View style={{ flex: 1, backgroundColor: colors.background }}>` to prevent the grey OS window background from flashing during native stack transitions on Android.

### Display Cutout (Notch / Punch-hole)

- `SafeAreaView` / `useSafeAreaInsets()` handles all notch scenarios.
- Floating tab bar is never occluded by gesture indicators â€” always `bottom: insets.bottom + 16px`.
- Summary hero card at the top of Records adds `paddingTop: insets.top` on the screen container to avoid status bar overlap.
