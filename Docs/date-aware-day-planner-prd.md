# Product Requirements Document: Date-Aware Day Planner

## Status

Proposed version-one requirements for the approved **Date-Aware Day Planner**. This document is implementation-ready; it does not authorize the deferred Today Command Center, authentication, settings redesign, PWA, or AI work.

## Summary

Replace the current one global Day Planner schedule with independent plans keyed by the user's local calendar date. The Day Planner will support previous/next/today navigation, a native date picker, reusable weekday templates, Copy Yesterday, scheduling existing manual To-Do items, an unscheduled-task queue, non-blocking collision warnings, and optional completion of a time block.

The current timeline interaction remains recognizable: clicking open grid space creates a block, blocks drag in 15-minute increments, and the lower handle resizes them. Categories and visible-hour settings remain global. A block is always owned by one plan date, even when it extends after midnight.

## Problem

`dayplanner-blocks` is currently a single synchronized array. Opening the Day Planner on a different day shows the same blocks, so the user cannot retain yesterday's history, prepare tomorrow, or see a truthful schedule in Overview. The planner also has no practical bridge from the existing To-Do inventory to a scheduled day, no reusable starting point for recurring weekdays, and no feedback when two blocks occupy the same time.

## Goals

- Store and display a distinct Day Planner plan for each local `YYYY-MM-DD` date.
- Let a user browse past and future plans without creating, deleting, or moving plans merely by navigating.
- Provide previous, next, Today, and calendar-date navigation.
- Preserve the existing timeline, categories, visible-hour settings, drag, resize, and clear-day affordances where compatible with date-aware behavior.
- Provide reusable templates associated with an ISO weekday, plus Copy Yesterday.
- Let a user schedule an existing *manual* To-Do task as a linked time block without deleting, moving, or changing that task's existing data.
- Provide a selected-day unscheduled-task queue for manual daily tasks.
- Warn about overlapping blocks but never silently move, shorten, or reject a block.
- Allow a block itself to be marked complete independently of a linked task.
- Give Overview and the later Today Command Center one stable, pure way to read a date's plan.
- Continue using localStorage plus Firestore through `useSyncedStorage`.

## Non-goals

Version one does not include:

- Changes to the existing To-Do board layout, task creation, task completion, drag/drop, recurring-task rules, This Week list, Long Term list, folders, Habits, or Job Applications.
- Scheduling virtual recurring occurrences. They remain governed by the recurring-task feature.
- Two-way synchronization between a linked task's title/completion/location and its time block, or automatic relinking after task moves.
- Reminders, notifications, calendar-provider integration, sharing, attendees, time zones per plan, travel-time calculations, or AI scheduling.
- A global task inbox redesign, prioritization algorithm, auto-placement, auto-rescheduling, duration estimates, or capacity scoring.
- Cross-midnight blocks longer than the configured 4:00 AM maximum, multi-day blocks, or a weekly/monthly planner view.
- A template editor beyond saving a plan as a weekday template, renaming it, and deleting it.
- Undo/history, bulk actions, archival/deletion of dated plans, export/import UI, or a settings/authentication/PWA redesign.
- Building the Today Command Center. This feature only supplies its read contract.

## Existing system context

The application is a React 18/Vite client application. Every persisted feature uses `useSyncedStorage(key, initialValue)`, which renders from localStorage immediately, waits for the first Firestore snapshot before ordinary writes, writes Firestore after one second, and uses whole-document last-write-wins semantics. There is no server-side merge or transaction layer.

Today, `src/components/DayPlanner.jsx` reads:

| Key | Current value | Current consumers |
|---|---|---|
| `dayplanner-blocks` | global block array | Day Planner, Overview |
| `dayplanner-settings` | `{ startHour, endHour }` | Day Planner, Overview |
| `dayplanner-categories` | editable category array | Day Planner, Overview |

The existing block shape is `{ id, label, category, startMinutes, endMinutes }`. `startMinutes` and `endMinutes` already permit values after 1440. `src/utils/date.js` deliberately supplies local calendar-key helpers and must remain the sole basis for dates; `Date#toISOString()` is not valid for this feature. `src/utils/time.js` already formats after-midnight time and maps a real time to a late-night schedule time.

