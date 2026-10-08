# Implementation checklist

Execute these steps with five sequential implementation agents. The coordinator delegates all implementations and fixes. Mark a step complete only after its gate passes, and record check evidence and any limitations below its entry.

- [x] **1. Foundation** — One root Git repository with `main` baseline and `dev` working branch; recoverable original mobile history outside the repository; npm mobile/functions workspaces with one root lockfile; shared commands and ignores; existing mobile instructions preserved. Validate workspace install, mobile TypeScript, and repository layout. Report the mobile lint setup limitation for step 2.
- [ ] **2. Mobile** — Expo Router and Firebase client integration implement the requested blank skeleton, environment setup is documented, and mobile lint/typecheck checks pass. Keep application features for later work and add real mobile check commands.
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
