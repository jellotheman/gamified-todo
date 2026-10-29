# Product direction: a small daily quest board

Research and proposal · 29 October 2026. The user supplied the videos as inspiration and has not committed to their systems. This is a direction to review, not an approved implementation spec. Existing app behavior, GitHub trackers and Figma designs were not changed. Recommendations are design judgments; the videos describe their creators' experiences and do not establish effectiveness for everyone.

## Recommendation

Make a personal quest board for **real-life actions**: one-off tasks plus a few daily routines, with cumulative progress in the life areas the user cares about. Keep the existing task app as the foundation. A person should be able to add “Submit assignment,” keep “Read for 10 minutes” as a daily routine, check either off, and see understandable progress.

The first game mechanic should be **credited activity days in each area**, rather than an economy of XP, coins, health, equipment and shops. An optional “Pick a side quest” button can help choose an available task. It is a decision aid, with no reward calculation or obligation to accept the suggestion.

This chooses a small synthesis from the videos. It does not reproduce every feature of either system or of Habitica.

## What was examined

The coordinator obtained both complete public videos with audio, original automatic captions and metadata, read the captions, and inspected 30 selected video frames across four contact sheets. This is sampled visual inspection alongside the captions, not a claim to have watched every second. Automatic captions may contain transcription errors. Metadata dates the Skill Tree video to 26 September 2026 (20:01) and Jess Less's video to 18 September 2026 (33:20).

### Skill Tree: I Turned My Life Into a Character Sheet

