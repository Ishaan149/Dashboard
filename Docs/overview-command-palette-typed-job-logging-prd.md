# Product Requirements Document: Typed Job Logging in Overview and Command Palette

## Status

Approved, implementation-ready requirements created August 18, 2026.

This document authorizes creation of a specification only. It does not authorize implementation, deployment, production-database access, data migration, or changes to production data. Implementation begins only after separate, explicit user approval.

## Summary

Extend the two quick-entry surfaces for job applications so every new application logged from them is assigned to one of the four existing job types:

1. Software Engineering
2. AI Applications
3. Backend
4. Data

On Overview, replace the center text in the existing `− / Log an application / +` row with a compact native job-type selector. The surrounding statistics, sparkline, card layout, and counter buttons remain recognizable and otherwise unchanged. Once a type is selected, the existing buttons decrement or increment that type for local today.

In the command palette, add one root command named **Log Application**. Activating it opens an explicit list of the four job types. Choosing a type immediately logs exactly one application of that type for local today, closes the palette, and confirms success with a toast.

Existing Uncategorized application quantities remain intact, continue contributing to all existing aggregate totals, and become read-only in these two surfaces. No migration is performed.

## Relationship to existing requirements

This is a focused amendment to:

- `Docs/categorized-job-activity-tracker-prd.md`
- `Docs/universal-command-palette-prd.md`

Where those documents say that Overview or command-palette logging changes Uncategorized, or that these surfaces must not expose a category chooser, this document supersedes those statements. All unrelated requirements in the earlier documents remain in force.

The current codebase already contains the categorized record shape, the four fixed categories, same-tab synchronized-storage broadcasts, and pure category adjustment helpers. This feature extends existing behavior; it does not introduce a second job model.

## Goals

- Require a fixed job type for every new application logged from Overview or the command palette.
- Preserve the speed of the existing one-at-a-time Overview counter.
- Add a fast, keyboard-accessible command-palette path for logging one typed application today.
- Keep Overview's existing today total, week total, seven-day sparkline, and card placement unchanged.
- Reuse the existing `job_applications` key and categorized record schema.
- Preserve legacy Uncategorized values without migrating, redistributing, or deleting them.
- Make writes immediately visible across mounted consumers through the existing synchronization contract.

## Non-goals

This feature does not include:

- Custom, user-created, renamed, reordered, or deleted job types.
- An Other or Uncategorized choice for new entries.
- Editing or categorizing existing Uncategorized quantities.
- A migration flow for legacy data.
- Company, role title, URL, location, compensation, status, notes, or other individual-application fields.
- Logging more than one application in a single command-palette action.
- Choosing a date in the command palette; the command always targets local today.
- Changes to the dedicated Job Applications page.
- Changes to Emails or LinkedIn outreach counters.
- New statistics, charts, category breakdowns, goals, reports, or history presentation.
- Undo for application logging.
- A new synchronized storage key or Firestore document.
- A broad command-palette registry, provider, routing, or synchronization refactor.

## Existing system context

### Job data

Job activity is stored under `job_applications` as an array of dated aggregate records. Enhanced records use this compatible shape:

```js
{
  date: 'YYYY-MM-DD',
  count: 0,
  categories: {
    softwareEngineering: 0,
    aiApplications: 0,
    backend: 0,
    data: 0,
  },
  emails: 0,
  linkedin: 0,
}
```

Unknown fields may also exist and must be preserved.

`count` is the overall application total. The existing domain helpers interpret the portion not represented by `categories` as Uncategorized. Existing aggregate-only records such as `{ date, count }` therefore remain valid without being rewritten.

### Existing helpers and consumers

- `src/domain/jobActivity.js` defines the authoritative category keys, labels, normalization, aggregate calculations, `adjustCategory`, and `adjustUncategorized`.
- `src/components/Overview.jsx` reads `job_applications`, displays overall totals, and currently adjusts Uncategorized.
- `src/components/CommandPalette.jsx` contains a static command list and action steps but currently has no job-logging command.
- `src/hooks/useSyncedStorage.js` supports functional setters and broadcasts same-tab changes using `dashboard:storage-change` so separate mounted consumers of one key remain aligned.

Implementation must reuse these contracts rather than duplicate category constants or arithmetic in components.

## Approved product decisions

