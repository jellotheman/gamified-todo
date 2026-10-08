# Firebase development

Use Node.js 22 and Java 21+ with the root npm workspace. Install once with `npm ci`.

```powershell
npm run check
npm run test:integration
```

`check` runs mobile/backend lint and TypeScript, five mobile tests, and the functions build. `test:integration` builds functions, starts Auth/Firestore/Functions emulators, runs the real SDK smoke test, and shuts the emulators down. First launch downloads the Firestore emulator. Keep ports 9099, 8080, 5001, 4000 and emulator auxiliary ports free.

For app development, run `npm run emulators` in one terminal and `npm run android` in another. Defaults match the mobile client: project `demo-gamified-todo`, Functions region `us-central1`; Android connects through `10.0.2.2`, web through `127.0.0.1`. Emulator UI is at http://127.0.0.1:4000. No Docker or Firebase login is required for these local commands.

The sole callable export is `health`, returning `{ status: 'ok' }`. Firestore denies every client read/write, including authenticated users, until application rules are deliberately implemented. The integration check creates/deletes an anonymous account, invokes health, writes/reads/deletes a temporary document through Admin, and verifies client permission denials. No application features are present.

For a real project, sign in with `npx firebase login`, select a project with `npx firebase use --add`, and supply the mobile `.env` settings documented in `mobile-development.md`. Local scripts explicitly retain the demo project. A newly installed global CLI may require reopening PowerShell/CMD; `npx --yes firebase-tools@15.33.0 login` works without the global command on PATH. Cloud provisioning/deployment is separate from these local checks.

Functions declare Node.js 22 in both package engines and Firebase configuration. A newer local host can run commands, but the emulator then warns and falls back to that host runtime. CI and backend runtime verification should use Node 22.
