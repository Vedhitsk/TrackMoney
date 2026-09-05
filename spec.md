# Project Specification

## TrackMoney
An Expo React Native mobile application.

### Tech Stack
- Frontend: Expo / React Native
- Language: TypeScript
- Database: SQLite
- ORM: Drizzle ORM
- State Management: Zustand
- Navigation: Expo Router / React Navigation
- Theme: Dynamic System/Light/Dark mode using React Navigation ThemeProvider and custom hooks.

### Information Architecture (post 2026-09 redesign)
4 bottom tabs + a floating center FAB (the FAB is an action — opens Add Transaction — not a 5th route):
- **Home** — dashboard (net cash flow, chart, spending breakdown)
- **Activity** — transaction feed (search, type filters, per-date totals)
- **Insights** — Analysis + Budgets merged behind a segmented control
- **Manage** — menu → Accounts / Categories / Pending Review / Settings

### Design System
- Tokens in `constants/theme.ts`: `LightColors`/`DarkColors` (single brand accent = `theme.primary`, a rich violet-purple), `Spacing`, `Radius`, `Typography`, `IconPalette`.
- Shared component library in `components/ui/*` (Card, SegmentedControl, Chip, ProgressBar, Badge, CountBadge, ListRow, IconTile, AmountText, SectionLabel, InsightCard, DonutLegend, CashFlowLineChart, BarChart) — prefer these over new one-off styles.
- App-styled alert dialog (`components/app-alert.tsx` / `showAppAlert()`) replaces the native `Alert.alert` everywhere.

Full rationale and file-by-file detail: see the "UI/UX Redesign" section of `context.md` and section 6 of `memory.md`.

*(Detailed specifications and feature plans should be added here as work progresses.)*
