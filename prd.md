# Product Requirements Document: Recurring Tasks

## Status

Version-one requirements agreed on August 8, 2026 and implemented by the recurring-task integration. This document defines the shipped behavior for the unified To-Do page.

## Summary

Add a dedicated **Recurring Tasks** management section to the To-Do page. A recurring series has a title and a user-selected set of weekdays. The application derives occurrences for matching calendar dates and displays them above manually created tasks in the daily columns. Today's occurrences also appear in the Overview task card.

Recurring occurrences are computed dynamically. The application stores series definitions and per-date actions such as completion or skipping; it does not copy recurring tasks into every future date.

## Problem

The current To-Do page supports individually created dated tasks, a global This Week list, and a Long Term list. Tasks that repeat on a regular weekly schedule must be recreated manually for every date. Copying these tasks into future dates would make series editing difficult, increase storage usage, and create synchronization risks because `todos-daily` is stored as one synchronized document.

## Goals

- Let users define a task once and select every weekday on which it repeats.
- Show all seven weekdays as independently selectable controls.
- Treat selecting all seven days as a daily schedule without introducing a separate recurrence type.
- Display recurring occurrences alongside dated tasks without generating future task copies.
- Track completion independently for every occurrence.
- Allow a single occurrence to be skipped without changing its series.
- Preserve historically accurate occurrences when a series schedule changes or is archived.
- Include today's recurring occurrences in the existing Overview task card.
- Preserve all existing daily, This Week, Long Term, and folder behavior.
- Continue using the existing localStorage and Firestore synchronization architecture.

## Non-goals

Version one will not include:

- Repeat intervals such as every two weeks.
- Monthly, yearly, date-of-month, or nth-weekday schedules.
- Start-date or end-date controls.
- Occurrence-count endings.
- Pausing and resuming a series.
- Restoring or managing archived series.
- Overdue roll-forward behavior.
- Automatic skipping of missed occurrences.
- Dragging or rescheduling individual recurring occurrences.
- Creating a recurring series from a daily, This Week, Long Term, or folder task form.
- Reminders, notifications, due times, descriptions, priorities, or tags.
- Server-side or background occurrence generation.

## Existing system context

The active task experience is implemented in `src/components/TodoCard.jsx` and currently uses three synchronized values:

| Storage key | Shape | Purpose |
|---|---|---|
| `todos-daily` | Object keyed by local `YYYY-MM-DD` | Manually created dated tasks |
| `todos-thisweek` | Task array | Global undated weekly backlog |
| `todos-longterm` | Task/folder array | Global long-term tasks and folders |

`src/components/Overview.jsx` independently reads today's entry from `todos-daily`. All persisted values pass through `useSyncedStorage`, which uses localStorage as an immediate cache and one Firestore document per storage key as the remote source of truth.

The recurring feature must use shared domain functions so Todo and Overview cannot disagree about whether an occurrence exists or is completed.

## Information architecture

The page remains named **To-Do**. Its existing weekly board, This Week list, and Long Term list remain intact.

A dedicated **Recurring Tasks** card is added inside the To-Do page beneath the existing task-planning sections. It is the only place where recurring series can be created, edited, reordered, or archived.

Archived series are not shown in the management section and there is no archived-series interface in version one.

## Recurring series management

### Creating a series

The inline creation form contains:

- A task title.
- Seven weekday controls ordered Monday through Sunday.
- A Save action.
- A Cancel action.

Requirements:

- The form opens with the current local weekday selected.
- All seven weekdays are always visible and individually selectable.
- There are no Every Day, Weekdays, Weekends, Select All, or Clear shortcuts.
- At least one weekday is required. Save remains disabled and validation is shown when none are selected.
- Selecting all seven weekdays means that the series occurs every calendar day.
- The title follows the existing task title limit of 200 characters and is trimmed before saving.
- An empty title is invalid.
- Duplicate titles and duplicate title/schedule combinations are allowed.
- A valid form can be submitted with Enter when doing so does not interfere with weekday controls.
- IDs use `crypto.randomUUID()` rather than timestamp-based numeric IDs.

### Series start behavior

- A new series is effective beginning on its local creation date.
- If its creation date is selected, the first occurrence appears immediately on that date.
- If its creation date is not selected, its first occurrence is the next selected weekday.
- There is no explicit start-date field and a series cannot be scheduled for creation on a future date.