`TodoCard.jsx` stores manual dated tasks in `todos-daily`, global This Week tasks in `todos-thisweek`, and global Long Term tasks/folders in `todos-longterm`. A normal task remains `{ id: number, text: string, done: boolean }`. Recurring occurrences are virtual and must not be modified by this feature. Overview currently sorts the one global block array and renders it in its Today's schedule card.

## Terminology

| Term | Definition |
|---|---|
| **Plan date** | A local calendar key (`YYYY-MM-DD`) that owns one plan and all of its blocks. |
| **Plan** | The optional stored record for one plan date. A date with no record has an empty plan. |
| **Time block** | A time interval belonging to exactly one plan date. It may be linked to a manual task. |
| **Logical schedule date** | The plan date to which the current after-midnight time belongs for the purpose of the Now line. It can be yesterday before the configured overnight cutoff. |
| **Template** | A reusable snapshot of blocks associated with one ISO weekday. It is not a live plan and contains no task links or completion state. |
| **Linked task** | A manual To-Do item from which a block was scheduled. The link is informational and one-way. |
| **Unscheduled task** | An incomplete manual daily task on the selected plan date that has no linked block in that same plan. |
| **Collision** | Two blocks in the same plan whose half-open intervals overlap: `a.start < b.end && a.end > b.start`. |

## Information architecture

The existing top-level page remains named **Day Planner**. Within it, in reading order:

1. A plan header: previous-day button, date label, native date picker, Today button, next-day button. The label includes the weekday and an unambiguous localized date. Today is visually distinct only when the selected plan date is today.
2. The existing settings row: global Start and End visible-hour selects, then selected-plan actions: Copy Yesterday, Templates, and Clear Day. Clear Day explicitly names the selected date.
3. The timeline for the selected date, including the Now line only when that selected date is the logical schedule date.
4. An edit/details panel for the selected block, or a compact selected-day **Unscheduled tasks** panel when no block is selected. On a narrow screen these panels appear below the timeline.

The To-Do page retains its current UI without new row actions or indicators. Manual tasks are selected from an **Add from tasks** picker owned by Day Planner, and the Today Command Center may open the same planner composer through the ephemeral handoff contract below. Recurring occurrences are not schedulable in version one. The Overview/Today schedule surface reads planner data only through the shared contract.

## Date and after-midnight semantics

### Local calendar ownership

- All plan keys, template weekday calculations, Copy Yesterday, and task dates use `toLocalDateKey`, `parseLocalDateKey`, and `addDays` from `src/utils/date.js` (or pure helpers built on them).
- A plan date is based on the browser's local calendar, not UTC and not the weather service timezone. Day arithmetic must use the existing local-noon-safe helper so DST transitions do not skip or duplicate a key.
- Navigating to a date is read-only. Do not create `plansByDate[dateKey]` until the user creates, copies, applies, updates, or clears a block for that date.
- A plan owns a block with `0 <= startMinutes < endMinutes <= 1680`. The existing maximum visible end hour of 28 is retained. Blocks snap to 15-minute increments and have a 15-minute minimum duration.

### After midnight

- `0` through `1439` are on the plan date. `1440` through `1680` are the following calendar day, but remain part of the originating plan date. Thus a block in the `2026-08-10` plan with `startMinutes: 1530` is displayed as **1:30 AM +** and is not copied into the `2026-08-11` plan.
- The literal local-today plan is always `getPlanForDate(plans, toLocalDateKey(new Date()))`. It does not inherit blocks from yesterday. This is the stable contract for Overview and the future Today Command Center.
- For the interactive timeline's Now line only, use `getLogicalScheduleDateKey(settings, now)`: when `endHour > 24` and local wall-clock minutes are less than `(endHour - 24) * 60`, return yesterday's key; otherwise return today's key. Pair it with `getScheduleMinutes(endHour, now)`.
- Consequently, at 2:00 AM with `endHour: 27`, the Now line appears at 26:00 only while yesterday's plan is selected. Today’s plan does not falsely show last night's block as its current block.
- A literal date summary uses `getBlocksForDate(plans, dateKey)` and never imports blocks from an adjacent plan. A current-time surface such as Today Command Center uses `getPlannerFocusForNow(plans, settings, now)`, which may return yesterday as `scheduleDateKey` before the overnight cutoff. When that occurs, the consumer must label the owning plan date rather than presenting the block as part of today’s literal plan.

