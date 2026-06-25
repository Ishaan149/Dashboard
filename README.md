# Personal Dashboard

A personal productivity dashboard built with React and Firebase. Tracks daily tasks, habits, job applications, a day planner, goals, and a brain dump — all synced in real time across devices via Firestore.

Live at: [ishaan149.github.io/Dashboard](https://Ishaan149.github.io/Dashboard)

## Features

- **Overview** — at-a-glance summary of tasks, habits, today's schedule, job application count, weather (Tempe, AZ), brain dump preview, and a daily quote
- **Todo** — daily task list with completion tracking
- **Goals** — long-term goal tracking
- **Brain Dump** — freeform scratch pad with multiple notes
- **Habit Tracker** — define habits and log them daily with streak history
- **Day Planner** — time-block calendar with configurable hours and categories (work, uni, gym, rest, meeting)
- **Job Tracker** — log job applications by day, view a 7-day sparkline

All data syncs across devices via Firestore with localStorage as an instant-render cache. Changes are debounced (1 s) before writing to Firestore to avoid per-keystroke writes.

## Tech stack

- React 18 + Vite
- Firebase Firestore (real-time sync)
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
   | `VITE_PASSWORD_HASH` | bcrypt hash of your dashboard password |
   | `VITE_FIRESTORE_SECRET` | any secret string used to authorize Firestore writes |

3. Start the dev server:

   ```bash
   npm run dev
   ```

## Deployment

Pushes to `main` automatically build and deploy to GitHub Pages via the included workflow. Add the environment variables above as repository secrets in **Settings → Secrets and variables → Actions**.

Manual deploy:

```bash
npm run build
npm run deploy
```
