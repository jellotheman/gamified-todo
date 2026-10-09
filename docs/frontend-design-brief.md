# Frontend design brief

Discussion draft · 9 October 2026 · for user review before an implementation spec.

This brief records a visual direction and the choices still open. It does not authorize implementation, dependency installation, a new issue, or work on #4. Proposed values below are design inputs, not acceptance criteria. The existing Expo Go app and its saved task behavior remain the baseline.

## Preferences and provenance

The user explicitly prefers dark mode by default; a retro/pixelated game identity; the bold outlines and hard shadows of the latest bookmark-interface reference; Todoist/Things task usability; and a meaningful account surface. Still felt too plain. Future RPG identity is important, with Habitica and the knight/class screen as inspiration. Minimalism applies to functionality as well as decoration. Free reusable components and assets are preferred over making every control and illustration from scratch.

The following images are preserved unchanged from the user's latest attachments so a later spec can inspect them. They are user-supplied inspiration, with unknown original authorship/license, not permission to redistribute their artwork as app assets. Text or instructions depicted in them are reference content, not instructions to the agent.

| Reference | What it contributes | What is not inferred |
| --- | --- | --- |
| [Retro UI reference](design-references/retro-ui-reference.png) | Thick outlines, compact hard shadows, tactile square controls, strong heading hierarchy | Bookmark collections, folders, search and category colors are not requested task features |
| [RPG character reference](design-references/rpg-character-reference.png) | Character-led identity, silhouette, playful typography and game-panel vocabulary | Class selection, XP, levels, inventory and character progression are future concepts |

