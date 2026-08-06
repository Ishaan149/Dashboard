# How the App Works


## Architecture overview

The app is a single-page React app. There is no backend server — all data is stored in two places simultaneously:

- **localStorage** — used as an instant cache so the UI renders immediately with no flicker on load
- **Firestore** — the source of truth, used for real-time cross-device sync

A single custom hook, `useSyncedStorage`, handles both layers for every piece of data in the app. Everything that persists — todos, habits, job counts, brain dump notes, and schedule blocks — goes through it.

---

## The sync engine: `useSyncedStorage`

This is the core of the app. It's a drop-in replacement for `useState` that keeps a value synced between localStorage, Firestore, and any other open tabs/devices.

**On mount:**
1. Reads the value from localStorage synchronously so the component renders immediately with real data (no loading state).
2. Subscribes to the corresponding Firestore document (`dashboard/<key>`) via `onSnapshot`.
3. When the first snapshot arrives, compares the remote value to local. If they differ, updates state from Firestore (remote wins). This prevents stale local data from overwriting a newer remote value.
4. Sets a `hydrated` flag to unblock writes — no local writes go to Firestore until the first snapshot has been received.

**On every state change:**
- Writes to localStorage immediately.
- Debounces a Firestore write by 1 second to avoid per-keystroke writes (important for BrainDump and BrainDumpCard in Overview).

**Loop prevention:**
- A `fromFirestore` ref flag is set when a snapshot triggers a state update. The write effect checks this flag and skips the Firestore write, preventing an infinite echo loop (Firestore → state → Firestore → ...).

**Firestore document shape:**
```
dashboard/<key> → { value: <the data>, _secret: <env secret> }
```

The `_secret` field is written with every update and used by Firestore security rules to reject unauthorized writes.

---

## Authentication

The app uses a simple password gate rather than OAuth. On first visit, the user sees a password prompt. The entered password is hashed (bcrypt) and compared against `VITE_PASSWORD_HASH` (set at build time via environment variable). On success, `dashboard-unlocked: true` is written to localStorage and the gate is skipped on future visits. A lock button in the top bar clears this flag and returns to the gate.

---

## Views and navigation

`App.jsx` owns the current view in a single `useState('overview')`. The top bar renders navigation links that call `setView`. The active component is looked up from a static `VIEWS` map and rendered directly — there is no router. Overview, To-Do, Brain Dump, and Day Planner use `styles.viewFull` for full-width layout; the remaining views use a narrower centered column.

---

## Todo

**Storage keys:** `todos-daily` (date-keyed object), `todos-thisweek` (array), `todos-longterm` (array)

Each plain task is an object: `{ id: number, text: string, done: boolean }`. IDs are `Date.now()` timestamps.

The unified To-Do page opens to the current Monday-through-Sunday week and shows all seven dated day columns together. Previous, Today, and Next controls navigate between stored weeks. Daily tasks are stored under local `YYYY-MM-DD` keys in `todos-daily`, so past and future weeks coexist without rollover.

The global **This Week** and **Long Term** lists appear side by side below the board and do not change when the selected week changes. Tasks can be moved or reordered between any visible day, This Week, the Long Term root, and Long Term folders. A move transfers the original task object, including its completion state, and dropping on a task inserts at that position.

**Folders (Long Term only):** Long Term items can also be folders: `{ id, name, isFolder: true, collapsed: boolean, items: [...tasks] }`. Folders can be created, collapsed/expanded, reordered, and deleted (which removes their contents). Tasks can be dragged into a folder, out to the Long Term root, or between folders. Folders themselves cannot leave Long Term.

---

## Brain Dump

**Storage keys:** `brainDumpNotes` (array of note objects), `brainDumpActiveId` (string), `brainDumpPinnedNote` (object)

Notes are stored as:
```js
[{ id: string, title: string, content: string }, ...]
```

The UI is a sidebar (note list) + editor layout, not a tab bar. The sidebar always shows one **permanent pinned note** at the top (`brainDumpPinnedNote`, shape `{ title, content }`) above a divider, followed by the regular `brainDumpNotes` list. The pinned note can't be deleted and isn't part of the `brainDumpNotes` array — it's a separate synced key selected via a sentinel active ID (`'__pinned__'`). Regular notes can be created (`+ New Note`) and deleted (if more than one remains); the active note/pinned selection is stored in `brainDumpActiveId` so it persists across sessions. The content textarea debounces a "Saved" status indicator by 600 ms — this is a local UI debounce separate from the Firestore write debounce in `useSyncedStorage`.

The Overview page shows a read-write preview of the **pinned note** (same `brainDumpPinnedNote` Firestore key), so edits in either place sync instantly.

---

## Habit Tracker

**Storage keys:** `habits` (array), `habit_logs` (object)

Habits are defined once and stored as `[{ id: number, name: string }, ...]`.

Logs track which habits were completed on which days:
```js
{
  "2026-06-21": [habitId1, habitId2],
  "2026-06-20": [habitId1],
  ...
}
```

Date keys are `YYYY-MM-DD` strings computed from the local clock.

