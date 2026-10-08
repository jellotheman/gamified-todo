# Cloud releases

GitHub repository: https://github.com/jellotheman/gamified-todo . Default working branch is `dev`; `main` is production.

Every push/PR to dev/main runs root `npm ci`, `npm run check`, and emulator integration tests on Node.js 22/Java 21. Push releases depend on the successful checks job for that exact commit. PRs never deploy. Dev uses the preview EAS environment/channel and development Firebase; main uses production. A release fails clearly when authentication or deployment is incomplete.

After checks, releases deploy Firestore rules/indexes and publish an EAS update. Native builds are deliberately manual to conserve build quota. **Actions → Cloud release → Run workflow** chooses dev/main and optionally builds a standalone Android APK. This action also requires a current commit with successful checks. APK download/install links are hosted in [EAS builds](https://expo.dev/accounts/jellotheman/projects/gamified-todo/builds). Android installation may prompt to allow that download source.

Before publishing a native dependency/configuration change, run this build action for the affected branch and install the new APK. Fingerprint runtimes prevent incompatible OTA updates from applying to an older APK. Ordinary JavaScript edits need no new native build. First-time preview and production builds must exist before OTA updates become useful on installed APKs. Expo Go development remains `npm run start:cloud`.

## Account setup

One repository secret, `EXPO_TOKEN`, contains an [Expo access token](https://expo.dev/accounts/jellotheman/settings/access-tokens). Set it in [GitHub Actions secrets](https://github.com/jellotheman/gamified-todo/settings/secrets/actions). Never paste it into code, public EAS variables or chat.

Firebase authentication uses Google Workload Identity Federation and short-lived Application Default Credentials; no JSON private key or legacy Firebase CI token is required. Repository variables `FIREBASE_DEV_PROVIDER`, `FIREBASE_DEV_SERVICE_ACCOUNT`, `FIREBASE_PROD_PROVIDER`, `FIREBASE_PROD_SERVICE_ACCOUNT` identify the resources. Provider conditions match this repository's immutable ID and owner ID, and restrict development to dev and production to main. Separate project deploy service accounts have Firebase/functions/deployment permissions, with no billing or project-owner role.

Both Firebase projects stay on the free Spark plan. No billing is attached. Cloud Functions source is an undeployed optional skeleton and is excluded from cloud releases. The app uses Firebase SDKs directly; no custom API hosting is needed.

## Promotion

Commit and push dev, wait for its complete Checks workflow (checks and development release), then `npm run promote`. The script requires a clean dev checkout and the exact pushed SHA's successful checks and development release. It synchronizes existing main history, normally merges dev into main, pushes main and merges main back into dev. If synchronization changes dev, it stops for a new push/check before promotion. No force push or squash is used; main runs independent checks and production deployment.

Inspect [GitHub Actions](https://github.com/jellotheman/gamified-todo/actions) for checks/deployment and [EAS](https://expo.dev/accounts/jellotheman/projects/gamified-todo) for update/build details. Do not call a missing credential, failed deployment or queued build a successful release.
