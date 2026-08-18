# Dashboard technical guide

## Overview

Dashboard is a client-only React single-page application for personal planning. It has six views:

- Today (internal view ID: `overview`)
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

Navigation is state-based rather than URL-based; there is no router. `AppShell` composes the responsive primary navigation, page header, and scrollable main landmark. Navigation keeps the existing IDs and callbacks; the `overview` destination is presented to users as **Today**. Each authenticated view is loaded with `React.lazy`, so the password screen does not initialize Firebase and the browser only downloads feature code when it is needed.

The authenticated shell also lazy-loads an action-first Command Palette. Its floating bottom-right command button and global `Cmd+K`/`Ctrl+K` shortcut offer four focused actions: create a task for today, create a task for this week, log a habit, and capture a Quick Note. On mobile, the button sits above the fixed bottom navigation. Every action writes through the feature's existing synchronized storage key; Quick Notes are saved as regular Brain Dump records with `quickNote: true`. The palette has no independent persistence key and is never mounted on the password gate.

The authenticated shell has three CSS-driven modes:

- at 1200px and wider, a persistent 216px labelled navigation rail includes all six destinations and Lock;
- from 768px through 1199px, the rail remains persistent at 64px and exposes labels through accessible names and focus/hover tooltips;
- below 768px, the rail is replaced by a safe-area-aware fixed 72px bottom navigation with all six destinations. Lock is available from the page-header overflow menu.

The page header displays the active page name, current local date, and clock. Its date control navigates to Today. The shell provides a skip link and a focusable `main#main-content`; after a lazy view has mounted, navigation moves focus to that landmark. Mobile overflow supports Escape, outside click, and focus return. Only the main landmark scrolls, while the rail and header remain in place.

The active view is rendered in one of three layout variants:

- regular centered width: Jobs and Habits;
- full width: Overview, Brain Dump, and Day Planner;
- unrestricted width: To-Do, which needs seven desktop columns.

## Source map

| Path | Responsibility |
|---|---|
| `src/App.jsx` | Password-gate state, view selection, lazy view loading, and page layout |
| `src/components/AppShell.jsx` | Authenticated shell landmarks, skip link, header/navigation composition, and main scroll region |
| `src/components/PrimaryNav.jsx` | Expanded desktop rail, compact tablet rail, mobile bottom navigation, active state, and Lock rail action |
| `src/components/PageHeader.jsx` | Active page heading, local date/clock, Today shortcut, and mobile Lock overflow menu |
| `src/components/CommandPalette.jsx` | Authenticated global shortcut and inline task, habit-log, and Quick Note action forms |
| `src/components/navigation.jsx` | Stable navigation IDs, user-facing labels, order, and shared navigation icons |
| `src/firebase.js` | Firebase application initialization and Firestore export |
| `src/hooks/useSyncedStorage.js` | Shared `localStorage`/Firestore persistence hook |
| `src/utils/date.js` | Local calendar keys, week/month boundaries, date parsing, and date arithmetic |
| `src/utils/time.js` | Schedule-aware current time and 12-hour time formatting |
| `src/data/categories.js` | Default Day Planner categories and category color presets |
| `src/data/quotes.js` | Static quote catalog and deterministic daily selection |
| `src/components/PasswordGate.jsx` | Client-side password convenience gate |
| `src/components/Card.jsx` | Shared card shell for feature pages |
| `src/components/Overview.jsx` | Cross-feature summary dashboard |
| `src/components/TodoCard.jsx` | Weekly task board and global task lists |
| `src/components/BrainDump.jsx` | Connected note browser, responsive editor, confirmations, and local save-status UI |
| `src/domain/brainDump.js` | Pure note normalization, creation, write-forward updates, clear/delete guards, ID, and timestamp rules |
| `src/domain/brainDumpSearch.js` | Pure local note search, ranking, bounded previews, Favorites composition, and Palette provider contract |
| `src/domain/brainDumpMarkdown.js` | Restricted Marked rendering and DOMPurify sanitization policy |
| `src/components/HabitTracker.jsx` | Habit definitions, logs, history, and streaks |
| `src/components/JobTracker.jsx` | Per-date job-application counts and notes |
| `src/components/DayPlanner.jsx` | Timeline, schedule settings, drag, resize, and category state |
| `src/components/TimeBlock.jsx` | Positioned Day Planner block |
| `src/components/BlockEditPanel.jsx` | Block and category editor |

Each component stylesheet is a colocated CSS Module. Global tokens, reset rules, body layout, scrollbar styling, and selection color live in `src/index.css`.

## Shell tokens and shared UI

`src/index.css` defines the shell dimensions, spacing scale, content gutters, 44px control target, radii, focus ring, motion durations, shadows, and navigation/popover/modal/toast z-index layers. The responsive boundaries are 1200px, 768px, and 480px. Global rules preserve visible keyboard focus, reduce animation under `prefers-reduced-motion`, and retain native legibility under forced-colors mode. No layout preference is persisted.

Reusable presentation primitives live in `src/components/ui/`:

