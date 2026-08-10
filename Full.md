# Dashboard technical guide

## Overview

Dashboard is a client-only React single-page application for personal planning. It has six views:

- Overview
- To-Do
- Brain Dump
- Job Applications
- Habit Tracker
- Day Planner

There is no application server. Persisted values are cached in browser `localStorage` and synchronized to Cloud Firestore. Weather is the only external, non-Firebase data source.

## Runtime architecture

`src/main.jsx` mounts `App` inside React Strict Mode. `App` owns two pieces of session UI state:

- whether the password gate is unlocked;
- which view is active.

Navigation is state-based rather than URL-based; there is no router. `TopBar` changes the active view and clears the unlock flag when Lock is selected. Each authenticated view is loaded with `React.lazy`, so the password screen does not initialize Firebase and the browser only downloads feature code when it is needed.

The active view is rendered in one of three layout variants:

- regular centered width: Jobs and Habits;
- full width: Overview, Brain Dump, and Day Planner;
- unrestricted width: To-Do, which needs seven desktop columns.

## Source map

| Path | Responsibility |
|---|---|
| `src/App.jsx` | Password-gate state, view selection, lazy view loading, and page layout |
| `src/firebase.js` | Firebase application initialization and Firestore export |
| `src/hooks/useSyncedStorage.js` | Shared `localStorage`/Firestore persistence hook |
| `src/utils/date.js` | Local calendar keys, week/month boundaries, date parsing, and date arithmetic |
| `src/utils/time.js` | Schedule-aware current time and 12-hour time formatting |
| `src/data/categories.js` | Default Day Planner categories and category color presets |
| `src/data/quotes.js` | Static quote catalog and deterministic daily selection |
| `src/components/TopBar.jsx` | Date, clock, navigation menu, and Lock action |
| `src/components/PasswordGate.jsx` | Client-side password convenience gate |
| `src/components/Card.jsx` | Shared card shell for feature pages |
| `src/components/Overview.jsx` | Cross-feature summary dashboard |
| `src/components/TodoCard.jsx` | Weekly task board and global task lists |
| `src/components/BrainDump.jsx` | Pinned and regular notes editor |
| `src/components/HabitTracker.jsx` | Habit definitions, logs, history, and streaks |
| `src/components/JobTracker.jsx` | Per-date job-application counts and notes |
| `src/components/DayPlanner.jsx` | Timeline, schedule settings, drag, resize, and category state |
| `src/components/TimeBlock.jsx` | Positioned Day Planner block |
| `src/components/BlockEditPanel.jsx` | Block and category editor |

Each component stylesheet is a colocated CSS Module. Global tokens, reset rules, body layout, scrollbar styling, and selection color live in `src/index.css`.

## Persistence and synchronization

Every persisted feature uses `useSyncedStorage(key, initialValue)`. Its return shape matches `useState`:

```js
const [value, setValue] = useSyncedStorage('storage-key', initialValue)
```

### Initial load

1. The hook synchronously reads and JSON-decodes `localStorage[key]`, falling back to `initialValue` when the item is missing or invalid.
2. It subscribes to Firestore document `dashboard/<key>` with `onSnapshot`.
3. Writes remain blocked until the first snapshot or subscription error, preventing cached data from immediately overwriting remote data.
4. If the document exists and differs from current local state, the Firestore value wins.
5. If the document does not exist, it is seeded with the latest local value.

### Updates

- Every state change is serialized to `localStorage` immediately.
- Firestore writes are delayed by 1 second; another change during that interval cancels the older pending write.
- The last serialized remote payload is retained in a ref. A state change matching that payload is not echoed back to Firestore.
- Current state is also retained in a ref, allowing the snapshot subscription to remain stable instead of resubscribing on each keystroke.

Firestore documents currently have this shape:

```text
dashboard/<key> -> { value: <JSON-compatible value>, _secret: <configured value> }
```

