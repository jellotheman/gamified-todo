# Firebase development

The mobile app uses Firebase's modular JavaScript SDK for Auth and Firestore. Native Auth persists sessions through AsyncStorage; web uses browser persistence. Local development uses the existing real development Firebase project on the free Spark plan. Setup is in [mobile development](mobile-development.md).

`apps/mobile/.env.example` contains public development web-app identifiers. Copy it to ignored `.env.local` on first setup. `EXPO_PUBLIC_APP_ENV=development` requires project `gamified-todo-dev-jellotheman`; production requires `gamified-todo-prod-jellotheman`. To select production manually, replace every Firebase value with its matching production web-app value and set the selector to `production`. Startup validates the project ID **and** approved API key, auth domain and app ID independently of `__DEV__`: Auth chooses its account store by API key, so a project-ID check alone is insufficient. The approved public identifiers live in `firebase-config.ts`; update that allowlist, environment files and regression tests together after an intentional web-app/key rotation. Never store login passwords, service-account credentials or tokens in public app variables.

The authentication screen uses normal email/password operations. After sign-in, Hello World initializes/subscribes to the owner's private profile. The opt-in smoke check itself validates service initialization and temporary local storage only. `npm run check` runs mocked tests; it does not verify a live database or deployed rules.

`firestore.rules` permits only authenticated owner access to `users/{uid}/tasks/{taskId}` and `users/{uid}/profile/settings`. Tasks contain exactly a trimmed 1–200 character `title`, immutable request-time `createdAt`, and nullable `completedAt`. Creation starts active; completion changes null to request time, undo clears it, and already-completed/title edits preserve its timestamp. Profiles contain exactly integer `dailyGoal` in 1–20; default 3. Unknown paths, role/owner fields and malformed writes are denied. Ownership comes from the path; parent user documents are unnecessary and grant no privileges.

The repository holds one captured account UID, rejects work after session changes, detaches old subscriptions, ignores cached/pending snapshots and requires acknowledged transactions for creates/updates. `prepareTask` allocates a stable draft identity; keep that same draft for uncertain create retries. `setCompleted` requests a desired state and preserves an already-saved completion timestamp. Task subscriptions are capped at 50 and ordered by `createdAt` descending; task/history UI and richer paging belong to #3. That query needs only Firestore's default single-field index, so the composite index list remains empty. There is no durable offline outbox.

The CLI aliases in `.firebaserc` are `dev` and `prod`, with development as the default. Rules changes have no cloud effect until explicitly deployed.

For an authorized manual rules/indexes deployment, authenticate and select the intended alias explicitly from the repository root:

```powershell
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project dev
```

Use `--project prod` only for an explicitly intended production deployment. GitHub Actions performs checks only. This app has no Functions, backend emulator workflow, automated deployment or billing requirement. Production resources are outside this identity milestone.

## Development identity setup

In the **development** Firebase Console, enable Authentication → Sign-in method → Email/Password (leave email-link login disabled). Keep Spark with no billing attachment. Manually create an ordinary user with a private email, set its Firebase Auth display nickname to `admin`, and send a password-reset email so the user chooses a strong password privately. The nickname grants no privileges. Never assign privileged claims, seed at startup, add a shortcut login, put credentials in `.env`/source/issues, or provision this user in production. Use its normal email/password on the sign-in screen.

Use the complete reset link with `mode=resetPassword`, `oobCode` and a **nonempty** `apiKey`; removing parameters can produce “The selected page mode is invalid.” If the received link has an empty key, request a fresh reset email after Auth provisioning. Do not share the full code or password in an issue. Reset links are single use and expire.

## Live development rules verification

After an authorized development-only deployment, use two isolated ordinary email/password test accounts and marked temporary IDs. Verify owner task create/read/query/edit/complete/repeat-complete/undo/recomplete/delete and profile create/read/update. Verify unauthenticated and second-account get/query/create/update/delete are denied. Verify missing/extra fields, title whitespace/length/types, noninteger/out-of-range goals, creation-time edits, non-request-time completions and completed-to-different-timestamp rewrites are denied. Clean up owner data and temporary test accounts. Record outcomes and deployment separately; mocks are no evidence of cloud enforcement.

Prototype rule review covered each required attack: public listing and other-account CRUD are blocked by path ownership; create/update ownership injection, schema pollution and privileged-role injection fail exact-field validators; omission, type juggling and excessive titles fail the validators on both write types; immutable creation-time edits and forged completion times fail transition checks; goal overflow/negative/fractional values fail integer bounds. Path traversal/references, counters/replay and mixed public/private content are absent from the schema. Owner-scoped queries match read rules; unknown paths deny access. Task subcollections intentionally work without a parent user document because UID ownership is independent of profile creation. Both update rules invoke their full domain validator. These static review outcomes require the live checks above.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for private owner paths with exact schemas, bounded values, immutable creation timestamps and request-time completion transitions. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## Verification recorded on 2026-10-09

Coordinator review returned Standards 0 findings and Spec 0 findings. Root `npm run check` passed lint, TypeScript and 43 tests in 6 suites on Node 24.15.0. `npm start` served an Android development JavaScript bundle with HTTP 200 (6,655,437 bytes); the verification server was stopped. These checks establish source/bundle readiness, not physical device operation. The work is ready for a local `dev` commit; no push. Issue #2 remains open pending device verification.

The coordinator enabled development email/password Auth and manually deployed rules/indexes to the explicit `gamified-todo-dev-jellotheman` project. The Firebase rules compiler accepted the rule source. **53/53 live client REST checks passed** using Firebase Auth ID tokens from two isolated temporary email/password accounts: owner task/profile CRUD and task queries; unauthenticated/other-account get/query/writes/deletes; exact fields/types/title trim/bounds; request-time/immutable creation and completion transitions; goal validation and unknown-path rejection. Temporary accounts and marked documents were removed. These were real development client checks, not IAM bypass calls, mocks or emulator tests.

The ordinary development test account's nickname is `admin`, its password provider is enabled, and it has no elevated privileges. Its owner confirmed a fresh password-reset link worked and privately set a password. No email, UID or password is recorded here. Production web-app identifiers were checked read-only for configuration isolation; production Auth/data/rules were not modified. Physical SDK 57 Android/iPhone flows, accessibility and restart restoration still require the [device checklist](mobile-development.md#iphone-identity-verification); Android testing is planned for later.
