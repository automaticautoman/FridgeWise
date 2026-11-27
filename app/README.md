# FridgeWise – Epic 1: Account Access

A working React app for Epic 1 (F01–F05), built on the stack from the product backlog:

| Part | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite, React Router | Backlog says React.js on Vercel. Vite is the fastest React setup. |
| Auth | Firebase Authentication (email/password + Google) | Backlog says Firebase. Handles password hashing, sessions, reset emails and rate limiting for you. |
| Database | Cloud Firestore (`users/{uid}` profiles) | Backlog says Firestore. Works offline with the on-device cache. |
| Security | Firestore security rules (`firestore.rules`) | Users can only read and write their own profile. Nobody can make themselves admin. |
| Offline | Auth session in IndexedDB + Firestore local cache + PWA service worker | F02: stay signed in, including offline. |
| Hosting | Vercel (`vercel.json` included) | From the backlog. |
| Reset codes | Vercel serverless functions (`api/otp/`) + Firebase Admin SDK + any SMTP sender | Firebase has no email OTP. Vercel functions are free, unlike Cloud Functions. |

Everything runs on Firebase's **free Spark plan** and Vercel's free Hobby plan. No Cloud Functions are needed for Epic 1.

## What each feature does

- **F01 Sign up:** name, email and password, or Google. Password rules: 8+ characters, a letter and a number, with live checks. A profile is saved in `users/{uid}`.
- **Confirm email (sign-up code):** email-and-password accounts get a 6-digit code by email and must enter it on `/verify-email` before using the app. `api/otp/email.js` sends and checks it with the user's ID token, then marks the account verified in Firebase Auth. Google accounts are already verified and skip this. Both code emails (sign-up and reset) use the same design in `api/_lib/emailTemplate.js`; edit `TEAM` there to change the names in the footer. Previews: `email-previews/` in the repo root.
- **F02 Sign in and stay signed in:** email/password or Google. The session survives reloads, restarts and going offline (an offline bar shows). Wrong details get one message that never says which field was wrong, so it doesn't reveal whether an email has an account.
- **F03 Forgot password:** emails a **6-digit code**. Enter it on the "Check your email" screen, then **Set a new password**, then **Password updated**. How it's kept safe:
  - The screen and the server reply are the same whether or not the email has an account.
  - Only HMAC hashes of codes are stored (`passwordResetOtps`, server-only; rules block all clients).
  - A code lasts 10 minutes, works once, and allows 5 wrong tries. Each email can get one code a minute and 5 an hour.
  - A correct code is swapped for a one-time token valid for 10 minutes, which sets the password. Then all the account's other sessions are signed out.
- **F04 Change password:** you confirm your current password first (Firebase requires a recent sign-in). New and confirm must match, and the new one can't be the current one. Google-only accounts see the Google screen and can **add a password**.
- **F05 Onboarding:** after sign up, three steps. 1) Create a shared kitchen, create a home kitchen, or join one (the choice is saved; kitchens themselves are Epic 2). 2) Explains reminders **before** asking for notification permission, with iPhone home-screen guidance. 3) Optional vegetarian, halal and allergen preferences. These can be edited later in Settings › Preferences.

## Run it locally (no Firebase project needed)

Needs Node 18+. Java 11+ is needed only for the Firestore emulator.

```bash
npm install
npm run emulators        # terminal 1: Auth + Firestore emulators (UI at http://localhost:4000)
npm run dev:emu          # terminal 2: app at http://localhost:5173
```

No Java? Run the Auth emulator only. Firestore is then replaced by an in-browser stand-in:

```bash
npm run emulators:auth   # terminal 1
npm run dev:emu:nojava   # terminal 2
```

In emulator mode, reset codes aren't emailed. They're printed in the terminal running the app: `[otp] dev mode, not emailed. Code for ...`. To get real emails while testing locally, put the `SMTP_*` values from `.env.example` in `.env.local`.

## Connect a real Firebase project

