- source_spec: none
  summary: Implement a robust Dark Mode toggling feature and fix global theming issues.
  evidence: This is a cross-cutting architecture change that was split from the Category Details screen feature to maintain single-goal scope.

- source_spec: `_bmad-output/implementation-artifacts/spec-ui-phase-1-token-refresh.md`
  summary: Migrate log-details-modal.tsx from static AppColors to useAppTheme() so income/expense header colors respect the active theme.
  evidence: AppColors is permanently pinned to LightColors; dark-mode users see light-palette green (#059669) as income header instead of designed teal (#00E5A0). Deferred by spec design — AppColors alias was intentionally preserved in Phase 1.

- source_spec: `_bmad-output/implementation-artifacts/spec-ui-phase-1-token-refresh.md`
  summary: Review textMuted contrast ratios (#CBD5E1 light, #4A4A55 dark) and constrain usage to placeholder/disabled states only.
  evidence: LightColors.textMuted on surface #FFFFFF is ~1.5:1 contrast — fails WCAG AA. Acceptable only for non-readable decorative or disabled text; token name doesn't communicate this constraint.

- source_spec: `_bmad-output/implementation-artifacts/spec-ui-phase-1-token-refresh.md`
  summary: Add success/successMuted and info/infoMuted semantic tokens to the design system palette in a future phase.
  evidence: App shows transaction confirmations, SMS parse results, and budget status; hardcoded ad-hoc colors are likely without planned token slots.

- source_spec: `_bmad-output/implementation-artifacts/spec-ui-phase-1-token-refresh.md`
  summary: Replace hardcoded rgba(0,0,0,0.6) overlay in log-details-modal.tsx with theme.overlay token.
  evidence: New overlay token is defined but unused; the modal hardcodes the dark-mode overlay value as a literal string, bypassing the design system.
