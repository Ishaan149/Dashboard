# Product Requirements Document: Today Command Center

## Status

Approved version-one scope, refreshed for the Dashboard codebase as it exists on August 10, 2026.

This revision reflects the selected product direction:

- show all of today's tasks rather than a separate top-priorities system;
- keep Quick Capture for tasks, planner blocks, and thoughts;
- show the current and next planner blocks;
- allow task completion directly from Today;
- keep a compact end-of-day review;
- retain the existing supporting dashboard cards;
- do not add overdue-task handling or task-to-planner links.

## Summary

Evolve the existing `overview` view into the **Today Command Center**: a daily landing screen that shows the current local date, all of today's tasks, what is happening now and next, fast capture, and a small end-of-day review.

The existing To-Do, Habits, Job Applications, Brain Dump, and Day Planner screens remain the source-of-truth experiences. The Command Center is a convenient daily surface, not a replacement task manager, habit tracker, notes app, or planner.

## Problem

The current Overview is a useful collection of summary cards, but its equally weighted layout makes the user scan the page to determine what matters now. It does not provide a prominent date, a single complete view of today's work, a focused Now/Next schedule state, a common capture entry point, or a lightweight way to close the day.

The product already has authoritative task, recurring-task, planner, habit, job, and Brain Dump data. The Command Center should organize that existing information without copying tasks into a new priority model or introducing unsupported task-planner relationships.

## Goals

- Keep `overview` as the internal view ID and use it as the primary daily landing page.
- Display the current browser-local weekday and date prominently.
- Show all of today's recurring and manually dated tasks, including completed tasks.
- Let the user complete or reopen a task directly from Today using its authoritative source.
- Show one deterministic **Now** planner block and one deterministic **Next** planner block.
- Let the user quickly capture a task, an unlinked planner block, or a thought.
- Provide a compact review that records what went well and what to carry forward.
- Retain the existing Habits, Job Applications, pinned Brain Dump, quote, and weather cards.
- Preserve the current localStorage/Firestore synchronization model and offline-local behavior.

## Non-goals

Version one does not include:

- Top-priority slots, task ranking, or a separate priority storage model.
- An overdue section, automatic carry-forward, or any reinterpretation of past dated tasks.
- Scheduling an existing task, linking a task to a planner block, or completing a task from a planner block.
- Editing or deleting a task from Today; those actions remain in To-Do.
- Changing recurring-series schedules, skipping occurrences, or treating missed occurrences as overdue.
- A general inbox, projects, due dates, descriptions, reminders, notifications, estimates, tags, or new recurring-task behavior.
- A global hotkey or searchable command interface. Those belong to the Command Palette workstream.
- Date navigation, multi-day planning, or migration to a date-aware planner architecture.
- Authentication, AI assistance, analytics, collaboration, weekly review, or server-side jobs.

## Existing system context

The app is a client-only React 18/Vite SPA. `src/App.jsx` uses state-based view selection rather than a URL router. The visible navigation label for the `overview` view is already **Today**; retain the stable `overview` ID and existing `onChange` navigation contract.

Persisted feature values use `useSyncedStorage(key, initialValue)`:

1. localStorage is read synchronously for the initial render;
2. Firestore document `dashboard/<key>` is subscribed to;
3. state changes update localStorage immediately where possible;
4. Firestore writes are debounced by one second after hydration; and
5. remote updates replace the whole value for that key.

This remains whole-document, last-write-wins synchronization. The feature must not assume cross-key transactions or claim that locally accepted data is already cloud-synced.

Shared date utilities use browser-local `YYYY-MM-DD` keys and deliberately avoid UTC conversion for calendar identity. All Today behavior must use `toLocalDateKey`, `getDateKey`, `parseLocalDateKey`, and the existing schedule-aware time helpers rather than `Date#toISOString` or ad hoc date strings.

Relevant existing data remains authoritative:

| Key | Existing shape | Command Center use |
|---|---|---|
| `todos-daily` | `{ [dateKey]: [{ id: number, text: string, done: boolean }] }` | Today's manual tasks and Task capture |
| `todos-recurring` | recurring-series array | Derive today's recurring occurrences |
| `todos-recurring-state` | sparse occurrence-state object | Complete or reopen today's recurring occurrences |
| `habit_logs` / `habits` | completed IDs by date / habit definitions | Existing habits card and review context |
| `brainDumpPinnedNote` | pinned-note object with `title`, `content`, and preserved metadata | Thought capture and existing Brain Dump card |
| `dayplanner-blocks` | undated block array | Plan-block capture and Now/Next display |
| `dayplanner-settings` / `dayplanner-categories` | visible hours / category metadata | Schedule-aware time and block display |

