# Gamified Todo

Expo SDK 57, TypeScript, Expo Router and Firebase. Register or sign in with email/password, reset your password and sign out. Sessions persist locally. The authenticated task screen supports private capture, title editing, guarded deletion, completion and undo, with server-confirmed saves and paged active/completed lists. Daily goal UI comes later.

Install Node.js 22.13 or newer. From the repository root in PowerShell:

```powershell
npm ci
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
npm start
```

Copy the environment file only on first setup; it contains the existing development Firebase public configuration. Keep your computer and phone on the same Wi-Fi, then scan Metro's QR code with SDK 57 Expo Go. See [mobile development](docs/mobile-development.md) for Android and iPhone installation and troubleshooting.

Run `npm run check` before committing. GitHub Actions runs the same lint, TypeScript and mocked tests on `dev` and `main`; it does not deploy anything. Work on `dev`, verify its exact commit in Actions, merge it into production `main`, then sync `dev` from `main`.

[Firebase configuration and manual rules deployment](docs/firebase-development.md) · [Implementation checklist](docs/implementation-checklist.md)

Everyday changes start on `dev` and finish with checks and a local commit. Push only when the user explicitly instructs it; the following push/promotion workflow requires that authorization:

```powershell
git switch dev
npm run check
git add -A
git commit -m "Describe the change"
git push origin dev
```

Wait for that exact commit's **Checks** run to pass, then promote and sync:

```powershell
git switch main
git merge --no-ff dev
git push origin main
git switch dev
git merge main
git push origin dev
```

Confirm Checks pass for both pushed branch tips.
