---
name: TrackMoney
description: A gradient-pill money tracker — soft violet chrome, vivid category colour, and numbers that never have to compete for attention.
status: draft
updated: 2026-09-05
colors:
  # ---- brand ramps · the primary material -------------------------------
  primary-from: '#3C3596'
  primary-mid: '#5A47D6'
  primary-to: '#7B62F7'
  primary-on: '#FFFFFF'
  primary-text: '#4A38C4'
  primary-text-dark: '#9E8BFA'

  secondary-from: '#5B8CFF'
  secondary-mid: '#4066FA'
  secondary-to: '#3448EE'
  secondary-on: '#FFFFFF'

  neutral-dark-from: '#4A4270'
  neutral-dark-mid: '#2A2545'
  neutral-dark-to: '#191529'
  neutral-dark-on: '#FFFFFF'

  neutral-light-from: '#FFFFFF'
  neutral-light-mid: '#F7F5FE'
  neutral-light-to: '#EDEAFA'
  neutral-light-on: '#2E2A45'

  # ---- surfaces & text · light ------------------------------------------
  background: '#F1F2F9'
  surface: '#FFFFFF'
  surface-elevated: '#FFFFFF'
  border: '#E2E4EE'
  border-light: '#EDEEF5'
  track: '#E6E8F2'
  text: '#14152A'
  text-secondary: '#565A72'
  text-tertiary: '#686D83'

  # ---- surfaces & text · dark -------------------------------------------
  background-dark: '#07070D'
  surface-dark: '#1C1C27'
  surface-elevated-dark: '#2A2A37'
  border-dark: '#343445'
  border-light-dark: '#262633'
  track-dark: '#24242F'
  text-dark: '#F1F1F7'
  text-secondary-dark: '#ADAFC2'
  text-tertiary-dark: '#8B8FA6'

  # ---- semantic ----------------------------------------------------------
  income: '#0A6B3E'
  income-dark: '#34D399'
  expense: '#CE3B49'
  expense-dark: '#FB7185'

  # ---- category palette · light -----------------------------------------
  cat-coral: '#E85D3C'
  cat-amber: '#C87F06'
  cat-lime: '#7E9418'
  cat-emerald: '#12A05E'
  cat-teal: '#0D9E96'
  cat-cyan: '#0E7F9E'
  cat-fuchsia: '#C43CA8'
  cat-rose: '#E03A67'
  cat-mocha: '#9C6A4E'
  cat-slate: '#6E7787'

  # ---- category palette · dark ------------------------------------------
  cat-coral-dark: '#FF7043'
  cat-amber-dark: '#FFB020'
  cat-lime-dark: '#C6D93B'
  cat-emerald-dark: '#2FD37A'
  cat-teal-dark: '#14C8C0'
  cat-cyan-dark: '#38C4E8'
  cat-fuchsia-dark: '#E85BD0'
  cat-rose-dark: '#FF5C8A'
  cat-mocha-dark: '#B98060'
  cat-slate-dark: '#8A93A5'

typography:
  hero:
    fontSize: '34px'
    fontWeight: 700
    letterSpacing: '-0.6px'
  amount-display:
    fontSize: '44px'
    fontWeight: 700
    letterSpacing: '-1px'
    note: 'Shrinks to fit one line. Never wraps, never truncates.'
  title:
    fontSize: '20px'
    fontWeight: 700
    letterSpacing: '-0.3px'
  subtitle:
    fontSize: '16px'
    fontWeight: 600
  body:
    fontSize: '15px'
    fontWeight: 400
  body-semibold:
    fontSize: '15px'
    fontWeight: 600
  caption:
    fontSize: '13px'
    fontWeight: 500
  label:
    fontSize: '11px'
    fontWeight: 700
    letterSpacing: '0.8px'
    note: 'Uppercase. ACCOUNT · CATEGORY · NET CASH FLOW'
  numeric:
    fontWeight: 700
    note: 'Tabular figures wherever amounts stack in a column.'

rounded:
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  xxl: '24px'
  full: '9999px'

spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '8': '32px'
  gutter: '16px'
  card-padding: '16px'
  sheet-padding: '20px'

components:
  button-primary:
    background: 'linear-gradient(120deg, {colors.primary-from} 0%, {colors.primary-mid} 52%, {colors.primary-to} 100%)'
    color: '{colors.primary-on}'
    radius: 'height ÷ 2'
    bloom: 'blur 11px · opacity 0.22'
    shadow: '0 6px 16px rgba(90,71,214,0.16), 0 2px 5px rgba(90,71,214,0.10)'
    sheen: 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent 55%)'
    height: '52px'
  button-secondary:
    background: 'linear-gradient(120deg, {colors.secondary-from} 0%, {colors.secondary-mid} 52%, {colors.secondary-to} 100%)'
    color: '{colors.secondary-on}'
    radius: 'height ÷ 2'
    bloom: 'blur 9px · opacity 0.20'
    height: '42px'
  button-neutral:
    background: '{colors.neutral-dark-from} → {colors.neutral-dark-to} on light; {colors.neutral-light-from} → {colors.neutral-light-to} on dark'
    radius: 'height ÷ 2'
  button-disabled:
    background: '{colors.track}'
    color: '{colors.text-tertiary}'
    bloom: 'none'
    shadow: 'none'
  fab:
    size: '56px'
    radius: '{rounded.full}'
    background: '{components.button-primary.background}'
    bloom: 'blur 12px · opacity 0.28'
    overlap: '-26px into the tab bar'
  field-card:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.md}'
    height: '52px'
    label: '{typography.label}'
    placeholder-color: '{colors.text-tertiary}'
  picker-sheet:
    background: '{colors.surface-elevated}'
    radius: '{rounded.xxl} top corners only'
    max-height: '70vh'
    scrim: 'rgba(7,7,13,0.45)'
  glass-scrim:
    blur: '20px'
    tint-light: 'rgba(241,242,249,0.72)'
    tint-dark: 'rgba(7,7,13,0.72)'
    fallback: 'solid {colors.background}'
  keypad-key:
    background: '{colors.surface}'
    radius: '{rounded.md}'
    aspect: '2.6'
  grab-bar:
    width: '40px'
    height: '4px'
    radius: '{rounded.full}'
    color: '{colors.border}'
    hit-area: '44pt tall'
---

# TrackMoney — Design Spine

Owns how it looks. `EXPERIENCE.md` owns how it works. Where a mock, a wireframe or an import
disagrees with this document, this document wins.

## Brand & Style

TrackMoney is a private ledger, not a bank app. It is used one-handed, often at a table, often at
night, and almost always for ten seconds at a time. The aesthetic follows from that: soft where it
is chrome, hard where it is data.

The chrome is a family of **gradient pills** — fully rounded, filled with a short diagonal ramp,
carrying a faint same-hue bloom. They are friendly and slightly luminous, and they are the only
place in the app where anything glows. Everything else is flat: cards are flat, rows are flat,
charts are flat. That contrast is the whole idea. If a control glows, it does something.

Amounts are the highest-value content on every surface. Nothing animates them, nothing tints them
except income and expense, and nothing is allowed to sit above them in the visual hierarchy.

## Colors

**The two-system rule.** Brand colour and category colour are separate systems and must never
overlap. The brand ramps are chrome only — FAB, primary and secondary buttons, the active segment,
active tab labels. Category colour appears only in charts, legends, icon tiles and progress bars.
The shipped build breaks this: violet `#7C3AED` is simultaneously the FAB and the largest donut
slice, which is why the FAB reads as a data point. Every category hue here is at least ΔE 45 from
both brand ramps in CIE Lab; the closest is Fuchsia at ΔE 45 from primary.

**Primary — `{colors.primary-from}` → `{colors.primary-mid}` → `{colors.primary-to}`.** Indigo into
violet. This keeps the identity the app already has, so the icon, splash and existing screenshots
stay correct. It carries the FAB, the Save action, the active type segment, and sheet confirms.

