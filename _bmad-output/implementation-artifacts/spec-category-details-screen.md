---
title: 'Category Details Screen & Log Details Popup'
type: 'feature'
created: '2026-08-31'
status: 'done'
baseline_commit: '803d8e91c3f000ccbb64ce3c50f5073fc3c7eb4a'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users cannot view detailed logs or drill down into specific categories from the Analytics or Budgets tabs. There is no way to view, edit, or delete a specific transaction from these tabs easily.

**Approach:** Implement a Category Details screen that shows a donut chart of expenses, and a chronologically grouped list of transactions (with a "new to old" / "old to new" sort toggle). Tapping a log will open a Log Details Popup showing details (including shared expenses amounts: `rawAmount` and shared portion) with Edit and Delete actions. The note text is intentionally hidden in the list view, but visible in the popup.

## Boundaries & Constraints

**Always:** Hide the `notes` field in the list view of the Category Details screen. Show both total (`rawAmount`) and shared amount difference if `isShared` is true. Ensure the Sort toggle reverses the list of grouped dates.
**Ask First:** If changing existing Database schemas or adding new dependencies.
**Never:** Add a duplicate icon to the Log Details Popup (only Edit, Delete, View).

</frozen-after-approval>

## Code Map

- `app/(tabs)/analysis.tsx` -- Update `catRow` to `TouchableOpacity` routing to category-details.
- `app/(tabs)/budgets.tsx` -- Currently clicking budget opens edit limit modal. Add a drill-down capability (or change primary tap) to navigate to category-details.
- `app/category-details.tsx` -- New screen for category details.
- `components/log-details-modal.tsx` -- New reusable modal for log popup.
- `db/queries/transactions.ts` -- Add/update query to fetch transactions by category and month/year.

## Tasks & Acceptance

**Execution:**
- [ ] `db/queries/transactions.ts` -- Add `getCategoryTransactions(categoryId, year, month)` to return transactions for a category in a specific month.
- [ ] `app/(tabs)/analysis.tsx` -- Change category rows in FlatList to `TouchableOpacity` and call `router.push('/category-details?categoryId=...')`.
- [ ] `app/(tabs)/budgets.tsx` -- Update budget cards routing to allow navigation to `/category-details?categoryId=...`.
- [ ] `components/log-details-modal.tsx` -- Build LogDetailsModal with View, Edit (router.push to `transaction/new`), and Delete (DB query and state refresh).
- [ ] `app/category-details.tsx` -- Build the screen with Donut chart, sorting toggle, and grouped SectionList of transactions.

**Acceptance Criteria:**
- Given I tap a category in Analytics, when the new screen loads, then it shows a pie chart and sorted transactions without notes.
- Given I tap a transaction log, when the popup appears, then it shows Edit/Delete actions and full details including shared amounts if applicable.
- Given I toggle the sort order, when I tap it, then the chronological groups reverse direction.
