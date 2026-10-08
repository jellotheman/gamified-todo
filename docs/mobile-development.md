# Cloud development

Create a GitHub Codespace from `dev`. Its devcontainer provides Node.js 22 and Java 21 and runs `npm ci` at the root. Develop in the Codespace and live-test on your phone:

```sh
npm run start:cloud
```

Scan the terminal QR code with SDK 57 Expo Go. On Android, install the SDK 57 version from [Expo Go](https://expo.dev/go). On iPhone, install SDK 57 through [sign.expo.dev](https://sign.expo.dev/), using a free Apple ID; its free provisioning lasts seven days, then repeat the signing/install process. The ordinary App Store Expo Go does not support SDK 57. Both devices use the same tunnel and receive Fast Refresh while Metro runs. See [Expo's signing explanation](https://sign.expo.dev/how-it-works) and [tunnel documentation](https://docs.expo.dev/more/expo-cli/#tunneling).

For local Windows development, install root dependencies with `npm ci`; `npm run android` opens Expo Go on an existing emulator. No Android SDK or local APK build is needed in Codespaces. The app remains one Hello World screen.

## Firebase environments

Copy `apps/mobile/.env.example` to `apps/mobile/.env.local`, then supply the real development Firebase web app API key and app ID. Missing values fail clearly at application startup. Expo exposes all `EXPO_PUBLIC_*` values in client code; use public Firebase SDK configuration only.

`EXPO_PUBLIC_APP_ENV=development` requires `gamified-todo-dev-jellotheman`; `production` requires `gamified-todo-prod-jellotheman`. Development and preview builds use the development backend; production uses the production backend. There is no demo fallback. Restart Metro after configuration changes.

The projects currently exist in Google Cloud but Firebase activation returned HTTP 403 for `sreerambiju4@gmail.com`. Complete the account's Firebase Console onboarding/permissions, then run:

```sh
npx -y firebase-tools@latest projects:addfirebase gamified-todo-dev-jellotheman
npx -y firebase-tools@latest projects:addfirebase gamified-todo-prod-jellotheman
npx -y firebase-tools@latest apps:create WEB "Gamified Todo Development" --project gamified-todo-dev-jellotheman
npx -y firebase-tools@latest apps:create WEB "Gamified Todo Production" --project gamified-todo-prod-jellotheman
npx -y firebase-tools@latest apps:sdkconfig WEB --project gamified-todo-dev-jellotheman
npx -y firebase-tools@latest apps:sdkconfig WEB --project gamified-todo-prod-jellotheman
```

Firebase services are not yet deployed. Cloud Functions deployment requires Blaze billing enabled by the account owner. The Hello World app initializes the client but makes no backend requests.

## EAS builds and updates

The app is linked to [jellotheman/gamified-todo](https://expo.dev/accounts/jellotheman/projects/gamified-todo). Run EAS commands from `apps/mobile`. In a new Codespace, run `npx eas-cli@latest login` once. Store the four Firebase public variables plus `EXPO_PUBLIC_APP_ENV` and `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false` in EAS `development`, `preview`, and `production` environments. Use the development project's values for development/preview, production project's values for production. For each value:

```sh
npx eas-cli@latest env:set --name EXPO_PUBLIC_FIREBASE_API_KEY --value ACTUAL_PUBLIC_API_KEY --environment development --visibility plaintext
npx eas-cli@latest env:pull --environment development --path .env.local
```

`eas.json` defines development client, internal preview APK, and production store builds. Each profile has a separate update channel. Fingerprint runtime versions keep updates compatible with the built native app. EAS updates require a matching standalone build; Expo Go live testing uses Metro directly. A native dependency change requires a new build. Standalone iOS builds need Apple's signing/account setup.

```sh
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest update --channel preview --environment preview --message "Describe the change"
```

The public environment selector must be set in each EAS environment too, because updates use `--environment`, not a build profile's `env`. Separate Android/iOS development identifiers allow dev and production builds side by side.

Optional emulator checks: `npm run test:integration` starts/stops isolated demo services. `npm run emulators` is for deliberate local testing; set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` explicitly for a local app. A Codespaces Metro tunnel exposes Metro only, not Firebase emulator ports. Normal phone development uses cloud Firebase.

References: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [EAS profiles](https://docs.expo.dev/build/eas-json/), [EAS environments](https://docs.expo.dev/eas/environment-variables/), [runtime versions](https://docs.expo.dev/eas-update/runtime-versions/).
