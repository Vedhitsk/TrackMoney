# Global Rules

1. Every prompt, chat, and output must originate from or follow BMad workflows.
2. Read `memory.md` at the beginning of any new conversation to acquire prior context.
3. Keep `memory.md` updated as technical decisions are made, or when chats get long to maintain continuity.
4. Follow the architecture and intent outlined in `spec.md`.
5. Utilize the capabilities defined in `skills.md`.
6. **Styling & Theme:** Never hardcode hex colors or static `StyleSheet.create`. Always inject the dynamic theme via `const theme = useAppTheme()` and wrap styles in `const getStyles = (theme: ThemeColors) => StyleSheet.create({...})`.
