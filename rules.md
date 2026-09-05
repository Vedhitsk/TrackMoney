# Global Rules

1. Every prompt, chat, and output must originate from or follow BMad workflows.
2. Read `memory.md` at the beginning of any new conversation to acquire prior context.
3. Keep `memory.md` updated as technical decisions are made, or when chats get long to maintain continuity.
4. Follow the architecture and intent outlined in `spec.md`.
5. Utilize the capabilities defined in `skills.md`.
6. **Styling & Theme:** Never hardcode hex colors. Always source color from `useAppTheme()`. Two accepted patterns:
   - Full-screen components: `const theme = useAppTheme(); const styles = getStyles(theme);` with `const getStyles = (theme: ThemeColors) => StyleSheet.create({...})`.
   - Shared `components/ui/*` primitives: a static `StyleSheet.create({...})` for structural properties (padding, radius, layout) plus inline `[styles.x, { color: theme.y }]` overrides for colors, with `useAppTheme()` called inside the component body.
7. **Reuse before building:** Before hand-rolling a new UI element, check `components/ui/*` (Card, SegmentedControl, Chip, ProgressBar, Badge, CountBadge, ListRow, IconTile, AmountText, SectionLabel, InsightCard, DonutLegend, CashFlowLineChart, BarChart) — the app has a real shared component library now, don't regress to per-screen one-off styles.
8. **Single accent token:** The whole app's brand color is `theme.primary` (currently a rich violet-purple, `constants/theme.ts`). Never hardcode an accent color anywhere — change it once in `constants/theme.ts` and it propagates everywhere (FAB, buttons, active chart accents, hero cards).
