# Implementation checklist

Execute these steps with five sequential implementation agents. The coordinator delegates all implementations and fixes. Mark a step complete only after its gate passes, and record check evidence and any limitations below its entry.

- [x] **1. Foundation** — One root Git repository with `main` baseline and `dev` working branch; recoverable original mobile history outside the repository; npm mobile/functions workspaces with one root lockfile; shared commands and ignores; existing mobile instructions preserved. Validate workspace install, mobile TypeScript, and repository layout. Report the mobile lint setup limitation for step 2.
- [x] **2. Mobile** — Expo Router and Firebase client integration implement the requested blank skeleton, environment setup is documented, and mobile lint/typecheck checks pass. Keep application features for later work and add real mobile check commands.
- [ ] **3. Firebase and tests** — Node.js 22 TypeScript health endpoint, Firebase configuration, default-deny rules, and Auth/Firestore/Functions emulator smoke checks are implemented; build/lint/typecheck/backend tests pass. Keep task and reward features for later work and add backend and emulator commands.
- [ ] **4. CI and local APK verification** — CI runs meaningful checks; a local Android APK builds and its artifact is verified; repeatable build and verification commands are documented. Add simple Windows APK commands; Linux CI must not complicate local development.
- [ ] **5. GitHub and branch promotion** — GitHub repository/remotes and agreed branch workflow are configured; the verified `dev` result is promoted to `main`; remote commits and final checks are verified.

## Step 1 evidence

- Root baseline commit: `2ee6752` on `main`; foundation changes are committed on `dev` with `main` as an ancestor.
- Original mobile Git history: `D:\Projects\misc\gamified-todo-git-backups\2026-10-08-foundation\mobile.git`. A verified complete `mobile-history.bundle` sits alongside it and preserves original `master`/HEAD commit `f812b06ee0b1a19fd07f69350c292913c8119ffb`.
- `npm install` and `npm install --package-lock-only` completed; `npm ls --workspaces --depth=0` resolves both local workspaces. One root `package-lock.json` tracks dependencies.
- `npm run typecheck` passed. `git diff --check` passed; original mobile `AGENTS.md` has no diff.
- Mobile lint remains for step 2: the generated blank template has no lint configuration or script. No lint result is claimed for this foundation step.
- Host tooling is Node.js `24.15.0` and npm `12.0.2`; functions explicitly target Node.js 22, so npm emits an engine warning on this host. Use Node.js 22 for backend/runtime verification.
- Installation reports 22 dependency audit findings (7 moderate, 15 high) in the initial Expo tree. Review through delegated fixes before final promotion; this step does not force upgrades across SDK constraints.
- Root `npm run android` delegates directly to Expo's existing Android command for convenient local Windows emulator use. Later agents add real lint/test/backend/APK commands with their tooling.

## Step 2 evidence

- Expo Router entry and `src/app/` contain one Hello World screen and root layout. No todo, rewards, auth UI or diagnostics screen was added. Existing mobile `AGENTS.md` is unchanged.
- Firebase JS SDK `13.0.0` initializes Auth/Firestore/Functions against `demo-gamified-todo` emulators by default. Native Auth uses AsyncStorage `2.2.0` persistence; actual installed Firebase RN source exports the native persistence helper. Explicit cloud settings are validated. Setup and flags are documented in `docs/mobile-development.md` and `apps/mobile/.env.example`.
- `npm run lint`, `npm run typecheck`, and `npx expo install --check` passed. `npx expo-doctor` passed 21/21 after deduplicating Reanimated `4.5.1` and Worklets `0.10.1` with SDK-compatible root overrides. Expo remains `57.0.27`, React `19.2.3`, React Native `0.86.3`, TypeScript `6.0.3`, Router `57.0.25`.
- `npx expo export --platform web` and `npx expo export --platform android` passed, including Android Hermes bundle generation. Generated outputs are ignored. `git diff --check` passed.
- Root `npm run android` remains the simple Expo command. Installed Expo CLI boots an existing AVD automatically; this host lists only `GamifiedTodo_API36`. Actual emulator launch and APK/runtime verification remain for step 4.
- `runDevelopmentSmokeCheck` is exported; `EXPO_PUBLIC_RUN_DEVELOPMENT_SMOKE=true` invokes it in development and logs results without changing the screen. Firebase service identity and AsyncStorage write/read/remove are covered by the helper, but native execution is pending step 4. Auth/Firestore/Functions request tests and real backend check commands remain for step 3.
- `npm audit fix` without force completed with no dependency changes and exit 1 for remaining findings: 35 (9 moderate, 26 high). Suggested forced fixes cross supported SDK constraints (including Expo 44/Firebase 9 downgrades); none applied. npm also reports blocked install scripts for `@firebase/util`, `protobufjs`, `unrs-resolver`; bundling/lint/typecheck pass with the host's existing npm policy. Functions Node 22 engine warning persists on local Node 24 as documented in step 1.
