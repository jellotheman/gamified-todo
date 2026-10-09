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

The app first restores any saved session, then displays registration/sign-in or the authenticated Hello World placeholder. New accounts receive a private profile with daily goal 3 (editable goal UI comes later). Password-reset responses deliberately do not disclose whether an account exists. Inputs survive failed operations; retry using the same submit control. Sign-out immediately hides private content, including when sign-out needs retry.

Optional initialization/storage smoke logging: uncomment `EXPO_PUBLIC_RUN_DEVELOPMENT_SMOKE=true` in `.env.local`, restart Metro, then open the app and inspect its logs. Success confirms Firebase Auth/Firestore share the configured app and a temporary AsyncStorage value was written, read and removed. The smoke check itself makes no sign-in or Firestore request; the authenticated screen normally initializes/subscribes to its private profile. Disable the flag afterward.

## iPhone identity verification

Use SDK 57 Expo Go with the real development project and an ordinary private email/password account. Record these checks separately from mocked tests:

1. Start with no session. Confirm restoration is distinguishable from sign-in. Register with a private email/password; confirm Hello World and “Your private account is ready.”
2. Sign out, enter invalid input and an incorrect password; confirm clear errors, retained input and working retry. Sign in correctly.
3. Force-close Expo Go and reopen the project. Confirm the saved session restores without reentering credentials.
4. Request password reset for a controlled address, use its full email link and choose a strong private password. Request for an unknown address too: the app should show the same generic acknowledgement. Confirm reset request failures retain the email and recovery controls.
5. Lose connectivity while an operation is pending. Confirm it is not shown as successfully saved; restore connectivity and retry. Sign-out failure must keep private content hidden and offer retry/return controls.
6. Sign out, then sign in as a second account. Confirm the previous email, errors and private readiness state disappear. With VoiceOver and a large text size, exercise labeled email/password inputs, errors and all recovery buttons; check keyboard access to the submit controls.
7. Confirm `.env.local` matches the approved development web app. Mixed development/production project IDs, API keys, domains or app IDs must fail startup. Never use the development test account in production.

Physical Android and iPhone verification remains pending until a user actually completes these steps; the user plans to try Android later. Use the same identity checklist on Android with SDK 57 Expo Go. Automated tests and bundles do not establish device behavior.

Run root `npm run check` for lint, TypeScript and mocked tests. For dependency changes, run these from `apps/mobile`:

```powershell
npx expo install --check
npx expo-doctor
```

Actual Android/iPhone operation must be checked on a physical device; successful automated checks or JavaScript bundling alone do not prove phone connectivity.

References: [SDK 57](https://docs.expo.dev/versions/v57.0.0/) · [Firebase setup](firebase-development.md)