Firestore errors are logged for failed writes. A subscription error unblocks later local writes; `localStorage` remains available while the browser is offline.

### Conflict behavior

This is last-event synchronization, not a transactional merge system. A remote snapshot replaces the whole value stored under that key. Concurrent edits to different fields within the same key can therefore overwrite one another. Data should remain JSON-compatible.

## Security model

`PasswordGate` hashes the entered password with SHA-256 through the Web Crypto API and compares the lowercase hexadecimal result with `VITE_PASSWORD_HASH`. A successful comparison stores `dashboard-unlocked=true` in `localStorage`; Lock removes that item.

This is a privacy/convenience gate only. It is not authentication:

- `localStorage` can be edited by the browser user;
- the compiled JavaScript contains `VITE_PASSWORD_HASH`;
- `VITE_FIRESTORE_SECRET` is also compiled into the client and cannot be a true secret.

Do not use this design for sensitive or multi-user data. A secure deployment should use Firebase Authentication and Firestore security rules based on authenticated user identity. Firebase web configuration values are identifiers, not server credentials.

## Local date handling

Task, habit, and job records use local `YYYY-MM-DD` calendar keys. Shared helpers in `src/utils/date.js` deliberately avoid `Date#toISOString`, which would convert to UTC and can select the wrong day near local midnight.

The utility module also centralizes:

- daylight-saving-safe day arithmetic using local noon;
- Monday week starts;
- first-of-month keys;
- strict parsing of stored calendar keys back to local dates.

## Features and data shapes

### Overview

Overview reads the same keys as the full feature pages and exposes a few write actions:

- toggle today's dated tasks;
- toggle today's habits;
- increment or decrement today's job applications;
- edit the pinned Brain Dump note.

Schedule blocks are sorted before display. The current-time value supports schedules extending past midnight and refreshes every minute. At widths up to 1024 px, a media-query listener switches the card ordering to the mobile grid.

Weather is fetched once per Overview mount from Open-Meteo for Tempe, Arizona (`33.4255, -111.9400`) using the `America/Phoenix` timezone. It is kept only in component state, reports an unavailable state on failure, and aborts the request when Overview unmounts. The daily quote is selected deterministically from `quotes.js` using the local date.

### To-Do

Storage keys:

- `todos-daily`: object keyed by local calendar date;
- `todos-thisweek`: global task array;
- `todos-longterm`: global array of tasks and folders;
- `todos-recurring`: ordered recurring-series array;
- `todos-recurring-state`: completion and skip state keyed by series/date occurrence ID.

A task is:

```js
{ id: number, text: string, done: boolean }
```

The page opens on the current Monday-through-Sunday week. Previous, Today, and Next controls change the selected week without rolling or deleting tasks. The This Week and Long Term lists do not change with week navigation.

Long Term folders have this shape:

```js
{
  id: number,
  name: string,
  isFolder: true,
  collapsed: boolean,
  items: [/* task objects */]
}
```

Native HTML drag and drop moves the original task object between visible days, This Week, the Long Term root, and Long Term folders. Dropping on a task inserts before it; dropping on list space appends. Folders can only be reordered within Long Term. Deleting a folder also deletes its contents.

Recurring series store a title, creation/archive dates, and dated weekday-schedule revisions. Occurrences are derived by `src/domain/recurringTasks.js` rather than copied into `todos-daily`, so edits preserve historical schedules without generating future records. Each occurrence has a deterministic `<seriesId>:<YYYY-MM-DD>` identity and independent completion or skip state. Recurring occurrences appear above manual tasks in daily columns and today's occurrences are also merged into Overview. Series can be created, edited, reordered, or archived from the Recurring Tasks card.

### Brain Dump

Storage keys:

- `brainDumpNotes`: regular note array;
- `brainDumpActiveId`: selected note ID or `__pinned__`;
- `brainDumpPinnedNote`: permanent pinned note.

