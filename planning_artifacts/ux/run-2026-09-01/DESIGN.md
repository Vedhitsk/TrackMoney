---
status: final
created: 2026-09-01
author: Vedant / TrackMoney UX Planning
version: "1.0"

colors:
  dark:
    background: "#0D0D0F"
    surface: "#18181C"
    surfaceElevated: "#222228"
    surfaceSubtle: "#1C1C21"
    primary: "#00E5A0"
    primaryDim: "#00C48A"
    primaryMuted: "#0A3D2E"
    income: "#00E5A0"
    expense: "#FF5C5C"
    expenseMuted: "#3D1515"
    warning: "#F59E0B"
    warningMuted: "#3D2A00"
    chart0: "#00E5A0"
    chart1: "#F59E0B"
    chart2: "#6C8EFF"
    chart3: "#FF5C5C"
    chart4: "#C084FC"
    chart5: "#38BDF8"
    chart6: "#FB923C"
    chart7: "#A3E635"
    textPrimary: "#F0F0F2"
    textSecondary: "#8A8A96"
    textMuted: "#4A4A55"
    textOnPrimary: "#001A12"
    border: "#2C2C34"
    borderFocus: "#00E5A0"
    overlay: "rgba(0,0,0,0.72)"
  light:
    background: "#F5F4F0"
    surface: "#FFFFFF"
    surfaceElevated: "#F0EFEB"
    primary: "#059669"
    income: "#059669"
    expense: "#DC2626"
    textPrimary: "#0F172A"
    textSecondary: "#64748B"
    border: "#E2E8F0"

spacing:
  xxs: 2
  xs: 4
  sm: 8
  md: 12
  lg: 16
  xl: 20
  xxl: 24
  xxxl: 32
  section: 40

rounded:
  xs: 4
  sm: 8
  md: 12
  lg: 16
  xl: 20
  xxl: 28
  pill: 999

typography:
  amountHero:
    size: 40
    weight: 700
    feature: "tnum"
    letterSpacing: -0.5
  amountLarge:
    size: 28
    weight: 700
    feature: "tnum"
  amountMedium:
    size: 20
    weight: 700
    feature: "tnum"
  amountSmall:
    size: 16
    weight: 600
    feature: "tnum"
  labelXL:
    size: 22
    weight: 700
  labelL:
    size: 18
    weight: 700
  labelM:
    size: 15
    weight: 600
  labelS:
    size: 13
    weight: 600
    letterSpacing: 0.3
  labelXS:
    size: 11
    weight: 600
    letterSpacing: 0.5
    transform: uppercase
  bodyL:
    size: 16
    lineHeight: 24
  bodyM:
    size: 14
    lineHeight: 20
  bodyS:
    size: 12
    lineHeight: 16
  mono:
    size: 12
    family: monospace
---

# TrackMoney — Design System Reference

> **Audience:** Vedant (sole engineer/designer). Canonical visual identity for the UI redesign sprint starting 2026-09-01.
> **Companion doc:** `EXPERIENCE.md` — interaction patterns, flows, state specs.

---

## 1. Brand & Style

### Personality

TrackMoney is a **personal finance co-pilot for the Indian power user**. It is:

- **Precise** — Every rupee displayed with clarity. No visual noise that distracts from numbers.
- **Calm but confident** — Dark surfaces reduce eye strain during quick morning check-ins; mint accent signals healthy financial control without aggression.
- **Efficient** — Information-dense screens that reward quick scanning (tabular numbers, consistent badge language).
- **Trustworthy** — Minimal chrome, stable layouts, no deceptive patterns.
- **Subtly premium** — Card elevation, gradient accounts, spring animations — delightful without showboating.

### Voice

| Context | Tone | Example |
|---|---|---|
| Empty states | Warm, practical | "No transactions yet. Your SMS income and expenses will appear here." |
| Error states | Direct, non-blaming | "Couldn't load transactions. Pull down to retry." |
| Permission asks | Honest, benefit-first | "TrackMoney reads incoming payment SMSes to log transactions automatically. Nothing is shared." |
| Success confirmations | Brief, affirming | "Transaction saved." |
| Budget warnings | Factual, not alarming | "83% of Dining budget used." |

### Anti-Patterns — Never Do These

