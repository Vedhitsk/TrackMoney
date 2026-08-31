<!-- bmad:context -->
<!-- Verified 2026-08-30 against d022a09. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## TrackMoney

Expo React Native app with TypeScript, Drizzle ORM, and SQLite. Handles sensitive SMS ingestion for finance tracking.

## Policy

- For every prompt, chat, and output, you must use BMad methods and workflows. Do not deviate.
- All interactions must strictly follow the rules defined in `rules.md`.
- Read `memory.md` at the start of a new chat to acquire prior context, and update it whenever a chat becomes long or major decisions are made.
- **Compliance:** Never add `RECEIVE_BOOT_COMPLETED` permission or persistent background services; they trigger banking app malware detection (e.g., YONO SBI).
- **Native Android:** Never use `startService()` (crashes Android 8+). Always use `ContextCompat.startForegroundService()`.
- **Background Tasks:** `SmsHeadlessTaskService` must remain transient and call `stopSelf()` on finish.

## Where things are

- Rules and conventions: `rules.md`
- Project specifications: `spec.md`
- Skills catalog and capabilities: `skills.md`
- Session memory & context: `memory.md`
- Deep system architecture and SMS ingestion flow: `context.md`
- AI Parser details and feature plan: `feature_plan.md`

## Conventions that differ from defaults

- Do not use third-party React Native SMS reading libraries (like `@maniac-tech`). We use a custom Expo Config Plugin (`withBackgroundSms.js`) and a native `BroadcastReceiver`.
- All AI API calls (Groq/Gemini) must have a hard 10-second timeout, wrap in try/catch, validate JSON, and never block the background thread. Always return `SUCCESS` to the background worker even if parsing fails.

## Known pitfalls

- SMS ingestion runs in a background headless task; it cannot access the UI React tree. The DB must be initialized directly via `ensureTablesExist()` before processing.
- Two SMS ingestion paths run simultaneously: BroadcastReceiver (real-time) and Inbox Backfill (on app open). A `processingLock` Set and `sms_log` DB check prevent double processing.

<!-- /bmad:context -->