## Detailed UX and interaction flows

### Opening and navigating a plan

- Initial selected date is the current local date. If the app remains open across local midnight, update the `todayKey` used for button state and Today navigation; do not automatically replace a user-selected historical/future date. If the selected date had been today, it may advance to the new today on the next minute tick.
- Previous and Next move exactly one local day with `addDays`. The date picker accepts any valid browser-supported date. Its value is a local date key, not a UTC timestamp.
- Today sets the selected key to the current local date. It is enabled on all dates; on today it is harmless.
- Changing selected date clears selection, closes destructive confirmations and schedule popovers, and preserves unsaved block edits because block fields save optimistically on change just as the current panel does.
- An empty plan shows the empty timeline plus: “No blocks planned for [date].” It offers **Copy Yesterday**, an applicable weekday-template chooser, and **Add a block**. Empty states must not imply that data is loading or that a plan record will be created.

### Creating, editing, moving, resizing, deleting, and completing a block

- Clicking/tapping blank grid space creates an initially unlabeled 60-minute block at the containing hour, clamped to the selected visible range. It uses the first category, has `completed: false`, and opens the editor.
- Drag and resize retain 15-minute snapping, range clamping, a 4px movement threshold, and click-to-select behavior. Replace mouse-only handling with Pointer Events plus `setPointerCapture` so touch and pen interaction work; Escape cancels an in-progress drag/resize back to its initial interval.
- The editor retains label, category, start, end, category creation/removal, close, and delete. The time controls use `formatMinutes(..., { markNextDay: true })`.
- Add a real checkbox/button labelled “Mark [label] block complete/incomplete.” Completion applies only to this `TimeBlock.completed` flag. It visually mutes/strikes the block and does not toggle a linked To-Do task.
- Deleting a block requires no new confirmation (matching current behavior), removes only that block, and makes a linked daily task eligible for the Unscheduled tasks list again. Clear Day requires the current confirmation and clears only the selected plan's block array; it never clears a template or a To-Do task.
- If a mutation leaves a date with no blocks, retain an explicit empty plan record in v1. This makes a user-cleared plan survive sync and prevents a legacy migration rerun from repopulating it.

### Collision warning behavior

- Evaluate collisions after creating a block and whenever a block’s start/end changes through drag, resize, selects, template application, Copy Yesterday, or scheduling a task.
- Collision is a warning, not a validator. The new interval is saved unchanged; no auto-placement, stacking change, rejection, or confirmation is required for direct manipulation.
- A colliding block displays a visible warning indicator and an accessible description such as “Overlaps Deep work, 10:00 AM–11:00 AM.” Its edit panel lists all overlapping block labels and intervals. Unlabeled blocks use “Untitled.”
- When a bulk operation would create one or more collisions, show a preview count and list up to five conflicts before its final Apply/Copy confirmation. The action remains available as **Apply anyway**. A no-collision bulk operation completes immediately.
- Adjacent blocks are not collisions. A block never collides with itself, and completion state does not affect collision detection.

### Copy Yesterday

- **Copy Yesterday** reads `getPlanForDate(plans, addDays(parseLocalDateKey(selectedDate), -1))`; it never reads the currently displayed global legacy array.
- If yesterday has no blocks, show a short non-destructive message: “No blocks to copy from [date].” Do not create a plan.
- If the selected plan is empty, Copy Yesterday prepares all blocks as new IDs, resets `completed` to `false`, preserves label/category/times, and strips `linkedTask`. It then applies immediately unless it detects invalid category references, in which case it reports fallback categories before applying.
- If the selected plan contains blocks, open a choice: **Add copied blocks** (default, non-destructive) or **Replace this plan**. Replace requires confirmation identifying the selected date. Both show collision warning preview when relevant.
- Copying never changes yesterday. A copied block is independent after copying.

### Weekday templates