- ❌ Pure black (`#000000`) backgrounds — use `#0D0D0F` canvas.
- ❌ Neon green for anything other than primary/income states — it would clash with the amber/chart palette.
- ❌ Modal dialogs for destructive confirmations longer than two lines — use inline bottom sheet actions with a single confirm tap.
- ❌ Mixing tabular and proportional numbers in the same amount display.
- ❌ Colour-only communication — always pair colour with a label or icon (especially income green vs expense red).
- ❌ Floating labels that obscure the text field during editing.
- ❌ Hero imagery or illustrations that compete with numeric data.
- ❌ Auto-dismiss toasts shorter than 3 seconds — the user may be mid-read.
- ❌ Animations longer than 400 ms on primary interaction paths (list items, tab switches).
- ❌ Hardcoded hex values in component code — all colours must flow through the token system.

---

## 2. Colors

### Dark Mode Token Table

| Token | Hex | Role |
|---|---|---|
| `background` | `#0D0D0F` | Page canvas — the deepest layer. Used for screen background. |
| `surface` | `#18181C` | Cards, list items, bottom sheets at rest. +4–5 lightness over background. |
| `surfaceElevated` | `#222228` | Modals, tab bar, FAB background, dropdowns — visually "above" surface. |
| `surfaceSubtle` | `#1C1C21` | Pressed state for list rows, hover highlights. |
| `primary` | `#00E5A0` | Electric mint — active tab, FAB, CTAs, income amounts, progress fill. |
| `primaryDim` | `#00C48A` | Pressed/ripple variant of primary. |
| `primaryMuted` | `#0A3D2E` | Tinted background behind mint elements (e.g., NEW badge tint, category chip bg). |
| `income` | `#00E5A0` | All positive/credit amount text. Same as primary in dark mode. |
| `expense` | `#FF5C5C` | All negative/debit amount text and expense indicators. |
| `expenseMuted` | `#3D1515` | Tinted background for expense-themed chips/badges. |
| `warning` | `#F59E0B` | Budget warnings, amber chart accent, over-budget indicator. |
| `warningMuted` | `#3D2A00` | Tinted background for warning chips. |
| `chart0` | `#00E5A0` | Category colour 1 (mint) |
| `chart1` | `#F59E0B` | Category colour 2 (amber/gold) |
| `chart2` | `#6C8EFF` | Category colour 3 (periwinkle blue) |
| `chart3` | `#FF5C5C` | Category colour 4 (coral red) |
| `chart4` | `#C084FC` | Category colour 5 (lavender) |
| `chart5` | `#38BDF8` | Category colour 6 (sky blue) |
| `chart6` | `#FB923C` | Category colour 7 (orange) |
| `chart7` | `#A3E635` | Category colour 8 (lime) |
| `textPrimary` | `#F0F0F2` | Body copy, amount labels. Main readable text. |
| `textSecondary` | `#8A8A96` | Metadata, timestamps, subtitles. |
| `textMuted` | `#4A4A55` | Placeholder text, divider labels, disabled state. |
| `textOnPrimary` | `#001A12` | Text rendered on the primary mint surface (FAB label, active tab label). |
| `border` | `#2C2C34` | Card outlines, dividers, input field borders. |
| `borderFocus` | `#00E5A0` | Input focus ring, selected state outline. |
| `overlay` | `rgba(0,0,0,0.72)` | Bottom sheet scrim, modal backdrop. |

### Light Mode Token Table

| Token | Hex | Role |
|---|---|---|
| `background` | `#F5F4F0` | Warm off-white page canvas. |
| `surface` | `#FFFFFF` | Cards, list items. |
| `surfaceElevated` | `#F0EFEB` | Tab bar, modals. |
| `primary` | `#059669` | Forest-emerald CTA, income. |
| `income` | `#059669` | Positive amounts. |
| `expense` | `#DC2626` | Negative amounts. |
| `textPrimary` | `#0F172A` | Main readable text. |
| `textSecondary` | `#64748B` | Metadata, subtitles. |
| `border` | `#E2E8F0` | Dividers, outlines. |

> Light mode fills for `surfaceSubtle`, `primaryMuted`, `expenseMuted`, `warningMuted`, `textMuted`, `textOnPrimary`, `border`, `borderFocus`, `overlay`, and all chart tokens are computed by the `useAppTheme()` hook from light-mode analogues following the same structural roles.

### Contrast Notes

