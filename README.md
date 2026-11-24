# Personal Dashboard

A personal productivity dashboard built with React, Vite, and Firestore. It caches data in the browser and syncs it across devices. [Open the dashboard](https://ishaan149.github.io/Dashboard/).

## Features

- **Today** — today's tasks, habits, planner blocks, application counts, pinned note, a daily quote, and weather for Tempe, Arizona. Includes a countdown timer and stopwatch that continue while you navigate the dashboard.
- **To-Do** — a navigable seven-day board, recurring weekday tasks, a This Week list, and folder-based Long Term tasks.
- **Brain Dump** — a pinned note and searchable Markdown notes with favorites, Quick Notes, and sanitized previews.
- **Projects** — manually ordered active and completed projects, color-coded categories, multiple Markdown notes, and independent task checklists.
- **Job Applications** — daily counts for four application categories, email and LinkedIn outreach counters, history, and a note.
- **Habits** — daily check-ins in a seven-day grid, with seven- and 30-day completion rates for each habit and overall.
- **Day Planner** — a shared daily time-block schedule with custom categories and start and end times in 15-minute steps, including overnight ranges.
- **Settings** — dark theme presets and custom accent, background, and foreground colors stored in the current browser.
- **Command palette** — use `Cmd/Ctrl+K` or the floating button to create a task for today or this week, log an application or habit, and capture a Quick Note. Separate keyboard shortcuts navigate to Today, To-Do, Brain Dump, Projects, and Job Applications.

## Local development

Install Node.js 20 (20.17+), 22 (22.9+), or 24. The Firestore emulator also requires Java 21 or later. From the repository root, run `npm ci`.

The checked-in `.env.development` connects Vite to the local Firestore emulator at `127.0.0.1:8080` with project ID `dashboard-local`. Add these placeholders and a local password hash to `.env.development.local`.

```dotenv
VITE_FIREBASE_API_KEY=local-api-key
VITE_FIREBASE_AUTH_DOMAIN=dashboard-local.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=dashboard-local.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=local-app-id
VITE_PASSWORD_HASH=<sha256-hex-digest>
VITE_FIRESTORE_SECRET=local-value
```

Replace `your-password` in the command below and put the resulting digest in `VITE_PASSWORD_HASH`.

```sh
node -e "console.log(require('node:crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" -- "your-password"
```

Keep production values in `.env.production.local`. In development, `.env.development.local` and shell environment variables can override the checked-in project ID.

Start the emulator and Vite in separate terminals.

```sh
npm run emulators:firestore
npm run dev
```

Open the URL printed by Vite and enter the password you used to generate the hash. View the emulator data at `http://127.0.0.1:4000`. The emulator command starts with an empty database each time. The app can seed it from the current browser's cached values.

Run `npm test` for the Vitest suite and `npm run build` to compile the bundle. To preview against the emulator, run `npm run build -- --mode development` and then `npm run preview` while the emulator is running.

## Data and security

The app reads cached values from `localStorage` and subscribes to Firestore documents for synchronization. Updates are debounced by one second after the initial snapshot. Theme preferences and the unlocked flag stay in the browser. Timer and stopwatch state stays in the current tab session. [Technical guide](Full.md).

The password gate checks the password in the browser. The bundle exposes the hash and the `VITE_*` values it uses, including the Firestore compatibility value. Protect sensitive Firestore data with Firebase Authentication and rules based on authenticated identity.

## Deployment

Pushes to `main` build the app and publish `dist` to the `gh-pages` branch. Configure GitHub Pages to serve the root of that branch. Set the Firebase web variables, `VITE_PASSWORD_HASH`, and `VITE_FIRESTORE_SECRET` as GitHub Actions repository secrets. To publish manually, put those values in `.env.production.local` or export them, then run `npm run build` followed by `npm run deploy`. [Production variable template](.env.local.example) · [Deployment workflow](.github/workflows/deploy.yml).