`todos-thisweek`, `todos-longterm`, past daily tasks, future daily tasks, and regular Brain Dump notes do not appear in the Today task list.

## Principal use cases

### Daily operator

The user opens Today, sees the current date, reviews every task assigned to today, checks the current and next planner blocks, and completes work without scanning multiple feature pages.

### Fast capturer

The user enters text once in Quick Capture and chooses Task, Plan block, or Thought. Task and Thought writes complete without leaving Today. Plan block opens a prefilled, unlinked scheduling draft in Day Planner.

### End-of-day closer

The user reviews live task and habit completion counts, records a short win and carry-forward note, and saves the review. The review does not create or move work automatically.

## Information architecture

The route remains `overview`, implemented by evolving `src/components/Overview.jsx` and extracting focused subcomponents where useful.

### Content order

1. **Today header and Quick Capture** — local weekday/date, capture input, target selector, and submit action.
2. **Schedule focus** — Now and Next, plus an Open Day Planner link.
3. **Today's tasks** — every recurring occurrence and manual task for the current local date.
4. **End-of-day review** — compact summary until opened.
5. **Supporting dashboard** — Habits, Job Applications, pinned Brain Dump, quote, and weather.

On wide screens, the header and Quick Capture span the top. Schedule focus and Today's tasks form the primary working area, followed by the review and supporting cards. Today's tasks must have enough width to display full task names comfortably.

At `max-width: 1024px`, render one logical column in the same DOM and visual order: header/capture, schedule focus, tasks, review, habits, jobs, Brain Dump, quote, weather.

## Detailed requirements

### 1. Today header

- Display the current browser-local weekday, month, day, and year prominently.
- Derive `todayKey` from a fresh `Date` using the shared local-date utilities.
- Refresh current date/time state at least once per minute and when the document becomes visible again so a tab left open across local midnight advances without requiring another user action.
- Do not add a date picker or historical navigation to Today.
- Retain **Today** as the visible navigation label and `overview` as the internal ID.

### 2. Quick Capture

Quick Capture is a visible, route-local form with three targets: **Task**, **Plan block**, and **Thought**. Task is the default. There is no global shortcut in version one.

#### Common controls

- Use a labelled text input, a real-button segmented target control with `aria-pressed`, and a submit button.
- The submit label reflects the selected target: “Add task,” “Plan block,” or “Add thought.”
- Enter submits while focus is in the text input. Escape clears the current draft and inline validation but does not navigate.
- Trim text before any write. Empty or whitespace-only submissions do not write and show an inline error.
- Enforce a 200-character maximum for Task and Plan block and a 500-character maximum for Thought both while typing and on submit.
- If the user changes from Thought to a 200-character target with a longer draft, retain the draft, block submission, and explain the new limit rather than silently truncating text.
- After a successful Task or Thought capture, clear and refocus the input and announce the result through a polite live region.

#### Task capture

- Append `{ id, text, done: false }` to `todos-daily[todayKey]`.
- Reuse or extract the existing To-Do task-ID creation convention so Quick Capture and To-Do create compatible numeric IDs.
- Do not add any new task fields.
- The new task appears immediately in Today's tasks.

#### Plan-block capture

- Create no task record and no task reference.
- Write a versioned, tab-local planner compose intent to `sessionStorage`, then call `onChange('dayplanner')`.
- Day Planner consumes the intent once and opens a new-block draft prefilled with the captured label. The user chooses time, duration, and category.
- No planner block is written until the user saves the draft. Cancel clears the draft without changing planner data.
- The intent is valid for 15 minutes from `requestedAt`. Day Planner rejects and clears malformed, expired, or already-consumed intents.
- If `sessionStorage` throws, remain on Today, preserve the capture draft, and show: “Couldn’t open the planning draft. Try again.”

#### Thought capture

- Append the trimmed text to `brainDumpPinnedNote.content`.
- When existing content is non-empty, prefix the entry with two newlines. Use `• <local 12-hour time> — <text>` for the appended line.
- Preserve the pinned note's title and all unknown/enhanced metadata.
- Use the existing shared `updatePinnedNote` domain action so `updatedAt` and other metadata behavior remain consistent with Brain Dump.
- Announce “Added to pinned Brain Dump.”

### 3. Schedule focus: Now and Next

