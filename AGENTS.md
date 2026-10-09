# Workflow

The coordinator delegates implementation and repairs to one sub-agent at a time, then inspects changes and runs checks. Read `docs/implementation-checklist.md` before handing off unfinished setup.

Work and commit on `dev`. Run root `npm run check`. Never push to a Git remote unless the user explicitly instructs you to push. Before an authorized production push to `origin/main`, verify GitHub Actions for the exact feature commit pushed to `dev`. Use normal `dev` to `main` merges and sync `main` back into `dev`. `origin/main` is production.

Use the root npm workspace and lockfile. Local phone development uses `npm start` and SDK 57 Expo Go with real development Firebase. Read `docs/mobile-development.md` for setup and device testing, and `docs/firebase-development.md` when changing Firebase configuration or manually deploying rules/indexes. Keep services on free plans without billing attachment; never request Blaze or paid hosting.

Follow `apps/mobile/AGENTS.md` for mobile changes. Preserve the Hello World screen until features are requested. Keep `npm run android` as the convenient entry point for an already installed local Android emulator. Current scope is local Expo Go; cloud releases, Functions, native builds and backend emulator testing require a new explicit request.

## Agent skills

### Issue tracker

Track issues and specs in GitHub Issues for `jellotheman/gamified-todo`. Before ticket operations, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before triaging, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single root context. Before exploring domain terminology or architecture, read `docs/agents/domain.md`.