- A user can save the selected plan’s blocks as a template. The save form contains a required name (trimmed, max 80 characters) and an ISO weekday selector (Monday–Sunday), defaulting to the selected date’s weekday. Multiple templates per weekday and duplicate names are allowed.
- A template is offered first when its weekday matches the selected date. An “All templates” control lets the user deliberately apply a template from another weekday; the confirmation says that it was created for a different weekday.
- Saving a template from an empty plan is disabled with clear validation. Saving captures order, label, category, start, and end only; it resets `completed` and removes `linkedTask`.
- Applying a template has the same **Add blocks** / **Replace this plan** choice and collision preview as Copy Yesterday. Applied blocks receive new IDs. Templates are snapshots: later plan/category edits do not rewrite them, and template edits do not alter already applied blocks.
- The Templates menu lists name, associated weekday, block count, Rename, Delete, and Apply. Delete requires confirmation and does not affect plans created from the template. Rename changes only template metadata.

### Scheduling existing tasks and the unscheduled-task workflow

- Day Planner provides **Add from tasks** beside its selected-day actions. It opens a local, filterable picker grouped as: incomplete manual tasks from `todos-daily[selectedDate]`, This Week, Long Term root, and Long Term folders. Completed manual tasks may be found through an explicit **Show completed** toggle. Folders and virtual recurring occurrences are never candidates.
- Choosing a task opens a lightweight planner-owned modal/popover with the task text, target plan date defaulting to the currently selected planner date, Start, End, category, and Create block. Start defaults to the first 60-minute slot in the selected range that does not collide; if none exists, default to the start hour and flag the prospective collision. The user may choose any valid time and may schedule an already completed task.
- Creating the block keeps the user in Day Planner, selects the created block, and announces success. It never alters the source task’s object, position, completion, folder, or ordinary delete behavior. Scheduling the same task more than once is allowed; each block is independent.
- The Day Planner's Unscheduled tasks panel lists incomplete manual tasks from `todos-daily[selectedDate]` with no linked block in that same plan. It is sorted in existing task-array order. Each row offers **Schedule** with the same planner-owned form. It excludes manual tasks already linked, completed tasks, recurring occurrences, This Week, and Long Term tasks because those do not inherently belong to the selected date.
- The To-Do page receives no Schedule button, Scheduled indicator, picker, or other presentation change from this feature. Task-to-block entry points are Day Planner and, when implemented, Today Command Center.
- A stale link (the task was deleted or moved after scheduling) remains a valid historical block. Its editor shows “Original task unavailable”; the block label remains editable, and no task data is recreated or changed.

## Data model and storage keys

### Canonical dated plans

Add the synchronized key `dayplanner-plans`. It is the sole write source for plans after migration.

```js
{
  schemaVersion: 1,
  plansByDate: {
    "2026-08-10": {
      blocks: [
        {
          id: "a0a2d839-...",             // crypto.randomUUID()
          label: "Deep work",
          category: "work",
          startMinutes: 600,
          endMinutes: 720,
          completed: false,
          linkedTask: {
            taskId: 1723276800123,
            source: { type: "daily", dateKey: "2026-08-10", folderId: null },
            textAtSchedule: "Finish portfolio"
          }
        },
        {
          id: "f603f3bb-...",
          label: "Wind down",
          category: "rest",
          startMinutes: 1500,
          endMinutes: 1560,
          completed: true,
          linkedTask: null
        }
      ]
    }
  },
  legacyMigration: {
    sourceKey: "dayplanner-blocks",
    importedToDateKey: "2026-08-10",
    importedBlockCount: 3,
    completedAt: 1723276800000
  }
}
```

Rules:

- `plansByDate` may omit empty dates except after a Clear Day, where an explicit `{ blocks: [] }` is retained as described above.
- Block order is the user’s creation/order order; rendering sorts a copy by `startMinutes`, then original array index for tied starts. Do not sort-and-write merely to display.
- `id` is a UUID for every newly created, copied, template-applied, or migrated block. Existing IDs are retained only when they are non-empty strings and unique within their migrated plan; otherwise generate a UUID.
- `linkedTask` is either `null`/absent or the snapshot shown above. `source.type` is `daily`, `week`, or `long`; `dateKey` is required only for `daily`; `folderId` is required only for nested `long` tasks. This preserves the current task shapes rather than adding fields to them.
- `textAtSchedule` is a display fallback, not a task replica. A linked task is never used to overwrite a block label.
- Defensively ignore malformed date keys, plans, blocks, categories, intervals, or task references. Invalid records must not crash Day Planner or consumers; valid sibling records remain available.

