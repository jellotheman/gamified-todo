# Implementation checklist

The current plan supersedes the original five-step local APK plan. Run two implementation agents sequentially; the coordinator reviews and verifies each handoff. Commit on `dev`, promote with normal merges to `main`, then sync `dev` from `main`.

- [x] **1. Cloud development foundation** — Codespaces Node 22 workspace, SDK 57 Expo Go tunnel entry point, EAS project/profiles, distinct cloud Firebase environment selection, concise future workflow, Hello World preserved. Gate: root checks and Expo dependency/config checks pass; incomplete cloud account/device actions recorded honestly.
- [ ] **2. CI, releases and GitHub** — Replace local APK scaffolding with cloud checks/build/update automation; configure the GitHub repository and dev/main promotions; verify remotes and cloud configuration. Gate: checks pass, production targets are isolated, remote branches/promotions verified, external provisioning/build limitations recorded.

## Step 1 evidence

- `.devcontainer/devcontainer.json` provides Node.js 22 and Java 21, installing with root `npm ci`. Root `npm run start:cloud` runs Expo Go over a tunnel; local `npm run android` still opens Expo Go on an existing emulator.
- Expo SDK 57 is preserved. Android uses SDK 57 Expo Go; iPhone uses `sign.expo.dev` with free Apple ID signing, renewed every seven days. Actual phone testing and Codespace creation remain pending user device/browser actions.
- EAS project `jellotheman/gamified-todo` is created and linked with ID `54af575f-8e7b-465c-8bde-ca68b52ff92e`. Development, preview APK and production store profiles use separate channels and EAS environments. Fingerprint runtime versions protect native compatibility. No remote build/update has been published yet.
- Firebase client defaults to real development cloud settings. Missing public config, cross-environment project IDs, invalid selectors, and production emulator mode fail clearly. Emulators remain explicit optional tests. Hello World and the original `apps/mobile/AGENTS.md` are preserved.
- Authenticated Firebase CLI read confirms both Google Cloud projects are ACTIVE: `gamified-todo-dev-jellotheman` (1062431403819) and `gamified-todo-prod-jellotheman` (126696046144), owned by the logged-in `sreerambiju4@gmail.com` account. Firebase activation returned HTTP 403 `PERMISSION_DENIED` with only "The caller does not have permission". Firebase web apps/config and service deployment are pending console onboarding/permissions; no billing was attached. Owner-enabled Blaze billing is required for deployed functions.
- Dependency installation used `npx expo install` in the root npm workspace. `expo-dev-client`, `expo-updates` and local `@expo/ngrok` are locked. `npx expo install --check` passed; Expo Doctor passed 21/21.
- Root `npm run check` passed: both workspace lint/typecheck checks, ten tests (including missing config, emulator opt-in and environment isolation), and the functions build. Expo Go tunnel startup reported Tunnel connected/Tunnel ready. `git diff --check` passed. Existing npm audit findings remain (73 at install); no unsupported forced upgrades were applied.
- Cloud setup/account follow-up commands are in `docs/mobile-development.md`. Step 2 owns the untracked obsolete `docs/android-apk.md` and `scripts/build-android.mjs` removal and the existing `.github`/README work. No local APK is required by the new plan.
