# Personal Dashboard

A personal productivity dashboard built with React and Firebase. Tracks tasks, habits, job applications, a day planner, and notes, with real-time Firestore sync and a local cache.

Live at: [ishaan149.github.io/Dashboard](https://Ishaan149.github.io/Dashboard)

## Features

- **Overview** — at-a-glance summary of tasks, habits, today's schedule, typed job-application logging and overall counts, weather (Tempe, AZ), brain dump preview, and a daily quote
- **To-Do** — a navigable seven-day board with recurring weekday tasks, per-date completion and skipping, plus global This Week and folder-based Long Term lists
- **Brain Dump** — a permanent pinned note plus Markdown notes with local title/body search, bounded previews, favorites, safe Edit/Preview modes, confirmations, editor metadata, and a mobile note browser
- **Action Command Palette** — open from the floating command button or with `Cmd/Ctrl+K` to create a task for today or this week, log one of the four job-application types, log a habit, or capture a flagged Quick Note directly into Brain Dump
- **Habit Tracker** — define habits and log them daily with streak history
- **Day Planner** — time-block calendar with configurable hours and categories (work, uni, gym, rest, meeting)
- **Job Tracker** — log job applications by day, view a 7-day sparkline

Persisted data syncs across devices via Firestore with `localStorage` as an instant-render cache. Changes are debounced for 1 second before writing to Firestore. Authenticated views are loaded on demand after the password gate is cleared.

## Tech stack

- React 18 + Vite
- Firebase Firestore (real-time sync)
- Marked + DOMPurify (restricted, sanitized Markdown preview)
- CSS Modules
- GitHub Actions → GitHub Pages (CI/CD)

## Getting started

### Prerequisites

- Node 20+
- A Firebase project with Firestore enabled

### Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/Ishaan149/Dashboard.git
   cd Dashboard
   npm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Where to find it |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web app |
   | `VITE_FIREBASE_AUTH_DOMAIN` | same |
   | `VITE_FIREBASE_PROJECT_ID` | same |
   | `VITE_FIREBASE_STORAGE_BUCKET` | same |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | same |
   | `VITE_FIREBASE_APP_ID` | same |
   | `VITE_PASSWORD_HASH` | lowercase SHA-256 hex digest of the dashboard password |
   | `VITE_FIRESTORE_SECRET` | compatibility value expected by the current Firestore rules |

   Generate the password digest with:

   ```bash
   printf '%s' 'your-password' | shasum -a 256
   ```

   The password gate is not security authentication: the hash and every other `VITE_*` value are included in the browser bundle. Protect sensitive data with Firebase Authentication and Firestore rules based on authenticated identity.

3. Start the dev server:

   ```bash
   npm run dev
   ```

### Tests

Recurring-task calendar behavior, Command Palette Quick Note capture, same-tab storage synchronization, and Connected Brain Dump normalization, write-forward updates, search/ranking, filters, deletion/clear protections, Markdown safety, and Palette-provider behavior are covered by deterministic Vitest tests:

```bash
npm test
```

Command Palette and Brain Dump tests use plain mocked/local values and jsdom. They do not connect to Firebase. Legacy note records are normalized only in memory while reading; enhanced metadata is written forward only for the individual note a user explicitly edits or creates.

## Deployment

Pushes to `main` automatically build and deploy to GitHub Pages via the included workflow. Add the environment variables above as repository secrets in **Settings → Secrets and variables → Actions**.

Manual deploy:

```bash
npm run build
npm run deploy
```