### Templates

Add synchronized key `dayplanner-templates`, initially `[]`.

```js
[
  {
    id: "253b87ac-...",
    name: "Focused Monday",
    weekday: 1,                         // ISO: 1 Monday … 7 Sunday
    blocks: [
      { label: "Deep work", category: "work", startMinutes: 600, endMinutes: 720 }
    ],
    createdAt: 1723276800000,
    updatedAt: 1723276800000
  }
]
```

Template block objects must not contain IDs, `completed`, or `linkedTask`. Validate weekday and intervals before render/apply; invalid template blocks are skipped and the UI reports how many could not be applied.

### Existing keys that remain compatible

| Key | v1 treatment |
|---|---|
| `dayplanner-blocks` | Legacy read-only migration source; do not delete or write it after migration. |
| `dayplanner-settings` | Unchanged global `{ startHour, endHour }`; retain defaults `10`, `27` and maximum `28`. |
| `dayplanner-categories` | Unchanged global editable category array; removing a category remaps all valid dated blocks from that category to the first remaining category/fallback. |
| `todos-daily` | Read for the selected-day queue and task scheduling; task objects remain unchanged. |
| `todos-thisweek`, `todos-longterm` | Read by Day Planner’s Add from tasks picker; shapes, page UI, and drag/drop behavior stay unchanged. |

## Stable integration contract

Create a pure `src/domain/dayPlanner.js` module shared by Day Planner, Overview, and future consumers. At minimum it must expose behavior equivalent to:

```js
getPlanForDate(dayPlannerPlans, dateKey) // { blocks: [] } for missing/invalid date
getBlocksForDate(dayPlannerPlans, dateKey) // safe, display-sorted copy
getLogicalScheduleDateKey(settings, now)
getPlannerFocusForNow(dayPlannerPlans, settings, now)
// -> { scheduleDateKey, nowMinutes, blocks }
getBlockCollisions(blocks, candidateOrBlockId)
isTaskLinkedInPlan(plan, taskId, source?)
cloneBlocksForPlan(blocks) // new IDs, completed false, no links
applyTemplateToPlan(plan, template, mode) // pure add/replace result + collisions
```

Consumer contracts for Overview and the later Today Command Center:

```js
const dateKey = toLocalDateKey(new Date())
const plan = getPlanForDate(dayPlannerPlans, dateKey)
const blocks = getBlocksForDate(dayPlannerPlans, dateKey)

const focus = getPlannerFocusForNow(dayPlannerPlans, settings, new Date())
// The current owning plan may be yesterday during the configured overnight window.
```

The literal-date functions return a safe empty plan and never pull blocks from an adjacent date. `getPlannerFocusForNow` is also pure and returns the logical owning plan plus schedule-aware minutes for Now/Next experiences. Both contracts expose each block’s `id`, `label`, `category`, interval, `completed`, and optional `linkedTask`. Consumers must resolve category display properties from `dayplanner-categories`; they must not duplicate collision, date, or after-midnight logic. The Command Center’s UX, prioritization, and writes are expressly outside this PRD.

Day Planner must also consume the versioned, tab-local `sessionStorage['dayplanner-compose-intent']` handoff defined by the Today Command Center PRD. Version one accepts a label with either no source or one manual dated-task source. It validates the intent, clears it once consumed, opens the target date and create-block editor, and writes nothing until the user confirms block creation. Invalid, expired, duplicate, or recurring-occurrence intents are rejected safely. The resulting planner block stores the canonical `linkedTask` snapshot defined in this PRD.

## Persistence, migration, and conflict behavior

### Migration from `dayplanner-blocks`

