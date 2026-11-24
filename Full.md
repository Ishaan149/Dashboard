# Dashboard technical guide

## Architecture

Dashboard is a client-only React single-page application. `src/main.jsx` mounts `App`, which controls the password gate, selected view, and clock state. The unlocked shell provides navigation, the command palette, theme context, and toasts. Each view loads on demand.

The interface uses CSS Modules and shared components under `src/components/ui`. Domain logic for tasks, notes, habits, projects, and job activity lives in `src/domain`; local date and time helpers are in `src/utils`. Markdown previews use Marked and DOMPurify. Today fetches a daily forecast from Open-Meteo for Tempe, Arizona.

## Persistence

`useSyncedStorage` initializes from `localStorage` and subscribes to `dashboard/<key>` in Firestore. The first snapshot applies the remote `value` or seeds a missing document from the local value. Local updates reach the cache and other mounted consumers in the same tab immediately. Once the initial snapshot or subscription error arrives, the hook debounces updates to Firestore by one second. An unmount cancels that consumer's pending update. Each write replaces the document with `value` and the configured `_secret` compatibility field.

Each document stores the entire value for a key, so concurrent edits from different clients can overwrite each other. The hook logs write failures to the browser console and handles subscription errors without a user-facing sync status.

| Storage keys | Use |
| --- | --- |
| `todos-daily`, `todos-thisweek`, `todos-longterm` | Manual tasks |
| `todos-recurring`, `todos-recurring-state` | Weekday series and per-date occurrence state |
| `brainDumpNotes`, `brainDumpActiveId`, `brainDumpPinnedNote` | Brain Dump notes and selection |
| `projects` | Projects, categories, notes, and task lists |
| `job_applications`, `job_note` | Daily application/outreach counts and note |
| `habits`, `habit_logs` | Habit definitions and check-ins |
| `dayplanner-blocks`, `dayplanner-settings`, `dayplanner-categories` | Shared planner schedule and configuration |

Theme preferences (`dashboard-theme-preferences-v1`) and the unlock flag (`dashboard-unlocked`) use `localStorage`. The timer and stopwatch share `dashboard-clock-v1` in `sessionStorage`, so their state survives navigation and reloads in the current tab. Startup clears retired wellness keys from `localStorage`.

## Feature notes

- To-Do derives recurring tasks from weekday series and per-date state. Date keys use local calendar dates.
- Project and task array positions represent manual order. Project notes autosave and the note index shows the most recently updated notes first.
- Brain Dump normalizes legacy note records in memory and writes enhanced metadata when a note is created or edited.
- Habits calculates seven- and 30-day completion rates using eligible dates on or after a habit's creation date.
- Day Planner stores a single block schedule shared across dates. Its start and end values use hours, including fractional hours for quarter-hour increments. Overnight ranges store the end as 24 or more hours, so 3 a.m. the next day is `27`.
- Job Applications includes legacy uncategorized counts in its totals.
- The timer and stopwatch calculate elapsed time from stored timestamps. If the countdown reaches zero while the tab is hidden, the completion toast appears after the tab becomes visible.
- Selecting a different theme preset resets custom colors to that preset's defaults.

## Configuration and commands

In development mode, `.env.development` configures the `dashboard-local` Firestore emulator. `src/config/firebaseEnvironment.js` requires the emulator or an explicitly configured synthetic project for all non-production modes. It also rejects non-production settings flagged as production credentials or matching the configured production project ID. The setup and deployment commands are in the [README](README.md).

Vitest covers domain logic and uses jsdom for browser-oriented tests. Component tests mock storage, and the storage hook tests mock Firestore. The deployment workflow installs dependencies, builds on pushes to `main`, and publishes `dist` to the `gh-pages` branch.