Regular notes are shaped as `{ id: string, title: string, content: string }`. The pinned note is `{ title: string, content: string }` and cannot be deleted. At least one regular note remains. The visible save status is a short local UI timer; Firestore persistence is independently debounced by the sync hook. Timer handles are cleared when the editor unmounts.

### Habit Tracker

Storage keys:

- `habits`: `[{ id: number, name: string }]`;
- `habit_logs`: object from local date key to an array of completed habit IDs.

The seven history dots are interactive. A streak starts today when today is complete, otherwise yesterday, then walks backward until the first missing date. Removing a habit removes its definition; historical IDs may remain in older log arrays but are no longer displayed.

### Job Applications

Storage keys:

- `job_applications`: `[{ date: 'YYYY-MM-DD', count: number }]`;
- `job_note`: freeform string.

The date picker permits today and earlier dates. Counts cannot go below zero, and decrementing a missing record does not create a zero-value entry. Week totals use Monday as the boundary; month totals use the first local calendar day. History is sorted newest first.

### Day Planner

Storage keys:

- `dayplanner-blocks`: schedule block array;
- `dayplanner-settings`: `{ startHour: number, endHour: number }`;
- `dayplanner-categories`: editable category array.

A block is:

```js
{
  id: string,
  label: string,
  category: string,
  startMinutes: number,
  endMinutes: number
}
```

Minutes can exceed 1440 for next-day time; for example, 1560 is 2:00 AM on the following day. Default visible hours are 10 through 27 (10:00 AM through 3:00 AM), and the UI permits an end hour up to 28.

Clicking empty grid space creates a one-hour block at the containing hour. Dragging moves a block in 15-minute increments; dragging the lower handle resizes it with a 15-minute minimum. Pointer movement is tracked on `window`, allowing the cursor to leave the block. A movement threshold distinguishes selection from a drag. Changing the visible range clamps existing blocks into that range.

Categories begin with `DEFAULT_CATEGORIES` but are editable. Removing a category reassigns its blocks to the first remaining category. New blocks use the first available category.

## Storage key reference

| Key | Type | Consumers |
|---|---|---|
| `todos-daily` | object of task arrays | To-Do, Overview |
| `todos-thisweek` | task array | To-Do |
| `todos-longterm` | task/folder array | To-Do |
| `todos-recurring` | ordered series array | To-Do, Overview |
| `todos-recurring-state` | occurrence-state object | To-Do, Overview |
| `brainDumpNotes` | note array | Brain Dump |
| `brainDumpActiveId` | string or null | Brain Dump |
| `brainDumpPinnedNote` | note object | Brain Dump, Overview |
| `habits` | habit array | Habit Tracker, Overview |
| `habit_logs` | object of ID arrays | Habit Tracker, Overview |
| `job_applications` | dated count array | Job Applications, Overview |
| `job_note` | string | Job Applications |
| `dayplanner-blocks` | block array | Day Planner, Overview |
| `dayplanner-settings` | settings object | Day Planner, Overview |
| `dayplanner-categories` | category array | Day Planner, Overview |

## Configuration

Copy `.env.local.example` to `.env.local` and set:

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |
| `VITE_PASSWORD_HASH` | lowercase SHA-256 password digest |
| `VITE_FIRESTORE_SECRET` | legacy rule compatibility value; not a secure secret |

Generate a password digest on macOS with:

```bash
printf '%s' 'your-password' | shasum -a 256
```

## Development and deployment

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Vite uses `/Dashboard/` as its production base path. `npm run deploy` publishes `dist` with `gh-pages`. The GitHub Actions workflow installs with `npm ci`, injects repository secrets at build time, builds on Node 20, and publishes `main` to GitHub Pages.

The recurring-task domain behavior has deterministic Vitest coverage. There is currently no automated component or browser suite, so deployment verification also includes a clean production build and manual checks of unlocking, navigation, persistence, drag/drop, Day Planner resize, recurring-task management, and cross-device Firestore updates.
