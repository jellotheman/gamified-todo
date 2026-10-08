# Workflow

The coordinator delegates implementation and repairs to one sub-agent at a time, then inspects changes and runs checks. Read `docs/implementation-checklist.md` before handing off unfinished setup.

Work and commit on `dev`. Promote verified changes with a normal `dev` to `main` merge, then merge `main` back into `dev`. `main` is production. Run `npm run check` before promotion; use GitHub Actions integration checks when backend behavior or rules change. Run local `npm run test:integration` or emulators only when the user explicitly requests local emulator testing.

Use the root npm workspace and lockfile. Codespaces is the default workspace; run `npm run start:cloud` for SDK 57 Expo Go live testing on Android and iPhone. See `docs/mobile-development.md` for device installation and cloud configuration. Use real development Firebase by default; emulators are optional tests. Keep cloud setup on free plans with no billing attachment. Cloud releases deploy Firestore rules/indexes and EAS updates; Functions source remains an undeployed optional skeleton. Submit native APK builds through the Linux Cloud release action; native changes require a new build before showcasing. Never request Blaze or enable paid hosting for this project.

Preserve and follow `apps/mobile/AGENTS.md` for mobile changes. Keep `npm run android` as the convenient local Android emulator entry point. Keep the Hello World skeleton until features are requested.
