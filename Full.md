# Dashboard technical guide

## Architecture

Dashboard is a client-only React single-page application. `src/main.jsx` mounts `App`, which controls the password gate and selected view. The unlocked shell provides navigation, the command palette, theme context, and toasts. Views are loaded lazily: Today (`overview`), To-Do, Brain Dump, Projects, Job Applications, Habits, Day Planner, and Settings.

The interface uses CSS Modules and shared components under `src/components/ui`. Domain logic for tasks, notes, habits, projects, and job activity lives in `src/domain`; local date and time helpers are in `src/utils`. Markdown previews use Marked and DOMPurify. Today fetches a daily forecast from Open-Meteo for Tempe, Arizona.

## Persistence

`useSyncedStorage` initializes from browser `localStorage` and subscribes to `dashboard/<key>` in Firestore. If the remote document exists, its `value` updates local state. If it does not exist, the hook seeds it from the local value. Writes wait for the first snapshot or a snapshot error, then are debounced for one second. A same-tab custom event keeps mounted consumers of a key in sync. Each write replaces the document with `value` and the configured `_secret` compatibility field.

These documents are whole values rather than per-item records. Concurrent edits from different clients can overwrite each other; the hook does not merge conflicting changes. Writes and subscription errors are logged or handled locally, and there is no user-facing sync status. A browser cache is not a backup.

| Storage keys | Use |
| --- | --- |
| `todos-daily`, `todos-thisweek`, `todos-longterm` | Manual tasks |
| `todos-recurring`, `todos-recurring-state` | Weekday series and per-date occurrence state |
| `brainDumpNotes`, `brainDumpActiveId`, `brainDumpPinnedNote` | Brain Dump notes and selection |
| `projects` | Projects, categories, notes, and task lists |
| `job_applications`, `job_note` | Daily application/outreach counts and note |
| `habits`, `habit_logs` | Habit definitions and check-ins |
| `dayplanner-blocks`, `dayplanner-settings`, `dayplanner-categories` | Shared planner schedule and configuration |

Theme preferences (`dashboard-theme-preferences-v1`) and the unlock flag (`dashboard-unlocked`) stay in browser storage. Startup removes the retired wellness cache keys from browser storage; it does not delete their Firestore documents.

## Feature notes

- Recurring tasks are derived from weekday series and per-date state rather than copied into future dates. Date keys use local calendar dates.
- Project and task array positions represent manual order. Project notes are autosaved and their timestamps determine the note index.
- Legacy Brain Dump note records are normalized in memory; enhanced metadata is written when an individual note is edited or created.
- The Day Planner stores one shared set of blocks, not separate plans for each date.
- Application counts are categorized; legacy uncategorized counts remain included in totals.
- Settings theme changes are local to the browser. Selecting a different preset resets custom colors to that preset's defaults.

## Configuration and commands

See the [README](README.md) for local setup, commands, security considerations, and deployment. [Local Firebase development](Docs/firebase-emulator.md) explains the emulator configuration. `src/config/firebaseEnvironment.js` rejects non-production configurations unless they use the emulator or an explicitly marked synthetic test project, and rejects configurations marked as production credentials outside production mode.

Tests use Vitest and jsdom; component tests mock storage and do not require a live Firebase project. GitHub Actions installs dependencies, builds on pushes to `main`, and deploys `dist` to GitHub Pages. The workflow does not run tests.