- Exactly four types are available, in the existing order: Software Engineering, AI Applications, Backend, Data.
- New entries from both surfaces must always be typed.
- Overview uses a styled native `<select>`.
- The select replaces the current center label in the existing stepper row.
- A fresh application runtime starts with no Overview type selected.
- Until a type is selected, both Overview adjustment buttons are disabled.
- Overview remembers the selected type while navigating within the current application runtime.
- The Overview selection resets on a full page reload; it is not persisted locally or remotely.
- Overview `−` and `+` adjust the selected type by exactly one for local today.
- Existing Overview statistics and the sparkline continue to show overall counts and do not react to the selection except when a write changes the underlying total.
- The palette exposes one command labelled **Log Application**.
- Activating the command opens an explicit four-option type list.
- The palette never preselects or remembers a type from an earlier use.
- Choosing a palette type is the commit action; there is no separate submit or confirmation screen.
- A palette action logs exactly one application for local today.
- Existing Uncategorized quantities remain included in totals but are read-only in both surfaces.

## Detailed behavior

### Overview job-type selector

The Job applications card retains its current structure:

1. Card heading.
2. Sent-today and this-week overall statistics.
3. Seven-day overall-count sparkline.
4. Existing bordered stepper row.

Only the center content of the stepper row changes. Replace **Log an application** with a native select that:

- Has an accessible label of **Job type**. The label may be visually hidden if necessary to preserve the compact row.
- Initially displays a disabled placeholder option, **Choose job type**.
- Lists the four fixed types in their authoritative existing order.
- Does not include Uncategorized, Other, a blank committed value, or a type-management affordance.
- Fits between the existing `−` and `+` buttons without causing horizontal page scrolling.
- Truncates long visible option text only if required by available width; the full accessible name remains available.

On a fresh full-page load, no type is selected and both buttons are disabled. Selecting a type enables `+`. The `−` button is enabled only when today's normalized count for the selected category is greater than zero.

The selection is ephemeral application UI state. It must survive navigating away from Overview and back during the same mounted application runtime, because the Overview view itself is unmounted on navigation. It resets after a full reload or other recreation of the application runtime. Do not write this selection to `localStorage`, Firestore, URL state, or another durable store.

### Overview increment

Pressing `+` with a selected type:

- Targets local today using the existing local-date helper.
- Adds exactly one to the selected category.
- Keeps the overall `count` synchronized through `adjustCategory`.
- Preserves all other category values, outreach values, and unknown record fields.
- Creates a dated record only when the increment is committed.
- Does not show a confirmation dialog, toast, or Undo.

### Overview decrement

Pressing `−` with a selected type:

- Targets local today.
- Subtracts exactly one from the selected category.
- Keeps the overall `count` synchronized through `adjustCategory`.
- Preserves Uncategorized, other category values, outreach values, and unknown fields.
- Is disabled and a no-op when the selected category is zero.
- Never borrows from or decrements another category.
- Never decrements Uncategorized, even when the displayed overall today count is positive.
- Removes the date record only under the existing domain rule that every application and outreach value is zero.
- Does not show a confirmation dialog, toast, or Undo.

### Overview statistics and presentation invariants

The following must remain unchanged in meaning and presentation:

- **sent today** displays today's overall application count.
- **this week** displays the existing overall period total.
- Every sparkline bar displays that date's overall application count.
- Existing Uncategorized quantities remain included in all three displays.
- Selecting a type does not filter, replace, relabel, or add a statistic.
- No category count or category breakdown is added to the card.
- Card order, heading, statistic labels, sparkline labels, and responsive placement remain unchanged.

The selector is the only new visible Overview UI.

## Command palette behavior

### Root command

Add one command definition:

| Property | Requirement |
|---|---|
| ID | `jobs.log` |
| Label | `Log Application` |
| Step | A dedicated typed-job selection step |
| Keywords | Include `job`, `jobs`, `application`, `applications`, `add job`, and the four type labels |
| Effect | Open the type-selection list; opening alone performs no write |

The command participates in the existing deterministic command filtering and keyboard selection behavior. It does not add a navigation shortcut or change `Cmd/Ctrl+J` navigation.

### Type-selection step

Activating **Log Application** replaces the root command list with a dedicated selection view containing:

- A back control that returns to the retained root palette without writing.
- The heading **Log Application**.
- A concise instruction such as **Choose a job type to log for today**.
- Four actionable options in the authoritative existing order.
- A close control with existing palette semantics.

There is no remembered or default job type. Opening the step must not silently carry over the Overview selection or a previous palette selection. Visual keyboard focus may begin on the first option, but no type is committed until the user explicitly activates an option with click, tap, or Enter.

Choosing an option immediately:

1. Reads the latest synchronized `job_applications` value through a functional setter.
2. Applies `adjustCategory(previous, todayKey, selectedCategoryKey, 1)`.
3. Closes the palette.
4. Restores focus according to the existing successful-command behavior.
5. Shows a live toast: **{Type} application logged for today.**

Examples:

- `Software Engineering application logged for today.`
- `Backend application logged for today.`

There is no quantity field, date field, submit button, review screen, confirmation prompt, or Undo action.