- [1:31](https://www.youtube.com/watch?v=NyHonQz6R3g&t=91s): activities are grouped into Mind, Body, Craft, Bonds and Empire.
- [5:51](https://www.youtube.com/watch?v=NyHonQz6R3g&t=351s): the creator rejects consecutive-day requirements for skill-tree growth; doing three days, missing one, then doing two still represents five days of effort. Tracking too many habits also became overwhelming.
- [9:15](https://www.youtube.com/watch?v=NyHonQz6R3g&t=555s): revised branch thresholds are 5, 15, 30, 50 and 80 credited days; multiple activities in one branch on one day still count once. The source uses roughly three-month seasons.
- [11:14–14:50](https://www.youtube.com/watch?v=NyHonQz6R3g&t=674s): optional loot, explanatory buff/debuff notes, monthly quests/feats and priority habits add further layers. The common-loot rule still includes a weekly streak exception.

Visuals show a character/skill-key spread, branching progress nodes with facing loot notes, a monthly quest log and a habit calendar. These are separate notebook surfaces. Our proposal retains cumulative progress and intentionally omits seasonal resets, feat bonuses and loot rules.

### Jess Less: I hate planners so I made a Quest Board instead

- [21:37](https://www.youtube.com/watch?v=Pm20ZCJNawo&t=1297s): reusable daily and weekly quest checklists cover repeated actions.
- [22:46–24:08](https://www.youtube.com/watch?v=Pm20ZCJNawo&t=1366s): time blocking uses rearrangeable task cards containing an exact slot or a duration.
- [25:09](https://www.youtube.com/watch?v=Pm20ZCJNawo&t=1509s): numbered small side quests and a dice roll help choose the next action. Tasks can include enjoyable or social activities.
- [28:22](https://www.youtube.com/watch?v=Pm20ZCJNawo&t=1702s): personally assigned coin values and chosen rewards form an **alternative** to random selection. The video does not require combining everything into one economy.

Visuals confirm a wall calendar, reusable daily checklist, separate timed cards and physical numbered side-quest cards. Our proposal borrows visible actionable choices and optional random selection, while leaving calendar scheduling and the coin shop out of the first version.

## Smallest useful version

| Part              | Concrete behavior                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quest board       | Existing one-off tasks remain; add daily routines only. Start with two or three routines, not a large compulsory checklist.                                                 |
| Clear actions     | Each item describes a binary action, such as “Walk for 10 minutes.” No water counters, time tracking or automatic activity detection.                                       |
| Life areas        | A small set of optional areas, inspired by the video's five branches. Assign an item to one area or leave it uncategorized. Empty areas need not dominate the screen.       |
| Daily completion  | A routine can be completed once for the current day; it becomes available on the next day. A one-off stays completed.                                                       |
| Growth            | Completing any categorized action credits that area's day once. Several same-area completions that day still give one credit. Count credited days toward simple milestones. |
| Forgiveness       | Missed days cause no lost progress, HP damage, debt or streak reset. Undo corrects an accidental completion and recalculates that day's credit.                             |
| Side-quest choice | Optionally suggest an active, actionable one-off task. The user can skip or choose manually. Do not let chance override appointments or deadlines.                          |

Example: complete a Craft action on three days, miss a day, then complete it on two more days: Craft has five credited days. Sketching and guitar practice on the same day add one Craft day, not two. This tracks recorded participation; it does not measure actual mastery, fitness or intelligence.

Using categorized one-off actions as well as routines for area credit, and using lifetime cumulative milestones without seasons, are simplifications proposed here. They are not presented as the exact rules of the source notebook.

The first release can use just two product surfaces: **Quests** for daily actions/one-offs and **Progress** for area growth. Keep the working Account flow. Reuse the current dark retro style and compact editor/menu direction. A full character creator, skill dependencies, classes, combat, currency, reward shop, loot rarity, arbitrary recurrence, subtasks, calendar, timer, notifications and social systems can wait.

## What can be reused and what needs care

The [current repository](../apps/mobile/src/lib/private-repository.ts) already supplies private identity-scoped persistence, stable task identities, transaction-based mutations and bounded active/completed lists. The existing task record contains only title, creation time and nullable completion time. A private daily-goal setting exists, but its UI is not implemented. These are source observations, not assumptions about future architecture.

Daily routines need a stable **per-item, per-day completion identity**. Area progress must count distinct completed days across all relevant records, rather than the currently loaded task rows. Multiple same-area actions, retries and repeated taps must not grant duplicate credit. Undo should remove an area's credit only when no other qualifying action remains for that day. Existing tasks should survive the change; no historical credit should be invented from incomplete evidence.

Choose a consistent local-day policy before implementation, including midnight/resume refresh, travel, editing an item's area, and deleting or archiving an item with history. The current mutable `completedAt` alone cannot preserve a routine's completion history. A date-specific completion record is a natural small extension; exact schema and rules belong in a later spec.

No background midnight job is inherently required: daily availability can be derived when the app opens/resumes and when the date changes. Keep Expo Go, the Firebase JS SDK and the existing free-plan constraints. [Expo documents this SDK path for Expo Go](https://docs.expo.dev/guides/using-firebase/). Firebase [aggregation queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries) are server queries without realtime/offline listeners; any use needs explicit refresh and honest loading/error states. [Cloud Functions deployment requires Blaze](https://firebase.google.com/docs/functions/get-started), so adding a scheduler is outside this project's constraints.

[Habitica's own FAQ source](https://github.com/HabitRPG/habitica/blob/develop/website/common/locales/en/faq.json) distinguishes one-off To-Dos, scheduled Dailies and repeatable/unscheduled Habits. Its full reward/penalty model is broader than this proposal. We only need the first two action patterns initially; repeated “plus/minus” habit counters introduce another interaction model without being necessary for this version.

## Where the project stands

The last recorded implementation work was on **9 October 2026**: private email/password identity and dependable task management were completed, followed by dark retro authentication/Account and task screens. Issues [#2](https://github.com/jellotheman/gamified-todo/issues/2), [#3](https://github.com/jellotheman/gamified-todo/issues/3), [#5](https://github.com/jellotheman/gamified-todo/issues/5), [#6](https://github.com/jellotheman/gamified-todo/issues/6) and [#7](https://github.com/jellotheman/gamified-todo/issues/7) are closed. Later local commits refined body typography to Pixelify Medium, added formatting hooks, and recorded interaction spec #8. The coordinator's fresh root check on 29 October passed lint, TypeScript and **72 tests across eight suites**. Full native accessibility/offline/device verification remains incompletely recorded in [frontend validation](frontend-validation.md).

Before this research note was added, local `dev` was clean at `0921db3`, three commits ahead of remote `dev`. Remote `dev` and `main` both point to `6e77484`; their latest recorded Actions runs passed on 9 October. This describes source state, not a deployed app release. No app implementation, GitHub issue edits, Figma edits, or Git push occurred during this research.

The actual two-page [Gamified Todo Figma file](https://www.figma.com/design/dFOaKXsdgNgVLSRtriQS6N) contains:

- **Mobile interaction reference** (`0:1`): ten task states, design foundations/controls/task patterns, an interaction guide and reusable app components. States include create/edit sheets, task actions, guarded delete, completion/Undo, and Saving/Retry.
- **Remade Screens** (`2014:5142`): two rebuilt screens, populated and empty task lists.

The older [reference linked from #8](https://www.figma.com/design/XLg2tasCMGF2bpUWauBYBo) is a different one-page file. Figma design references and planned interaction states should not be mistaken for implemented app behavior. No Figma content was changed.

## What to do with the three open trackers

These are internal planning trackers, not reports from outside users. No tracker was edited during this research.

| Tracker                                                                                                            | Current position                                                                                              | Proposed treatment if this direction is accepted                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#1: Private task management with forgiving daily progress](https://github.com/jellotheman/gamified-todo/issues/1) | Parent spec; identity and task-management children are complete.                                              | Preserve its history and link a new concise direction/spec that supersedes the remaining product assumptions.                                                                                                              |
| [#4: Forgiving daily completion progress](https://github.com/jellotheman/gamified-todo/issues/4)                   | Unimplemented; its #2/#3 blockers are closed. Plans an adjustable daily task-count goal/bar.                  | Defer and reconcile with cumulative area growth before implementing. A separate arbitrary daily target is not needed to prove the proposed game loop. Keep its useful day-boundary, confirmed-data and privacy safeguards. |
| [#8: Smooth mobile task interactions and immediate updates](https://github.com/jellotheman/gamified-todo/issues/8) | Ready-for-agent spec; its interaction implementation has not started. Typography refinement is already local. | Retain compact add/edit, accessible actions, Undo, honest pending/retry and account isolation. Narrow the first implementation around the chosen quest loop; optional swipe work and exhaustive motion polish can follow.  |

The next useful deliverable is one compact implementation spec for this loop, followed by one working vertical slice. Agreeing the product direction comes before reopening the Figma effort or implementing every old tracker as written.