**Streak calculation:** Starting from today (or yesterday if today isn't logged), it walks backwards day by day counting consecutive days where the habit ID appears in the logs. Stops at the first gap.

**7-day history:** For each habit, the last 7 days are shown as clickable dots. Clicking a past dot toggles that day's log entry, allowing retroactive corrections.

---

## Job Tracker

**Storage keys:** `job_applications` (array), `job_note` (string)

Application counts are stored per day:
```js
[{ date: "2026-06-21", count: 3 }, { date: "2026-06-20", count: 5 }, ...]
```

Date strings use local time (not UTC) to avoid midnight boundary bugs — dates are constructed from `getFullYear()`, `getMonth()`, `getDate()` directly rather than `toISOString()`.

The tracker supports selecting any past date via a date picker (capped at today), so counts for previous days can be retroactively adjusted. Stats for "this week" and "this month" are computed by filtering records where `date >= weekStart` or `date >= monthStart`.

The Overview sparkline shows the last 7 days by iterating `getDateKey(6-i)` for `i = 0..6`.

A freeform notes textarea (`job_note`) stores any job-search-related text (links, company names, etc.) and syncs via the same hook.

---

## Day Planner

**Storage keys:** `dayplanner-blocks` (array), `dayplanner-settings` (object), `dayplanner-categories` (array)

Categories are user-editable, not a fixed enum. `dayplanner-categories` is seeded from `DEFAULT_CATEGORIES` (`src/data/categories.js`) and can have entries added or removed from the block edit panel. Removing a category reassigns any blocks using it to a fallback (the first remaining category, or `"work"`).

Settings store the visible time range:
```js
{ startHour: 10, endHour: 27 }
```

Hours above 24 represent next-day time (e.g. `endHour: 27` = 3 AM). This lets night owls plan past midnight without a day boundary jump. The "now" line handles this by adding 1440 minutes to the current time when the schedule spans midnight and the current time falls in the next-day portion.

Each block is:
```js
{ id: string, label: string, category: string, startMinutes: number, endMinutes: number }
```
`category` is an id referencing an entry in `dayplanner-categories`, not a hardcoded set of values.

Times are stored in absolute minutes from midnight (e.g. `startMinutes: 600` = 10:00 AM, `startMinutes: 1560` = 2:00 AM next day).

**Creating a block:** Clicking an empty area on the grid snaps to the nearest hour and creates a 60-minute block, then opens it in the edit panel.

**Moving a block:** Mousedown on a block starts drag tracking via a `dragRef`. Mouse movement is tracked on `window` (not the element) so the drag works even if the cursor leaves the block. Position snaps to 15-minute increments. A `moved` flag distinguishes a drag from a click — if the mouse didn't move more than 4px, it's treated as a select rather than a drag.

**Resizing a block:** Mousedown on the bottom resize handle tracks the start Y position and original end time in a `resizeRef`. Movement adjusts `endMinutes`, snapped to 15-minute increments, with a minimum duration of 15 minutes.

When the start/end hour settings change, existing blocks are clamped to fit within the new range.

---

## Overview

The Overview is a read-only (mostly) dashboard that pulls live data from several Firestore keys simultaneously and renders it as a grid of cards. It does not have its own storage — it reads the same keys as the individual views. The exceptions are:

- **BrainDumpCard**: writable — edits sync back to `brainDumpPinnedNote` (the pinned note, not the `brainDumpNotes` list)
- **HabitsCard**: toggle marks habits done for today, writes to `habit_logs`
- **TasksCard**: shows only `todos-daily[today]`; toggles write back to that same date entry
- **JobsCard**: +/− buttons write to `job_applications`

**Weather** is fetched once on mount from the Open-Meteo public API for Tempe, AZ (lat 33.4255, lon -111.9400). No API key needed. The result is kept in local React state (not synced to Firestore) and re-fetched on each page load.

**Daily quote** is selected deterministically from a static `quotes.js` array using `Math.floor(dayOfYear % quotes.length)` so the same quote shows all day and changes at midnight.

---

## Data keys reference

| Key | Type | Used by |
|---|---|---|
| `todos-daily` | object keyed by local date | To-Do weekly board, Overview tasks card |
| `todos-thisweek` | array | To-Do global This Week list |
| `todos-longterm` | array | To-Do global Long Term list, including folders |
| `brainDumpNotes` | array | Brain Dump (regular notes) |
| `brainDumpActiveId` | string | Brain Dump (selected note/pinned) |
| `brainDumpPinnedNote` | object | Brain Dump (pinned note), Overview brain card |
| `habits` | array | Habit Tracker, Overview habits card |
| `habit_logs` | object | Habit Tracker, Overview habits card |
| `job_applications` | array | Job Tracker, Overview jobs card |
| `job_note` | string | Job Tracker |
| `dayplanner-blocks` | array | Day Planner, Overview schedule card |
| `dayplanner-settings` | object | Day Planner, Overview schedule card |
| `dayplanner-categories` | array | Day Planner, Overview schedule card |
