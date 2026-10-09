# Frontend validation (#5)

Coordinator evidence on 9 October 2026 using the existing `http://localhost:8081` server and the private account supplied in chat:

- Browser sign-in worked. Account displayed the real identity, and Back to tasks preserved an entered capture draft.
- Keyboard Done created one marked disposable task. Saved title editing, completion, undo and recompletion worked with confirmed section movement.
- A 200-character title wrapped at narrow width without horizontal overflow. Edit autofocus and return focus were verified.
- Guarded deletion was first cancelled, then confirmed; both disposable tasks were removed. After the deletion return-focus repair, browser focus was verified on the Task title textbox.
- Sign-out removed private content. Final sign-in after sign-out succeeded.
- The active server was reused without restart. No credentials, production configuration changes or authentication bypass were added.

Measured opaque text/background contrast after the user-directed neutral palette adjustment: ink/canvas 16.87:1, ink/panel 14.21:1, secondary/panel 8.75:1, canvas/gold 10.55:1, saved/panel 9.48:1, error/panel 9.01:1. These measurements do not establish every translucent, pressed, focus or disabled rendered state.

Final coordinator root checks passed lint, TypeScript and 72 tests after the deletion-focus repair. Focused task checks also passed 13 tests and TypeScript. Expo dependency check reported current versions and Expo Doctor passed 21/21. Controlled screen/repository tests cover retained failed input, pending locks, retries, cache/unconfirmed states, bounded paging and observation races; these are automated evidence rather than live browser simulations of every failure.

The user reports the live iPhone UI works. A complete native checklist has not been exercised by the agent: iPhone/Android keyboard avoidance with large text and open dialogs, VoiceOver/TalkBack labels and focus restoration, safe-area reachability, session restart and native offline recovery remain pending. Ordinary browser verification is agent-owned and is not assigned to the user as phone work.