1. Create a project at console.firebase.google.com (Spark plan is fine).
2. **Authentication › Sign-in method:** enable **Email/Password** and **Google**.
3. **Authentication › Settings:** keep **Email enumeration protection** on (it's the default).
4. **Authentication › Settings › Authorized domains:** add your Vercel domain.
5. **Firestore Database:** create it, then deploy the rules: `npx firebase deploy --only firestore:rules --project <your-project-id>`
6. Add a Web app in Project settings, copy `.env.example` to `.env.local` and fill in the four `VITE_` values.
7. **Reset codes (server):**
   - **Project settings › Service accounts › Generate new private key.** Paste the JSON on one line as `FIREBASE_SERVICE_ACCOUNT`. Treat it like a password: never commit it.
   - Set `OTP_SECRET` to a long random string.
   - Set the `SMTP_*` values. With no domain, use **Gmail**: turn on 2-Step Verification, create an app password at myaccount.google.com/apppasswords, and use it as `SMTP_PASS`. **Brevo** (300 emails a day) also works without a domain. Switch to **Resend** once you have a domain; it's only an env change.
   - Optional: in Firestore, add a **TTL policy** on `passwordResetOtps` field `expireAt` so old records clean themselves up.
8. `npm run dev` locally, or deploy to Vercel with all the env vars above. Vercel turns `api/` into serverless functions automatically.

## Epic 2: Kitchens and sharing (backend)

The server side of F06–F13 is done; the screens are not built yet.

- **Server:** `POST /api/kitchens` with `{ action, ... }` and the user's Firebase ID token as `Authorization: Bearer <token>` (`api/kitchens.js`, logic in `api/_lib/kitchens.js`). One function handles every action, because Vercel's free plan allows 12 functions per project.
- **Browser:** use `src/lib/kitchens.js`. It wraps every action and has live listeners: `watchMyKitchens`, `watchKitchen`, `watchMembers`, `watchActivity`. Error codes have friendly messages in `src/auth/errors.js`.
- **Rules:** clients can only read kitchens they're a member of, and never write kitchens or members directly. Invite codes are server-only.

| Action | Who | What it does |
|---|---|---|
| `create` | anyone signed in | F06. Shared or private kitchen, Fridge/Pantry/Cupboard by default (custom spots allowed), creator is owner and it becomes the active kitchen |
| `update` | owner | Rename, change storage spots, set who can invite (`anyone` / `owner`) |
| `invite` | members (or owner only) | F08. Current 6-character code, or a new one with `renew: true` (old one stops working). 7-day expiry, 5 new codes an hour. Shared kitchens only |
| `revokeInvite` | same | Turns the current code off |
| `preview` / `join` | anyone signed in | F09. "Is this the right kitchen?" then join. 5 wrong codes in a row = 10-minute wait |
| `leave` | any member | F11. Their personal items are deleted, shared items stay. Owner must hand over first if others remain. Last member out deletes the kitchen |
| `removeMember` | owner | F11. Same item handling as leaving |
| `transfer` | owner | New owner; `andLeave: true` for "Make Ali owner and leave" |

Membership events (created, joined, left, removed, owner changed) are written to the activity feed (F13) by the server. Item events are written by members from Epic 3 on. Items live in `kitchens/{id}/items` with `ownerId` and `shared` (true/false), which leaving relies on.

Test it end to end (app running with `npm run dev`, latest `firestore.rules` published): `npm run test:kitchens`. It creates throwaway users and deletes everything afterwards.

Kitchens need Firestore, so they don't work in `dev:emu:nojava` mode. Use the real project, or the Firestore emulator (Java 11+).

## Epic 3: Inventory and quick entry

Screens built from the `epic3-inventory-quick-entry` mockups: Home inventory (`/kitchen`), Add item with search (`/kitchen/add`), Quick-add (`/kitchen/add/quick`), Item form (`/kitchen/item/new`, `/kitchen/item/:id/edit`), Item detail (`/kitchen/items/:key`) and Recently removed (`/kitchen/removed`). Opening the app goes straight to the kitchen (FR3.17).

- **Data:** `src/lib/items.js`. Each purchase is its own batch in `kitchens/{id}/items` (F19); the item page totals batches with the same name, spot and owner. Amounts are stored in g, ml or pieces, so 1 kg = 1000 g (F21, `src/lib/units.js`). Loose items can be tracked by level instead (F22).
- **Catalogue:** `src/lib/catalog.js` has about 90 regional staples with Urdu names for search, default spot, amount and shelf life (F17). **The shelf lives need the Product Owner's sign-off** (SRS FR4.2).
- **Taking out** (F24) removes from the batch that expires first. Every removal goes into `kitchens/{id}/removed` for 30 days so it can be restored (F25); wasted ones are the waste log for Epic 9.
- **"You often add"** (F15) and custom items (F16) are kept per person in `users/{uid}/myItems`.
- Writes are batched (not transactions), so they also queue up offline.
- `firestore.rules` validates every item field and checks the owner is a member (F27). `npm run test:kitchens` covers the item rules too.

Not in Epic 3 (later epics): the separate Expired section and reminder windows (Epic 4; for now "Use these soon" shows items expiring within 3 days, and expired ones are labelled "Expired"), low-stock thresholds and staples (Epic 6), and clearing removals older than 30 days from the database (they're hidden after 30 days).

## Check your setup

After filling in `.env.local`, run `npm run check:firebase`. It checks the browser keys, the service-account key, the OTP secret, that Authentication and Firestore are reachable, and that the email login works. It prints only OK/FIX lines, never the secrets.

## Deploy on Vercel

This app lives in the `app/` folder of the repo, so when importing the repo in Vercel set **Root Directory** to `app`. Framework preset: Vite. Add every variable from `.env.local` under Project Settings > Environment Variables, then add the Vercel domain to Firebase > Authentication > Settings > Authorized domains.

## Not getting the reset code?

Run the checker. It reads the same env files as the dev server and tells you which step is broken:

```bash
npm run check:email -- you@example.com                       # real project (.env.local)
npm run check:email -- you@example.com --mode emulator-nojava  # emulator mode
```

The screen says "code sent" even when nothing was sent, so it doesn't reveal which emails have accounts. The dev server terminal always says why:

- `[otp] dev mode, not emailed. Code for ...`: you're in emulator mode with no `SMTP_*` set. The code is right there in the terminal.
- `[otp] no account for ...`: that email has no account in the backend the server uses. Emulator accounts and real-project accounts are separate, so sign up again in the mode you're running.
- `[otp] emailed a code to ...`: it left the server. Check spam and promotions.
- `[otp] email failed: ...`: SMTP problem. For Gmail, `SMTP_PASS` must be an app password, not your normal password.

## Tests

```bash
npm run test:rules   # 11 security-rule tests against the Firestore emulator
npm run test:e2e     # end-to-end checks of every Epic 1 flow in a real browser (Playwright)
```

The end-to-end test runs against the real Firebase **Auth** emulator. It covers sign up, onboarding, staying signed in, the offline banner, sign-in errors, change password, the full reset-code flow (wrong code, unknown email, used code) and the Google account variants. It saves screenshots to `tests/e2e/screenshots/`. It needs Playwright: `npm i -D playwright && npx playwright install chromium`.

Two notes on the test setup:

- It uses a small in-memory stand-in for Firestore (`tests/e2e/fake-firestore.js`), so it can run where the Firestore emulator can't be downloaded. The security rules are tested separately against the real Firestore emulator with `npm run test:rules`.
- The real Google pop-up needs Google's servers, so the test signs a Google account in through the emulator instead (an emulator-only hook in `authService.js`). Click-test the real Google button once you've connected a real project.

## Project layout

```
api/otp/                 Vercel functions: request, verify, reset (+ emulator-only dev-outbox)
api/_lib/                OTP logic, code store, SMTP mailer, Admin SDK
src/
  firebase.js            Firebase setup, persistence, emulator switch
  auth/authService.js    Every auth action (F01–F04)
  auth/AuthProvider.jsx  Signed-in user + live profile for the whole app
  auth/errors.js         Firebase error codes -> friendly messages
  lib/profile.js         users/{uid} profile reads and writes
  lib/passwordRules.js   Password and email checks
  components/            Layouts, brand panel, sidebar, form pieces
  pages/                 Sign in/up, reset flow, change password, onboarding, settings
firestore.rules          Security rules
tests/rules/             Rules tests
tests/e2e/               End-to-end test
```

## Changes from the original UI

- **Reset uses a 6-digit code, as in the original UI.** Backlog F03 says "reset link"; the code replaces it. Firebase has no email OTP, so `api/otp/` handles it.
- The password reset screen is reachable whether or not you're signed in, so "Forgot it?" on Change password works too.
- Sidebar items for later epics are marked "Soon".