### Series list

Each active series row displays:

- The title.
- A compact weekday summary, such as `Mon, Wed, Fri`.
- Edit and Archive actions.
- A drag handle.

Series are displayed in user-defined order. Users can drag rows within the management section to reorder them. This same order determines the order of recurring occurrences within every daily column.

### Editing a series

Editing uses an inline form with the same title and seven weekday controls used during creation.

- Changing the title changes the displayed title for all occurrences, including historical occurrences.
- Changing selected weekdays takes effect from the current local date forward.
- Past dates before the edit retain the schedule that applied on those dates.
- Multiple edits on the same local date update that day's latest schedule revision rather than creating ambiguous competing revisions.
- Adding the current weekday makes today's occurrence appear immediately.
- Removing the current weekday removes today's incomplete occurrence immediately.
- If today's occurrence is already completed when today is removed, that completed occurrence remains visible for today. The new schedule applies normally beginning tomorrow.
- Existing completion and skip state is preserved if a weekday is removed and later re-added.
- At least one weekday remains required while editing.

Historical schedule accuracy requires dated schedule revisions. Implementations must not overwrite the only copy of the previous weekday selection.

### Archiving a series

Archive is the only supported way to stop a series.

- Archiving requires confirmation explaining that future occurrences will stop.
- The archive date is the current local date and is inclusive: today's occurrence remains, while no occurrence is produced beginning tomorrow.
- Historical occurrences on or before the archive date continue to appear when browsing past weeks.
- The archived series immediately disappears from the Recurring Tasks management section.
- Archived series cannot be restored, permanently deleted, or edited through the version-one interface.
- Archiving does not delete completion or skip history.

## Occurrence behavior

### Derivation

An occurrence exists on a date when all of the following are true:

1. The date is on or after the series creation/effective date.
2. The date matches the weekday set in the schedule revision effective for that date.
3. The series was not archived before that date.
4. The occurrence has not been skipped.

No occurrence record is written merely because a date or week is viewed.

Each occurrence has a deterministic identity composed from the series ID and local date:

```text
<seriesId>:<YYYY-MM-DD>
```

### Placement and ordering

- Recurring occurrences appear above manually created tasks in each daily column.
- Recurring occurrences follow the order of their series in the Recurring Tasks management section.
- Completed occurrences stay in their original series order and do not jump after completion.
- Manually created tasks retain their current ordering and drag-and-drop behavior.
- Recurring occurrences are visually identifiable as recurring and expose a clear Skip action.
- Recurring occurrences are not draggable in version one.
- Clicking an occurrence title does not open or edit its series.

### Completion

- Every occurrence has an independent completion state.
- Completing one date does not affect any other date.
- A completed occurrence remains visible with the existing completed-task treatment.
- Clicking the checkbox again returns that occurrence to incomplete.
- Completion state is retained indefinitely so historical weeks remain accurate.
- Completing or uncompleting an occurrence must not create an entry in `todos-daily`.

### Skipping

- Each recurring occurrence provides a visible, touch-accessible **Skip** action rather than the ordinary task delete control.
- Skipping affects only the selected series/date occurrence.
- A skipped occurrence disappears from the daily column immediately.
- Skipping does not alter the series schedule or any other occurrence.
- There is no confirmation, Undo action, restore control, or exception-history interface in version one.
- Skip state is retained indefinitely.

### Missed occurrences

- An incomplete occurrence remains incomplete on its original historical date.
- It does not roll forward to today.
- It does not appear as overdue on later dates.
- It is not automatically skipped at midnight.

## Overview integration

The existing Overview **Pending tasks** card must merge:

1. Recurring occurrences derived for today's local date.
2. Manually created tasks from `todos-daily[today]`.

Requirements:

- Recurring occurrences appear before manual tasks, matching the To-Do daily column.
- The existing Overview behavior of showing pending items before completed items remains.
- The existing five-item display limit remains.
- Completing or uncompleting a recurring occurrence on Overview updates `todos-recurring-state`.
- Completing or uncompleting a manual task continues updating `todos-daily`.
- Skipping and series management remain available only on the To-Do page.
- This Week and Long Term tasks remain excluded from Overview.

## Data model

### Series storage

Use the synchronized key `todos-recurring` for an ordered array of series. Array order is the user-defined display order.

