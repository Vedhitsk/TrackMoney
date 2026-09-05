---
name: TrackMoney
status: draft
sources:
  - planning_artifacts/architecture/architecture-TrackMoney-2026-08-30/ARCHITECTURE-SPINE.md
updated: 2026-09-05
---

# TrackMoney — Experience Spine

Owns how it works. `DESIGN.md` owns how it looks; tokens are referenced here by name as
`{path.to.token}`. Where a mock, a wireframe or an import disagrees with this document, this
document wins.

## Foundation

Single-surface mobile. Expo SDK 54 / React Native 0.81, expo-router, new architecture enabled,
React Compiler on. Android is the primary target — SMS ingestion is Android-only and
`edgeToEdgeEnabled` is `true`, so **the app already draws underneath the system bars**. Every
safe-area rule below exists because of that flag.

No UI system named. The app inherits platform navigation and system gestures, and supplies its own
component layer under `components/ui/`. Light and dark are peers: `userInterfaceStyle` is
`automatic`, so neither mode is "the default" and every rule here must hold in both.

Currency is INR throughout. Amounts are the highest-value content on every surface — when
something has to give, it is never the number.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Home | App open, tab 1 | Net cash flow for the period, trend, in/out, spending breakdown |
| Activity | Tab 2 | The transaction ledger, filterable |
| Insights | Tab 3 | Analysis and Budgets, as two panes of one surface |
| Manage | Tab 4 | Accounts, categories, recoveries, settings |
| Add Transaction | FAB, from any tab | Create one transaction. Modal, one level deep |
| Account picker | Add Transaction → Account field | Choose an account, or create one |
| Category picker | Add Transaction → Category field | Choose a category, or create one |
| Transaction detail | Activity row tap | Read / edit one transaction |
| Pending review | Home insight card | Triage SMS-ingested transactions |

Four-tab bar with the FAB floating between Activity and Insights. The FAB is an action, not a fifth
route. Modals stack **one level deep, never two** — the account and category pickers are sheets
presented over the Add Transaction modal, and nothing may be presented over them.

## Chrome & Scroll Contract

Product-specific, and the origin of two of the four defects this revision exists to fix. Because
`edgeToEdgeEnabled` is on, content and system bars share the same coordinate space; every scrolling
surface must therefore obey all four rules below.

| # | Rule |
|---|---|
| C1 | **Content scrolls under the chrome, never beside it.** A scroll view is always full-bleed — top inset 0, bottom inset 0. Padding is applied to the *content container*, never to a parent that clips the scroll view's own edges. |
| C2 | **The status bar always sits on a scrim.** A blurred band the height of `insets.top` is layered above the scroll view. Content passes beneath it, faintly ghosted — never hard-clipped, never colliding with the clock. |
| C3 | **The tab bar always sits on the same scrim.** Symmetric with C2. Content passes beneath it too, and the scroll content container carries `paddingBottom = tabBarHeight + insets.bottom`, so the last card can always be scrolled clear of the glass. |
| C4 | **Nothing between the last card and the chrome.** There is no gap, no dead band, and no border. If a surface looks like it ends before the tab bar, a parent has bottom padding it should not have. |

**The two live violations.**

`app/(tabs)/insights.tsx:549` — the container that wraps the scroll view carries
`flex: 1, paddingTop: 56, paddingBottom: Spacing.lg`. The bottom padding is the dead band in
`imports/analytics_footer.jpg`: the scroll view's own edge stops 16px short, and the tab bar sits
below that, so the Food & Dining card is clipped early against nothing. The hardcoded `paddingTop: 56`
is the same bug at the other end — it ignores `insets.top` entirely and happens to look right only on
the device it was tuned on. Both move to the content container, and the top becomes `insets.top`.

`app/(tabs)/index.tsx:347` — `donutCard` carries `flex: 1` inside a `flexGrow: 1` content container.
That pins the card to the remaining viewport height instead of letting it size to its content, so
Home cannot grow past one screen and the legend scrolls inside the card rather than the page
scrolling. The card sizes to content; the page scrolls.

