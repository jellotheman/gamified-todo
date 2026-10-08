# Gamified Todo

An Expo SDK 57 + Firebase starter with one **Hello World** screen.

Open a [Codespace on dev](https://codespaces.new/jellotheman/gamified-todo/tree/dev). It installs Node.js 22, Java 21 and the root workspace dependencies. The first time, log in to Expo and pull the saved development configuration:

```sh
npx eas-cli@latest login
npm run setup
npm run start:cloud
```

Scan Metro's QR code with SDK 57 Expo Go on Android or iPhone. Android: [install Expo Go](https://expo.dev/go). iPhone: [sign.expo.dev](https://sign.expo.dev/) installs SDK 57 using a free Apple ID; renew its signing every seven days. Keep the Codespace and Metro running for live updates.

Work and commit on `dev`, then push. GitHub runs checks and releases a compatible EAS update to the development backend. When the exact commit's **Checks** workflow and development release pass, promote with:

```sh
npm run promote
```

This makes a normal merge into production `main`, pushes it, and synchronizes `dev`. Main runs its own checks and production release. Development/preview and production use different Firebase projects and app identifiers.

Standalone Android showcase APKs are built in EAS. Open **Actions → Cloud release → Run workflow**, choose `dev` or `main`, and enable **Build a standalone APK**. Download the installable APK from the linked [EAS build](https://expo.dev/accounts/jellotheman/projects/gamified-todo/builds). Native/runtime changes need a new APK; ordinary JavaScript changes use automatic updates without spending a build on every push. iPhone live development uses Expo Go; standalone iOS distribution needs separate Apple signing.

Local Windows: `npm ci`, `npm run setup`, then `npm run android` opens Expo Go on an existing Android emulator. Local emulator smoke tests run only when explicitly requested: `npm run test:integration`. Normal phone development uses real Firebase.

Details: [mobile development](docs/mobile-development.md), [Firebase development](docs/firebase-development.md), [release setup](docs/cloud-releases.md), [implementation evidence](docs/implementation-checklist.md).