- `Button` provides primary, secondary, ghost, danger, and icon variants; `IconButton` requires an accessible label.
- `Dialog` and `BottomSheet` render modal surfaces with labelled semantics, background-scroll locking, Tab focus trapping, Escape handling where allowed, and focus return. Destructive dialogs disable Escape/backdrop dismissal and initially focus the dialog surface unless a safe focus target is supplied.
- `ToastProvider`, `ToastRegion`, and `useToast` provide one polite live notification region. Success/information messages dismiss after about four seconds by default; errors persist until dismissed.
- `LoadingState` supplies the named lazy-view loading status used by `App`; `EmptyState` supplies contextual empty copy with an optional action.

These components are presentational and store only ephemeral component state. They do not add localStorage keys, Firestore documents, or persistence mutations.

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
- Same-tab consumers of one storage key receive a local custom event, keeping concurrently mounted features such as the palette and Brain Dump synchronized without waiting for Firestore.
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

Connected Brain Dump does not eagerly migrate synchronized values. Its selectors treat missing enhanced note fields as runtime defaults without writing. When a user explicitly changes one note, the pure domain updater writes forward only that record, preserves its unknown fields and every sibling record, and supplies missing version-one metadata from that action's single `Date.now()` value. This avoids a mount-time normalization write while the sync hook is waiting for its first Firestore snapshot.

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

### Today / Overview

Today (the `overview` view) reads the same keys as the full feature pages and exposes a few write actions:

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

Legacy regular notes remain readable as `{ id: string, title: string, content: string }`. Version-one records add:

```js
{
  id: 'crypto-random-uuid',
  title: 'Project notes',
  content: '# Markdown source',
  contentFormat: 'markdown',
  favorite: false,
  quickNote: false,
  createdAt: 1786272000000,
  updatedAt: 1786272300000
}
```

The pinned record keeps `title` and `content` for Overview compatibility and may add `contentFormat`, `createdAt`, and `updatedAt`; it never stores a regular-note ID or favorite flag. The shared `updatePinnedNote` action is used by both Brain Dump and Overview so unknown/enhanced fields survive either editor.

Brain Dump renders cached values immediately and performs no read-time storage normalization. Defensive selectors skip malformed records and later duplicate IDs without deleting or rewriting the source array. Missing favorite/timestamp fields become `false`/`0` only in runtime selectors. New notes use `crypto.randomUUID()`, receive Markdown metadata and action timestamps, and are prepended. Stored array order remains authoritative; selecting or editing never reorders notes.

The browser searches normalized title and Markdown source locally with deterministic exact-title, title-prefix, title-token, then body tiers. Result excerpts are whitespace-collapsed and capped at 160 characters. Search, Favorites, and Quick Notes filters are ephemeral and compose with AND. Pinned is shown above regular results, is always treated as a favorite, and is never treated as a Quick Note. `brainDumpSearchProvider` exposes bounded, write-free note results and `{ view: 'braindump', target: { kind: 'note', id } }` navigation targets for future palette search expansion.

The authenticated command palette can create plain tasks in today's dated list or the shared This Week list, log one of today's remaining habits, and capture a Quick Note. Task titles accept up to 200 characters. Habit logging adds the selected habit ID to today's existing `habit_logs` entry without duplicates. Quick Notes accept required Markdown content up to 10,000 characters and an optional title up to 200 characters. A blank title is derived from the first nonempty content line and capped at 80 characters. Captures are prepended to `brainDumpNotes`, set as the active Brain Dump note, retain `favorite: false`, and add `quickNote: true`. Every successful action confirms through the shared toast region without forcing a page change.

The editor stores Markdown source in the existing `content` string. Preview uses Marked with GFM disabled and DOMPurify with a narrow tag/attribute allow-list. Raw HTML and image syntax render as inert source text; only `http`, `https`, and `mailto` links become anchors. Edit/Preview mode, character counts, browser-sheet state, queries, and save indicators are never synchronized.

Clear content and eligible regular-note deletion use accessible confirmations. Clear preserves all non-content fields; deletion removes only the selected record, cannot target pinned, and retains final-regular-note protection. Below 768 px, the editor remains primary and the shared accessible bottom sheet contains New note, Search, Favorites, and the note list. Selecting a sheet result closes it and focuses the note title. The layout is usable without horizontal page scrolling at 320 px.

The visible Saving/Saved/Auto-saves state is a short local UI timer and does not claim cloud acknowledgement. Firestore persistence remains independently debounced by the sync hook, and whole-array concurrent edits retain the documented last-write-wins limitation.

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

Recurring-task and Connected Brain Dump domain behavior have deterministic Vitest coverage. Brain Dump tests cover legacy normalization without mutation, array order, UUID boundaries, action timestamps, metadata/unknown-field preservation, safe clear/delete behavior, Markdown sanitization, search/ranking/previews, Favorites, malformed/duplicate records, and the future Palette provider. Navigation configuration tests protect destination order, stable IDs, and the `overview` → Today display label. There is no automated end-to-end browser suite, so deployment verification also includes a clean production build and manual checks of unlocking, navigation, responsive shell breakpoints, note-browser focus handoff, offline/local persistence, pinned edits through both surfaces, confirmations, drag/drop, Day Planner resize, recurring-task management, and cross-device Firestore last-write-wins behavior.