Version one reads the existing undated `dayplanner-blocks` timeline. It does not introduce a date-aware planner schema or task links.

- Use `getScheduleMinutes(dayplanner-settings.endHour)` for the current schedule-aware minute.
- Validate blocks defensively and ignore malformed siblings rather than failing the card. A displayable block has an ID, finite numeric `startMinutes` and `endMinutes`, and `startMinutes < endMinutes`.
- Sort valid blocks by `startMinutes`, preserving stored order for equal start times.
- **Now** is the active block with the greatest `startMinutes` for which `startMinutes <= nowMinutes < endMinutes`. If active blocks share the same start, use the first one in stored order.
- **Next** is the future block with the lowest `startMinutes` strictly greater than `nowMinutes`. If future blocks share the same start, use the first one in stored order.
- If no block is active, show “No block in progress.” If no future block exists, show “Nothing else scheduled.”
- Display label, falling back to category label and then “Untitled”; formatted start/end time; and category name plus a non-color-only indicator.
- Refresh Now/Next at least once per minute and when the document becomes visible again.
- Provide **Open Day Planner** in all states. Blocks are not edited from this card.
- Because the existing timeline is undated, do not claim that blocks belong to a persisted calendar date or show task-link indicators.

### 4. Today's tasks

- Derive recurring occurrences for `todayKey` through `getRecurringOccurrences` and merge them before manual `todos-daily[todayKey]` tasks through `mergeDailyTasks`.
- Show every valid task for today. Do not apply a five-item cap or “+N more” summary.
- Group unfinished tasks before completed tasks while preserving recurring/manual source order within each group.
- Keep completed tasks visible and allow them to be reopened.
- Manual completion updates only the matching task in `todos-daily[todayKey]`.
- Recurring completion uses `setOccurrenceCompleted` and `todos-recurring-state`.
- Recurring rows have a visible and accessible recurring label. They do not expose Skip or series-management controls on Today.
- Rows do not expose priority, schedule, edit, delete, reorder, or move actions.
- Provide **Open To-Do** for full task management.
- If no tasks exist, show a useful empty state with an Add task focus action and Open To-Do link.

### 5. Compact end-of-day review

- The review is always available, never time-gated, required, or opened automatically.
- Its collapsed state shows “Review today,” whether a saved review exists, and live context: today's tasks completed/total and habits completed/total.
- Opening it presents two optional textareas: **What went well?** and **What will I carry forward?**, each capped and submit-validated at 500 characters.
- Save is enabled only when at least one trimmed answer is non-empty.
- First save records `completedAt`; later edits preserve it and update `updatedAt`.
- Cancel restores the last saved values and closes the editor. It does not erase a saved review.
- A user may clear one field but cannot save two blank fields. There is no delete UI in version one.
- The carry-forward answer is prose only. It does not create a task, planner block, reminder, or notification.

### 6. Supporting dashboard

- Retain the existing Habits, Job Applications, pinned Brain Dump, quote, and weather cards below the primary Today workflow.
- Preserve their existing authoritative storage and actions.
- Use the existing `onChange` navigation for Habits, Jobs, Brain Dump, To-Do, and Day Planner.
- Where Today touches an existing clickable `span` or `div`, replace it with a native button or link rather than perpetuating non-semantic controls.
- Supporting-card failure must not prevent the primary Today workflow from rendering. Weather failure, for example, remains local to the Weather card.

## Data model and storage

### New synchronized key: `today-command-center-reviews`

Use `useSyncedStorage('today-command-center-reviews', {})`.

```js
{
  "2026-08-10": {
    "wins": "Finished the presentation outline.",
    "carryForward": "Start the data cleanup first thing tomorrow.",
    "completedAt": "2026-08-10T20:40:00.000Z",
    "updatedAt": "2026-08-10T20:41:12.000Z"
  }
}
```

Rules:

- The outer key is a valid browser-local `YYYY-MM-DD`.
- `wins` and `carryForward` are trimmed strings of at most 500 characters; at least one must be non-empty.
- `completedAt` is assigned on the first valid save and remains stable on later edits.
- `updatedAt` changes on each valid save.
- Invalid records are ignored in the UI without rewriting storage during render.
- Historical reviews remain stored but have no version-one browse UI or retention policy.

No priority storage key is introduced.

### Ephemeral planner compose intent

Storage key: `sessionStorage['dayplanner-compose-intent']`

```js
{
  "version": 1,
  "intentId": "crypto.randomUUID()",
  "requestedAt": "2026-08-10T09:20:00.000Z",
  "label": "Prepare interview notes"
}
```