Conceptual shape:

```js
[
  {
    id: "9d5b6c89-...",
    text: "Gym",
    createdDate: "2026-08-08",
    archivedDate: null,
    scheduleRevisions: [
      {
        effectiveFrom: "2026-08-08",
        weekdays: [1, 3, 5]
      }
    ]
  }
]
```

Weekdays use ISO numbering:

- `1` Monday
- `2` Tuesday
- `3` Wednesday
- `4` Thursday
- `5` Friday
- `6` Saturday
- `7` Sunday

Rules:

- `createdDate`, `effectiveFrom`, and `archivedDate` are local calendar date strings in `YYYY-MM-DD` format.
- `archivedDate` is inclusive.
- `scheduleRevisions` are ordered by `effectiveFrom`.
- The revision with the latest `effectiveFrom` not later than the requested date controls that date.
- Reordering the series array must not change IDs or occurrence state.

### Occurrence-state storage

Use the synchronized key `todos-recurring-state` for sparse, per-occurrence state:

```js
{
  "9d5b6c89-...:2026-08-10": {
    status: "done"
  },
  "9d5b6c89-...:2026-08-12": {
    status: "skipped"
  },
  "9d5b6c89-...:2026-08-14": {
    status: "done",
    preserveOccurrence: true
  }
}
```

Rules:

- Untouched and incomplete occurrences have no stored entry.
- Marking a completed occurrence incomplete removes its ordinary `done` state entry.
- `preserveOccurrence` is used only when a completed current-day occurrence must remain after a schedule edit removes that weekday.
- If a preserved occurrence is later marked incomplete and no longer matches the schedule, it disappears and its state entry is removed.
- State keys remain stable across title changes, schedule revisions, reordering, and archiving.

### Why occurrences are virtual

The implementation must not pre-generate future occurrences or lazily insert them into `todos-daily` when weeks are viewed. Virtual derivation:

- Avoids writes caused by navigation.
- Prevents duplicate generation across devices.
- Keeps `todos-daily` from growing for untouched occurrences.
- Makes a series definition authoritative.
- Allows schedule changes without rewriting copied future tasks.

## Shared task-domain module

Date and recurrence behavior must be extracted into shared, testable functions used by both Todo and Overview. The module should provide behavior equivalent to:

```js
toLocalDateKey(date)
toIsoWeekday(dateOrDateKey)
getScheduleForDate(series, dateKey)
seriesOccursOn(series, dateKey, occurrenceState)
getRecurringOccurrences(seriesList, state, dateKey)
mergeDailyTasks(recurringOccurrences, manualTasks)
makeOccurrenceId(seriesId, dateKey)
```

Requirements:

- Recurrence calculations must not use `toISOString()` for local task dates.
- Calendar computations must remain stable across local midnight and daylight-saving transitions.
- Todo and Overview must not maintain separate implementations of recurrence matching.
- Domain functions must be deterministic and must not write to storage.

## Persistence and synchronization

- `todos-recurring` and `todos-recurring-state` use the existing `useSyncedStorage` hook.
- Each key remains one localStorage value and one Firestore document under `dashboard/<key>`.
- Series definitions and occurrence state remain separate so frequent completion changes do not rewrite the series document.
- The existing one-second Firestore write debounce remains.
- Version one accepts the current whole-document, last-write-wins synchronization behavior used elsewhere in the dashboard.
- The feature does not refactor existing tasks into item-level Firestore documents.
- Viewing dates and deriving occurrences must never cause persistence writes.

## Existing behavior that must remain unchanged

- Manual daily tasks can still be added, completed, deleted, reordered, and dragged between supported locations.
- This Week remains global and unchanged while navigating weeks.
- Long Term retains root tasks, folders, nested tasks, and current drag-and-drop behavior.
- Existing task IDs may remain numeric; new recurring series IDs are strings.
- Existing `todos-daily`, `todos-thisweek`, and `todos-longterm` data must remain intact.
- Ordinary tasks do not gain recurrence metadata.
- Recurring occurrences never become ordinary tasks unless a future feature explicitly introduces detaching or rescheduling.

## Migration and rollout