1. Preserve `dayplanner-blocks` untouched as a rollback source.
2. Extend the persistence layer used by migration to expose first-snapshot hydration status (for example, a third value from `useSyncedStorage` that existing two-value callers may ignore). Do not migrate from local cache before *both* the legacy key and `dayplanner-plans` have received their initial remote snapshot/error.
3. If the hydrated canonical value has no `legacyMigration` and no own plan records, clone the hydrated legacy global array into the current local date’s plan. Normalize valid legacy records, reset `completed` to `false`, retain valid unique string IDs where possible, and generate UUIDs otherwise.
4. Write the resulting canonical object with `legacyMigration` in the same `dayplanner-plans` value. This embedded marker makes a retry idempotent; never import again when it exists, even if its imported plan is later cleared.
5. If canonical plans already exist, do not import legacy blocks. If legacy is empty, write an empty canonical object with a migration marker only after an intentional planner mutation; simply viewing must remain write-free.
6. If the browser is offline, wait until the normal hook has hydrated/unblocked local persistence. Do not show two schedules. Present a small “Migrating existing planner…” loading state while the migration decision is pending.

The migration destination is the first local date on which the post-upgrade app completes migration. This is an unavoidable product choice because the legacy schedule has no date metadata. The migration notice states that existing blocks were placed on that date. It must not guess historical dates.

### Compatibility and rollback

- New code reads `dayplanner-plans` only after migration; it must not fall back to `dayplanner-blocks` for normal rendering, or a clear/edit could appear to fail.
- A rollback to the immediately preceding release restores the untouched legacy global schedule. Changes made only in dated plans/templates after migration are not visible to that older release; document this release-note limitation.
- Keep legacy reads and the migration code for at least one release cycle. A future cleanup may remove the legacy document only through an explicit user-backed export/confirmation flow, not silently.

### Synchronization and conflicts

- `dayplanner-plans` and `dayplanner-templates` use the existing immediate-local, one-second-debounced Firestore persistence model. Category/settings writes remain as they are.
- The plans map is one Firestore value, so two devices editing different dates concurrently can still overwrite one another by last remote event. This is accepted for v1 to match current persistence and avoid a broad storage-hook refactor.
- UI edits are optimistic. A remote snapshot may replace the selected plan, close a now-missing selection, and recompute collisions/unscheduled tasks. Do not try to merge arrays client-side or echo the remote snapshot back.
- Storage errors retain the local view and use the existing console-error behavior. Validation errors remain visible in the relevant dialog/panel and never discard entered values.

## Component and domain responsibilities

| Area | Responsibility |
|---|---|
| `src/domain/dayPlanner.js` (new) | Pure date-plan validation, safe lookup, sorting, after-midnight key, collision detection, template/copy cloning, task-link matching, and migration normalization. Unit-test it. |
| `src/utils/date.js` | Continue to own local date key parsing/arithmetic; add only general local-date helpers needed by the pure domain module. |
| `src/utils/time.js` | Continue time formatting/current-time conversion; do not move date-key rules into it. |
| `src/hooks/useSyncedStorage.js` | Expose hydration status needed to make migration safe without breaking existing two-item destructuring. Do not change its local cache, debounce, or Firestore document conventions. |
| `DayPlanner.jsx` | Selected-date state, canonical plans/templates/category/settings hooks, navigation, migration orchestration, timeline mutations, Copy Yesterday/template flows, and selected-day queue composition. |
| `TimeBlock.jsx` | Positioned visual block, completed/collision state, pointer drag initiation, semantic accessible block controls. No persistence logic. |
| `BlockEditPanel.jsx` | Block fields, completion, collision details, stale-link notice, category management, delete. It receives callbacks/data rather than reading storage. |
| New small planner components | Date navigator, template menu/dialog, task-schedule dialog, and unscheduled list. Keep them presentational where practical. |
| `TodoCard.jsx` | No implementation change required for this feature. Existing task storage remains a read source for planner-owned selectors. |
| `Overview.jsx` | Read `dayplanner-plans`, call the shared domain contract for literal today, and retain the current sorted schedule-card limits/navigation. It must not trigger migration or mutate a plan. |

## Responsive, touch, and accessibility requirements