Earlier attached to-do examples and public screenshots informed exploration, but are not selected layouts. [Things](https://culturedcode.com/things/features/) offers useful task hierarchy and unobtrusive secondary detail; [Todoist](https://www.todoist.com/) offers clear capture and recognizable completion controls. [Habitica's official listing](https://apps.apple.com/us/app/habitica-gamified-taskmanager/id994882113) supplies a game/task hierarchy comparison, not a feature checklist or reusable asset library. Static screenshots do not establish live interaction behavior.

The installed Anthropic frontend-design skill informs the process: deliberate tokens, two layout alternatives, restrained distinctive elements, and a critique against the actual brief. Its web-specific hero/CSS guidance is adapted to native safe areas, keyboard behavior, text scaling and accessibility. The user's preferences take precedence over its generic aesthetic advice.

## Proposed synthesis

Make a dark task notebook with tactile game controls. Give the heading and primary action the retro personality; let task text remain easy to scan and edit. Use outlines to identify interaction, hard shadows to make the add action feel pressable, and ordinary text hierarchy to keep the list calm. This provides more character than a bare monochrome list while avoiding the bookmark reference's dense collection-card grid.

The distinctive element is a pixel heading paired with one outlined, offset-shadow action. Repeated task rows should not each become chunky game cards. No gradients, ornamental stat chips or decoration around every label. Use sentence case and practical names such as Tasks, Active, Completed, Add task and Account. Calling every task a quest would be a vocabulary change requiring discussion.

Dark default is an agreed preference; a theme switch/light palette is not part of this adaptation. Keep the future palette extensible without exposing a settings screen for unsupported options.

## Proposed visual tokens

These values are starting points for phone mockups. Preliminary opaque color-pair contrast has been measured with the standard sRGB relative-luminance formula; rendered controls still need verification in the eventual implementation.

| Core color | Hex | Role |
| --- | --- | --- |
| Canvas | `#151821` | Main dark background |
| Panel | `#242936` | Inputs, account/editor surfaces and pressed rows |
| Ink | `#F4F6FC` | Primary text and strong outlines |
| Secondary ink | `#B5BED0` | Supporting copy and completed titles |
| Action gold | `#F4CB59` | Add action, focus indication and future progress fill |
| Shadow | `#07090F` | Small hard offset behind selected raised controls |

Semantic accents: saved/check `#8CD8AA`, warning/pending `#F4CB59`, error/delete `#FFADB5`. Each has a text/icon cue; color never establishes persistence by itself. Structural dividers may use a translucent Ink tint, but actionable input boundaries need sufficient contrast. Gold buttons use Canvas-colored text, not white. Do not fade errors or disabled labels into illegibility.

| Proposed opaque pair | Contrast ratio |
| --- | --- |
| Ink on Canvas / Panel | 16.41:1 / 13.45:1 |
| Secondary ink on Panel | 7.78:1 |
| Canvas text on Action gold | 11.43:1 |
| Saved/check or Error text on Panel | 8.66:1 / 8.23:1 |

These calculations cover the proposed opaque tokens only. Translucent boundaries, pressed/disabled/focus states, font rendering and actual device appearance still require review; a high text ratio alone does not establish accessible controls.

| Typography role | Proposed face and size/line height | Guidance |
| --- | --- | --- |
| Main heading | Pixelify Sans SemiBold, 30/36 | One expressive heading, sentence case; wrap when text scales |
| Section/editor heading | Platform system sans, semibold, 20/26 | Quiet hierarchy; no pixel font for every label |
| Task title and input | Platform system sans, regular, 17/24 | Unicode, long titles and reading comfort come first |
| Action label | System sans, semibold, 16/22 | Explicit verbs; minimum-size buttons can grow vertically |
| Status/supporting copy | System sans, regular, 15/21 | Pending, retry and validation are first-class content |

[Pixelify Sans](https://github.com/google/fonts/tree/main/ofl/pixelifysans) and [Silkscreen](https://github.com/google/fonts/tree/main/ofl/silkscreen) are both verified [OFL 1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/OFL.txt) / [OFL 1.1](https://raw.githubusercontent.com/google/fonts/main/ofl/silkscreen/OFL.txt). Pixelify is proposed first for a less rigid display heading; Silkscreen is an alternative to compare visually. Use one, not both. Bundle only selected font files and their copyright/license; do not rely on remote runtime fetching. System body text adds no separate font asset. Unsupported heading characters must fall back legibly. A font-load failure must leave a usable system heading.

Spacing scale: 4, 8, 12, 16, 24 and 32 logical units. Start with 20-unit horizontal screen padding; 16-unit row gaps/padding; a 56-unit minimum row height that expands with content. Interactive targets should be at least 48 by 48; separate checkbox, title and overflow targets so hit areas do not overlap. Primary outlines are 2 units, dividers 1; corners 4 for controls, 8 for large editor/account surfaces. A hard 3-unit offset can distinguish the primary button; avoid blurred elevation and shadows on every row. Press feedback can compress that offset immediately, without implying a save. Layout dimensions are minimums, not fixed-height text containers.

## Layout alternatives for review

**A. Notebook with framed composer.** One header, continuously readable Active and Completed sections, framed capture above the list. Account opens from a clearly labeled header action. Left-aligned content throughout.

```text
Tasks [pixel heading]              [Account]
[ Task title............................. ]
[ Add task ]
Active
[ ] Buy groceries                      [...]
[ ] Send the revised presentation       [...]
    to Priya before the meeting
[ Load more active tasks ]
Completed
[v] Book the dentist appointment        [...]
[ Load older completed tasks ]
```

**B. Framed list with a persistent add control.** A lightly outlined list panel gives the game frame more presence; Add task opens a native modal editor. The add control remains reachable without scrolling, provided it does not cover rows or the keyboard.

```text
Tasks [pixel heading]              [Account]
+-----------------------------------------+
| Active                                  |
| [ ] Buy groceries                 [...]  |
| [ ] Send the revised presentation [...]  |
| Load more active tasks                   |
| Completed                               |
| [v] Book the dentist appointment  [...]  |
| Load older completed tasks               |
+-----------------------------------------+
                              [ Add task ]
```

Proposal for review: start from A. It preserves the current visible capture loop, makes task entry discoverable, and spends the bold treatment on useful controls. B gives stronger game-panel structure and more list space at rest, but introduces modal capture and an additional step. Neither includes fake progress, empty avatar slots, dates, projects or an In Progress status. Completed stays visible initially to preserve the present two-section model; collapsing it would be a separate interaction choice.

## Critique against the brief

An all-pixel interface would make long task titles and small recovery text harder to read; expressive display type belongs in headings while task content stays readable. Repeated chunky cards would spend the user's preferred outlines/shadows on every item and reduce task space, so A trades some game framing for the usability admired in Todoist and Things. Paper is a control foundation, not the visual direction: default Material pills, typography and elevation would dilute the requested tactile retro treatment and need deliberate overrides. A placeholder RPG dashboard would imply unsupported progression and distract from the working task loop; future game identity is recorded as vocabulary instead.

The strongest remaining uncertainty is whether a pixel heading, restrained outlines and tactile primary action provide enough game identity for this user. Later mockups should compare that intensity with B and selected CC0 pixel artwork before the design becomes a spec. The brief intentionally leaves that judgment open.

## Existing screens and capability adaptation

| Surface | Proposed presentation | Existing capability boundary |
| --- | --- | --- |
| Session restoration | Quiet loading state with readable status | Wait for identity; never briefly expose private tasks |
| Sign in / registration / password reset | Shared dark panel, readable labels, pixel page heading and outlined submit | Preserve existing email/password modes, retained input, generic reset acknowledgement and recovery |
| Tasks | Active and Completed rows, capture and section-specific loading/retry/paging | Preserve private title-only add/edit/delete/complete/undo; separate initial 25-task windows and expansion controls |
| Task editor | Native modal with title, Save changes, Cancel and guarded Delete task | No descriptions, due dates, priority, recurrence, subtasks or drag ordering |
| Account | Proposed presentation of signed-in email, Back to tasks and Sign out | Identity stores uid/email; profile stores dailyGoal only. No editable nickname, photo, biography, class or unbacked account settings |
| Sign-out recovery | Clear status and retry/return controls with private content hidden | Preserve the existing immediate privacy gate on sign-out, including failure |

Account is an information/navigation surface around existing identity, not a new profile model. It should show the actual signed-in email or a clear fallback when absent. Password reset remains the existing authentication-form flow; this brief does not add a reset action inside the authenticated account surface. Do not surface the stored goal as an editable account setting before #4 is specified.

## Task interactions and recovery

Show realistic task content: Buy groceries; Book the dentist appointment; Send the revised presentation to Priya before the meeting. Long titles must wrap without truncating the only meaningful task content; editing remains available for the full 200-character bound. Completion control is separate from title editing. A visible overflow control can expose existing Edit task and Delete task, with accessible names containing the task title; neither swipe nor long press should be the only route.

Capture labels the field Task title and the action Add task. Keyboard Done submits once. Blank/overlong input uses existing validation with the title retained. Once submission is uncertain, preserve the frozen draft title/id and explain Retry adding task; avoid making the locked draft appear editable. Clearing or replacing that uncertain draft would change current semantics.

Edit uses Save changes and Cancel; errors retain the entered title. Delete presents Delete task? and the title, with Keep task and Delete task as distinct actions. Follow the current pending-dialog close safeguards rather than silently dismissing an uncertain operation. Completion/undo remain reversible desired-state operations; repeated taps while pending must not suggest repeated saved achievements.

| State | Design treatment |
| --- | --- |
| Loading | Text plus indicator within the relevant section; no empty-success message before confirmed data |
| Confirmed empty | No active tasks. Add a task to get started. Completed has its own quiet empty copy |
| Pending mutation | Local action/row status such as Saving task… or Saving completion…; busy semantics and disabled duplicate action |
| Failed/unconfirmed | Readable explanation near the affected input/row and explicit retry; keep content and operation identity |
| Cached/pending list | State that server confirmation is unavailable; retain last-confirmed content honestly |
| Subscription error | Section-specific Retry loading tasks; one section failing does not imply the other is empty |
| Paging | Preserve Load more active tasks / Load older completed tasks and their loading/error states |

Avoid calling any cache result Offline unless connectivity is actually known; a cache flag alone is not a network detector. There is no durable offline outbox. Do not promise background synchronization or a successfully saved task while offline.

## Snappy feedback and the server-confirmation boundary

The current repository uses Firestore transactions for mutations and ignores cached/pending-write snapshots as confirmed list content. Capture retains a prepared draft id/title until acknowledgement; completion moves according to confirmed observations. These facts come from [private-repository.ts](../apps/mobile/src/lib/private-repository.ts) and [task-screen.tsx](../apps/mobile/src/components/task-screen.tsx). A visual redesign must preserve this truthfulness.

Immediate press feedback is presentation work: change the button's pressed outline/offset and show a pending indicator promptly. It can make the interface feel responsive without pretending a task was saved. Saved completion feedback may be a short check emphasis once confirmed; no continuous sparkle, confetti or success message during a pending write. Respect reduced motion.

For a later spec, recommend considering an immediate provisional capture row and pending completion checkmark overlay, with explicit Saving… / Retry status, as a separate behavioral amendment. This is a proposed choice awaiting agreement, not part of a visual-only implementation. Keep the repository's transactions and stable draft ids: no write-design change is inherently needed for a local overlay. Keep an unconfirmed completion in its original section with a pending checkmark rather than silently removing/moving it. Replace a capture overlay by the matching id once a confirmed window contains it; reconcile completion against the confirmed desired state without duplicate section membership. On failure, retain the retry identity and label uncertainty; do not fabricate server timestamps or invent a confirmed ordering position. Any saved/reward count comes only from confirmed data, never the overlay or the number of loaded rows in a bounded window. Purge overlays with owner/session state and ignore late responses; remount recovery must not promise durable retention that does not exist. These rules would need focused behavioral tests. Durable offline queuing remains a larger, out-of-scope change. Firebase documents [local listener events/pendingWrites](https://firebase.google.com/docs/firestore/query-data/listen) and [transactions failing offline](https://firebase.google.com/docs/firestore/manage-data/transactions); latency compensation does not automatically give this transaction-based screen optimistic rows.

## Reusable native foundation and free resources

Recommend a narrow React Native Paper foundation, themed through small app-owned wrappers, for the later implementation discussion. Reuse inputs, buttons, checkbox controls, helper text and busy indicators; keep the existing repository/session logic and native modal shell. Add the retro visual layer around reusable controls rather than importing an entire dashboard/starter kit or copying screenshot UI. The eventual component selection still needs an SDK 57 phone spike; no library was installed or tested here.

| Resource | Current/proposed use | License and compatibility evidence |
| --- | --- | --- |
| Existing React Native, Expo Router, safe-area-context, Reanimated/Worklets | Retain navigation, native modal/keyboard surfaces and existing state boundaries | Current workspace: Expo ~57.0.27, RN 0.86.3, React 19.2.3. No replacement app scaffold |
| [React Native Paper](https://oss.callstack.com/react-native-paper/docs/guides/getting-started) | Proposed reusable control foundation, stable 5.x | [MIT](https://raw.githubusercontent.com/callstack/react-native-paper/main/LICENSE.md); Expo setup documented, safe-area dependency already present. 6.x docs explicitly mark that version unreleased; do not select it inadvertently. Exact SDK 57/RN 0.86 compatibility still needs validation |
| [NativeWind](https://www.nativewind.dev/docs/getting-started/installation) + [React Native Reusables](https://github.com/founded-labs/react-native-reusables) | Alternative when source-owned utility-styled components are preferred | [NativeWind MIT](https://raw.githubusercontent.com/nativewind/nativewind/main/LICENSE), [RNR MIT](https://raw.githubusercontent.com/founded-labs/react-native-reusables/main/LICENSE). NativeWind 4.2.7 explicitly documents SDK 57 support. Requires Tailwind/CSS/Metro/Babel setup; RNR adds selected primitive/icon dependencies. More tooling change for this small existing screen |
| [expo-font SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/font/) + selected Pixelify Sans files | Proposed local runtime font loading, not native font embedding | Expo Go supported; runtime loading avoids a custom native build. Font OFL notices retained |
| [Pack-specific React Native Vector Icons](https://expo.dev/blog/moving-away-from-expo-vector-icons), proposed Ionicons | Reuse check, add, account, back and overflow glyphs; one consistent pack | [RNVI MIT](https://raw.githubusercontent.com/oblador/react-native-vector-icons/master/LICENSE), [Ionicons MIT](https://raw.githubusercontent.com/ionic-team/ionicons/main/LICENSE). Expo documents Expo Go support; prefer scoped packages and verify Paper's icon-provider integration rather than mixing old/new fonts |
| [Kenney Pixel UI Pack](https://kenney.nl/assets/pixel-ui-pack) / [Pixel Adventure UI](https://kenney.nl/assets/ui-pack-pixel-adventure) | Optional reusable decorative panel/button artwork to compare with outline controls | Official pages identify CC0. Select only a small subset after visual review; not downloaded/imported. Bitmap art does not supply focus, labels, hit targets or form semantics |
| [Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | Future RPG-character/environment art candidate only | Official page identifies CC0, 16×16 tiles. Not current live UI or a proposed character feature |

RNR is a React Native adaptation, not merely web shadcn pasted into an app. Its inspected [button](https://github.com/founded-labs/react-native-reusables/blob/main/packages/registry/src/nativewind/components/ui/button.tsx) uses native Pressable with platform-specific web styles; its [dialog](https://github.com/founded-labs/react-native-reusables/blob/main/packages/registry/src/nativewind/components/ui/dialog.tsx) uses RN primitives, Reanimated and lucide-react-native. SVG icons introduce react-native-svg. Do not install the registry's complete dependency list or its authentication examples. Paper minimizes styling-toolchain change here, but its Material defaults need deliberate typography/radius/color overrides.

Reusable controls are not blanket accessibility certification. [Paper's Modal documentation](https://oss.callstack.com/react-native-paper/docs/components/Modal) explicitly directs accessible modal use to React Native Modal. Preserve the existing native modal approach and verify focus, keyboard and screen-reader behavior; do not replace it with a convenient inaccessible overlay.

For any later copied component/font/art, record the exact release/commit or asset archive, source, license and notices. Preserve MIT/OFL notices where required. CC0 assets are free to reuse but still benefit from provenance. Do not copy Habitica code/art or assets from the supplied screenshots: [existing research](gamification-research.md) records GPL and asset attribution/sharealike/noncommercial restrictions. No paid kit, paid font, billing attachment or hosted service is needed.

## Future game vocabulary, not present UI

The user wants RPG identity to remain a real design direction. Document its vocabulary now: framed game panels, pixel display type, readable body text, strong silhouettes, restrained accent and tactile confirmation. These can later support an original character/profile scene without a complete visual restart. Do not add blank avatar slots, XP labels, fake levels or inactive inventory tabs to today's Tasks or Account screen.

**Separate future concept for #4:** a compact daily-goal panel could show Daily goal, a native progress bar and readable saved count such as 2 of 3 tasks completed. The number is illustrative only; it must not appear as live placeholder data. Saved-only counting, editable goal behavior, reset/time-zone details and recovery belong in #4's later spec. This goal bar is not XP. No health deductions, streak reset, lost retained progress or paid recovery. The [gamification research](gamification-research.md) supports exploring understandable, forgiving feedback; it does not prove this visual will improve motivation.

## Accessibility and future validation

Keep system text scaling enabled; allow rows, actions and dialogs to grow, and stack controls when horizontal space runs out. A pixel heading must never force task/input/error text into a pixel face. Modal content scrolls with safe areas and keyboard avoidance; Save/Cancel/Delete remain reachable after scrolling deep in the list. Screen readers receive task-specific completion/undo/action names, checked/busy/disabled state and polite status updates. Restore focus on modal close and avoid hiding task actions inside unexplained icons. Web keyboard focus remains visible too. Review numeric text/input contrast and non-color state cues on actual devices.

Later validation should review both layout variants with short/200-character titles, large text, long email addresses, both sections populated, empty/loading/error states and a keyboard open. Verify add/edit/delete/complete/undo, stable retry identity, account isolation and sign-out privacy on SDK 57 Expo Go for iPhone and Android. Automated bundles/screenshots alone do not establish native usability. Follow [mobile-development.md](mobile-development.md) and [implementation-checklist.md](implementation-checklist.md).

For an eventual approved implementation, use the root npm workspace/lockfile on dev and run root `npm run check`; dependency changes additionally require Expo install --check and Expo Doctor. Check regressions around saved-only semantics rather than tests that mirror colors. Do not push or deploy as a consequence of this brief. The coordinator runs the root check after this documentation handoff.

Relative effort: a token/font/control pass is modest; adapting every recovery/modal/large-text state is the main work. RNR would add tooling/source ownership, while Paper needs control theming and careful icon/modal integration. Pixel artwork can become blurry when stretched and can constrain text layout; trial it only where it remains decorative. Exact package compatibility, dark-mode contrast and platform rendering remain unverified until a later implementation spike.

## Remaining discussion

1. Does the preferred intensity resemble A's quiet rows with bold controls, or B's stronger framed list?
2. Does Pixelify Sans with readable system body text express enough game identity, or should Silkscreen be compared before choosing?
3. Should snappiness stay at immediate press/pending feedback, or become a separately specified provisional-row/completion behavior change?
