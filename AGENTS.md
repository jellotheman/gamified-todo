# Workflow

The coordinator delegates implementation and repairs to one sub-agent at a time, then inspects changes and runs checks. Read `docs/implementation-checklist.md` before handing off unfinished setup.

Work and commit on `dev`. Run root `npm run check` and verify GitHub Actions for the exact pushed commit before promoting with a normal `dev` to `main` merge; merge `main` back into `dev`. `main` is production.

Use the root npm workspace and lockfile. Local phone development uses `npm start` and SDK 57 Expo Go with real development Firebase. Read `docs/mobile-development.md` for setup and device testing, and `docs/firebase-development.md` when changing Firebase configuration or manually deploying rules/indexes. Keep services on free plans without billing attachment; never request Blaze or paid hosting.

Follow `apps/mobile/AGENTS.md` for mobile changes. Preserve the Hello World screen until features are requested. Keep `npm run android` as the convenient entry point for an already installed local Android emulator. Current scope is local Expo Go; cloud releases, Functions, native builds and backend emulator testing require a new explicit request.
