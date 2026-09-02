---
title: 'UI Phase 1 — Token Refresh (New Color System)'
type: 'refactor'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'f5ff30355be604393ad046e5a824c93529456920'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current `constants/theme.ts` palette uses outdated forest-green and warm-cream colours with token names (`text`, `primaryLight`, `borderLight`, `white`) that don't match the new DESIGN.md system. The app looks dated and every screen needs a new colour foundation before any component-level styling can begin.

**Approach:** Replace both `LightColors` and `DarkColors` objects with the new design-system palette, add `Spacing` and `Radius` constants, and add backward-compatible token aliases (e.g. `text` → same value as `textPrimary`) so that the **zero existing screen files need to change** in this phase — they keep compiling and rendering at their current pixel positions, but now in the new colours.

## Boundaries & Constraints

**Always:**
- Every new token must resolve through `useAppTheme()` — no hardcoded hex in component files.
- `ThemeColors` type must remain `typeof LightColors` — the type is derived from the shape, not declared manually. Add new tokens to `LightColors`; `DarkColors` must have identical keys.
- Existing token names (`text`, `primaryLight`, `borderLight`, `white`, `shadow`, `progressGreen`, `progressRed`, `calculator`, `calculatorDark`, `fab`, `tabActive`, `tabInactive`) must remain as aliases pointing to semantically equivalent new values. No existing screen file should need editing to compile.
- `AppColors = LightColors` alias must remain (it's used as a static fallback in `log-details-modal.tsx`).
- `Colors` object (used by Expo Router for tab icon tints) must be updated to reference new tokens.
- `Spacing` and `Radius` exports are additive — they do not replace anything.
- Follow all rules in AGENTS.md: no hardcoded colours, use factory functions in components.

**Ask First:**
- If `DarkColors` and `LightColors` key sets diverge (TypeScript will catch this as a type error) — halt and ask before proceeding.

**Never:**
- Do not touch any screen, component, or hook file in this phase.
- Do not rename or remove any existing token key — only add new ones and change values.
- Do not add `Platform.select` inside the colour objects (platform logic stays in `Fonts`).
- Do not import `expo-linear-gradient` or any native library in this file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Dark mode active | `useAppTheme()` returns `DarkColors` | All screens render with new near-black canvas (`#0D0D0F`), electric mint primary (`#00E5A0`), coral expense (`#FF5C5C`) | — |
| Light mode active | `useAppTheme()` returns `LightColors` | Screens render with warm cream canvas (`#F5F4F0`), deep emerald primary (`#059669`), rich red expense (`#DC2626`) | — |
| System mode, OS=dark | `useAppTheme()` → `DarkColors` | Same as dark mode above | — |
| TypeScript build | `tsc --noEmit` | Zero new errors — `DarkColors` and `LightColors` have identical key sets satisfying `ThemeColors` | Fix any mismatch before committing |
| Old token reference | Component uses `theme.text` | Still resolves — `text` alias equals new `textPrimary` value in both palettes | No change needed in component |
| Old token `primaryLight` | Component uses `theme.primaryLight` | Still resolves — alias points to `primaryMuted` value | No change needed in component |

</frozen-after-approval>

## Code Map

- `constants/theme.ts` (L1–90) — **primary edit target**. Contains `LightColors`, `DarkColors`, `ThemeColors` type, `AppColors`, `Colors`, `Fonts`. All new tokens and aliases go here. Both color objects must remain structurally identical or TypeScript will error.
- `hooks/useAppTheme.ts` (L1–12) — imports `LightColors`, `DarkColors`, `ThemeColors` from `constants/theme.ts`. No change needed — it only reads the objects.
- `store/useThemeStore.ts` — Zustand store providing `theme: 'light' | 'dark' | 'system'` to `useAppTheme()`. Read-only context; no change.
- `app/_layout.tsx` — uses `LightColors.background` / `DarkColors.background` directly for the `ThemeProvider` and `StatusBar` background. Token value changes flow in automatically; no structural change.
- `app/(tabs)/_layout.tsx` (L21–34) — references `theme.tabActive`, `theme.tabInactive`, `theme.white`, `theme.border`. All must remain as aliases. No change needed.
- `components/log-details-modal.tsx` (L7) — `import { AppColors } from '@/constants/theme'` then uses `AppColors.expense` / `AppColors.income` as static colors. `AppColors = LightColors` alias must remain.

## Tasks & Acceptance

**Execution:**
- [x] `constants/theme.ts` — Replace `LightColors` and `DarkColors` with the new palette below; add backward-compatible aliases; add `Spacing` and `Radius` exports; update `Colors` object references — **this is the only file edited in this phase**

**New `DarkColors` (copy exactly):**
```typescript
export const DarkColors = {
  // ── Core surfaces ──────────────────────────────────
  background:       '#0D0D0F',
  surface:          '#18181C',
  surfaceElevated:  '#222228',
  surfaceSubtle:    '#1C1C21',

  // ── Brand / Primary ────────────────────────────────
  primary:          '#00E5A0',
  primaryDim:       '#00C48A',
  primaryMuted:     '#0A3D2E',

  // ── Semantic ───────────────────────────────────────
  income:           '#00E5A0',
  expense:          '#FF5C5C',
  expenseMuted:     '#3D1515',
  warning:          '#F59E0B',
  warningMuted:     '#3D2A00',

  // ── Text ───────────────────────────────────────────
  textPrimary:      '#F0F0F2',
  textSecondary:    '#8A8A96',
  textMuted:        '#4A4A55',
  textOnPrimary:    '#001A12',

  // ── Borders ────────────────────────────────────────
  border:           '#2C2C34',
  borderFocus:      '#00E5A0',
  overlay:          'rgba(0,0,0,0.72)',
  shadow:           'rgba(0,0,0,0.6)',

  // ── Chart palette (8 stops) ────────────────────────
  chart:            ['#00E5A0','#F59E0B','#6C8EFF','#FF5C5C','#C084FC','#38BDF8','#FB923C','#A3E635'] as string[],

  // ── Backward-compatible aliases (keep all existing screens compiling) ──
  text:             '#F0F0F2',   // = textPrimary
  primaryLight:     '#0A3D2E',   // = primaryMuted
  borderLight:      '#2C2C34',   // = border (subtle alias)
  progressGreen:    '#00E5A0',   // = primary / income
  progressRed:      '#FF5C5C',   // = expense
  calculator:       '#00C48A',   // = primaryDim
  calculatorDark:   '#009E70',
  fab:              '#00E5A0',   // = primary
  tabActive:        '#00E5A0',   // = primary
  tabInactive:      '#8A8A96',   // = textSecondary
  white:            '#18181C',   // = surface (used as "inverted white" in dark mode)
};
```

**New `LightColors` (copy exactly):**
```typescript
export const LightColors = {
  // ── Core surfaces ──────────────────────────────────
  background:       '#F5F4F0',
  surface:          '#FFFFFF',
  surfaceElevated:  '#F0EFEB',
  surfaceSubtle:    '#FAFAF8',

  // ── Brand / Primary ────────────────────────────────
  primary:          '#059669',
  primaryDim:       '#047857',
  primaryMuted:     '#D1FAE5',

  // ── Semantic ───────────────────────────────────────
  income:           '#059669',
  expense:          '#DC2626',
  expenseMuted:     '#FEE2E2',
  warning:          '#D97706',
  warningMuted:     '#FEF3C7',

  // ── Text ───────────────────────────────────────────
  textPrimary:      '#0F172A',
  textSecondary:    '#64748B',
  textMuted:        '#CBD5E1',
  textOnPrimary:    '#FFFFFF',

  // ── Borders ────────────────────────────────────────
  border:           '#E2E8F0',
  borderFocus:      '#059669',
  overlay:          'rgba(0,0,0,0.5)',
  shadow:           'rgba(0,0,0,0.1)',

  // ── Chart palette (8 stops) ────────────────────────
  chart:            ['#059669','#D97706','#6C8EFF','#DC2626','#C084FC','#0284C7','#EA580C','#65A30D'] as string[],

  // ── Backward-compatible aliases ────────────────────
  text:             '#0F172A',   // = textPrimary
  primaryLight:     '#D1FAE5',   // = primaryMuted
  borderLight:      '#F1F5F9',
  progressGreen:    '#059669',   // = primary / income
  progressRed:      '#DC2626',   // = expense
  calculator:       '#059669',   // = primary
  calculatorDark:   '#047857',   // = primaryDim
  fab:              '#059669',   // = primary
  tabActive:        '#059669',   // = primary
  tabInactive:      '#94A3B8',
  white:            '#FFFFFF',   // = surface
};
```

**New `Spacing` and `Radius` exports (append after `Fonts`):**
```typescript
export const Spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  pill: 999,
} as const;
```

**Updated `Colors` object:**
```typescript
export const Colors = {
  light: {
    text:            LightColors.textPrimary,
    background:      LightColors.background,
    tint:            LightColors.primary,
    icon:            LightColors.tabInactive,
    tabIconDefault:  LightColors.tabInactive,
    tabIconSelected: LightColors.tabActive,
  },
  dark: {
    text:            DarkColors.textPrimary,
    background:      DarkColors.background,
    tint:            DarkColors.primary,
    icon:            DarkColors.tabInactive,
    tabIconDefault:  DarkColors.tabInactive,
    tabIconSelected: DarkColors.tabActive,
  },
};
```

**Acceptance Criteria:**
- Given the app is built with `npx expo start`, when any screen opens in dark mode, then the background is `#0D0D0F` (near-black) and the primary accent is electric mint `#00E5A0`
- Given the app is in light mode, when any screen opens, then the background is `#F5F4F0` (warm cream) and income amounts are `#059669` (deep emerald)
- Given a TypeScript check `npx tsc --noEmit` is run, then it exits with code 0 — no new type errors
- Given any screen that previously compiled, when the token refresh is applied, then it still compiles without import or property errors (`theme.text`, `theme.primaryLight`, `theme.borderLight`, `theme.white` all remain valid)
- Given `Spacing` and `Radius` are exported, when any future screen imports them, then they resolve as `const` with correct numeric values

## Design Notes

The key insight in this spec is the **backward-compatible alias pattern**: the new design system introduces `textPrimary` as the canonical primary text token, but the existing 17+ screens all use `theme.text`. Rather than mass-refactoring all screens in this phase, both names exist — `text` and `textPrimary` hold the same value. Future phases will progressively migrate component code to the canonical names as screens are individually restyled.

The `chart` token is an array (`string[]`) rather than individual `chart0`…`chart7` properties. New components will use `theme.chart[index]`. Existing donut chart code that uses category-level `color` strings from the DB will be migrated in Phase 5 (Analysis).

The `white` alias in dark mode intentionally returns `surface` (`#18181C`) not true white — this preserves the existing dark-mode behaviour in `log-details-modal.tsx` and `pending.tsx` where `white` is used as "the surface-level light colour in dark contexts."

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: exit 0, zero errors
- `npx expo start` -- expected: app launches without red screen; dark mode shows near-black background and mint FAB/tabs

## Suggested Review Order

**Design system — new palette and token structure**

- Entry point: both color objects with semantic groups and backward-compat aliases.
  [`theme.ts:3`](../../constants/theme.ts#L3)

- Compile-time guard ensuring DarkColors never silently drifts from LightColors shape.
  [`theme.ts:99`](../../constants/theme.ts#L99)

- Updated Colors object now references textPrimary/tabActive/tabInactive instead of legacy aliases.
  [`theme.ts:106`](../../constants/theme.ts#L106)

**New additive exports**

- Spacing scale (xxs→section) as `as const` for future component adoption.
  [`theme.ts:147`](../../constants/theme.ts#L147)

- Radius scale (xs→pill) as `as const` for future component adoption.
  [`theme.ts:159`](../../constants/theme.ts#L159)