| Pairing | Approx Ratio | Pass Level |
|---|---|---|
| `textPrimary` on `surface` (dark) | ~14:1 | AAA |
| `textSecondary` on `surface` (dark) | ~4.8:1 | AA |
| `primary` on `background` (dark) | ~9.2:1 | AAA |
| `textOnPrimary` on `primary` (dark) | ~12:1 | AAA |
| `expense` on `surface` (dark) | ~5.1:1 | AA |
| `textPrimary` on `surface` (light) | ~18:1 | AAA |
| `primary` on `surface` (light) | ~4.5:1 | AA |

> **Critical rule:** `expense` on `expenseMuted` in badges is decorative; ensure a text label always accompanies the colour for screen readers.

---

## 3. Typography

### Type Scale Table

| Token | Size | Weight | Line Height | Letter Spacing | Feature | Usage |
|---|---|---|---|---|---|---|
| `amountHero` | 40sp | 700 | 48 | −0.5 | `tnum` | Summary card net balance, account balance hero |
| `amountLarge` | 28sp | 700 | 36 | −0.3 | `tnum` | Log details modal amount, budget total |
| `amountMedium` | 20sp | 700 | 28 | 0 | `tnum` | Category card total, analysis totals |
| `amountSmall` | 16sp | 600 | 22 | 0 | `tnum` | Transaction list item amount |
| `labelXL` | 22sp | 700 | 30 | 0 | — | Screen/section titles (month picker, screen headers) |
| `labelL` | 18sp | 700 | 26 | 0 | — | Card headers (account name, budget title) |
| `labelM` | 15sp | 600 | 22 | 0 | — | List item titles (merchant/description) |
| `labelS` | 13sp | 600 | 18 | +0.3 | — | Badge labels, segmented control labels |
| `labelXS` | 11sp | 600 | 14 | +0.5 | UPPERCASE | Section headers, column headers, date group labels |
| `bodyL` | 16sp | 400 | 24 | 0 | — | Setting descriptions, permission modal body |
| `bodyM` | 14sp | 400 | 20 | 0 | — | SMS text preview, notes, secondary body copy |
| `bodyS` | 12sp | 400 | 16 | 0 | — | Timestamps, metadata, caption text |
| `mono` | 12sp | 400 | 18 | 0 | monospace | Raw SMS text display |

### Platform Font

- **Font family:** `System` (Roboto on Android). Do **not** bundle a custom typeface unless a distinct brand moment is required.
- **Tabular-nums instruction:** Every `Text` component rendering a currency amount **must** include `fontVariant: ['tabular-nums']` in its style. This ensures digit columns align vertically in lists and that animated number counters do not jitter as digit width changes.

### Amount Formatting Convention

```
₹1,23,456.78   → Indian number system (lakh/crore)
₹0.00          → Show two decimal places always in detail views
₹1.2K          → Abbreviated form only in chart labels where space < 40px
```

---

## 4. Layout & Spacing

### Grid & Gutter

| Property | Value | Notes |
|---|---|---|
| Screen horizontal gutter | `lg` (16px) | Consistent on both sides for all scroll views |
| Card gap (vertical list) | `sm` (8px) | Gap between adjacent transaction cards or budget cards |
| Card internal padding | `lg` (16px) | Uniform inner padding for surface cards |
| Section gap | `section` (40px) | Between major screen sections (e.g., hero card → filter row) |
| Inline icon gap | `sm` (8px) | Between icon and label/text in rows |
| Badge horizontal padding | `md` (12px) | Internal horizontal padding for pill badges |
| Badge vertical padding | `xs` (4px) | Internal vertical padding for pill badges |

### Safe Area

- Use `useSafeAreaInsets()` from `react-native-safe-area-context` on all screens.
- `top` inset: applied to the screen's outermost container.
- `bottom` inset: **added to the floating tab bar height** so content does not disappear behind the pill nav.
- Minimum bottom padding for scroll content = tab bar height (64px) + bottom inset + `md` (12px) breathing room.

### Tab Bar Clearance

The floating pill nav sits at `bottom: inset.bottom + 16px` above the screen edge. All scrollable content must have `contentContainerStyle.paddingBottom` set to `tabBarHeight + insets.bottom + 24px` to ensure the last list item is fully visible above the bar.

### Card Gap

- Transaction list: `FlatList` with `ItemSeparatorComponent` = 8px transparent spacer (no divider line — card boundaries provide visual separation).
- Category grid: 2-column `FlatList` with `columnWrapperStyle.gap = md (12px)` and `contentContainerStyle.gap = md (12px)`.

---

## 5. Elevation & Depth

Three-level elevation model. Shadows cast on Android using the `elevation` prop.