- Preserve the full-width Day Planner layout. At widths where the 260px editor would crowd the timeline, stack it below the timeline; avoid horizontal page overflow. The timeline itself may scroll vertically.
- All primary actions have visible labels or accurate `aria-label`s: date navigation, date picker, Today, Copy Yesterday, template actions, clear confirmation, schedule, completion, collision details, and task links.
- Use native `button`, `input`, `select`, checkbox, and dialog semantics. Do not use clickable spans for new controls. Button hit targets must be at least 44×44 CSS px on touch layouts or have an equivalent padded target.
- Use Pointer Events for timeline interactions. Keyboard alternatives are required: edit Start/End selects to move/resize, Tab-reachable editor actions, Escape to close/cancel popovers, and Enter/Space for buttons. Dragging is an enhancement, not the only way to set time.
- The selected block exposes `aria-selected`; collision indicators have text alternatives; a completion change is announced through a polite live region. Do not rely on category color, completed opacity, or a hover-only tooltip as the sole signal.
- Dialogs trap focus while open, return focus to the opener when closed, and announce destructive/replace consequences before confirmation. Respect `prefers-reduced-motion` for panel animations.

## Loading, empty, error, and validation states

- While an initial plan/migration decision is not hydrated, display a bounded planner loading state and disable mutations that could race migration. Existing local-cache blocks may render only if clearly treated as provisional; the preferred v1 behavior is the explicit migration/loading state.
- A missing selected-date plan is the normal empty state, not an error and not a record creation event.
- Missing categories use the first available category and show an unobtrusive “Category updated” notice. If no categories remain due to corrupt data, initialize/render the default category defensively before allowing a block edit.
- Reject block intervals outside selected configured bounds, `start >= end`, non-15-minute values from corrupt data, invalid dates, and empty template names. User-entered times are constrained by selects, but domain validation remains authoritative.
- Schedule dialogs retain input on validation failures; Create is disabled for invalid interval/date/title inputs. A task missing from its source at submit time produces a normal unlinked block using `textAtSchedule` only if the user confirms; it must not recreate the task.
- Template/copy bulk previews identify skipped invalid blocks and collisions. A rejected replace confirmation changes nothing.

## Testing requirements

Add deterministic Vitest coverage for the new domain module and extend component tests where the project test setup permits. At minimum cover:

- `toLocalDateKey`, date navigation, local-noon DST-safe adjacent-date behavior, and no `toISOString()` date conversion.
- Missing/invalid plan produces a safe empty plan without writes.
- Blocks on two dates remain isolated; navigation itself causes no plan creation.
- A 1:30 AM+ block belongs only to its originating plan, while `getLogicalScheduleDateKey` selects yesterday before the configured overnight cutoff.
- 15-minute interval validation, range clamping, collision detection, adjacency not colliding, multiple collisions, and collision state after drag/resize equivalent updates.
- Copy Yesterday and template add/replace cloning: new IDs, completion reset, links stripped, source/template unchanged, and collision preview.
- Template weekday matching, cross-weekday confirmation requirement, invalid template-block skipping, rename/delete isolation.
- Scheduling daily/This Week/Long Term/folder tasks through Day Planner’s picker without changing their task objects; duplicate scheduling; stale-link behavior; selected-day unscheduled inclusion/exclusion and reappearance after block deletion.
- Block completion remains independent from the underlying task's `done` state.
- Migration imports a valid legacy array once into the migration-day plan, normalizes malformed records, preserves legacy source, skips when canonical plans exist, and does not re-import after Clear Day.
- Local optimistic mutation/remote replacement behavior for selected/deleted blocks, to the extent a hook/component test can simulate it.
- Keyboard date navigation, focus return from dialogs, accessible collision text, and pointer/touch-independent time editing.

## Rollout

1. Implement and test the pure domain layer before changing consumer UI.
2. Add canonical storage, hydration-aware migration, and a temporary migration state; validate with legacy localStorage and Firestore fixtures.
3. Ship Day Planner navigation/timeline against canonical plans, then templates/copy and task scheduling/unscheduled queue.
4. Switch Overview to the stable literal-today contract in the same release so it no longer reads `dayplanner-blocks`.
5. Manually verify desktop and narrow touch layouts, before/after-midnight behavior, Firefox/Safari date input behavior, offline cache, cross-device overwrite behavior, and production build.
6. Update README and Full.md when implementation lands. No feature flag is required for this personal dashboard; include concise migration/rollback notes in release notes.

