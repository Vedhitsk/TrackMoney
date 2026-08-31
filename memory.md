# Session Memory — TrackMoney

*This document captures critical technical context, architectural invariants, compliance constraints, and completed work across chat sessions. Always read this file at the start of a new chat.*

---

## 1. Project Overview & Future Vision
- **App:** TrackMoney — Android-only, offline-first personal finance tracking via real-time SMS ingestion.
- **Stack:** Expo SDK 54 (React Native), TypeScript, Drizzle ORM, SQLite (`expo-sqlite`), Zustand.
- **Target:** Production launch on Google Play Store (Android-only due to SMS permission requirements).
- **Future Milestone:** Integration with an on-device Small Language Model (e.g., Gemma) so that transaction SMS parsing never leaves the user's device, ensuring complete privacy.

---

## 2. Hard Compliance & Native Architecture Constraints
*Crucial rules to prevent banking app malware flags (e.g., YONO SBI) and Android OS crashes:*
- **No Boot Persistence:** NEVER add `RECEIVE_BOOT_COMPLETED` permission or persistent background daemons.
- **Service Transience:** `SmsHeadlessTaskService` must remain strictly transient and invoke `stopSelf()` immediately upon completing background SMS processing.
- **Android 8+ Service Invocation:** Never use `startService()`; always use `ContextCompat.startForegroundService()`.
- **No Third-Party SMS Libraries:** Custom Expo config plugin (`withBackgroundSms.js`) + native `BroadcastReceiver` handle incoming messages.
- **AI Network Invariants:** All remote AI parser calls (Groq / Gemini) must have a hard 10-second `AbortController` timeout, wrapped in try/catch, and always return `SUCCESS` to background tasks to prevent infinite retries or crashes.
- **Headless DB Access:** Background tasks run outside the React UI tree; SQLite tables must be initialized via `ensureTablesExist()`.

---

## 3. Core Architectural Decisions (from `ARCHITECTURE-SPINE.md`)
- **AD-1 (State Ownership):** SQLite is the absolute single source of truth. Zustand serves solely as an ephemeral UI draft store and read-cache. Background services write directly to SQLite and emit a `DeviceEventEmitter` event (`newTransactionSaved`); the UI re-queries SQLite rather than receiving transaction payloads through the event bus.
- **AD-2 (Pure Parser Boundaries):** Regex and AI parsers are pure functions/modules (no DB access). A separate Ingestion Coordinator layer coordinates raw extraction, queries the database for merchant context, and persists records.
- **AD-3 (Privacy & Remote Masking):** Parsers adhere to a common interface. Remote implementations (Groq/Gemini) scrub sensitive PII (account numbers) before network transit. Future on-device SLM parsers can bypass scrubbing since processing stays local.

---

## 4. Key Work Completed in Recent Session

### A. Navigation & Touch Responsiveness Optimization
- **Problem:** Main records screen (`app/(tabs)/index.tsx`) felt laggy on button clicks in release builds due to whole-store destructuring from `useTransactionStore`, triggering full-component and list re-renders on every background state change.
- **Fix:** Switched `index.tsx` to use Zustand's `useShallow` selector map. Tap events and UI thread operations now execute without thread blocking.
- **Commit:** `213309f` (*fix: resolve navigation lag in main screen using useShallow*)

### B. Merchant Context Memory & Learning Fix
- **Problem:** When users manually accepted/categorized a transaction from a new merchant, subsequent SMS messages from that merchant failed to inherit the user-selected category.
- **Root Causes:**
  1. `lookupMerchantContext` query used a strict case-sensitive `eq(transactions.merchant, merchant)` check. Slight variations in AI casing or whitespace caused misses.
  2. Fallback logic prioritized the AI's category guess over historical database records (`finalDraft.categoryId ?? ctx.categoryId`).
- **Fix:**
  1. Updated `lookupMerchantContext` in `lib/sms/smsIngestion.ts` to use case-insensitive, trimmed matching: `sql`LOWER(TRIM(${transactions.merchant})) = LOWER(TRIM(${merchant}))``.
  2. Updated priority logic in Layer 1 and Layer 3 so that manual database context memory strictly overrides AI/Regex guesses: `ctx.categoryId ?? finalDraft.categoryId`.
- **Commit:** `79297a8` (*fix: make merchant context case-insensitive and override AI*)

### C. Repository Structure & BMad Setup
- Configured BMad workspace, `AGENTS.md`, `rules.md`, `spec.md`, `skills.md`, and created implementation specs in `_bmad-output/implementation-artifacts/`.
- Finalized architecture spine in `planning_artifacts/architecture/architecture-TrackMoney-2026-08-30/ARCHITECTURE-SPINE.md`.
- **Commit:** `b81fba8` (*chore: add BMad artifacts, agents config, and implementation specs*)

---

## 5. Outstanding Tasks & Next Chat Handoff
1. **Remote Push:** Run `git push origin master` in an authenticated terminal (current local branch is ahead by 3 commits: `213309f`, `79297a8`, `b81fba8`).
2. **Release Verification:** Build new release APK (`--variant release`) to verify snappy navigation and merchant auto-categorization.
3. **Future Explorations:** Prepare specification for on-device SLM (Gemma) pipeline.
