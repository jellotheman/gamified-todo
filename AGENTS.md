# Workflow

The coordinator delegates implementation and repairs to one sub-agent at a time, then inspects changes and runs checks. Read `docs/implementation-checklist.md` before handing off unfinished setup.

Work and commit on `dev`. Promote verified changes with a normal `dev` to `main` merge, then merge `main` back into `dev`. `main` is production. Run `npm run check` before promotion; run `npm run test:integration` when backend behavior or rules change.

Use the root npm workspace and lockfile. Codespaces is the default workspace; run `npm run start:cloud` for SDK 57 Expo Go live testing on Android and iPhone. See `docs/mobile-development.md` for device installation and cloud configuration. Use real development Firebase by default; emulators are optional tests. Functions deploy on Node.js 22.

Preserve and follow `apps/mobile/AGENTS.md` for mobile changes. Keep `npm run android` as the convenient local Android emulator entry point. Keep the Hello World skeleton until features are requested.