## Acceptance criteria

The feature is complete when all of the following are true:

1. Day Planner opens on the current local date and has previous, next, Today, and date-picker controls.
2. Blocks created or changed on one local date never appear on another date unless copied/applied there.
3. Navigation alone causes no dated-plan persistence write.
4. Existing categories, hour settings, creation, drag, resize, selection, and clear behavior remain available and operate on only the selected plan where applicable.
5. Blocks after midnight are owned by the prior plan date and formatted with `+`; the interactive Now line follows the documented logical schedule date.
6. Copy Yesterday and weekday templates clone blocks with fresh IDs, reset completion, strip task links, and offer non-destructive add versus confirmed replace.
7. Collision warnings appear for every overlap, do not occur for adjacent intervals, and never block/silently alter direct edits.
8. A user can schedule any existing manual daily, This Week, Long Term, or folder task from Day Planner without changing the task's existing data, page UI, or behavior.
9. The selected-day Unscheduled tasks panel accurately lists incomplete unlinked manual daily tasks and never includes recurring occurrences.
10. Block completion is visible, persistent, accessible, and independent from task completion.
11. Overview reads the literal local-today dated plan using the shared domain contract and does not read the legacy global key.
12. The future Today Command Center can consume the documented pure `getPlanForDate`/`getBlocksForDate` contract without depending on Day Planner UI state.
13. Migration places a legacy global schedule on one explicit local migration date exactly once, preserves the legacy key, and avoids a hydration race.
14. Existing To-Do UI/behavior, recurring tasks, Habits, Job Applications, and their stored data remain unchanged.
15. Required domain, migration, after-midnight, collision, template, task-link, accessibility, and responsive verification passes.

## Dependencies

- Existing `useSyncedStorage`, Firebase document conventions, and localStorage cache.
- Existing `src/utils/date.js` local-date utilities and `src/utils/time.js` schedule-time utilities.
- Existing category defaults/presets and current Day Planner CSS module.
- Vitest (already used for recurring-task domain coverage). Component-test tooling may be added only if needed for the interaction checks above.

## Risks and tradeoffs

| Risk/tradeoff | v1 decision |
|---|---|
| Legacy schedule has no historical date | Import it once into the first post-upgrade local date and disclose that choice. Do not invent a past date. |
| Whole-map cross-device conflicts | Accept existing last-write-wins behavior and document it; per-date Firestore documents are a later architecture change. |
| Template/category drift | Preserve category IDs in snapshots, fall back safely on missing category, and notify rather than fail application. |
| Task links can become stale after moves/deletion | Keep an immutable display snapshot and one-way link; preserve the time block without attempting fragile automatic rewrites. |
| Overlaps can make the timeline busy | Warn visibly but keep user control. Auto-scheduling/reflow is deferred. |
| Literal-today overview differs from overnight logical schedule | Make the difference explicit: Today consumers are date-keyed, while only the planner Now line follows an overnight owning plan. |

## Open decisions resolved for v1

- Plan data uses one `dayplanner-plans` document keyed internally by local date, not a Firestore document per date.
- A selected date with Clear Day remains an explicit empty plan record.
- Copy/template application defaults to add, never replacement; replacement always requires confirmation.
- Templates are weekday-associated snapshots, can have duplicate names/multiple entries per weekday, and can deliberately be applied to a different weekday.
- Time-block completion is enabled and is separate from a linked task’s completion.
- Manual task scheduling is one-way and supports all existing non-recurring task locations; the selected-date queue intentionally lists only daily tasks.
- Collision prevention is deliberately non-blocking.

## Future considerations

- Per-date Firestore documents or transactional merges to reduce cross-device contention.
- Selectable schedule cutoff, timezone display, and an optional carryover/current-overnight view distinct from literal today.
- Editable templates, default template per weekday, template versioning, and bulk plan creation.
- Two-way task links, task duration estimates, scheduled task filtering, recurring-occurrence scheduling, and an unscheduled inbox across all task lists.
- Auto-placement, capacity indicators, focus timers, reminders, conflict resolution, undo/history, archiving/export, and calendar integrations.
- The separate Today Command Center, built solely as a consumer of the stable date-plan contract.