| Level | Name | Usage | Android Elevation | Visual Treatment |
|---|---|---|---|---|
| 0 | Flat | Background, list separators | `elevation: 0` | Colour difference only (`background` → `surface`) |
| 1 | Card | Transaction cards, budget cards, account cards, category cards | `elevation: 2` | 1px `border` + subtle inner glow on dark mode via `borderColor` |
| 2 | Sheet | Bottom sheet, FAB, segmented control | `elevation: 6` | `border` + slightly lighter `surfaceElevated` fill |
| 3 | Modal | Full-screen modals, overlays | `elevation: 12` | `overlay` scrim behind + full-border card |

> On dark mode, `elevation` alone is invisible. **Always pair elevation with the correct surface token and a 1px border** to communicate depth.

---

## 6. Shapes

| Component | Border Radius | Rationale |
|---|---|---|
| Transaction list card | `lg` (16px) | Primary content card — modern, not boxy |
| Account card | `xl` (20px) | Premium feel; larger card warrants larger radius |
| Budget card | `lg` (16px) | Consistent with transaction card family |
| Category grid card | `lg` (16px) | Consistent |
| Floating tab bar pill | `pill` (999px) | Fully rounded pill — centrepiece of nav identity |
| FAB (collapsed) | `pill` (999px) | Pill FAB shape |
| FAB (expanded panel) | `xxl` (28px) | Popup tray — softly rounded, not fully pill |
| Segmented control container | `pill` (999px) | Outer container is fully rounded |
| Segmented control active slider | `xl` (20px) | Slightly less than container — inset gap creates depth |
| Badge / chip | `pill` (999px) | Category, account, NEW, Needs Review badges |
| Button (primary) | `md` (12px) | Standard call-to-action |
| Input field | `md` (12px) | Consistent with button |
| Bottom sheet handle | `pill` (999px) | The drag handle bar |
| Bottom sheet container | `xxl` (28px) top-only | Top-left and top-right only |
| Month picker popup | `xl` (20px) | Floating card |
| Progress bar track | `pill` (999px) | Full radius for smooth animated fill |
| Progress bar fill | `pill` (999px) | Matches track |
| Permission modal | `xl` (20px) | Softer feel for trust-building screens |
| Settings section card | `lg` (16px) | Grouped section container |
| Donut chart center container | `pill` (999px) | Subtle pill around center text (optional polish) |
| Toast / SMS ingestion banner | `md` (12px) | Compact notification bar |

---

## 7. Components

> All colour references below are token names from the YAML frontmatter. Implement via `useAppTheme()` — never hardcode hex values.

---

### 7.1 Transaction List Item

**Purpose:** Displays one ingested or manual transaction in the Records screen list.

**ASCII layout (min row height 64dp, auto-expands for long merchant names):**

```
┌─────────────────────────────────────────────────────┐
│  [●]  Merchant / Description            ₹1,234.56   │
│  emoji  Category Label  [Account Badge]  timestamp  │
└─────────────────────────────────────────────────────┘
```

**Structure (horizontal row, `alignItems: 'center'`, `padding: lg`):**

- **Left icon block (40×40dp):** Circular container (`borderRadius: pill`), background = category colour at 18% opacity. Contains the category emoji (24sp, centered).
- **Centre content (`flex: 1`, `marginHorizontal: sm`):**
  - Row 1: `merchant/description` — `labelM`, `textPrimary`, `numberOfLines: 1`, ellipsis tail.
  - Row 2 (flex row, `gap: xs`): category chip (`labelXS`, `primaryMuted` bg, `primary` text, pill radius); account badge (`labelXS`, `surfaceElevated` bg, `textSecondary` text, pill radius); spacer; timestamp (`bodyS`, `textMuted`).
- **Right amount block:**
  - Amount: `amountSmall`, `income` for credits (prefix `+`), `expense` for debits.
  - If "Needs Review": `warning`-coloured pill badge below the amount: `NEEDS REVIEW` in `labelXS`.

**Card container:** `surface` bg, `lg` radius, `elevation: 2`, 1px `border`.
**Press state:** Ripple with `primaryDim` at 12% opacity, `borderless: false`, background flashes `surfaceSubtle`.
**Swipe actions:** None — deletion exclusively via Log Details bottom sheet.

