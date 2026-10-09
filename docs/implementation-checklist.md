# Implementation checklist

The approved minimal local plan supersedes the previous cloud release setup. The coordinator reviews each sequential implementation handoff before committing on `dev`.

- [x] Local Expo foundation: SDK 57, root npm workspace/lockfile, `npm start`, copied public Firebase environment, Hello World preserved. EAS, Codespaces and cloud release scaffolding removed.
- [x] Firebase/local storage: Auth, Firestore and AsyncStorage retained; configuration rejects missing values and project mismatches. Explicit smoke check validates initialization and local storage without sign-in or database traffic. Deny-all rules, indexes, aliases and manual Firebase CLI remain.
- [x] Minimal CI: one Node 22 `npm ci` / `npm run check` job on dev/main pushes, PRs and manual runs. No deployment, Functions or emulator tests.
- [x] Documentation: local PowerShell setup, SDK 57 Android/iPhone installation, same-Wi-Fi QR workflow and manual rules deployment.
- [x] Final verification on Node 22.23.3: fresh `npm ci`, root lint/typecheck and 19 mocked tests passed; Expo dependency check and Doctor 21/21 passed. `npm start` served Metro and an Android development JavaScript bundle returned HTTP 200 (6,655,240 characters); verification server stopped. npm reported 81 audit findings (17 moderate, 64 high); no unrelated dependency upgrades applied.
- [x] Coordinator inspected code, configuration, CI and documentation and authorized the verified commit/promotion.
- [ ] Publish the verified dev commit and pass exact-SHA Checks; normal merge into main, sync main into dev, verify both branch Checks and clean matching tips. The final handoff records commit IDs and run links.
- [ ] Physical Android/iPhone test: user scans QR code and confirms Hello World and optional smoke logs. Device test remains pending until actually performed.

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
