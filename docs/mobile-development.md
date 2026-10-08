# Local mobile development

Use Node.js 22.13 or newer and the root npm workspace. First setup in PowerShell:

```powershell
npm ci
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
npm start
```

On later sessions, run `npm start`. Preserve your existing `.env.local`; restart Metro after changing it. The example contains public configuration for the existing development Firebase project. Server credentials and tokens never belong in `EXPO_PUBLIC_*` variables.

Install **SDK 57 Expo Go** on your phone:

- Android: select SDK 57 at [expo.dev/go](https://expo.dev/go).
- iPhone: use [sign.expo.dev](https://sign.expo.dev/) with a free Apple ID and a USB-connected device. Follow its browser/device instructions. Free signing lasts approximately seven days; repeat installation to renew it. [Official signing explanation](https://sign.expo.dev/how-it-works).

Connect your phone and computer to the same Wi-Fi and scan Metro's QR code. Keep Metro running for Fast Refresh. If the phone cannot connect, check that the network allows devices to communicate and allow Node/Metro through the Windows firewall on your private network. Stop Metro with Ctrl+C when finished. `npm run android` opens Expo Go on an existing local Android emulator; no emulator is needed for phone testing.

The app displays Hello World. Optional initialization/storage smoke logging: uncomment `EXPO_PUBLIC_RUN_DEVELOPMENT_SMOKE=true` in `.env.local`, restart Metro, then open the app and inspect its logs. Success confirms Firebase Auth/Firestore share the configured app and a temporary AsyncStorage value was written, read and removed. It makes no sign-in or Firestore request. Disable the flag afterward.

Run root `npm run check` for lint, TypeScript and mocked tests. For dependency changes, run these from `apps/mobile`:

```powershell
npx expo install --check
npx expo-doctor
```

Actual Android/iPhone operation must be checked on a physical device; successful automated checks or JavaScript bundling alone do not prove phone connectivity.

References: [SDK 57](https://docs.expo.dev/versions/v57.0.0/) · [Firebase setup](firebase-development.md)
