# Mobile development

Keep the Hello World skeleton until features are requested. Use Expo Router with routes in `src/app/`; keep libraries, hooks and other non-route code outside that folder.

Before changing Expo or React Native APIs, read the installed Expo major version and its matching docs at `https://docs.expo.dev/versions/v<major>.0.0/`. For other Expo topics, use `https://docs.expo.dev/llms.txt` to find the official page.

Use the root npm workspace and lockfile. Install mobile dependencies with `npx expo install <package>` from this directory to resolve SDK-compatible versions. Local testing uses SDK 57 Expo Go; select libraries supported by Expo Go. Native builds require a separate explicit request.

Run root `npm run check` after changes. For dependency or native configuration changes, also run `npx expo install --check` and `npx expo-doctor` here. Keep `ios/` and `android/` generated; configure native behavior through Expo configuration rather than editing generated files.

Read `../../docs/mobile-development.md` for environment and phone setup. Firebase Auth persists through AsyncStorage on native devices; the optional smoke check only verifies initialization and local storage, without signing in or accessing the database.
