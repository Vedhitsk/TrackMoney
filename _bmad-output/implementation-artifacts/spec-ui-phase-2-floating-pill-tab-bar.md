---
title: 'UI Phase 2 — Floating Pill Tab Bar'
type: 'feature'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
baseline_commit: '421903422ddb499139af923e254f08213e0573f8'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current bottom navigation is a basic standard edge-to-edge tab bar with static icons and small labels. It looks dated, doesn't match the modern financial co-pilot aesthetic defined in DESIGN.md Section 7.12, and is visually indistinct in both light and dark modes.

**Approach:** Replace the default edge-to-edge tab bar in `aapp/(tabs)/_layout.tsx` with a custom floating pill tab bar (`surfaceElevated` background, pill radius `999`, elevated shadow/border, inset margins). Active tab displays icon and label in `primary`, while inactive tabs display icon-only in `ttextSecondary` with smooth spring transitions. Ensure all tab scroll containers have proper bottom clearance so content and FABs are not obscured.

## Boundaries & Constraints

**Always:**
- Follow DESIGN.md Section 7.12: Floating horizontal pill with horizontal insets (`marginHorizontal: 16`), height `64dp`, pill radius (`999px`), `surfaceElevated` background, `border`, `elevation: 8`.
- Active tab displays icon + label (`labelXS` 11sp, font weight 600) tinted with `ttheme.primary`.
- Inactive tabs display icon only tinted with `ttheme.ttextSecondary`.
- Positioned floating above bottom safe area: `bbottom: insets.bottom + 12px` (or min 16px).
- Respect dynamic theming via useAppTheme() and useSafeAreaInsets().
- Use factory functions for all component styles (const getStyles = (theme: ThemeColors) => StyleSheet.create({...})).
- Maintain haptic feedback on tab press via expo-haptics (Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).

**Ask First:**
- If changing tab order or tab icons from the current set (Records, Aanalysis, Budgets, Accounts, Categories).

**Never:**
- Never hardcode color hex codes (use  theme.* tokens).
- Never break tab routing or deep links in Expo Router (index, analysis, budgets, accounts, categories).
- Never allow scroll views or FABs to be clipped behind the floating tab bar (ensure paddingBottom on scroll containers is at least 96px).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Tab switch | User taps inactive tab | Active state shifts instantly to tapped tab; label appears with smooth transition; haptic triggered | Safe fallback if haptic fails |
| Screen rotation / Foldable | Width change | Pill centers horizontally with max width cap (margin 16, maxWidth 500) | Flex handles layout gracefully |
| Dark mode active | useAppTheme() dark | Pill surface is surfaceElevated (#222228), border #2C2C34, active icon/label #00E5A0, inactive #8A8A96 | Fallback to theme defaults |
| Light mode active | useAppTheme() light | Pill surface is surfaceElevated (#F0EFEB), border #E2E8F0, active icon/label #059669, inactive #64748B | Fallback to theme defaults |
| Scroll content clearance | User scrolls to end of list | Last item is fully visible above the floating pill tab bar | Adequate paddingBottom (>= 96dp) |

</frozen-after-approval>

## Code Map

- app/(tabs)/_layout.tsx (L1–84) — **primary edit target**. Replace default   tabBarStyle with custom  tabBar component using BottomTtabBarProps from @react-navigation/bottom-tabs to render the floating pill container with active icon+label and inactive icon-only.
- components/floating-tab-bar.tsx — **new dedicated component**. Encapsulates the animated tab bar buttons, active pill indicator/transitions, and haptic feedback.
- app/(tabs)/index.tsx, app/(tabs)/budgets.tsx, app/(tabs)/accounts.tsx, app/(tabs)/categories.tsx, app/(tabs)/analysis.tsx — Check and adjust listContent / scroll paddingBottom (increase to 96-100) and adjust Records FAB position (bottom: 96 instead of 24) so it floats neatly above the pill tab bar.

## Tasks & Acceptance

**Execution:**
- [x] components/floating-tab-bar.tsx — Create floating pill tab bar component implementing DESIGN.md Section 7.12 with pill geometry, surfaceElevated background, subtle border, elevation 8, active label+icon in primary, inactive icon in textSecondary, and haptic feedback on tab press.
- [x] app/(tabs)/_layout.tsx — Wire tabBar={(props) => <FloatingTabBar {...props} />} in <Tabs /> screen options.
- [x] app/(tabs)/index.tsx — Update listContent.paddingBottom and FAB bottom coordinate to ensure clearance above the floating pill.
- [x] app/(tabs)/analysis.tsx, budgets.tsx, accounts.tsx, categories.tsx — Verify and update paddingBottom on scroll/list containers to 100 so content is not clipped by the floating pill.

**Acceptance Criteria:**
- Given the app is running on Android, when tabs are rendered, then the tab bar is a floating pill detached from the bottom and screen edges with rounded pill corners.
- Given any active tab, when inspected, then its icon and label are both visible and colored primary.
- Given any inactive tab, when inspected, then only its icon is visible, colored  textSecondary.
- Given the user taps an inactive tab, then haptic feedback triggers and the tab navigates correctly.
- Given the Records, Budgets, Accounts, and Categories lists, when scrolled to the very bottom, then the last item is fully visible and not blocked by the tab bar.
- Given 
npx tsc --noEmit is run, then no new TypeScript errors are introduced.

## Design Notes

Section 7.12 of DESIGN.md specifies:
- Dimensions: Horizontal pill, screenWidth - 32dp (horizontal insets 16dp), height 64dp.
- Colors: surfaceElevated background, border outline, active tab icon & label in primary, inactive icon in  textSecondary.
- Labels: labelXS (11sp, weight 600).
- FAB integration: On Records tab, the FAB sits above the tab bar (bottom: insets.bottom + 84px).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no new TypeScript errors
- `npx expo start` -- expected: floating pill bar displays properly in both light and dark modes with proper touch response and content clearance

## Suggested Review Order

**Floating Pill Navigation**

- Entry point: custom floating pill tab bar with pill geometry, dynamic theme surface, active icon+label and inactive icon-only.
  [`floating-tab-bar.tsx:9`](../../components/floating-tab-bar.tsx#L9)

- Tab layout integration replacing default edge-to-edge tab bar with FloatingTabBar.
  [`_layout.tsx:13`](../../app/(tabs)/_layout.tsx#L13)

**Scroll & FAB Clearance Adjustments**

- Records screen list bottom padding and FAB bottom offset so nothing is obscured.
  [`index.tsx:523`](../../app/(tabs)/index.tsx#L523)

- Categories screen grid bottom clearance and FAB adjustment.
  [`categories.tsx:245`](../../app/(tabs)/categories.tsx#L245)

- Analysis, Budgets, and Accounts list padding expansion.
  [`analysis.tsx:240`](../../app/(tabs)/analysis.tsx#L240)

