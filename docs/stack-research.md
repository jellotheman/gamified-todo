# React Native + Firebase research

Research date: 8 October 2026. Recommendations below are architectural judgments; linked documentation and repositories are primary sources.

## Recommended stack

Use **Expo + React Native + TypeScript + Expo Router**, Firebase Authentication, Cloud Firestore, Cloud Functions for Firebase (Node.js/TypeScript), and Firebase Admin SDK. Add Storage only for attachments/avatars. Firestore listeners can provide task/progress updates; callable functions provide the API for awarding rewards. A separate Express server, SQL database, or ORM is unnecessary for this scope.

For the skeleton, Firebase's modular **JavaScript SDK** gives the simplest Expo Go and web path. Expo currently requires `firebase@12.0.0` or newer; use `npx expo install firebase` and lock compatible versions. Native Analytics/Crashlytics require **React Native Firebase** and an Expo development build; React Native Firebase cannot run inside Expo Go. Choose the native route upfront if those capabilities are required. [Expo Firebase guide](https://docs.expo.dev/guides/using-firebase/)

## Reward integrity

Implement `completeTask(taskId, occurrenceId)` as an authenticated callable function. Validate ownership, derive rewards server-side, then atomically write completion, reward-ledger entry, XP, and relevant progress. A deterministic ledger key per task occurrence prevents retry/double-tap rewards; reopening a task should not mint another reward. This is our proposed design, supported by callable authentication context and atomic Firestore transactions. Keep transaction callbacks free of external side effects because they may rerun. [Callable functions](https://firebase.google.com/docs/functions/callable), [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

Security rules should deny client writes to reward totals/ledger. Test rules and functions with the Auth, Firestore, and Functions emulators, including cross-user access, duplicate/concurrent completion, timezone day boundaries, and recurrence. [Emulator workflow](https://firebase.google.com/docs/functions/local-emulator)

## Concrete code worth adapting

| Repository/code path | Useful practice | License/reuse note |
|---|---|---|
| [firebase/functions-samples: callable-functions/functions/index.js](https://github.com/firebase/functions-samples/blob/main/Node/quickstarts/callable-functions/functions/index.js) | `onCall`, input validation, `request.auth`, structured `HttpsError` responses | Apache-2.0; preserve applicable notices. Adapt to TypeScript and our Firestore transaction. |
| [firebase/quickstart-testing: firestore.spec.ts](https://github.com/firebase/quickstart-testing/blob/master/unit-test-security-rules/test/firestore.spec.ts) | Emulator test environment, authenticated/unauthenticated contexts, rules assertions | Apache-2.0; useful test scaffolding rather than a complete app. |
| [expo/examples: with-firebase-storage-upload/App.js](https://github.com/expo/examples/blob/master/with-firebase-storage-upload/App.js) | Expo image picker → Firebase Storage upload | MIT; optional avatar/attachment reference. Modernize its class UI and verify APIs against selected Expo versions. |
| [Habitica: scoreTask.js](https://github.com/HabitRPG/habitica/blob/develop/website/common/script/ops/scoreTask.js) and [tests](https://github.com/HabitRPG/habitica/blob/develop/test/common/ops/scoreTask.test.js) | Task scoring and reward edge cases | Study as design reference. [License](https://github.com/HabitRPG/habitica/blob/develop/LICENSE) assigns GPLv3 to code and separate CC licenses to assets, including noncommercial restrictions; avoid copying into a permissively licensed app without reviewing obligations. |

Pin any code actually reused to a commit and record attribution; these links currently follow upstream branches.

## Firebase MCP

An official server exists via `firebase-tools mcp`, authenticating with Firebase CLI credentials. It can inspect/configure projects, Auth, Firestore, and rules; `--only` limits exposed feature groups. Useful during later setup, unnecessary for this research or an emulator-only skeleton. No installation performed. [Official Firebase MCP documentation](https://firebase.google.com/docs/ai-assistance/mcp-server)
