# Agent Skills

*This document tracks custom skills, workflows, and tools that agents should leverage.*

- **BMad Method:** BMad workflows (e.g., `bmad-build`, `bmad-spec`, `bmad-project-context`) are the primary driver for all actions and must be followed.
- **Design system:** UI work should draw from the token system in `constants/theme.ts` (colors, `Spacing`, `Radius`, `Typography`, `IconPalette`) and the shared component library in `components/ui/*` rather than hand-rolling new one-off styles — see the "UI/UX Redesign" section of `context.md` for what exists and why.
- **Alerts:** Use `showAppAlert()` from `store/useAlertStore.ts` (same signature as React Native's `Alert.alert`) instead of the native `Alert.alert` — the app has a custom-styled dialog, not the OS default.
