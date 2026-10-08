# Mobile development

Run `npm install` at the repository root. Dependencies and lockfile belong to the root npm workspace. The mobile app uses Expo SDK 57, React Native 0.86, React 19, TypeScript 6, Expo Router, Firebase JavaScript SDK 13, and AsyncStorage 2.2.

## Windows commands

- `npm run android`: start Metro and open the app on the existing Android emulator. Expo automatically boots an installed AVD when none is running. This host has one AVD, `GamifiedTodo_API36`; no manual Android Studio startup is needed. Expo handles installing/opening Expo Go. Native APK build/verification commands are added in step 4.
- `npm start`: Metro without opening a device.
- `npm run web`: start Metro and open the web app.
- `npm run lint` and `npm run typecheck`: mobile checks, usable from the root.

Set `ANDROID_HOME` to your SDK directory if Expo cannot locate the default Windows SDK at `%LOCALAPPDATA%\Android\Sdk`. If multiple AVDs are installed, start your preferred one first or use Expo's interactive device selection. Root overrides hold optional Reanimated/Worklets peers to Expo SDK 57's supported versions to prevent duplicate native modules.

## Firebase defaults

Normal startup initializes Auth, Firestore and Functions locally, without signing in or making an application request. The only screen displays **Hello World**. No cloud account, credentials or running Firebase emulators are required to open the screen.

The default project ID is `demo-gamified-todo` and emulator mode is on. Service hosts default to `10.0.2.2` on Android (the host computer) and `127.0.0.1` on web/iOS simulator. Ports are Auth `9099`, Firestore `8080`, Functions `5001`; Functions region is `us-central1`. Step 3 implements the matching emulator configuration and backend checks. To use a physical device, set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to the computer's reachable LAN IP and run the emulators with a reachable bind address.

Optional local settings live in `apps/mobile/.env`; copy `apps/mobile/.env.example`. Expo bundles `EXPO_PUBLIC_*` variables into client code. Put only public client configuration there, never Admin SDK/service-account secrets. Restart Metro after changing environment settings.

Cloud mode requires explicitly setting `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false` and providing all four real `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, and `EXPO_PUBLIC_FIREBASE_APP_ID` values. Incomplete cloud settings or an invalid emulator flag fail clearly; no silent fallback to cloud exists.

Native Auth uses AsyncStorage persistence. Web Auth uses Firebase's browser persistence. The platform-specific native module is selected by Metro. Firebase 13's public declaration entry omits the native persistence helper; the narrow local declaration matches the actual `@firebase/auth` React Native runtime export.

## Explicit development smoke check

Set `EXPO_PUBLIC_RUN_DEVELOPMENT_SMOKE=true` in the optional mobile `.env`, restart Metro, and open the app. The existing screen remains Hello World. Development logs report success or failure for shared Firebase service initialization and AsyncStorage write/read/remove using a unique temporary key. The helper `runDevelopmentSmokeCheck` in `apps/mobile/src/lib/development-smoke.ts` can also be invoked from development code. It makes no auth or server requests and rejects calls in production.

The helper has not yet been exercised on a device in step 2; step 4 verifies it on Android. It is separate from the Auth/Firestore/Functions emulator request checks owned by step 3. No application features or test UI are included.

## Documentation consulted

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Expo documentation index](https://docs.expo.dev/llms.txt)
- [Expo Router installation](https://docs.expo.dev/router/installation/)
- [Expo Firebase guide](https://docs.expo.dev/guides/using-firebase/)
- [Firebase Auth API](https://firebase.google.com/docs/reference/js/auth)
