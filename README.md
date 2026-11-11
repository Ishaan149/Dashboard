# Personal Dashboard

A personal productivity dashboard built with React, Vite, and Firestore. It caches data in the browser and syncs it across devices. The deployed app is at [ishaan149.github.io/Dashboard](https://Ishaan149.github.io/Dashboard).

## Features

- **Today** — today's tasks, habits, planner blocks, application counts, pinned note, a daily quote, and weather for Tempe, Arizona.
- **To-Do** — a navigable seven-day board, recurring weekday tasks, a This Week list, and folder-based Long Term tasks.
- **Brain Dump** — a pinned note and searchable Markdown notes with favorites, Quick Notes, and sanitized previews.
- **Projects** — manually ordered active and completed projects, custom categories, multiple Markdown notes, and independent task checklists.
- **Job Applications** — daily counts for four application categories, email and LinkedIn outreach counters, history, and a note.
- **Habits** — daily check-ins in a seven-day grid, completion rates, and streaks.
- **Day Planner** — a time-block schedule with configurable hours and categories. The schedule is shared across days; it is not date-specific.
- **Settings** — dark theme presets and custom accent, background, and foreground colors stored in the current browser.
- **Command palette** — use `Cmd/Ctrl+K` or the floating button to create a task for today or this week, log an application or habit, and capture a Quick Note. Separate keyboard shortcuts navigate to Today, To-Do, Brain Dump, Projects, and Job Applications.

## Local development

Prerequisites: Node.js 20 or later and Java 21 or later for the Firestore emulator. Install dependencies with `npm ci`.

Development uses the Firestore emulator and the synthetic `dashboard-local` project. Create `.env.local` with a local password hash and placeholder Firebase web configuration:

```dotenv
VITE_FIREBASE_API_KEY=local-api-key
VITE_FIREBASE_AUTH_DOMAIN=dashboard-local.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=dashboard-local.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=local-app-id
VITE_PASSWORD_HASH=<sha256-hex-digest>
VITE_FIRESTORE_SECRET=local-value
```

Generate the hash with `printf '%s' 'your-password' | shasum -a 256`. Do not set a production project ID in `.env.local` for development: it overrides `.env.development`, which selects the local emulator project. See [local Firebase development](Docs/firebase-emulator.md) for details.

In separate terminals, run:

```sh
npm run emulators:firestore
npm run dev
```

Open the URL printed by Vite and use the password corresponding to your hash. Run `npm test` for the Vitest suite and `npm run build` to build the production bundle. `npm run preview` serves a built bundle locally.

## Data and security

The app reads cached values from `localStorage` and subscribes to Firestore documents for synchronization. Writes are debounced by one second after the initial snapshot. Theme preferences and the unlocked flag are browser-local. See the [technical guide](Full.md) for storage keys and synchronization details.

The password gate is a convenience, not authentication: the hash and all `VITE_*` values are included in the browser bundle. Protect sensitive data with Firebase Authentication and Firestore rules based on authenticated identity. The Firestore compatibility value is also visible to the browser and is not a secret.

## Deployment

Pushes to `main` build and deploy to GitHub Pages through the included workflow. Configure the Firebase web variables, `VITE_PASSWORD_HASH`, and `VITE_FIRESTORE_SECRET` as GitHub Actions repository secrets. [.env.local.example](.env.local.example) lists the production configuration values. To deploy manually, put those values in `.env.production.local` or export them as environment variables, then run `npm run build` and `npm run deploy`.