**Special state — NEW badge (post-SMS ingestion):**
- Left edge: 3px vertical accent bar, `primary` colour, rounded on the right edge only (borderTopRightRadius: `pill`, borderBottomRightRadius: `pill`).
- Top-right corner: `NEW` badge — `labelXS`, `primaryMuted` bg, `primary` text, pill, auto-fades with `Animated.timing` (opacity 1→0, delay 2000ms, duration 800ms).

---

### 7.2 Account Card

**Purpose:** Displays a bank/wallet account with balance in the Accounts screen.

**ASCII layout (full-width card, height ≈ 140dp):**

```
┌───────────────────────────────────────────────────┐  ← gradient background
│  [Bank Icon]  Account Name          ●●● (menu)   │
│                                                   │
│               ₹ 1,23,456.78                       │  ← amountHero
│                                                   │
│  Updated 2h ago              47 transactions       │
└───────────────────────────────────────────────────┘
```

**Background:** Linear gradient — each account assigned a gradient pair from the chart colour palette (chart[N] at 80% opacity top-left → chart[N+1] at 60% opacity bottom-right), overlaid on `surface`. Keep saturation moderate (not garish).
**Border:** 1px border using the dominant gradient colour at 40% opacity (luminous edge effect).
**Balance:** `amountHero`, white/near-white text (always high contrast against gradient background, even in light mode).
**Account name:** `labelL`, `textPrimary`.
**Metadata row:** `bodyS`, `textSecondary` — last updated time (left), transaction count (right).
**Corner radius:** `xl` (20px).

---

### 7.3 Budget Card

**Purpose:** Displays one budget category with spend progress in the Budgets screen.

**ASCII layout:**

```
┌──────────────────────────────────────────────────────┐
│  emoji  Budget Name                     [Edit ✎]    │
│         ₹2,340 / ₹5,000                              │
│  ████████████░░░░░░░░░░░░░░░░░  [₹2,660 left]        │
└──────────────────────────────────────────────────────┘
```

**Progress bar:**
- Track: `border` colour, `pill` radius, height 8dp.
- Fill: Animated linear gradient — `primary` (left) → `primaryDim` (right) for normal state (<80% used).
- **Warning state (80–99%):** Fill gradient `warning` → `#D97706`.
- **Over-budget state (≥100%):** Fill = `expense`; track outline pulses once with `expense` at 40% opacity on mount (single pulse, not looping).
- Fill animates with `Animated.spring`: stiffness 120, damping 20, from 0 to `spendPercent` width on mount.

**Remaining pill badge:** Right-aligned at the track end.
- Normal: `primaryMuted` bg, `primary` text — "₹2,660 left".
- Warning: `warningMuted` bg, `warning` text — "₹2,660 left".
- Over-budget: `expenseMuted` bg, `expense` text — "₹340 over".

**Edit button:** Pencil icon (20dp), `textSecondary`, top-right. Opens inline edit form. Card body tap navigates to category details.
**Corner radius:** `lg` (16px).

---

### 7.4 FAB — Collapsed State

**Purpose:** Primary action trigger for adding a transaction, centered at the bottom of the Records screen.

**Geometry:** Horizontal pill, minimum width 120dp, height 56dp. Centered horizontally. Positioned `bottom: insets.bottom + 80px` (above the tab bar).
**Background:** `primary`.
**Content:** `+` icon (24sp bold) + `Add` label (`labelM`, `textOnPrimary`). Gap: `xs` (4px).
**Shadow:** `elevation: 8`. On Android API 28+, optionally add a `shadowColor: primary` wrapper at 40% opacity for a mint-tinted glow.
**Spring animation on mount:** Scale 0 → 1 with `spring(mass=1, damping=15, stiffness=200)`.
**Press state:** Scale 0.93 over 80ms, spring back on release.

### 7.4b FAB — Expanded State

Triggered by tapping the collapsed FAB. The pill expands upward into an action tray.

**Tray container:** `surfaceElevated` bg, `xxl` (28px) radius, `elevation: 10`, 1px `border`. Appears with scale 0.8→1 + fade-in spring (same spec as mount).
**Available actions:**
1. **Manual Entry** — pencil icon + label. Opens transaction edit form via stack push.
2. _(Reserved for future: scan/share receipt)_

**Backdrop:** `overlay` scrim behind the tray, above main content. Tap scrim to dismiss with reverse spring.
**FAB during expansion:** Label cross-fades from `+Add` to `✕` (150ms). Icon rotates 45° → 90° (150ms). Background stays `primary`.

---

### 7.5 Log Details Bottom Sheet

**Purpose:** Full transaction detail view, slides up when any transaction list item is tapped.

