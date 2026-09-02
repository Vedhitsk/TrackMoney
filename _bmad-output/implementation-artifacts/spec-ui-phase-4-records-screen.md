---
title: 'UI Phase 4 — Records Screen Redesign'
type: 'feature'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'ad86a92'
context: []
---

# UI Phase 4 — Records Screen Redesign

<frozen-after-approval>
## Description

Revamp the Records (index) screen transaction list items, summary section, and badges according to the design system (DESIGN.md Section 7.1 and related). The goal is to bring the primary feed of transactions up to the polished aesthetic defined by the design tokens and layout conventions.

## ACs

- **Given** the user views the Records screen, **when** transactions are rendered, **then** they should appear as elevated cards (16px radius, surface bg, 1px border) with the category emoji inside a 40x40 circle, replacing the flat list rows.
- **Given** the user looks at a transaction item, **when** evaluating the content, **then** the first row should show the merchant/description (falling back to category name if empty), and the second row should display a pill-shaped category badge (primary text on primaryMuted bg), an account badge (textSecondary on surfaceElevated bg), and the timestamp, replacing the current simple layout.
- **Given** the user interacts with a transaction, **when** tapped, **then** it should navigate to the details screen as before, but the inline delete button must be completely removed (deletion will be handled exclusively in the details view).
- **Given** the user looks at the top of the screen, **when** evaluating the period summary, **then** the summary bar should be styled as a proper elevated summary card rather than a simple border-bottom row.
- **Given** the user scrolls the list, **when** reaching the bottom, **then** there must be adequate padding (`paddingBottom: 100`) so the last item is not hidden behind the floating tab bar.
</frozen-after-approval>

## Code Map

- **`app/(tabs)/index.tsx`**:
  - `renderItem`: Restructure the `txRow` component to match DESIGN.md Section 7.1. Remove `txDeleteBtn`.
  - Transaction item layout:
    - Left: 40x40 circular icon container.
    - Center: 2 rows (Title/Merchant above, badges + timestamp below).
    - Right: Amount `fontVariant: ['tabular-nums']`.
  - Summary Bar: Update `summaryBar` to be an elevated card (`surface` bg, `lg` radius, `elevation: 2`) instead of a flat border-bottom row.

- **`components/themed-text.tsx`** or **inline styles**: Ensure amounts use `tabular-nums` per `DESIGN.md`.

## Tasks

- [x] 1. Update `app/(tabs)/index.tsx` to remove the inline delete button from `renderItem`.
- [x] 2. Refactor the `renderItem` component in `app/(tabs)/index.tsx` to use the card-based layout from Section 7.1 (elevated surface container, circular icon background, merchant/title row, badges row, amount block).
- [x] 3. Implement a pill badge component/style for the category (primary text on primaryMuted) and account (textSecondary on surfaceElevated).
- [x] 4. Update the summary bar in `app/(tabs)/index.tsx` to render as a distinct card with `lg` radius and subtle elevation instead of a flat row.
- [x] 5. Apply tabular numbers (`fontVariant: ['tabular-nums']`) to all currency amounts rendered in these elements.

## Dependencies

None.

## Verification

**Commands:**
- `npx tsc --noEmit`

**Manual checks (if no CLI):**
- Verify transaction list items are elevated cards with correct spacing.
- Verify the delete icon is gone from the list.
- Verify amounts align correctly using tabular numbers.

## Review Prompts

None.
