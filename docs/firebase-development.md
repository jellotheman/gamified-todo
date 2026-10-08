# Firebase development

Use Node.js 22 and root `npm ci`. Normal mobile development uses the real cloud development project; environment setup steps are in [mobile development](mobile-development.md).

The TypeScript callable `health` returns `{ status: 'ok' }`. Firestore rules deny all client reads/writes until application features are implemented. No auth UI or backend requests are made by the Hello World screen.

Run `npm run check` for lint, TypeScript, mobile tests and the functions build. Run `npm run test:integration` for optional local Auth/Firestore/Functions smoke tests; it starts/stops emulators under the explicit demo project. Java 21 is included in Codespaces for this test. Ports 9099, 8080, 5001 and 4000 must be available.

The integration test authenticates anonymously, calls health, writes/reads/deletes a temporary Admin document, verifies denied client operations, and cleans up. Expected permission-denied logs validate the rules. `npm run emulators` keeps these test services running when needed. They are not the phone development backend.

Both functions package engines and Firebase runtime target Node.js 22. Both real Firebase projects are activated; Standard Firestore databases use us-central1. Real functions deployments need owner-enabled Blaze billing. CI uses short-lived Google federation credentials described in [cloud releases](cloud-releases.md). Emulator testing needs neither billing nor cloud authentication.