## Keyboard & Keypad Contract

Also product-specific. Add Transaction is the only surface carrying two input devices at once — the
app's own numeric keypad and the system keyboard — and the current behaviour of lifting the whole
screen is the fourth defect.

| # | Rule |
|---|---|
| K1 | **The keypad is furniture.** It is anchored to the bottom of the screen and never moves, never animates, and never unmounts, whatever has focus. |
| K2 | **The keyboard rises over the keypad.** It is not pushed by it and does not push it. The keypad is simply occluded while the keyboard is up, and revealed again when it dismisses. |
| K3 | **The amount never leaves the screen.** The amount readout and the type segment are outside the scroll region. They are the anchor the user is editing against. |
| K4 | **Only the list scrolls.** If the keyboard would cover the focused row, the scrollable middle region — and only that region — scrolls the minimum distance to clear it. Nothing else on the screen translates. |
| K5 | **You can always see what you are typing.** K4's "minimum distance" is measured to put the focused row fully above the keyboard with one row of breathing space, not to put it flush against the keyboard's edge. |

The cause of today's behaviour is that the entire form — segment, amount, pickers, list — sits
inside one `ScrollView` wrapped in a `KeyboardAvoidingView` with `behavior="height"`. That
combination resizes the whole screen, and because the keypad is a sibling inside the same avoiding
view, it rides up with everything else. The fix is structural, not a tuning of offsets: the screen
becomes three fixed bands — header, scrollable middle, anchored footer — and only the middle band
responds to the keyboard.

## Voice and Tone

Microcopy. Brand voice lives in `DESIGN.md.Brand & Style`.

| Do | Don't |
|---|---|
| "Enter an amount" | "Please enter a valid amount!" |
| "Select account & category" | "Missing required fields" |
| "No budgets set for September" | "Nothing here yet 🎉" |
| "1 transaction needs review" | "You have 1 pending item!" |
| "New category" | "+ Add New Category" |
| Name the missing thing, so the button is the instruction. | Exclamation marks, emoji in system copy, encouragement. |

Category and account names are user content and are never rewritten, sentence-cased or truncated
mid-word — they truncate with an ellipsis at the glyph boundary.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Glass scrim | Top and bottom of every tab surface | Blurred band over `insets.top` / tab bar. Non-interactive; touches pass through the top band. Renders in both modes. |
| Tab bar | All four tabs | Four tabs plus a floating FAB in the centre slot. FAB opens Add Transaction; it is not a route and never shows a selected state. |
| Grab bar | Add Transaction header | Drag-only dismiss. See Interaction Primitives. |
| Field card | Add Transaction, Account and Category | Micro-label above, icon + value + chevron inside. Empty state shows the field's own name as placeholder in `{colors.textTertiary}`. Tap opens the matching sheet. |
| Picker sheet | Account, Category | Auto-height, hugging content, capped at 70% of screen; scrolls past the cap. Create button pinned below the list, outside the scroll. Selecting a row closes the sheet immediately — there is no confirm step. |
| Search field | Category sheet only | Filters the list as you type. Never filters away the create button. |
| Numeric keypad | Add Transaction | Anchored footer. Digits, decimal, backspace; long-press backspace clears. Never scrolls. |
| Amount readout | Add Transaction | Fixed above the scroll region. Shrinks to fit on one line; never wraps, never truncates. |
| Segmented control | Type, period, Insights panes | Active segment carries the primary material. Changing type re-derives which fields are shown, and clears fields that no longer apply. |
| Chip row | Legacy pickers elsewhere | Single-row horizontal scroller, never wraps. |
| Insight card | Home, Insights | One action, stated as a verb. Tapping the card and tapping the action do the same thing. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Unset account | Add Transaction | Placeholder "Account" in `{colors.textTertiary}`. **No default selection** — the first account is not auto-picked. The placeholder is chrome and never appears as a row in the sheet. |
| Unset category | Add Transaction | Placeholder "Category", same rule. |
| No accounts at all | Account sheet | "No accounts yet." above the create button. The create button is the only action. |
| No categories at all | Category sheet | "No categories yet." Search field hidden until there are rows to search. |
| Search no match | Category sheet | "No categories match." Create button stays, pre-filled with the search text. |
| Amount is zero | Add Transaction | Action button reads "Enter an amount", disabled, no gradient and no bloom. |
| Amount set, fields missing | Add Transaction | Action button names what is missing: "Select account & category" / "Select both accounts" / "Select a recovery". |
| Saveable | Add Transaction | Action button reads "Save", enabled, carries the primary material. |
| Empty period | Home | Hero shows ₹0.00; the chart renders its baseline rather than disappearing. Donut card is omitted, not shown empty. |
| Balance hidden | Home | Hero masked as `•••••`. Re-hides on blur and on backgrounding. |
| Pending transactions | Home | Insight card above the donut. Absent when the count is zero. |
| Loading budgets | Insights | Spinner in place of the list. Header, month nav and footer stay put. |
| Save failed | Add Transaction | Alert. The form keeps every value; nothing is cleared. |