**Sheet geometry:**
- Default snap: 70% of screen height.
- Tall snap: 100% (for long SMS text).
- Horizontal inset: 16px each side (floating card feel, not full-bleed).
- Drag handle: 4×36dp pill, `textMuted` colour, centered, `marginTop: md`.

**Background:** `surfaceElevated`, `xxl` (28px) radius top-only, `border` on top/left/right, `elevation: 12`.
**Backdrop:** `overlay` scrim.

**Content layout (top to bottom):**

1. **Amount hero row:** `amountLarge`, `income` or `expense` colour, centered. `+` prefix for income, `−` for expense. Followed by a 1px `border` divider.
2. **Transaction type badge row:** Centered. `[CREDIT]` or `[DEBIT]` badge — `labelXS`, `primaryMuted`/`expenseMuted` bg, `primary`/`expense` text.
3. **Detail rows (icon + label + value, each min 44dp height):**
   - 📅 Date & Time — `bodyM`, `textPrimary`
   - 🏦 Account — account badge pill
   - 🏷️ Category — category badge pill (tappable → navigates to category details)
   - 📝 Notes (if present) — `bodyM`, `textPrimary`
4. **Raw SMS section:** Collapsed by default. `View raw SMS ▾` link in `bodyS`, `textSecondary`. On tap, expands to `mono` text block in a `surfaceSubtle` container with `md` radius and `md` padding.
5. **Actions row:** Two equal-width buttons, `gap: sm` between them:
   - **Edit** — outlined, `border` bg, `primary` text, `md` radius.
   - **Delete** — `expenseMuted` bg, `expense` text, `md` radius.
   - Delete requires double-tap confirmation: on first tap, label changes to `Confirm delete?` for 3 seconds, then auto-reverts. Second tap within 3s confirms deletion.

---

### 7.6 Segmented Control (Filter Pill)

**Purpose:** Switches the Records list between All / Expenses / Income.

**Geometry:** Full-width pill container (with `lg` horizontal margin on each side), height 40dp. `surfaceElevated` bg, `pill` outer radius. Three equally spaced segments.
**Active slider:** `surface` bg, `xl` (20px) radius, height 32dp (4dp vertical inset). Width = `(containerWidth - 8px) / 3`. Slides using `Animated.spring` (stiffness 260, damping 22, mass 0.8 → appears ~200ms).
**Labels:**
- Active: `labelS`, `textPrimary`, on the sliding surface.
- Inactive: `labelS`, `textSecondary`, on the container bg.
- Label colour cross-fades over 150ms simultaneously with slider movement.
**Interaction:** Single tap. Haptic: `Haptics.selectionAsync()` (Android: omit, ripple provides feedback).

---

### 7.7 Category Grid Card

**Purpose:** One category tile in the 2-column Categories management screen grid.

**Geometry:** `(screenWidth - 2*lg - md) / 2` wide. Min height 100dp. `surface` bg, `lg` radius, `border`, `elevation: 2`.

**ASCII layout:**

```
┌────────────────────┐
│  [●]               │  ← 36×36dp colour swatch circle, top-left
│  🍕                │  ← 32sp emoji, vertically centered
│  Dining            │  ← labelM, textPrimary
│  ₹3,450.00         │  ← amountSmall, expense/income coloured
└────────────────────┘
```

**Colour swatch:** 36×36dp circle, filled with the category's chart colour (`chart[N]`).
**Spend amount:** `amountSmall`, `expense` for expense categories; `income` for income categories.
**Long-press action:** Subtle `borderFocus` outline appears around card. Inline action toolbar below card: `[✎ Edit]` + `[🗑 Delete]`, `surfaceElevated` bg, `md` radius. No modal required.

---

### 7.8 Settings Row

**Purpose:** One interactive row in the Settings screen grouped sections.

**Type A — Navigation row (chevron):**

```
  [Icon]  Label                    ›
          subtitle (optional)
```

Icon: 20dp, `textSecondary`. Label: `labelM`, `textPrimary`. Subtitle: `bodyS`, `textSecondary`. Chevron: `textMuted`. Row height: min 56dp.

**Type B — Toggle row:**

```
  [Icon]  Label                [◉ toggle]
```

`Switch` component: `trackColor.true = primary`, `thumbColor = textOnPrimary`.

**Type C — Destructive row:** Same as Type A but label and icon use `expense` colour. No chevron.

