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

The app first restores any saved session, then displays registration/sign-in or the authenticated private task list. New accounts receive a private profile with daily goal 3 (editable goal UI comes later). Password-reset responses deliberately do not disclose whether an account exists. Inputs survive failed operations; retry using the same submit control. Sign-out immediately hides private content, including when sign-out needs retry.

Optional initialization/storage smoke logging: uncomment `EXPO_PUBLIC_RUN_DEVELOPMENT_SMOKE=true` in `.env.local`, restart Metro, then open the app and inspect its logs. Success confirms Firebase Auth/Firestore share the configured app and a temporary AsyncStorage value was written, read and removed. The smoke check itself makes no sign-in or Firestore request; the authenticated screen normally initializes/subscribes to its private profile. Disable the flag afterward.

## iPhone identity verification

Use SDK 57 Expo Go with the real development project and an ordinary private email/password account. Record these checks separately from mocked tests:

1. Start with no session. Confirm restoration is distinguishable from sign-in. Register with a private email/password; confirm Your tasks and “Your private account is ready.”
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

## iPhone task-loop verification (#3)

Use SDK 57 Expo Go and the real development project. The user reported that the task loop works on Web and iPhone in the live SDK 57 Expo Go session. The full restart, second-account isolation, offline recovery and VoiceOver/large-text checklist remains pending until those outcomes are explicitly recorded.

1. After sign-in, distinguish private-account/list loading from empty sections. Add a title with surrounding spaces; confirm one trimmed task appears under Active. Submit blank input and a title over 200 characters; confirm readable errors and retained editable input.
2. Edit a title, cancel once, then save. Complete a task; tap repeatedly while pending and confirm a single saved completion. Undo, then complete again. Confirm it moves between sections without duplicate rows. Daily counts and goal controls are outside #3.
3. Open Delete task and choose Keep task; confirm it remains. Confirm deletion on a different marked test task. Force-close/reopen Expo Go and verify saved creation, edited titles, completion/undo and deletion persist.
4. Lose connectivity while adding/editing/completing/deleting. Pending and last-confirmed/cache status must never claim successful persistence. Failed capture keeps the original title and document identity; Retry adding task intentionally locks that submitted draft until confirmation. Edit failures keep the entered title; completion/deletion offer explicit retry. Restore connectivity and retry; confirm no duplicate creation or changed timestamp from repeated completion.
5. With more than 25 tasks in each section, use Load more active tasks and Load older completed tasks. Check section ordering (newest creation for Active; newest saved completion for Completed), equal-time stable order, and realtime edit/delete/undo/recompletion from another controlled session. Newly completed tasks must appear in recent history even after loading older history.
6. Sign out while work is pending, then sign in to a second private account. Confirm no former titles, drafts, errors or pending state appear. Force-close/reopen and repeat account isolation. Sign-out failure must keep private content hidden with retry/return controls.
7. With VoiceOver and large text, exercise labeled capture/edit fields, readable errors, completion/undo, paging and guarded deletion. Confirm comfortable touch targets and keyboard Done submits once. Edit/delete dialogs must remain reachable after scrolling far down the list; verify keyboard avoidance and cancellation.
8. Remove any marked device-test data. Record iPhone outcomes separately from mocked screen tests and development SDK/rules checks. Android remains pending too.

Each section listens to a bounded window, initially 25 displayed tasks plus one lookahead. Explicit paging expands that section by 25 and replaces its listener; it does not accumulate stale cursor pages. All loaded records continue to receive realtime changes. Lists show only server-confirmed snapshots; while connectivity is unconfirmed, previously confirmed records may remain visible with a status message. A cold offline start cannot substitute cached data for confirmed loading. There is no durable offline outbox; unsaved input/draft recovery lasts within the current signed-in screen, not across a forced app shutdown.