- No existing task data requires migration.
- The new storage keys initialize to an empty array and empty object respectively.
- Existing users initially see an empty Recurring Tasks section and no derived occurrences.
- The removed legacy `GoalsCard` and `week_planner_tasks` data are outside this feature's scope.
- Update `Full.md` and `README.md` when the feature is implemented.
- No feature flag is required for this personal dashboard.

## Error and validation behavior

- A series cannot be saved without a non-empty title and at least one selected weekday.
- Invalid forms retain the user's entered values and clearly identify the missing field.
- Storage write failures follow the existing `useSyncedStorage` console-error behavior; optimistic local state remains visible.
- Unknown or malformed series/state records should be ignored defensively rather than breaking the entire To-Do or Overview view.
- An orphaned occurrence-state entry without a corresponding series is not rendered.

## Accessibility and interaction requirements

- Weekday controls are real buttons with pressed state exposed through `aria-pressed`.
- Every control has a meaningful accessible label, including abbreviated weekdays.
- Save, Cancel, Edit, Archive, completion, Skip, and drag controls are keyboard reachable.
- Skip is not hover-only.
- Disabled Save state is programmatically represented.
- Archive confirmation identifies the series being archived and explains that future occurrences stop.
- Drag ordering is an enhancement; the DOM order remains logical and usable without dragging.

## Testing requirements

Introduce Vitest for deterministic recurrence-domain tests. At minimum, cover:

- ISO weekday conversion for Monday through Sunday.
- Local `YYYY-MM-DD` generation without UTC date shifting.
- Creation on a selected current weekday.
- Creation when the current weekday is not selected.
- All seven weekdays selected.
- Schedule revisions preserving dates before their effective date.
- Adding today during an edit.
- Removing an incomplete occurrence today.
- Preserving an already-completed occurrence when today is removed.
- Independent completion on different dates.
- Toggling a completed occurrence back to incomplete.
- Skipping one occurrence without affecting the series.
- Archive cutoff behavior: today remains and tomorrow stops.
- Historical occurrence rendering for archived series.
- Stable occurrence identities across renames and reordering.
- Merging recurring occurrences above manual daily tasks.
- Ignoring malformed and orphaned state safely.

Component-level interaction tests are desirable but not required for version one.

## Acceptance criteria

The feature is complete when:

1. The To-Do page contains a dedicated Recurring Tasks management section.
2. A user can create a series with a title and any non-empty combination of Monday through Sunday.
3. The creation form defaults to the current local weekday and provides no selection shortcuts.
4. Selecting all seven days produces an occurrence every calendar day.
5. A series created on a selected current weekday appears today immediately.
6. A series created when today is not selected first appears on the next selected weekday.
7. Matching occurrences appear above manual tasks in each daily column.
8. Occurrences follow the user-defined series order.
9. Series can be reordered by dragging within the Recurring Tasks section.
10. Completing an occurrence affects only that series and date.
11. Completion can be toggled back to incomplete.
12. Completed occurrences remain visible and do not move position.
13. Skipping an occurrence hides only that occurrence and provides no undo in version one.
14. Missed occurrences remain incomplete only on their original dates and never roll forward.
15. Recurring occurrences cannot be dragged or rescheduled.
16. Editing a title updates the title on historical and future occurrences.
17. Editing weekdays changes today and future dates while preserving the historical schedule.
18. A completed occurrence for today remains visible if an edit removes today's weekday.
19. Archiving requires confirmation, retains today's occurrence, and stops occurrences beginning tomorrow.
20. Archived series disappear from management while their historical occurrences remain visible.
21. Today's recurring occurrences appear in Overview before today's manual tasks.
22. Overview completion updates the same per-date occurrence state shown on To-Do.
23. Viewing a week or opening Overview does not create task copies or trigger recurrence-related persistence writes.
24. Existing daily, This Week, Long Term, and folder data and interactions remain unchanged.
25. Recurrence behavior uses local calendar dates consistently across Todo and Overview.
26. Automated domain tests cover recurrence matching, revisions, state changes, archive cutoff, and merging.

## Future considerations

The model should permit later additions without requiring the version-one interface to expose them:

- Repeat intervals.
- Explicit start and end dates.
- Monthly and yearly schedules.
- Pausing and resuming.
- Archived-series management and restoration.
- Skip history and undo.
- Moving or detaching one occurrence.
- Converting an existing ordinary task into a series.
- Item-level Firestore storage if multi-device write contention becomes material.