**Section card:** Groups 2–5 rows. `surface` bg, `lg` radius, `border`, `elevation: 1`. 1px `border` divider between rows (horizontal `lg` inset, not full-bleed).

---

### 7.9 Theme Preview Card

**Purpose:** Live visual preview of dark/light mode at the top of Settings > Appearance.

**Geometry:** Full-width card (`screenWidth - 2*lg`), height 120dp, `lg` radius, `border`, `elevation: 2`. Left half = dark preview, right half = light preview.

**Left (dark preview):**
- Background: `#0D0D0F`, `lg` radius on left.
- Mini fake card: 70% width, 60% height, `#18181C` fill with 1px `#2C2C34` border.
- Inside: 10dp wide `#00E5A0` left bar; 3 short placeholder rows in `#4A4A55`.
- Label: "Dark", `bodyS`, `#8A8A96`.

**Right (light preview):**
- Background: `#F5F4F0`, `lg` radius on right.
- Mini fake card: `#FFFFFF` fill, `#059669` left bar, rows in `#E2E8F0`.
- Label: "Light", `bodyS`, `#64748B`.

**Active mode indicator:** Thin `borderFocus` ring around the active half.
**Tap:** Immediately applies theme via `setThemeMode()`.
**System option:** Below card — full-width outlined button "Use System Default", `labelM`, `primary` text, 1px `primary` border, `md` radius.

---

### 7.10 Donut Chart (Dual)

**Purpose:** Side-by-side income vs expense donut charts in Analysis and Category Details screens.

**Geometry:** Horizontal flex row, equal halves. Each donut: 120dp diameter, 14dp stroke width (92dp center). Rendered via SVG/Canvas.

**Donut colours:**
- Income: segments use `chart0`, `chart2`, `chart5`, `chart7` (cooler tones).
- Expense: segments use `chart1`, `chart3`, `chart4`, `chart6` (warmer tones).
- Remaining/unallocated: `border` at 60% opacity.

**Center label:**
- Above: `labelXS`, `textSecondary`, UPPERCASE — "INCOME" or "EXPENSE".
- Below: `amountMedium`, `income` or `expense` colour.

**Legend:** Below each donut, up to 4 category rows. Each row: 10dp colour dot + category name (`bodyS`, `textSecondary`) + amount (`amountSmall`, right-aligned). Horizontally scrollable if more than 4.

**Interaction:** Tapping a segment highlights it (scale 1.05, opacity 1.0 vs others at 0.6). Shows tooltip above donut: category name + amount + percentage in a `surfaceElevated` bubble with `md` radius. Second tap deselects.

**Card wrapper:** `surface` bg, `lg` radius, `border`, `elevation: 1`. Remove previous grey bg.

---

### 7.11 Permission Modal

**Purpose:** Onboarding screen explaining SMS permission requirement.

**Geometry:** Bottom sheet rising from the bottom, 80% screen height. `surfaceElevated` bg, `xxl` radius top-only, `border`, `overlay` scrim.

**Content (top to bottom, `padding: xl`):**
1. 64×64dp illustration: SMS envelope with a shield — SVG or emoji `🔐`, centered.
2. Title: `labelXL`, `textPrimary`, centered — "TrackMoney needs SMS access".
3. Body: `bodyL`, `textSecondary`, left-aligned — 2–3 sentences explaining what is read, what is not shared, and that the app is offline-first.
4. Privacy chip: `primaryMuted` bg, `primary` text — "📵 Offline-first. Nothing is sent to servers." (update if AI parse is enabled).
5. **Allow button:** Full-width, `primary` bg, `textOnPrimary`, `md` radius, height 52dp, `labelM`.
6. **Not now link:** `bodyM`, `textSecondary`, centered. Tapping shows a warning toast: "Without SMS access, add transactions manually."

**Dismissal:** Cannot be dismissed by tapping the scrim. User must tap Allow or Not now.

---

### 7.12 Tab Bar (Floating Pill)

**Purpose:** Primary navigation between the five main tabs.

**Geometry:** Horizontal pill, `screenWidth - 2*xl` (20dp horizontal insets). Height 64dp. `surfaceElevated` bg, `pill` (999px) radius, `border`, `elevation: 8`. Positioned `bottom: insets.bottom + 16px`, `alignSelf: center`.

**Tabs (left to right):** Records | Analysis | Budgets | Accounts | Categories.