**Secondary — `{colors.secondary-from}` → `{colors.secondary-mid}` → `{colors.secondary-to}`.** Blue.
Additive actions that create something rather than commit something: New account, New category, Add
budget. It is deliberately a step cooler and lighter in weight than primary, so a screen holding
both never reads as two competing calls to action.

**Dark and Light pills.** The neutral members of the family. `{colors.neutral-dark-*}` carries
neutral actions on the light theme; `{colors.neutral-light-*}` carries the same actions on dark.
They are the only pills that are not a brand hue, and they exist so that a secondary action never
has to be a bare outline.

**Income `{colors.income}` and expense `{colors.expense}`** are semantic and appear nowhere else. A
category may be green; that green is `{colors.cat-emerald}`, not `{colors.income}`, and it never
appears on an amount.

**Text tertiary is not decoration.** `{colors.text-tertiary}` carries placeholders — "Account",
"Category", "Add a note" — which are instructions, not hints. It is set at 5.12:1 on
`{colors.surface}` and 4.58:1 on `{colors.background}`. The shipped build's equivalent sits at
2.55:1, which is why those placeholders are hard to read today.

Every value above was computed, not sampled. Full results in
`.working/primary-material-3.html`.

## Typography

One family, the platform system font, across both platforms. The ramp is short on purpose — six
roles do all the work.

`{typography.amount-display}` is the only role above 34px and belongs to the Add Transaction
readout alone. It shrinks to fit a single line rather than wrapping, because an amount that breaks
across two lines is an amount that can be misread.

`{typography.label}` is the uppercase micro-label: ACCOUNT, CATEGORY, NET CASH FLOW · SEPTEMBER. It
always sits above the thing it names, never beside it, and always in `{colors.text-secondary}`.

Amounts use tabular figures wherever they stack in a column — the Activity ledger, budget rows,
the donut legend — so decimal points align down the page.

## Layout & Spacing

A 4px base. `{spacing.gutter}` is the screen margin on every surface and does not change between
tabs. Cards are padded `{spacing.card-padding}`; sheets `{spacing.sheet-padding}`, which is one step
more because a sheet is closer to the eye.

Vertical rhythm between sections is `{spacing.4}`; between a label and the thing it labels,
`{spacing.1}`. Two cards side by side are separated by `{spacing.3}` and always share a width.

**Full-bleed is the default.** No scrolling surface has horizontal or vertical insets of its own —
padding belongs to the content container. This is a layout rule with teeth: it is what stops
content ending in a dead band above the tab bar. See `EXPERIENCE.md` § Chrome & Scroll Contract.

## Elevation & Depth

Three levels, and only three.

| Level | Light | Dark | Used by |
|---|---|---|---|
| Ground | `{colors.background}` | `{colors.background-dark}` | Screen |
| Raised | `{colors.surface}` + 1px `{colors.border}` | `{colors.surface-dark}` | Cards, rows, keypad keys |
| Near | `{colors.surface-elevated}` + shadow | `{colors.surface-elevated-dark}` | Sheets, modals |

Dark mode carries elevation tonally rather than with shadow: ΔL\* 8.69 from ground to raised, then
6.84 from raised to near. Both sit inside the 6–9 target, and both are roughly double the shipped
build's 4.83 and 3.56 — which is why the current dark screens read flat.

**A note on the metric.** Surface separation is measured in perceptual L\*, not WCAG contrast ratio.
At near-black the +0.05 flare term in the ratio formula dominates, so any two dark greys score about
1.1:1 no matter how different they look. Contrast ratio governs text; L\* governs surfaces.

Light mode separates ground from raised by only ΔL\* 4.40, which is deliberate — the 1px
`{colors.border}` at ΔL\* 9.30 carries the card edge instead, and a heavier tonal step would make
the screen feel grey.

**The bloom is not elevation.** It is the primary material's own light and belongs to brand pills
alone. A card never blooms. A disabled control never blooms.

## Shapes

