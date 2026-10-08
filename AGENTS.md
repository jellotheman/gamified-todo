# Implementation workflow

The coordinating agent delegates every implementation and fix to a sub-agent. It inspects work, runs checks, and coordinates handoffs. Delegate verification repairs to a sub-agent too.

Run the five step agents sequentially, with one implementation step active at a time:

1. Foundation: root Git repository, npm workspaces, shared commands, ignores, and this execution checklist.
2. Mobile: Expo Router application, Firebase client integration, and mobile checks.
3. Firebase: TypeScript functions, emulator configuration, security rules, and backend tests.
4. CI and APK: automated checks, local Android APK build, and APK verification.
5. GitHub: repository setup, branch promotion, and remote verification.

Before dispatching a step, read `docs/implementation-checklist.md` for its completion gate and `docs/stack-research.md` for the agreed stack. Each step agent implements only its assigned step, validates it, updates its checklist entry with evidence, commits on `dev`, and returns a handoff. Advance after the current gate passes. Record incomplete checks explicitly and add check commands when their tooling is implemented.

Keep `main` as the initial baseline until step 5 promotes the verified result. Preserve the existing instructions in `apps/mobile/AGENTS.md` and follow them for mobile changes. Use the root npm workspace and lockfile for dependency installation. Declare Node.js 22 for deployed Firebase functions; the local host may run a newer Node.js version.

Optimize development for convenient Windows use. Keep `npm run android` as the simple entry point for an existing Android emulator. CI may use Linux; local development should work directly without Docker.