**Active tab:** Icon + label visible. Inactive tabs: icon only.
**Active state:** Icon `primary`, label `labelXS` in `primary`. Inactive: icon `textSecondary`.
**Transition:** On tab switch — label cross-fades in (200ms). Icon scales 1 → 1.1 → 1 (100ms spring).
**Distribution:** Equal `flex: 1` per tab. Active tab's extra label width is absorbed without layout shift — icon + label are centered within the tab's flex region.

**FAB relationship:** FAB is positioned absolutely above the center of the tab bar, vertically overlapping it. The FAB is NOT a sixth tab item.

---

### 7.13 Calculator Pad

**Purpose:** Numeric keyboard for amount entry in the transaction edit form and manual entry FAB flow.

**Geometry:** 4-column, 4-row grid. Each key: `(screenWidth - 3*gap) / 4` wide, 56dp tall, `md` radius. Key gap: `xs` (4px).

**Key types:**
- **Digit keys (0–9, `.`):** `surfaceElevated` bg, `textPrimary` label (`amountMedium`). Press: `surfaceSubtle` bg flash.
- **Delete key (⌫):** `surfaceElevated` bg, `warning` icon, 24dp icon size.
- **Confirm key (✓):** `primary` bg, `textOnPrimary`, `md` radius. Spans 2 rows in the rightmost column (tall key).

**Display field (above pad):** `amountHero`, right-aligned. `surface` bg container with 2px bottom `borderFocus` underline (no full box border). Blinking cursor (1px, `primary`) appears 400ms after last keypress.

**Haptic:** `Haptics.impactAsync('light')` on each digit key press.

---

### 7.14 Date Picker

**Purpose:** Date/time selection for manual entry and filter use cases.

**Month picker (Analysis screen header):**
- Layout: `‹  September 2026  ›`. Month+year: `labelXL`, `textPrimary`. Arrows: 24dp, `textSecondary`.
- Tapping the month label expands a 3×4 month grid popup: `xl` (20px) radius, `surface` bg, `elevation: 10`.
- Active month: `primary` bg pill, `textOnPrimary`. Current month (today): `primaryMuted` bg. Others: transparent.

**Date/Time picker (transaction edit form):**
- Two stacked chips: Date chip + Time chip. Each: `surfaceElevated` bg, `border`, `md` radius, `labelM`, `textPrimary`.
- Tapping opens `@react-native-community/datetimepicker` which respects the app's dark/light theme.

---

## 8. Do's and Don'ts

| Do | Don't |
|---|---|
| Use `fontVariant: ['tabular-nums']` on all currency `Text` components. | Use default proportional digits for amounts — they jitter during animation. |
| Reference `useAppTheme()` for every colour value. | Hardcode any hex values in component styles. |
| Pair every colour indicator with a text label or icon. | Use green/red alone to communicate income/expense (accessibility). |
| Keep destructive actions behind a 2-step confirmation (change label → tap again within 3s). | Show an immediate deletion confirmation modal on every tap. |
| Use `ContextCompat.startForegroundService()` for any native service call. | Use `startService()` — crashes Android 8+. |
| Return `SUCCESS` from headless SMS tasks even on AI parse failure. | Throw or reject from headless tasks — causes Android to retry infinitely. |
| Use spring animations for FAB and bottom sheet entry (physical feel). | Use linear/ease animations for primary interactions (feels robotic). |
| Set `contentContainerStyle.paddingBottom = tabBarHeight + insets.bottom + 24px` on all scroll views. | Let the last list item clip behind the floating tab bar. |
| Use `surfaceSubtle` for pressed states inside cards. | Use pure transparent or white overlays for press states (invisible in dark mode). |
| Apply `pill` radius (999px) to all badge/chip elements. | Use fixed-pixel radius on badges — breaks at different font scales. |
| Format all rupee amounts using the Indian number system (lakh/crore grouping). | Use Western thousands-grouping (1,234,567 is incorrect for Indian users). |
| Keep the bottom sheet dismiss gesture (swipe down or tap scrim) always available. | Lock the bottom sheet open during loading states — deeply frustrating. |
| Display skeleton loaders for all async content (transactions, charts). | Show blank screens or lone centre-screen spinners. |
| Test contrast ratios for every new colour pairing before shipping. | Assume dark-on-light or light-on-dark automatically meets WCAG AA (4.5:1). |
| Keep the `SmsHeadlessTaskService` strictly transient — call `stopSelf()` on finish. | Add `RECEIVE_BOOT_COMPLETED` or persistent background services (triggers bank app malware detection). |