`{rounded.full}` for every pill — the radius is always half the height, at every size, so a 42px
secondary button and a 52px CTA are the same shape at different scales.

`{rounded.md}` for field cards and keypad keys, `{rounded.lg}` for cards, `{rounded.xxl}` for the
top corners of sheets. Sheets round only at the top; the bottom runs off the screen.

The logic: **containers are gently rounded, controls are fully rounded.** Nothing in the app is a
squircle or a half-measure between the two, because a shape language with three answers reads as
an accident.

## Components

**Primary button.** Gradient at 120°, radius half the height, white label at
`{typography.body-semibold}`. The bloom is a blurred copy of the pill behind it at
`blur 11px · opacity 0.22`, plus two drop shadows in the ramp's mid hue. A faint sheen over the top
55% at 6% white. Pressed: `saturate(1.06) brightness(0.93)`, bloom to `blur 7px · opacity 0.14`,
`translateY(1px) scale(0.988)`.

**Secondary button.** Same construction, blue ramp, 42px tall, bloom one step lighter.

**Disabled.** Flat `{colors.track}` with `{colors.text-tertiary}` text. No gradient, no bloom, no
shadow. A disabled control must never glow — that is the single clearest signal in the system.

**FAB.** 56px, full radius, primary ramp, overlapping the tab bar by 26px. Bloom
`blur 12px · opacity 0.28` — the strongest in the app, because it is the only control that floats
over content.

**Field card** (Account, Category). 52px tall, `{colors.surface}` with a 1px `{colors.border}`,
`{rounded.md}`. `{typography.label}` above it. Inside: category or account icon, the value at
`{typography.body-semibold}`, a chevron in `{colors.text-tertiary}` at the trailing edge. Unset, the
value slot shows the field's own name in `{colors.text-tertiary}`. Two field cards share a row and
always share a width.

**Picker sheet.** `{colors.surface-elevated}`, top corners `{rounded.xxl}`, scrim
`rgba(7,7,13,0.45)`. Height hugs content to a 70vh cap, then scrolls. Grab bar centred at the top.
The create button is pinned below the list, outside the scroll, and carries the secondary ramp.

**Glass scrim.** 20px blur, tinted 72% toward `{colors.background}`. Top band is `insets.top` tall;
bottom band is the tab bar. Where blur is unavailable it degrades to a solid
`{colors.background}` band — never to transparent.

> **As shipped:** the degraded form. `expo-blur` could not be installed in the build environment,
> so the band is the tint alone. The spec above is unchanged and remains the target; see
> `EXPERIENCE.md` § Responsive & Platform for the one-component restore.

**Keypad key.** `{colors.surface}`, `{rounded.md}`, aspect 2.6. Flat. The keypad is furniture, not
chrome, and carries no gradient.

**Grab bar.** 40×4px, `{rounded.full}`, `{colors.border}`. Drawn small, targeted large — 44pt of
vertical hit area.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Let one control on a screen carry the primary ramp. | Put two primary pills on the same screen. |
| Keep brand hues out of the category palette. | Reuse `{colors.primary-mid}` as a category colour — that is the bug this revision fixes. |
| Reserve the bloom for brand pills. | Add a glow to cards, sheets, chips or disabled controls. |
| Measure surface separation in L\*. | Quote a WCAG ratio between two dark greys and conclude anything from it. |
| Pair every category colour with an icon and a name. | Rely on colour alone to identify a category. |
| Let amounts sit still. | Animate a number counting up. |
| Round controls fully and containers gently. | Introduce a third radius philosophy. |
| Degrade blur to a solid band. | Ship a transparent scrim when blur is unavailable — content will collide with the clock. |
| Use `{colors.income}` and `{colors.expense}` on amounts only. | Tint a category, chip or icon with a semantic colour. |

---

**Open — confirm before final.** The role mapping was recommended, not chosen: this document assumes
**violet-led** (primary = indigo→violet, secondary = blue). The alternative is blue-led, which would
also require revisiting the app icon and splash. See `.working/primary-material-3.html` § Mapping.
