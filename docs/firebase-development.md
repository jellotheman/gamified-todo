# Firebase development

The mobile app uses Firebase's modular JavaScript SDK for Auth and Firestore. Native Auth persists sessions through AsyncStorage; web uses browser persistence. Local development uses the existing real development Firebase project on the free Spark plan. Setup is in [mobile development](mobile-development.md).

`apps/mobile/.env.example` contains public development web-app identifiers. Copy it to ignored `.env.local` on first setup. `EXPO_PUBLIC_APP_ENV=development` requires project `gamified-todo-dev-jellotheman`; production requires `gamified-todo-prod-jellotheman`. To select production manually, replace every Firebase value with its matching production web-app value and set the selector to `production`. Missing values or mismatched project IDs fail clearly. Never store service-account credentials or tokens in public app variables.

The Hello World screen does not sign in or access Firestore. The opt-in smoke check validates service initialization and temporary local storage only. `npm run check` runs mocked tests; it does not verify a live database or deployed rules.

`firestore.rules` denies every client read/write until features and access rules are implemented. `firestore.indexes.json` retains index configuration. The CLI aliases in `.firebaserc` are `dev` and `prod`, with development as the default. Rules changes have no cloud effect until explicitly deployed.

For an authorized manual rules/indexes deployment, authenticate and select the intended alias explicitly from the repository root:

```powershell
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project dev
```

Use `--project prod` only for an explicitly intended production deployment. GitHub Actions performs checks only. This starter has no Functions, backend emulator workflow, automated deployment or billing requirement; existing online projects and credentials remain untouched by the local cleanup.