Rules:

- The intent is tab-local and never synchronized to Firestore.
- `label` is a trimmed string of 1–200 characters.
- `requestedAt` must be a valid timestamp no more than 15 minutes old when consumed.
- `intentId` is used to ignore duplicate consumption during the Day Planner mount.
- The intent has no `sourceTask`, `targetDateKey`, or linked-task fields.
- Write the complete intent before navigation.
- Day Planner clears the stored intent after successful consumption or rejection.

## Backward compatibility

- Do not migrate, rewrite, add fields to, or delete existing task, recurrence, habit, note, job, category, settings, or planner values merely by opening Today.
- Existing manual task IDs remain numeric and unchanged.
- Recurring behavior remains owned by `src/domain/recurringTasks.js`.
- Pinned-note writes use `updatePinnedNote` and preserve enhanced metadata already present in the current codebase.
- Existing `dayplanner-blocks`, settings, and categories remain authoritative. Plan-block capture adds a normal block only after explicit save in Day Planner.
- Existing supporting screens and navigation IDs remain unchanged.

## Error, offline, and conflict behavior

- Follow `useSyncedStorage` exactly: local state updates optimistically, localStorage is the immediate cache, and Firestore writes retain the existing debounce and whole-document behavior.
- Do not block Task capture, task completion, Thought capture, or review entry because the network is unavailable.
- “Saved” means accepted locally; do not claim cloud synchronization.
- Simultaneous cross-device edits may overwrite one another under last-write-wins. This is accepted for version one.
- Keep the review in its own key so review edits cannot overwrite task, habit, note, or planner values.
- Treat malformed source arrays and records defensively. Ignore invalid rows while retaining valid siblings, and never throw during the primary Today render.
- If localStorage serialization fails, preserve in-memory UI according to existing hook behavior. Do not add a second persistence or retry system.

## Responsive and accessibility requirements

- Use one semantic page heading and semantic headings for each major section.
- All capture targets, task completion controls, review controls, navigation actions, and planner actions are keyboard reachable and have visible focus states.
- Task controls expose “Mark <task> complete” or “Mark <task> incomplete.” Recurring accessible names include “recurring.”
- Do not rely on color alone for schedule state, category, completion, errors, or control state.
- The desktop and narrow layouts use one DOM order matching the defined content sequence.
- At touch widths, primary and row-action targets are at least 44 by 44 CSS pixels.
- Task names wrap. If visual truncation is unavoidable, expose the full name in accessible text.
- Success, error, and status feedback uses a polite live region and does not steal focus.
- Opening and closing the review or another dialog-like control moves focus predictably and returns it to the invoking control.
- Respect the existing reduced-motion treatment.

## Component and domain responsibilities

Suggested boundaries:

| Area | Responsibility |
|---|---|
| `src/components/Overview.jsx` | Compose Today, own synchronized source hooks, current-date/time tick, navigation, and supporting cards. |
| `src/components/today/QuickCapture.jsx` | Capture form state, target selection, validation, and calls to pure adapters. |
| `src/components/today/ScheduleFocusCard.jsx` | Render deterministic Now/Next results from validated legacy planner blocks. |
| `src/components/today/TodayTasks.jsx` | Render all merged today tasks and forward source-specific completion actions. |
| `src/components/today/EndOfDayReview.jsx` | Review draft lifecycle, validation, save, and cancel behavior. |
| `src/domain/todayCommandCenter.js` | Pure task creation, block validation/focus selection, planner-intent validation, thought append, and review validation/update helpers. No React, storage, Firebase, or implicit clock reads. |
| `src/domain/recurringTasks.js` | Remain the sole recurring occurrence derivation and completion authority. |
| `src/domain/brainDump.js` | Remain the shared pinned-note mutation authority. |
| `src/components/DayPlanner.jsx` | Consume an unlinked compose intent, manage an unsaved new-block draft, and save/cancel it. |

Use memoization for derived task and schedule lists when inputs are stable. Never write state from a memo or effect merely to normalize display data.

## Testing requirements

The repository already has a jsdom React component-test pattern, so version one requires both pure domain tests and component interaction tests.

### Domain tests

At minimum cover:

- local-date rollover and valid/invalid `YYYY-MM-DD` handling;
- recurring-first task merge, unfinished/completed grouping, and preservation of all valid tasks;
- compatible Task capture shape and numeric ID generation;
- Thought capture newline formatting and preservation through `updatePinnedNote`;
- valid, malformed, expired, and duplicate planner compose intents;
- deterministic Now/Next selection, including empty states, overlaps, equal-start ties, overnight schedule minutes, and malformed blocks;
- review trimming, length limits, first-save `completedAt`, and later `updatedAt` behavior.