## Interaction Primitives

- **Tap to act.** Long-press is reserved for the keypad's backspace-to-clear and for system text
  selection. Nothing else uses it.
- **The grab bar is the back button.** Add Transaction has no other dismiss affordance. The bar
  tracks the finger 1:1 downward and rubber-bands upward. Release past 120px, or with velocity over
  0.8, dismisses; anything shorter springs back. **A tap on it does nothing** — the screen holds an
  amount the user has typed, and a tap is too easy to fire by accident. Hit area is 44pt tall
  regardless of the bar's drawn size.
- **Sheets dismiss the same way:** drag down, or tap the scrim behind them.
- **Selecting closes.** Picking an account or a category dismisses its sheet immediately.
- Horizontal scrollers never paginate or snap.
- **Banned:** carousels, pull-to-refresh on Home, swipe-between-tabs, badge counts on the tab bar,
  any gesture that dismisses Add Transaction without the user's hand on the grab bar.

## Motion

The brief asked for optimised animation, and the constraint is specific: everything below must run
on the UI thread, because the one screen with the most motion is also the one doing arithmetic on
every keystroke.

| Motion | Spec |
|---|---|
| Grab-bar drag | Gesture Handler + Reanimated worklet. Never `PanResponder` + `Animated` — that runs the drag on the JS thread and drops frames while the keypad re-renders. `react-native-reanimated@4.1.1` and `react-native-gesture-handler@2.28` are already installed. |
| Dismiss | 220ms ease-out translate to screen height. Spring back uses `withSpring`, damping 18, stiffness 220. |
| Sheet present | 260ms ease-out from the bottom edge; scrim fades 0 → 0.45 over the same curve. |
| Sheet dismiss | 200ms — faster out than in, always. |
| Button press | 120ms in, 180ms out. Scale 0.988, translateY 1px, bloom tightens. |
| FAB press | Same curve; the FAB additionally dips 4px rather than scaling alone. |
| Segment change | The active pill slides between positions in 180ms; it does not cross-fade. |
| Value changes | Amounts and percentages never animate. A number that counts up is a number you cannot read. |
| Reduce Motion | Drag still tracks the finger — it is direct manipulation, not decoration. Sheet and dismiss transitions become instant. Press states become opacity-only. |

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md`.

- TalkBack / VoiceOver: every control labelled with role and state. The field cards announce
  "Account, Card, button" when set and "Account, not selected, button" when empty.
- The grab bar is exposed as a button labelled "Close" with a dismiss action, so the drag gesture is
  never the only way out for a screen-reader user.
- Tap targets ≥ 48dp Android / 44pt iOS. The keypad's keys already exceed this; the grab bar and
  the sheet rows must be brought up to it.
- Dynamic type honoured through `DESIGN.md` typography tokens. The amount readout shrinks to fit;
  every other control grows and reflows rather than truncating.
- The blurred scrims are decorative and excluded from the accessibility tree.
- Focus order follows reading order: type → amount → account → category → date → time → note →
  shared → save.
- Colour is never the only carrier. Income and expense are distinguished by sign and position as
  well as hue; category identity always pairs its colour with an icon and a name.

## Responsive & Platform

| Concern | Android | iOS |
|---|---|---|
| Keyboard | `softwareKeyboardLayoutMode` must not resize the window under the anchored keypad; the middle band listens to keyboard height directly. | `KeyboardAvoidingView` is not used on this screen either — same three-band structure, same listener. |
| Blur | **Shipped in its degraded form.** `expo-blur` could not be installed (npm `ECONNRESET`), so `components/glass-scrim.tsx` renders the solid tinted band instead — the fallback this spine already required. Content no longer collides with the clock, which is the property that matters; the ghosting is what is missing. To restore: `npx expo install expo-blur`, then add a `BlurView` beneath the tint View in that one component (`experimentalBlurMethod="dimezisBlurView"` on Android). Nothing else changes. |
| Gradients | `expo-linear-gradient` could not be installed either. The ramp is drawn with `react-native-svg`, already a dependency and already used by the donut chart, so the material ships in full. Swapping to `expo-linear-gradient` later touches `gradient-button.tsx` alone. |
| Coloured shadow | Not supported below API 28. The primary material's bloom degrades to an absolutely-positioned gradient halo behind the control. | Native `shadowColor` carries the bloom directly. |
| Back gesture | `predictiveBackGestureEnabled` is `false`; system back closes Add Transaction, matching the grab bar. | Edge-swipe is disabled on Add Transaction — the grab bar is the only gesture. |
| Tablet | `supportsTablet` is true but no tablet layout is specified. Out of scope for this revision. |

## Key Flows

> The protagonist below is illustrative — `[ASSUMPTION]`, to be replaced with a real session once
> confirmed. The mechanics are not assumed; each flow traces a defect this revision fixes.

### Flow 1 — Log a shared dinner (Priya, at the table, phone in one hand)

1. Priya taps the FAB from Home. Add Transaction rises from the bottom.
2. The type segment reads Expense. The amount reads ₹0. **Account and Category are both empty**, showing their own names as placeholders — nothing has been guessed on her behalf.
3. She taps the keypad: 1, 2, 4, 0. The amount reads ₹1240 as she goes.
4. She taps the Account field. A sheet rises with her four accounts and a create button pinned below them.
5. She taps Card. The sheet closes on the tap.
6. She taps the Category field. A sheet rises with a search field, her categories, and "New category" pinned below.
7. She taps Food & Dining. The sheet closes.
8. She taps "Add a note". The system keyboard rises **over** the keypad; the amount stays visible above; the details list scrolls up just enough to lift the Note row clear of the keyboard.
9. She types "Dinner with Sam", dismisses the keyboard. The keypad is revealed again, unmoved.
10. She ticks Shared expense and enters her half.
11. **Climax:** the action button, which has been telling her what was missing at every step, now reads Save and carries the gradient. One tap and she is back on Home with the number already changed.

Failure: save throws → alert, and every field she entered is still there.

### Flow 2 — Reading the month (Priya, Sunday morning, scrolling)

1. She opens Insights.
2. The Analysis pane fills the screen edge to edge — the header sits on the blurred top scrim, the content runs under the blurred tab bar.
3. She scrolls. Cards pass beneath the tab bar, ghosted through the glass, rather than stopping short of it.
4. She reaches Category Movement and keeps going.
5. **Climax:** the last card scrolls fully clear of the tab bar and stops there. Nothing was hidden behind the footer, and there was never a strip of dead background between the content and the tabs.

### Flow 3 — Abandoning an entry (Priya, interrupted)

1. She has typed ₹450 into Add Transaction and picked nothing else.
2. She puts her thumb on the grab bar and pulls down 40px. The screen follows her finger exactly.
3. She changes her mind and lifts. It springs back.
4. She pulls again, further this time, and flicks.
5. **Climax:** the screen leaves in 220ms and she is on Home. She never had to hunt for a close button, and no accidental tap could have thrown the entry away.
