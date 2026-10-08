# Implementation checklist

The current plan supersedes the original five-step local APK plan. Run two implementation agents sequentially; the coordinator reviews and verifies each handoff. Commit on `dev`, promote with normal merges to `main`, then sync `dev` from `main`.

- [x] **1. Cloud development foundation** — Codespaces Node 22 workspace, SDK 57 Expo Go tunnel entry point, EAS project/profiles, distinct cloud Firebase environment selection, concise future workflow, Hello World preserved. Gate: root checks and Expo dependency/config checks pass; incomplete cloud account/device actions recorded honestly.
- [ ] **2. CI, releases and GitHub** — Replace local APK scaffolding with cloud checks/build/update automation; configure the GitHub repository and dev/main promotions; verify remotes and cloud configuration. Gate: checks pass, production targets are isolated, remote branches/promotions verified, external provisioning/build limitations recorded.

## Step 1 evidence

- `.devcontainer/devcontainer.json` provides Node.js 22 and Java 21, installing with root `npm ci`. Root `npm run start:cloud` runs Expo Go over a tunnel; local `npm run android` still opens Expo Go on an existing emulator.
- Expo SDK 57 is preserved. Android uses SDK 57 Expo Go; iPhone uses `sign.expo.dev` with free Apple ID signing, renewed every seven days. Actual phone testing and Codespace creation remain pending user device/browser actions.
- EAS project `jellotheman/gamified-todo` is created and linked with ID `54af575f-8e7b-465c-8bde-ca68b52ff92e`. Development, preview APK and production store profiles use separate channels and EAS environments. Fingerprint runtime versions protect native compatibility. No remote build/update has been published yet.
- Firebase client defaults to real development cloud settings. Missing public config, cross-environment project IDs, invalid selectors, and production emulator mode fail clearly. Emulators remain explicit optional tests. Hello World and the original `apps/mobile/AGENTS.md` are preserved.
- Both Firebase projects are ACTIVE and Firebase-enabled; their real web apps and Standard us-central1 Firestore databases are configured. Deny-all rules are deployed to both projects. Owner-enabled Blaze billing remains required for deployed functions.
- Dependency installation used `npx expo install` in the root npm workspace. `expo-dev-client`, `expo-updates` and local `@expo/ngrok` are locked. `npx expo install --check` passed; Expo Doctor passed 21/21.
- Root `npm run check` passed: both workspace lint/typecheck checks, ten tests (including missing config, emulator opt-in and environment isolation), and the functions build. Expo Go tunnel startup reported Tunnel connected/Tunnel ready. `git diff --check` passed. Existing npm audit findings remain (73 at install); no unsupported forced upgrades were applied.
- Cloud configuration is stored in EAS and downloaded with npm run setup. Obsolete local APK scaffolding has been replaced with EAS cloud releases.

## Step 2 evidence

- Public GitHub repository `jellotheman/gamified-todo` created. GitHub `EXPO_TOKEN` secret metadata verified; token content never read. Development and production Firebase deploy accounts use separate repository-ID/owner-ID/branch-scoped Workload Identity Federation providers and short-lived ADC; four repository variables configured. No service-account key or legacy Firebase token created.
- Real Firebase web app configuration published as public EAS variables in development/preview/production. Development configuration pulls automatically with `npm run setup`; Codespaces post-create attempts it only when Expo authentication exists.
- Both Standard Firestore databases created in us-central1 with free tier; deny-all rules/indexes deployed successfully. No data/features added. Functions health caps maxInstances at one; billing-dependent deployment remains pending owner decision.
- Node 22 `npm run check` passed (lint, typecheck, ten tests, functions build). `npm run test:integration` passed (Auth, health, Admin Firestore and deny-client rules). Git diff whitespace check passed.
- CI checks dev/main pushes and PRs. Push releases depend on checks, preserve the branch OIDC claim, map backend/EAS environments independently, and fail clearly for missing setup. Native APK builds are manual; fingerprint-compatible OTA updates are automatic. Production builds an installable showcase APK.
- Promotion script requires clean/pushed dev and successful exact-SHA checks plus development release, then normal main merge and dev synchronization. Actual push/CI/promotion/build evidence still pending.
