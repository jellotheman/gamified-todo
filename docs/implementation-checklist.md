# Implementation checklist

Execute these steps with five sequential implementation agents. The coordinator delegates all implementations and fixes. Mark a step complete only after its gate passes, and record check evidence and any limitations below its entry.

- [x] **1. Foundation** — One root Git repository with `main` baseline and `dev` working branch; recoverable original mobile history outside the repository; npm mobile/functions workspaces with one root lockfile; shared commands and ignores; existing mobile instructions preserved. Validate workspace install, mobile TypeScript, and repository layout. Report the mobile lint setup limitation for step 2.
- [x] **2. Mobile** — Expo Router and Firebase client integration implement the requested blank skeleton, environment setup is documented, and mobile lint/typecheck checks pass. Keep application features for later work and add real mobile check commands.
- [x] **3. Firebase and tests** — Node.js 22 TypeScript health endpoint, Firebase configuration, default-deny rules, and Auth/Firestore/Functions emulator smoke checks are implemented; build/lint/typecheck/backend tests pass. Keep task and reward features for later work and add backend and emulator commands.
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

## Step 3 evidence

- Functions use Firebase Admin `14.5.0`, Firebase Functions `7.4.0`, strict TypeScript, Node.js 22 engines/runtime, and one callable `health` in `us-central1` returning `{ status: 'ok' }`. Firebase config includes Auth 9099, Firestore 8080, Functions 5001, demo project defaults, empty indexes, and default-deny Firestore rules.
- Root `npm run check` passed: both workspaces lint/typecheck, five mobile Jest tests, and the functions build. Mobile tests cover Hello World rendering and development smoke success, round-trip failure cleanup, failed-write cleanup, and mismatched Firebase service rejection. No application features were added; mobile instructions are unchanged.
- `npm run test:integration` passed under official Node.js `22.23.3` and Java 21. The Functions emulator explicitly reported `Using node@22 from host`; the public Firebase JS SDK authenticated anonymously and called health, Admin wrote/read/deleted a temporary Firestore document, and unauthenticated/authenticated reads plus authenticated writes were denied. The account/document were cleaned up and all emulators stopped successfully.
- Node 22 was placed in a temporary host directory and prepended to PATH for that verification; the standard host remains Node 24. `npx --package=node@22 node` resolved the host binary here, so it was not used as Node 22 evidence. Node 22 CI verification remains step 4.
- SDK-compatible Jest `29.7.0`, Jest Expo `57.0.5`, React Native Testing Library `14.1.0`, and local Firebase CLI `15.33.0` are tracked in the root lockfile. `npm run emulators`, `build:functions`, `test:integration`, `test`, and `check` are documented in `docs/firebase-development.md`. `npm run android` remains unchanged.
- Testing dependencies initially hoisted an extra React `19.3.0`; root React `19.2.3` and its matching override deduplicate the native runtime. The five mobile tests pass with this corrected tree; `npx expo install --check` and Expo Doctor 21/21 also passed.
- Compatible `npm audit fix` made no package changes and exits 1 with 80 reported findings (17 moderate, 63 high) across the expanded toolchain; forced recommendations include unsupported Expo/Firebase downgrades or Jest/Router major upgrades and were not applied. The host blocks install scripts for `@firebase/util`, `protobufjs`, `unrs-resolver`, and `re2`; actual tests and emulator startup passed without changing that policy. Native APK/runtime and CI checks remain step 4.