### Cancellation and accidental-write protection

- Opening the command or entering the selection step never writes.
- Back, Escape, the close control, and backdrop dismissal never write.
- Choosing a type is the sole commit point.
- A pointer down used only to focus or highlight an option must not commit it.
- One activation must produce exactly one category increment, even if rerenders or synchronized updates occur during close.
- Reopening the command always presents the uncommitted four-type list again.

### Palette keyboard and accessibility behavior

- Initial focus in the typed-job step moves to its selection control or first actionable option.
- Arrow keys, Home, End, Enter, Escape, Tab, and Shift+Tab follow the palette's existing list and focus-containment conventions.
- Every option exposes the complete type label to assistive technology.
- Options provide at least a 44 × 44 CSS-pixel pointer target on touch layouts.
- The step remains usable at 320 CSS pixels without body-level horizontal scrolling.
- Closing after a successful write announces the toast through the existing toast live region.
- Reduced-motion and forced-colors behavior follow existing palette styles.

## Data and synchronization requirements

### Write contract

Both surfaces must use the existing `job_applications` synchronized key and the existing `adjustCategory` helper. A typed increment against an existing record must preserve:

- Other category counts.
- Uncategorized quantity represented by `count` beyond the categorized total.
- `emails` and `linkedin`.
- Unknown forward-compatible fields.

No eager normalization write, bulk migration, duplicate date creation, or full data rewrite is permitted merely because a surface renders.

### Legacy Uncategorized data

Uncategorized is calculated by the existing compatibility rules and remains:

- Included in today, week, month, all-time, history, and sparkline totals where already applicable.
- Hidden from the four selectable types.
- Unavailable for new logging.
- Unavailable for decrement or reassignment in Overview and the palette.
- Preserved unchanged when a typed category is incremented or decremented.

This feature deliberately does not provide a recovery UI for changing legacy Uncategorized data.

### Dates

- Both quick-entry surfaces target local today only.
- Use the repository's existing local date helpers.
- Do not use `Date#toISOString()` to derive the date key.
- A date changes only at local-day rollover; no timezone or remote-server date is introduced.

### Immediate consistency

- A write from the palette must appear in a currently mounted Overview immediately through the existing same-tab storage-change event.
- A write from Overview must be reflected by other mounted `job_applications` consumers through the same mechanism.
- Functional setters must use their latest provided value rather than a render-time snapshot.
- Existing whole-key, last-write-wins remote synchronization semantics remain unchanged; this feature does not claim conflict-free cross-device increments.

## State ownership

The selected Overview type is UI state, not job data. Because navigation unmounts `Overview`, the state must be owned above the view-remount boundary and supplied to Overview, or be held by an equivalent ephemeral application-scoped context.

Requirements for this state:

- Initial value is empty.
- It may contain only an authoritative category key.
- It survives ordinary in-app navigation while the application remains mounted.
- It is cleared when the application runtime is recreated.
- It is not shared with the command palette.
- It is not stored using `useSyncedStorage`, `localStorage`, `sessionStorage`, Firestore, or another durable mechanism.

Do not introduce global state infrastructure solely for this scalar preference if the existing component hierarchy can own it safely.

## Error and edge-case behavior

- Missing, malformed, negative, fractional, or non-finite stored counts continue to use existing in-memory normalization rules.
- An unknown selected category key is treated as no selection; adjustment controls stay disabled and no write occurs.
- A removed or changed category definition cannot produce an uncategorized write as a fallback.
- A zero selected category keeps `−` disabled even when today's overall total is positive due to other types or Uncategorized.
- Rapid separate activations are handled as separate user increments; a single activation must not double-submit.
- If storage is unavailable, existing `useSyncedStorage` local error tolerance remains unchanged.
- Firestore failures follow existing logging and offline behavior; the UI must not claim remote synchronization succeeded.
- Remote whole-key replacement behavior is not redesigned by this feature.

## Visual requirements

### Overview

- Reuse the current card, stepper, border, spacing, typography, and green theme tokens.
- Style the native select to integrate with the existing center label area without mimicking a different category color system.
- Preserve visible focus indication.
- Maintain usable `−` and `+` targets and native disabled semantics.
- Do not increase card width requirements or introduce page-level horizontal scrolling.

### Command palette

- Reuse existing modal, option-row, focus, hover, touch, and responsive patterns.
- The typed-job step should look like a focused command choice, not a new full-page form.
- Do not assign distinct colors to the four types.

## Testing requirements

### Domain tests

Existing `jobActivity` tests remain authoritative. Add or retain coverage proving that:

- Each category can be incremented and decremented independently.
- Typed changes preserve Uncategorized and unknown fields.
- A category decrement cannot fall below zero or borrow from another category.
- Overall counts remain synchronized with category adjustments.