### Component tests

At minimum cover:

- capture target switching, per-target limits, Enter submit, Escape clear, success/error announcements, and refocus;
- Task and Thought source writes;
- Plan block session-intent handoff, storage failure, Day Planner consume/save, and cancel-without-write;
- rendering every today task, recurring labels, complete/reopen source writes, and the empty state;
- Now/Next minute updates and equal-start behavior;
- review open, cancel, first save, and edit;
- focus return and DOM order at widths above and below 1024px.

Run `npm test` and `npm run build`.

Manual verification must include clean and populated storage, a tab left open across local midnight, document visibility restoration, offline/browser-network-disabled behavior, two-tab remote replacement, planner hours extending after midnight, keyboard-only navigation, a screen-reader pass, and widths above and below 1024px.

## Rollout

1. Add pure Today domain helpers and tests.
2. Add the unlinked planner compose-intent draft flow and tests to the existing Day Planner.
3. Recompose Overview behind the stable `overview` view ID, using the single new review key and all existing source keys.
4. Add component interaction coverage and run the full manual checklist.
5. Run `npm test` and `npm run build` before release.

Update `README.md` and `Full.md` as part of implementation, not as part of this PRD-only revision.

## Acceptance criteria

The feature is complete when all of the following are true:

1. Opening the existing **Today** navigation item presents the Command Center without changing the `overview` ID or state-based routing model.
2. The page prominently displays the correct browser-local weekday and date and advances after local midnight while left open.
3. Quick Capture supports Task, Plan block, and Thought with the documented validation, keyboard, focus, and feedback behavior.
4. Task capture appends a normal `todos-daily[todayKey]` task with no new fields.
5. Thought capture appends safely through `updatePinnedNote`, preserving the pinned title and enhanced metadata.
6. Plan block capture creates only a short-lived unlinked session intent; Day Planner writes a block only after Save, and Cancel writes nothing.
7. Schedule focus shows deterministic Now and Next states from valid `dayplanner-blocks`, including equal-start and empty states.
8. Every valid recurring and manual task for today is shown; completed tasks remain visible and there is no five-item cap.
9. Completing or reopening a task updates the correct existing manual or recurring source and is reflected in To-Do and Today.
10. Today exposes no top-priority, overdue, task-scheduling, task-linking, task-editing, or task-deletion UI.
11. The compact review saves and edits two optional bounded responses for today without creating or moving work.
12. Habits, Job Applications, pinned Brain Dump, quote, and weather remain below the primary workflow with their existing actions.
13. Existing To-Do, recurrence, Habits, Jobs, Brain Dump, navigation, and legacy Day Planner behavior remain functional except for the documented unlinked compose draft.
14. The only new synchronized key is `today-command-center-reviews`; existing stored values are not migrated or rewritten merely by loading Today.
15. Offline/local-cache and cross-device last-write-wins behavior remain consistent with `useSyncedStorage`.
16. Keyboard, screen-reader, focus, touch-target, reduced-motion, and responsive-order requirements are satisfied.
17. Domain tests, component interaction tests, production build, and the manual regression checklist pass.

## Risks and tradeoffs

| Risk / tradeoff | Decision / mitigation |
|---|---|
| Showing all tasks may make the page long | Preserve a clear unfinished/completed grouping and give the task section primary width; do not hide work behind a count cap. |
| The current planner is undated | Treat it as the existing daily timeline and avoid date-specific persistence claims or task links. |
| Whole-document sync can overwrite concurrent changes | Accept existing last-write-wins behavior and keep review data isolated in one new key. |
| Plan-block handoff could survive an abandoned navigation | Use a versioned session intent with a 15-minute expiry and consume/clear it once. |
| Supporting cards can crowd the page | Keep them below the primary Today workflow and preserve the same logical order on narrow screens. |
| References to a future date-aware planner could reintroduce unwanted scope | Keep this version explicitly on legacy unlinked blocks; any later planner migration requires a separate approved change. |

## Future considerations

Only after separate product approval, consider:

- historical review browsing, deletion, or export;
- a date-aware planner migration;
- a shared capture adapter for a future Command Palette;
- a weekly review that reads daily reviews without rewriting them; and
- item-level or operation-based sync if cross-device conflicts become material.
