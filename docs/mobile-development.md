# Cloud development

Create a [Codespace on dev](https://codespaces.new/jellotheman/gamified-todo/tree/dev). Its devcontainer installs Node.js 22, Java 21 and root `npm ci`. If Expo authentication is already available it pulls development configuration automatically; otherwise it prints the one-time login instruction without prompting.

```sh
npx eas-cli@latest login
npm run setup
npm run start:cloud
```

`npm run setup` downloads the EAS **development** environment into ignored `apps/mobile/.env.local`. Firebase public values are already stored in EAS, so no manual copying is needed. Failed login/configuration fails clearly. Restart Metro after changing configuration.

Scan the terminal QR code with SDK 57 Expo Go. Android: [Expo Go SDK 57](https://expo.dev/go). iPhone: [sign.expo.dev](https://sign.expo.dev/) installs SDK 57 using a free Apple ID; signing lasts seven days, then repeat installation. The ordinary App Store Expo Go does not support SDK 57. Both devices use the same tunnel and Fast Refresh while Metro runs. [Signing explanation](https://sign.expo.dev/how-it-works), [tunnel documentation](https://docs.expo.dev/more/expo-cli/#tunneling).

Local Windows uses root `npm ci`, `npm run setup`, then `npm run android` to open Expo Go on an existing emulator. Codespaces needs no local Android SDK or Xcode. The app remains Hello World.

## Environment mapping

| EAS environment/channel | App environment | Firebase project |
| --- | --- | --- |
| development | development | gamified-todo-dev-jellotheman |
| preview | development | gamified-todo-dev-jellotheman |
| production | production | gamified-todo-prod-jellotheman |

`EXPO_PUBLIC_*` variables are public client configuration bundled into the app. No server credentials belong there. Missing configuration or a project/environment mismatch fails at startup. Real development Firebase is the default; production never uses emulators.

The app is linked to [jellotheman/gamified-todo](https://expo.dev/accounts/jellotheman/projects/gamified-todo). Android preview and production profiles create installable showcase APKs using EAS signing. Each profile has its own update channel; fingerprint runtimes keep updates compatible with the installed native app. Changing a native dependency or native configuration requires rebuilding the APK. EAS updates need a matching standalone build; Expo Go uses Metro directly. See [release workflow](cloud-releases.md).

Explicitly requested local backend tests: `npm run test:integration` starts and stops demo Auth/Firestore/Functions emulators. `npm run emulators` is for deliberate local testing; explicitly set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` for a local app. A Codespaces Metro tunnel exposes Metro only, not emulator ports.

References: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [EAS environments](https://docs.expo.dev/eas/environment-variables/), [runtime versions](https://docs.expo.dev/eas-update/runtime-versions/).