### Overview component tests

Use mocked/in-memory storage boundaries. Verify:

- The select starts at **Choose job type** after a fresh app mount.
- The selector contains exactly the four types in the approved order.
- Neither adjustment button writes before a type is selected.
- Selecting a type and pressing `+` increments only that category for local today.
- `−` is disabled when the selected category is zero, regardless of overall or Uncategorized count.
- `−` decrements only the selected category when positive.
- Switching types updates button eligibility without changing data.
- The selected value survives Overview view unmount/remount during in-app navigation.
- A fresh full app mount resets the selection.
- Today/week statistics, sparkline labels, and overall calculations remain unchanged.
- Legacy Uncategorized values remain displayed in totals and unchanged by typed writes.

### Command palette component tests

Use mocked/in-memory storage and the existing fixed local-time setup. Verify:

- **Log Application** appears and is searchable by its required keywords.
- Activating it opens four types in the approved order without writing.
- No earlier Overview or palette selection is preselected or committed.
- Back, Escape, close, and backdrop dismissal perform no write.
- Activating each type increments only that category for local today.
- One activation adds exactly one application.
- Existing category, outreach, Uncategorized, and unknown fields are preserved.
- Success closes the palette and emits the type-specific toast.
- Reopening starts with a fresh uncommitted choice.
- Keyboard and pointer activation have equivalent results.
- Existing task, habit, Quick Note, navigation shortcut, focus, and unsaved-draft tests remain green.

### Synchronization test

At least one deterministic component or hook-level test must prove that a palette update to `job_applications` is observed by another mounted same-tab consumer without waiting for a Firestore response.

### Manual verification

Using synthetic data only, verify:

- Overview at desktop, tablet, and narrow mobile widths, including 320 CSS pixels.
- Long type labels fit or truncate safely in the center select.
- Native select operation with keyboard, pointer, and touch.
- Palette operation with keyboard only and a screen reader.
- Disabled-state visibility and forced-colors behavior.
- Local-day behavior near midnight.
- Offline local logging and later existing synchronization behavior.
- Legacy records containing only `{ date, count }` remain intact.

## Production data safety

Implementation and testing must not read, write, migrate, seed, copy, inspect, or otherwise use the production/current Firebase database.

- Automated tests use fixtures and mocked storage/synchronization boundaries.
- Manual sync testing uses the Firebase Local Emulator Suite or a dedicated test project with synthetic data.
- No eager migration or bulk rewrite is permitted.
- Deployment and first use against production require separate explicit authorization.

## Documentation requirements

When implementation is separately approved and completed:

- Update README command-palette actions to include **Log Application**.
- Update job-tracking documentation to state that Overview and palette quick entries are typed.
- Mark the superseded Uncategorized quick-entry statements in the two earlier PRDs or link them to this amendment.
- Do not describe legacy Uncategorized values as migrated or editable.

## Acceptance criteria

1. Overview exposes a native type selector in place of the center stepper label.
2. The selector contains only Software Engineering, AI Applications, Backend, and Data, in that order.
3. A fresh app runtime has no selected type and disables both Overview adjustment buttons.
4. Overview remembers the selected type across in-app navigation but resets it on full reload.
5. Overview `+` adds exactly one to the selected category for local today.
6. Overview `−` removes exactly one from the selected category only when that category is positive.
7. Overview never changes Uncategorized through these controls.
8. Existing Overview statistics, labels, sparkline, card order, and aggregate meanings remain unchanged.
9. The palette root includes one searchable command named **Log Application**.
10. Activating the command opens an uncommitted four-type selection list and performs no write.
11. Explicitly choosing a type immediately adds exactly one application of that type for local today.
12. Successful palette logging closes the palette and announces **{Type} application logged for today.**
13. Cancellation from the palette type step performs no write.
14. Palette type choice is never preselected or remembered between invocations.
15. Typed changes preserve other categories, outreach fields, Uncategorized quantity, and unknown record fields.
16. Legacy aggregate-only records remain valid, included in totals, and are not migrated.
17. Both surfaces reuse `job_applications`, authoritative category definitions, local-date helpers, and `adjustCategory`.
18. Same-tab consumers observe committed changes immediately through the existing synchronization contract.
19. No new durable storage key, database schema, category, date field, quantity field, confirmation screen, or Undo action is added.
20. Existing Job Applications, palette commands, navigation shortcuts, Overview behavior outside the selector, and synchronization tests continue to pass.

## Implementation boundary

This PRD is complete enough for implementation, but creating it does not start implementation. No source, style, test, configuration, storage, or production-data change is authorized until the user explicitly says to implement the feature.
