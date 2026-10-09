# Implementation checklist

The approved minimal local plan supersedes the previous cloud release setup. The coordinator reviews each sequential implementation handoff before committing on `dev`.

- [x] Local Expo foundation: SDK 57, root npm workspace/lockfile, `npm start`, copied public Firebase environment, Hello World preserved. EAS, Codespaces and cloud release scaffolding removed.
- [x] Firebase/local storage: Auth, Firestore and AsyncStorage retained; configuration rejects missing values and project mismatches. Explicit smoke check validates initialization and local storage without sign-in or database traffic. Deny-all rules, indexes, aliases and manual Firebase CLI remain.
- [x] Minimal CI: one Node 22 `npm ci` / `npm run check` job on dev/main pushes, PRs and manual runs. No deployment, Functions or emulator tests.
- [x] Documentation: local PowerShell setup, SDK 57 Android/iPhone installation, same-Wi-Fi QR workflow and manual rules deployment.
- [x] Final verification on Node 22.23.3: fresh `npm ci`, root lint/typecheck and 19 mocked tests passed; Expo dependency check and Doctor 21/21 passed. `npm start` served Metro and an Android development JavaScript bundle returned HTTP 200 (6,655,240 characters); verification server stopped. npm reported 81 audit findings (17 moderate, 64 high); no unrelated dependency upgrades applied.
- [x] Coordinator inspected code, configuration, CI and documentation and authorized the verified commit/promotion.
- [ ] Publish the verified dev commit and pass exact-SHA Checks; normal merge into main, sync main into dev, verify both branch Checks and clean matching tips. The final handoff records commit IDs and run links.
- [ ] Physical Android/iPhone test: user scans QR code and confirms the current authenticated task screen and optional smoke logs. Device test remains pending until actually performed.

Online Firebase/EAS projects, GitHub secrets/variables and billing settings are outside this cleanup; no resources were created, deployed or deleted. Historical architecture ideas are recorded only as future options in `stack-research.md`.

## Identity milestone (#2)

- [x] Email/password registration, sign-in, generic password-reset response, persistent-session gate and recoverable sign-out; authenticated Hello World retained.
- [x] Owner-scoped task/profile repository and exact-schema rules with private goal default 3, bounds 1–20. Approved API key/domain/app ID checks strengthen project isolation independently of `__DEV__`; no login credentials or startup seeding bundled.
- [x] Development email/password enabled; ordinary private test account nicknamed `admin` provisioned with user-chosen password and no elevated privileges. Owner confirmed a fresh reset link worked.
- [x] Firebase compiler accepted rules; coordinator explicitly deployed rules/indexes to development. 53/53 live client ID-token checks passed; marked documents and temporary accounts cleaned up. Production untouched.
- [x] Coordinator final review: Standards 0 findings, Spec 0 findings. Root `npm run check` passed lint, TypeScript and 43 tests across 6 suites on Node 24.15.0. Ready for local `dev` commit; no push.
- [x] `npm start` served an Android development JavaScript bundle with HTTP 200 (6,655,437 bytes). Verification server stopped. This is bundling evidence, not physical device evidence.
- [ ] Physical Android/iPhone SDK 57 Expo Go identity, session restart and accessibility checks in `docs/mobile-development.md`. Both remain pending; the user plans Android testing later.

Issue #2 remains open until device verification is completed.

## Task-management milestone (#3)

- [x] Replaced authenticated Hello World with accessible private capture, title editing, safeguarded deletion, complete/undo and explicit recovery controls. Uncertain capture retains one frozen draft ID/title for retries; pending submissions coalesce; desired-state completion preserves existing timestamps.
- [x] Independently bounded active/history subscriptions: 25 displayed plus lookahead, explicit 25-task expansion, stable timestamp/document-ID ordering and complete live-window replacement. Account/sign-out/unmount purge screen state, unsubscribe and ignore late callbacks/saves. Cache/pending status never substitutes for server confirmation; deletion is an acknowledged transaction. No durable offline outbox or goal UI.
- [x] Development active-task composite index deployed by coordinator and READY. Rules unchanged; production untouched. 15/15 actual repository/client SDK verification groups passed, including owner query/mutation/retry/order and denied stranger/guest/malformed operations; all marked documents and two temporary accounts cleaned, zero cleanup failures.
- [x] Controlled screen tests cover capture/edit/delete/complete/undo/recomplete, retained failed input, stable retries, restored saved outcomes after remount, bounded paging/realtime replacement, status/retry, session purge and late responses. Focused tests and TypeScript passed; no new dependencies.
- [x] Root npm run check passed after the review repair: lint, TypeScript and 55 tests across 8 suites. Standards review returned 0 findings; the Spec review found one stale section-membership issue, repaired with red/green saved-undo and symmetric saved-completion regressions. Fresh confirmed windows now determine duplicate-ID section membership; stale/error/cache windows cannot override the newer confirmed section.
- [x] Coordinator inspected the repair and reran root npm run check: lint, TypeScript and 55/55 tests across 8 suites passed. Final read-only reviews returned Standards 0 and Spec 0 actionable findings. Task milestone committed locally on dev as c17b798. Source promotion is now authorized; completion is tracked below.
- [ ] Full physical iPhone SDK 57 Expo Go saved-loop, restart, account isolation, offline recovery and VoiceOver/large-text checks in docs/mobile-development.md. The user confirms the live task loop works on Web and iPhone; the specific full-checklist outcomes remain unrecorded. Android verification also remains pending.

- [x] Existing Metro returned an iOS development bundle with HTTP 200 (5,937,549 bytes), without restarting/stopping the user server. Bundle readiness does not establish native saved-loop behavior.
- [x] Separate fresh browser session loaded both sections and saved a disposable task. Its one task, profile and third disposable account were cleaned; browser signed out. This browser evidence is separate from the 15 live SDK groups/two accounts and physical-device checklist.

Issue #3 remains open until required device verification is completed. Earlier foundation/identity entries record their historical Hello World scope; the current screen is the task list.

## Authorized source promotion and explicit configuration

- [x] User authorized dev/main pushes and normal source promotion. Existing local dev Metro remains running with its explicit development .env.local; no service restart or local environment rewrite.
- [x] Firebase runtime and Expo app identity now require an explicit development/production selector; missing, blank and unsupported values reject startup. Added approved public-only .env.production.example; mixed-project validation retained. No branch/NODE_ENV inference, dependencies, cloud/native deployment or backend changes.
- [x] Focused configuration regressions: 26 passed. Fresh-checkout-equivalent root npm run check with EXPO_NO_DOTENV=1 and selector cleared passed lint, TypeScript and 66 tests across 8 suites. No new CI environment settings are needed.
- [x] Expo install --check reported dependencies up to date.
- [x] Coordinator read-only verification confirmed production example project/API key/domain/app ID exactly match the existing production Firebase web app; no production backend writes/deployments.
- [x] Expo Doctor passed 21/21 checks for the app-configuration change.
- [x] Coordinator inspection and root npm run check passed: lint, TypeScript and 66 tests across 8 suites. Final Standards and Spec reviews each returned 0 actionable findings. Ready for the local dev safeguard commit; not yet committed.
- [ ] Push dev and verify GitHub Actions for that exact feature commit before production source promotion.
- [ ] Normal dev-to-main merge/push, sync main back into dev, verify both branch Checks and clean matching tips. Record final commit IDs/run links after completion.

These Git operations promote source only. Runtime production configuration must be explicitly supplied for a separately intended runtime; no automatic Firebase/hosting/native deployment exists. Production Auth, data, rules and indexes remain untouched by this configuration safeguard.
