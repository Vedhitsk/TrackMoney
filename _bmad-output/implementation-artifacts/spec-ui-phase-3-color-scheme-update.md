---
title: 'UI Phase 3 — Color Scheme Update'
type: 'feature'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'a3661ef9b9e6a8075dff82e4bf2f18d53344b4c1'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app currently uses Green as its primary brand color for almost everything (buttons, active tabs, floating action buttons, calculators). The new UI designs dictate a shift to a warm Amber/Yellow (`#F59E0B`) as the primary brand color, reserving Green exclusively for income/positive amounts.

**Approach:** Update `constants/theme.ts` to swap the Primary brand palette from Green to Amber/Yellow. Retain Green specifically for semantic `income` tokens. Update the `calculator` and `calculatorDark` backward-compatibility aliases to use neutral surface colors (greys) rather than bright primary colors, matching the new understated keypad designs.

## Boundaries & Constraints

**Always:** Ensure all backward-compatible aliases in `theme.ts` continue to point to valid hex codes so that no existing un-refactored screens break.
**Always:** Ensure Light and Dark theme structures remain perfectly identical to pass the `_darkCheck` compile-time assertion.

**Ask First:** If any specific component explicitly hardcodes a color instead of using `theme.primary` or `theme.income` and needs manual overriding outside of `theme.ts`.

**Never:** Do not touch navigation logic, data models, or screen layouts in this task. This is purely a theming palette shift.

</frozen-after-approval>

## Code Map

- `constants/theme.ts` -- The single source of truth for the app's color palette. We will update the `Brand / Primary` section, the `Semantic` section, and the backward-compatible aliases here.

## Tasks & Acceptance

**Execution:**
- [x] `constants/theme.ts` -- Update `primary`, `primaryDim`, `primaryMuted` to Amber/Yellow variants for both Light and Dark themes. Keep `income` as Green. Change `calculator` aliases to neutral surface greys (e.g. `surfaceElevated`).

**Acceptance Criteria:**
- Given the user views any screen with a Primary button or Active Tab, when rendered, then it should appear Amber/Yellow.
- Given the user views income amounts, when rendered using the `income` semantic color, then it should appear Green.
- Given the user opens the numeric keypad/calculator, when rendered, then the background should be neutral dark/light grey instead of bright green.

## Spec Change Log

## Design Notes

- **Dark Mode Amber:** `#F59E0B` (primary), `#D97706` (primaryDim), `#3D2A00` (primaryMuted)
- **Light Mode Amber:** `#D97706` (primary), `#B45309` (primaryDim), `#FEF3C7` (primaryMuted)
- **Income Green:** `#00E5A0` (Dark), `#059669` (Light)

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: TypeScript compiles cleanly without errors, proving the `ThemeColors` interface is intact.

**Manual checks (if no CLI):**
- Run the app and verify the FAB, active tabs, and primary buttons are now Amber, while income amounts remain Green.

## Suggested Review Order

- Swapped core brand color to Amber in Dark theme
  [`theme.ts:11`](../../constants/theme.ts#L11)

- Swapped core brand color to Amber in Light theme
  [`theme.ts:59`](../../constants/theme.ts#L59)

- Re-mapped backward-compatible aliases to semantic greys or Amber
  [`theme.ts:41`](../../constants/theme.ts#L41)
