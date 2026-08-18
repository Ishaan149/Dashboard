# Product Requirements Document: Universal Command Palette

## Status

Phase 1 implemented August 10, 2026: authenticated global invocation, six navigation commands, and Quick Note capture with a Brain Dump Quick Notes filter. The broader task/job/habit actions and cross-feature stored-record search described below remain proposed.

## Summary

Add a global **Universal Command Palette** that opens with `Cmd+K` on macOS and `Ctrl+K` on Windows/Linux. It gives the unlocked dashboard a single fast path to:

- Navigate among its six existing views.
- Create a dated, This Week, or Long Term task.
- Capture a regular Brain Dump note.
- Log a positive job-application count for today or an earlier date.
- Toggle an existing habit for today.
- Find existing tasks, recurring series, notes, habits, job records, and Day Planner blocks, then open the relevant existing view.

The palette is a lightweight command-and-search layer over the existing application. It must use the current storage keys and feature data shapes, preserve existing page flows, and avoid an AI or natural-language parser. Every v1 action is selected from a deterministic command, then completed with explicit fields and choices.

## Problem

The dashboard has capable feature pages, but routine actions are distributed across six lazy-loaded views. Adding a task requires finding the To-Do page and the correct list; logging an application requires opening Job Applications; and recalling a note or schedule block requires manually navigating to its feature. The current `TopBar` offers only a hamburger navigation menu and has no keyboard-first global action surface.

For a personal dashboard used throughout the day, this creates unnecessary navigation and context switching. The application already has local-first storage and well-defined feature data; it needs one consistent entry point rather than redesigns of To-Do, Habits, or Job Applications.

## Goals

- Open a keyboard-first command surface from every unlocked dashboard view.
- Offer deterministic navigation, capture, safe state-change, and cross-feature search commands.
- Keep the user in control with visible command names, explicit field labels, and reviewable arguments.
- Reuse the local-date utilities and current synchronized values rather than introduce duplicate models or a second persistence path.
- Make common creation actions faster while leaving existing page-level forms and interactions intact.
- Make search results useful enough to jump to the owning feature and, where supported, the matching item.
- Establish a provider/registry contract that lets later features contribute commands and search results without turning the palette into a monolithic switch statement.
- Work well with keyboard, mouse, touch, narrow screens, assistive technology, local cache, and Firestore’s current last-write-wins synchronization model.

## Non-goals

V1 will not include:

- AI, LLM, voice, or ambiguous natural-language parsing such as “remind me to call Sam next Thursday.” Dates, destinations, quantities, and habits are selected through deterministic controls.
- Authentication, settings, profile, PWA/offline-install, notifications, reminders, or background processing.
- A redesign of Job Applications, To-Do, Habit Tracker, Brain Dump, Day Planner, their navigation, or their stored schemas.
- New task fields such as due time, priority, labels, tags, descriptions, recurrence creation, or task-folder selection from the palette.
- Creating, deleting, renaming, or reordering habits from the palette.
- Editing, clearing, deleting, tagging, or full-text-managing Brain Dump notes from the palette.
- Editing/deleting Day Planner blocks or categories from the palette.
- Changing job notes or decrementing application counts from the palette.
- Fuzzy AI search, semantic/vector retrieval, saved searches, command history, user-customized shortcuts, or usage-based ranking.
- A durable command-palette storage key. Palette UI state and its index are ephemeral and are rebuilt from the existing synchronized data.

## Product boundaries and ownership

Two related planned initiatives must remain separate:

| Initiative | This PRD owns | It does not own |
|---|---|---|
| Universal Command Palette | Global invocation, deterministic commands, lightweight cross-feature result retrieval, navigation handoff, and small capture forms | A replacement home page or a full note-management experience |
| Today Command Center | Its own dashboard layout and quick-capture affordances | The global shortcut, command registry, ranking engine, and cross-feature search UI |
| Connected Brain Dump | Rich note search, tags, relationships, filtering, and any advanced note relevance model | Generic palette shell and non-note providers |

The Today Command Center may invoke the same reusable task/note action services, and it may include an “Open command palette” control. It must not fork command definitions or storage mutations. Connected Brain Dump may later replace the palette’s simple note provider with a richer provider while retaining the `SearchProvider` contract defined below.

V1 note search is intentionally limited: it returns the pinned note and regular notes by normalized title and a bounded plain-text content snippet. It has no tags, graph, backlinks, filters, advanced ranking, or note-specific search screen.

## Existing system context

The application is a client-only React 18/Vite SPA. `src/App.jsx` owns the active view in state; there is no URL router. `TopBar` receives `view`, `onChange`, and `onLock`. The active feature is loaded with `React.lazy` only after the password convenience gate is unlocked.

All persisted feature data is local-first through `useSyncedStorage(key, initialValue)`: it reads `localStorage` synchronously, subscribes to `dashboard/<key>` in Firestore, writes local state immediately, and debounces Firestore writes by one second. A remote snapshot replaces the whole value for its key. This is not a transactional merge system.

The palette must be mounted only inside the authenticated application tree. It must not mount while `PasswordGate` is shown or create Firebase work before the user has unlocked the application.

## Scope and information architecture

### Placement

- Add a compact command button to the right side of `TopBar`, before the hamburger menu. Its accessible name is **Open command palette** and its visible key hint is `⌘K` on macOS or `Ctrl K` elsewhere when space permits.
- The button opens the same palette as the keyboard shortcut. It is an enhancement, not the only entry point.
- The palette renders through a portal at document body level so it is not clipped by a page card, Day Planner timeline, or TopBar dropdown.
- It is available from Overview, To-Do, Brain Dump, Job Applications, Habit Tracker, and Day Planner. It is not shown on the locked password gate.

### Palette layout

The desktop palette is a centered modal surface over a dimmed backdrop:

1. A leading search icon and one autofocus input.
2. A context line, initially `Search commands and dashboard` and, during a form, the selected command name.
3. A scrollable, grouped result list.
4. A compact footer with the active keyboard hints.

The input remains visible during argument entry. The list is replaced by an explicit mini-form; it never guesses arguments from free-form query text. A one-line inline validation/error region appears directly below the relevant input or choice control.

## Command taxonomy and v1 inventory

Commands are static definitions; search results are derived records. Both appear in one ordered list but are visibly grouped.

### Navigation commands

| Command ID | Label | Effect |
|---|---|---|
| `navigate.overview` | Go to Today | Calls the existing view change with `overview`; `Overview` remains a searchable alias. |
| `navigate.todo` | Go to To-Do | Calls the existing view change with `todo`. |
| `navigate.braindump` | Go to Brain Dump | Calls the existing view change with `braindump`. |
| `navigate.jobs` | Go to Job Applications | Calls the existing view change with `jobs`. |
| `navigate.habits` | Go to Habit Tracker | Calls the existing view change with `habits`. |
| `navigate.dayplanner` | Go to Day Planner | Calls the existing view change with `dayplanner`. |

These commands make no storage writes. Their keywords include the current and legacy user-facing names and common deterministic aliases: `today`, `overview`, `home`, `tasks`, `notes`, `job apps`, `tracker`, `habit`, `calendar`, and `schedule`.

### Quick-capture commands

| Command ID | Label | Explicit arguments | Effect |
|---|---|---|---|
| `todo.addDated` | Add dated task | Required title (max 200); date defaulting to local today | Appends an ordinary task to the selected `todos-daily` date. |
| `todo.addWeek` | Add This Week task | Required title (max 200) | Appends an ordinary task to `todos-thisweek`. |
| `todo.addLongTerm` | Add Long Term task | Required title (max 200) | Appends an ordinary root task to `todos-longterm`. |
| `note.capture` | Capture note | Required content (max 10,000); optional title (max 200) | Prepends one regular Brain Dump note and selects it. |
| `jobs.log` | Log job applications | Positive integer count, default `1`, range 1–999; date defaulting to local today and capped at today | Adds the count to the selected `job_applications` record. |

No command creates a recurring series in v1. Recurring creation has several schedule-revision rules and remains in the existing To-Do management card.

### Safe state commands

| Command ID | Label | Explicit arguments | Effect |
|---|---|---|---|
| `habits.toggleToday` | Toggle habit for today | Choose one existing habit from a filtered list | Adds or removes that habit ID from today’s `habit_logs` array. |

The command label changes in its review step to **Mark “Name” done today** or **Mark “Name” not done today**, based on the latest current log. The palette does not expose historical habit logging in v1, even though the Habit Tracker’s seven history dots retain that page-level capability. This keeps the global action safe, clear, and consistent with the prominent “Today’s Habits” flow.

### Search result types

The following are results, not mutation commands:

- Views: the six destinations above.
- Manual tasks: dated tasks, This Week tasks, Long Term root tasks, and Long Term folder tasks.
- Recurring task series: title and current weekday summary; opening goes to To-Do’s Recurring Tasks section.
- Notes: pinned note and regular notes, with a title and bounded content match preview.
- Habits: definition names and today’s done/not-done status.
- Job records: stored dates/counts and the job note when it matches.
- Day Planner blocks: label, category label, and formatted start/end time.

Results never mutate data merely because they are indexed, selected, or opened.

## Invocation, dismissal, and focus rules

### Keyboard invocation

- `Meta+K` on macOS and `Ctrl+K` on non-macOS opens the palette and calls `preventDefault()` so the browser’s page search/address action is not invoked.
- The listener is registered once by the unlocked application shell, not separately by each lazy-loaded feature.
- The shortcut works when focus is in a normal input or textarea so capture is truly global. It does not fire while `event.isComposing` is true, when an IME composition is active, or when the event was already prevented by an embedded control.
- Repeating the shortcut while the palette is open focuses the palette query input and selects its current query; it does not create another dialog.
- `Cmd+K`/`Ctrl+K` must have no effect while the password gate is active.

### Dismissal and return focus

- `Escape` closes the root palette and restores focus to the exact element that opened it.
- In a command argument step, first `Escape` abandons the argument step and returns to the retained query/result list; a second `Escape` closes the palette and restores opener focus.
- Clicking/tapping the backdrop closes the root palette only. It does not discard a completed write; it does discard unsubmitted form values.
- The close button is not required visually, but the dialog may expose one for touch discoverability; it must perform the same close operation.
- Navigating to a result or completing a successful command closes the dialog before moving focus to the destination target or a live confirmation toast.

### List keyboard behavior

- `ArrowDown` and `ArrowUp` move one active option, wrapping from last to first and vice versa.
- `Home` and `End` move to the first and last available option.
- `Enter` executes the active navigation/state command, opens its argument form, or opens the active search result.
- `Tab` and `Shift+Tab` remain contained in the dialog. The primary input/list interaction does not require tabbing through every result.
- On the root list, typing modifies the query; Backspace only edits the query. It is never mapped to deletion.

### Mouse and touch behavior

- Clicking the TopBar trigger, a result, a command, a choice chip, or the submit button has the same effect as its keyboard equivalent.
- Tapping a result does not require hover. Active rows have a minimum 44 × 44 CSS-pixel target on touch layouts.
- The results region scrolls independently; page scroll is locked while the modal is open and restored exactly on close.
- Hover may reveal a shortcut hint, but no action is hover-only.

## Search and ranking

### Normalization and matching

V1 uses a deterministic, case-insensitive matcher:

1. Convert text to Unicode-normalized lowercase, trim it, and collapse whitespace.
2. Match a query against a candidate’s label, configured keywords, and provider search text by token-prefix matching. For example, `job app` matches `Job Applications`; `plan` matches `Day Planner`.
3. As a secondary match only, permit ordered-character subsequence matching within a single label token (for example, `tod` → `To-Do`). Do not use edit-distance, semantic similarity, remote APIs, or LLM interpretation.
4. An empty query displays the default suggested commands; it does not enumerate all stored records.

Quoted phrases, prefixes such as `task:`, and natural-language dates are out of scope. Entering `buy milk tomorrow` simply filters the visible labels and does not create or interpret a task.

### Group ordering

With an empty query, show in this exact order:

1. **Suggested**: Add dated task, Capture note, Toggle habit for today, Log job applications.
2. **Navigate**: the six views, with the active view visually identified but still selectable.
3. **Actions**: remaining quick-capture commands.

With a nonempty query, show matching groups in this exact order:

1. **Commands**
2. **Navigation**
3. **Tasks** (manual tasks and recurring series)
4. **Notes**
5. **Habits**
6. **Job Applications**
7. **Day Planner**

Within a group, rank exact normalized label match first, then label prefix, then token-prefix match, then subsequence match. Break ties by stable source order: static command declaration order; task/list order; notes array order (pinned first); habits array order; job records newest date first; planner blocks by start time then existing array order. Cap each result group at 20 and show `Show all results in <Feature>` only if a future feature adds a dedicated results screen; v1 omits that control rather than hiding additional results behind an unimplemented destination.

If no candidate matches, show `No matching commands or dashboard items` and retain the query. It must not offer a guessed action.

### Search text and privacy

The index is in-memory only and is constructed from values already loaded in the authenticated app. It sends no search terms or content to third parties and records no queries. Note previews are capped at 160 characters and derive from a local newline-collapsed substring around the first matching text when possible; they are not stored separately.

## Argument-entry flows

All command forms have a visible command title, a Back control, labelled fields, Cancel, and a primary action. Enter submits only when the current form is valid and no native picker/menu is open. Invalid submit keeps entered values in place, focuses the invalid field, and announces the error.

### Add dated task

1. Choose **Add dated task**.
2. Enter a title. The initial date field is local today (`toLocalDateKey(new Date())`).
3. Select a valid local calendar date through a native date input or equivalent deterministic picker. V1 permits past and future dates; it does not parse typed date phrases.
4. Submit **Add task**.

Title is trimmed, must be nonempty, and is limited to 200 characters, matching existing To-Do forms. The success destination is To-Do, with the selected date’s Monday-to-Sunday board week displayed and the new row focused when practical.

### Add This Week and Long Term tasks

Each flow presents only the title field and validates it identically. Add This Week appends to the existing global list. Add Long Term appends to the Long Term root, never to a folder; folder choice belongs to the To-Do page’s existing drag/drop and add controls. Success navigates to To-Do and focuses the resulting row when practical.

### Capture note

1. Choose **Capture note**.
2. Enter note content in the required multiline field. Entering `Cmd+Enter`/`Ctrl+Enter` submits; unmodified Enter inserts a newline.
3. Optionally enter a title. If blank, derive it deterministically from the first nonempty content line, trim it to 80 characters, and fall back to `Untitled`.
4. Submit **Save note**.

Content is trimmed only to validate nonemptiness; preserve interior and trailing authored whitespace when saving. The title is limited to 200 characters and content to 10,000. On success, navigate to Brain Dump, select the new note, and focus its editor title or content input. This is a quick capture, not an inline rich note editor.

### Log job applications

1. Choose **Log job applications**.
2. Enter a count. It must be an integer from 1 through 999 and defaults to `1`.
3. Optionally select a local date no later than local today. There is no future date or natural-language date entry.
4. Submit **Log applications**.

Success navigates to Job Applications and sets its ephemeral selected-date UI to the logged date. A record remains present at count zero only if it was already present; this command only adds a positive value, so it never creates a zero record.

### Toggle habit for today

1. Choose **Toggle habit for today**.
2. Focus a filterable list of existing habit names. The selection list uses the same deterministic matcher as the root palette.
3. Choose a habit and review its explicit resulting state: done today or not done today.
4. Press Enter/click **Confirm**.

If there are no habits, show `Create a habit in Habit Tracker before logging it` with an **Open Habit Tracker** action. Do not create a habit from this flow. The command re-checks the latest logs immediately before mutation because a snapshot could have changed the done state while the form was open.

## Confirmations, feedback, and undo

- Navigation and opening search results require no confirmation.
- Creation and positive logging require no blocking confirmation because all submitted fields are visible in the final action step and these mirror additive existing flows.
- Habit toggle has an explicit review/Confirm step because the same command can add or remove completion.
- The palette has no destructive v1 command, so it does not introduce a generic confirmation modal.
- A successful task or note creation shows a polite toast for eight seconds with **Undo**. Undo removes only the created record by its generated ID, and only while it still matches the expected original store and has not been edited/moved by the local session. If it is no longer safe, hide/disable Undo and retain the success message.
- Job-count logging and habit toggling do not offer Undo in v1. Job counts are aggregated per date and an inverse operation could accidentally undo a concurrent device update; habit state may also change independently. The existing feature pages remain the recovery path (decrement a selected job date or retoggle the habit).
- A storage write remains optimistic. Show `Saved locally` after mutation and `Sync pending` only if the shared sync-status service knows a write is pending. Do not claim a Firestore write succeeded merely because the local setter ran.

## Exact data effects and persistence rules

The palette writes only through shared setters backed by the existing `useSyncedStorage` values. It adds no Firestore collections, documents, or durable storage key.

| Action | Key | Exact v1 update |
|---|---|---|
| Add dated task | `todos-daily` | `next = { ...previous, [dateKey]: [...(previous[dateKey] || []), { id, text: trimmedTitle, done: false }] }`, where `id` follows the existing ordinary task ID generator (`Date.now() + Math.floor(Math.random() * 1000)`). |
| Add This Week task | `todos-thisweek` | Append `{ id, text: trimmedTitle, done: false }` to the existing array. |
| Add Long Term task | `todos-longterm` | Append `{ id, text: trimmedTitle, done: false }` at the root array. Do not create `isFolder`, alter folders, or add to nested `items`. |
| Capture note | `brainDumpNotes` | Prepend `{ id: Date.now().toString(), title, content }` to the regular notes array. Preserve the existing pinned note and all regular notes. |
| Select captured note | `brainDumpActiveId` | Set to the new note ID after creating its `brainDumpNotes` entry. Never set it to `__pinned__` for capture. |
| Log applications | `job_applications` | If a record has `date === dateKey`, replace it with `{ ...record, count: record.count + quantity }`; otherwise append `{ date: dateKey, count: quantity }`. No job-note change. |
| Toggle habit today | `habit_logs` | For `todayKey`, add the selected existing habit ID if absent, otherwise filter that ID out; return `{ ...previous, [todayKey]: nextIds }`. Do not change `habits`. |

The note row above describes compatibility with the current Brain Dump shape. When Connected Brain Dump is installed, `note.capture` must call its shared `createBrainDumpNote` action so the same `id`, title, and content are created with the enhanced metadata defaults. The palette must not maintain a second legacy creator. Likewise, the Day Planner search provider must use the shared date-aware planner selectors after `dayplanner-plans` ships and may use `dayplanner-blocks` only as a pre-migration compatibility source.

Generated IDs must be created once at submit time, not while rendering options. Ordinary task/note ID collision behavior remains consistent with the current feature implementation; the palette does not migrate it. Dates must use `toLocalDateKey`, `parseLocalDateKey`, `getMonday`, and `addDays` from `src/utils/date.js`; it must not use `Date#toISOString()` for a calendar key.

The palette must not modify `todos-recurring`, `todos-recurring-state`, `job_note`, `dayplanner-settings`, or `dayplanner-categories`. It reads recurring data and Day Planner data for search only.

## Navigation integration and result handoff

Because the app has state-based navigation rather than routes, introduce an ephemeral `navigate(intent)` service at the authenticated application shell. An intent has `{ view, target?: { kind, id, dateKey, folderId } }`; it is never persisted.

- Basic navigation sets the existing `view` state.
- A dated-task result sets `view: 'todo'`, derives the target week with `getMonday(parseLocalDateKey(dateKey))`, and asks To-Do to scroll/focus the matching row.
- This Week, Long Term root, folder-task, and recurring-series results open To-Do and focus the matching visible item or management row. A collapsed folder is expanded only as an ephemeral UI response to its own target.
- A note result first sets `brainDumpActiveId` to the target ID (or `__pinned__`), opens Brain Dump, and focuses its editor.
- A habit result opens Habit Tracker and focuses the habit row. It does not change completion.
- A job-record/job-note result opens Job Applications, sets its local selected date when a record is targeted, and focuses the count control or note field.
- A planner-block result opens Day Planner, selects the block, scrolls it into view, and focuses the edit panel label if the panel is available.

Each destination component consumes and clears only an intent intended for its view after applying it. If an item has been removed by a current remote snapshot before consumption, open the owning view without focus and announce `Item is no longer available`.

## Provider and registry architecture

### Shared dashboard data/actions

The implementation must not mount a second independent set of `useSyncedStorage` hooks solely for the palette. Doing so would produce duplicate Firestore subscriptions and stale setter closures. Instead, add a `DashboardDataProvider` inside the unlocked portion of `App` that owns one synchronized value/setter per existing key and exposes:

- Read-only normalized selectors for each feature shape.
- Mutation functions for the five permitted palette writes above.
- A small local sync-status abstraction derived from the shared hook lifecycle where feasible.
- The route-less `navigate(intent)` service and current view.

Migrate the existing feature components incrementally to consume that provider (or adapters around it) so a palette action appears in the active page immediately. The provider is an integration refactor only: it must preserve existing keys, initial values, debounce behavior, and Firestore document shape `{ value, _secret }`.

### Registry contracts

Define a pure, testable command/search module separate from rendering. The palette UI consumes a `CommandRegistry` with static commands and `SearchProvider` implementations.

```ts
type Command = {
  id: string
  label: string
  group: 'suggested' | 'action' | 'navigate'
  keywords: string[]
  requiresArguments: boolean
  isAvailable: (context) => boolean
  execute: (context, args?) => CommandOutcome
}

type SearchResult = {
  id: string
  providerId: string
  group: 'tasks' | 'notes' | 'habits' | 'jobs' | 'planner' | 'navigation'
  label: string
  detail?: string
  searchText: string[]
  target: NavigationIntent
}

type SearchProvider = {
  id: string
  getResults: (dashboardSnapshot) => SearchResult[]
}
```

Use providers for `navigation`, `todos`, `notes`, `habits`, `jobs`, and `dayPlanner`. Providers return plain data and never call setters. Commands delegate mutations to named action services (`addDatedTask`, `captureNote`, `logJobApplications`, `toggleHabitToday`) rather than directly reaching into unrelated component state.

All matcher/ranking functions, result builders, date validation, argument validation, and ID-independent action payload construction must be pure modules with unit tests. React components handle only focus, dialog state, portals, forms, and calling the registry.

## Accessibility and focus management

- Render the root surface with `role="dialog"`, `aria-modal="true"`, a programmatic dialog label, and an `aria-describedby` reference to the current context/help text.
- Use a real text input for search and explicit labelled controls for argument forms. Do not implement the list as a collection of non-semantic `div` click handlers.
- Use either a correctly implemented `aria-activedescendant` combobox/listbox pattern or roving `tabIndex` list options; choose one and test it. The active option must be announced with its group, label, and detail.
- Trap focus inside the open dialog, restore opener focus on dismiss, and do not let background controls receive pointer or keyboard input while modal.
- Provide visible focus indicators that meet contrast requirements in the dashboard’s dark theme. Do not rely on color alone for selected, done, unavailable, or invalid state.
- Use `aria-live="polite"` for validation, successful save, unavailable item, and sync-pending messages; do not announce every keystroke or every search result refresh.
- Form errors identify both the field and constraint, e.g. `Count must be a whole number from 1 to 999.`
- Respect `prefers-reduced-motion`; opening, closing, and result updates must be instant or use reduced transitions.
- Ensure pointer targets meet 44 × 44 CSS pixels on touch-capable/narrow layouts, including Back, Cancel, Undo, and habit choices.

## Responsive UI

- At viewport widths above 700 px, use a modal with a 640 px preferred width and a maximum width of `calc(100vw - 32px)`.
- At 700 px and below, use a bottom-sheet or top-aligned full-width dialog with 16 px side insets, safe-area padding, and a results region that leaves the input/footer visible.
- The palette must remain usable at 320 px width, with long labels truncated visually but exposed in full through accessible names/title where needed.
- Do not depend on the To-Do seven-column layout. A result opens its owning view, whose existing responsiveness remains its responsibility.
- The TopBar trigger may collapse to an icon-only button on narrow screens, but retains its accessible name. The keyboard shortcut remains available when a hardware keyboard is connected.

## Empty, validation, error, offline, and conflict behavior

### Empty states

- Empty root query shows Suggested/Navigate/Actions, not an empty data index.
- No search matches show an explanatory empty state and no speculative create action.
- No habits disables the habit command or displays it as available with the explicit Open Habit Tracker recovery action; it must not lead to a blank selection form.
- Missing task/note/planner results after a remote update open the relevant page without target focus and announce their unavailability.

### Validation and malformed data

- Task title: nonempty trimmed string, maximum 200 characters.
- Note content: nonempty after trim, maximum 10,000 characters; optional title maximum 200 characters.
- Job date: `parseLocalDateKey` succeeds and is not later than local today; count is an integer 1–999.
- A habit can be toggled only if its ID still exists in the current `habits` array at confirmation time.
- Providers must ignore malformed data records defensively. A malformed record must not crash indexing or hide valid results from the same key.

### Offline and sync errors

- A palette action updates the same local state immediately as existing views; localStorage remains the immediate cache when offline.
- The UI may use `navigator.onLine` only as a hint. It must label this as `Offline — saved on this device` and never promise later synchronization.
- Firestore errors continue to use the existing `useSyncedStorage` console-error behavior unless the hook is deliberately extended with a non-sensitive status signal. If surfaced, report `Could not sync yet; your local change is still visible.`
- Closing/reopening the palette must not discard an already committed local mutation.

### Conflicts

Whole-key remote replacement and last-write-wins behavior are existing constraints. The palette must not promise conflict-free editing or merges. Before executing a command, use the latest provider value, not the search-result snapshot. After a remote replacement removes a selected target, cancel the unsafe operation with an explanatory message. Aggregate job logs and toggles intentionally omit Undo as described above.

## Performance requirements

- Opening the palette must focus the input within 100 ms on a warm local render and should not wait for a Firestore response.
- Index construction runs only after unlock and is memoized from relevant synchronized values; query filtering is memoized from the normalized query and provider output.
- Do not write to storage, Firestore, or localStorage while searching, ranking, navigating, or opening/closing the dialog.
- Keep v1 result generation synchronous and local. Bound note previews and result groups as specified; avoid rendering an unbounded list in the dialog.
- Defer optional palette module code with the authenticated shell if doing so does not make first invocation feel delayed. Preload after unlock/idle is acceptable; do not preload it on the password gate.
- Escape, backdrop close, and unmount must clean up global key listeners, focus traps, body scroll locks, pending toasts, and any timers.

## Testing requirements

### Unit tests

Add Vitest coverage for pure registry/provider utilities:

- Platform shortcut detection and composition-event exclusion.
- Query normalization, token-prefix, deterministic subsequence, stable ranking, group order, and no-match behavior.
- Default empty-query inventory/order and availability when no habits exist.
- Result builders for each supported data shape, including folder tasks, recurring series, pinned notes, malformed records, and Day Planner blocks after midnight.
- Local date validation, past/future constraints, and Monday derivation using the existing date utilities.
- Exact mutation payloads for all five permitted writes, including append/prepend order and no unintended key changes.
- Note-title derivation, content limits, job integer/range validation, and stale-habit validation.

### Component/integration tests

Add React Testing Library coverage for:

- Opening through `Cmd+K`/`Ctrl+K` and TopBar trigger only after unlock.
- Autofocus, dialog semantics, Arrow/Home/End/Enter behavior, focus trap, two-stage Escape, backdrop close, and focus restoration.
- Each argument flow’s validation and successful action.
- Keyboard and pointer execution for navigation, capture, job log, and habit toggle.
- Search selection sending the expected navigation intent and destination consumption/clear behavior.
- Undo only for an unchanged task/note creation, plus unavailable Undo after a conflicting local modification.
- Narrow viewport sheet behavior and minimum target controls.
- No storage setter calls while typing/querying or opening a search result.

### Manual verification

Verify in a production build on macOS and a non-macOS browser; with an input/textarea focused; with VoiceOver or another screen reader; at 320 px width; offline; and with a second browser/device producing a remote update while the palette is open. Also verify the existing To-Do drag/drop, recurring management, Habit Tracker history dots, Job Applications date picker, Brain Dump save indication, and Day Planner interactions are unchanged.

## Rollout and documentation

- Ship as a normal authenticated-dashboard feature; no remote feature flag or migration is required.
- Existing users see the TopBar trigger and can immediately use the shortcut. No existing stored value changes until they execute a write command.
- Add the command palette to `README.md` and `Full.md` when implementation is complete, including its shortcut, supported actions, local-only search, and storage reuse.
- Do not add external product analytics in v1. This personal dashboard has no analytics infrastructure, and command/note query telemetry would be unnecessarily sensitive. Console diagnostics may be used only during development and must not include note contents.

## Acceptance criteria

The feature is complete when all of the following are true:

1. An unlocked dashboard has a visible, accessible TopBar command trigger and opens one global palette with `Cmd+K`/`Ctrl+K` from every existing view.
2. The password gate does not render or activate the palette shortcut.
3. The palette is a modal dialog with correct focus containment, restoration, Escape behavior, and keyboard list navigation.
4. Empty-query suggestions and navigation/action ordering match this PRD.
5. Query matching/ranking is deterministic and contains no AI, semantic, remote, or natural-language argument parsing.
6. Users can navigate to all six existing views without a persistence write.
7. Users can add a valid dated task, including a past or future explicitly selected local date, and it appears as a normal task in `todos-daily`.
8. Users can add normal This Week and Long Term root tasks; the palette does not alter folders or recurring data.
9. Users can capture a regular note, with deterministic title fallback, and the new note is selected in Brain Dump.
10. Users can add a positive 1–999 application count only for today or an earlier date; no zero or future record is created.
11. Users can explicitly select and toggle an existing habit for today; no habit definition is created or changed.
12. Cross-feature search returns and opens supported task, recurring, note, habit, job, and planner records without writes on search.
13. Result navigation applies the correct ephemeral intent where supported and degrades gracefully if a target has disappeared.
14. The palette uses one shared synchronized data/action source, not independent duplicate subscriptions that cause stale page state.
15. Each palette action applies exactly the documented update to existing storage shapes and creates no durable palette key or new Firestore schema.
16. All local calendar keys use the shared local-date utilities, never `toISOString()`.
17. Invalid forms retain entered data, identify the failing field, and cannot commit invalid values.
18. Task/note creation provides safe time-bounded Undo; job logging and habit toggling do not expose unsafe undo.
19. Offline/local-cache and remote-replacement limitations are communicated without false claims of synchronization or merging.
20. The palette is usable at 320 px, by mouse/touch, keyboard, and assistive technology, and respects reduced-motion preferences.
21. Searches, opens, closes, and navigation commands never trigger a persistence write.
22. Unit and integration tests cover the stated logic and interaction paths, and a production build succeeds.
23. Existing Job Applications, To-Do, Habit Tracker, Brain Dump, Overview, and Day Planner behavior/data remain unchanged outside the explicitly documented palette actions and navigation handoffs.

## Dependencies

- `src/App.jsx` authenticated shell and existing `view` state.
- `src/components/TopBar.jsx` and CSS Module for the trigger.
- `src/hooks/useSyncedStorage.js` and Firestore/localStorage behavior.
- `src/utils/date.js` for local calendar keys and week navigation.
- `src/domain/recurringTasks.js` for deriving recurring-series search metadata safely.
- Existing feature data shapes documented in `Full.md`.
- A portal/focus-trap implementation that does not add an unnecessary large dependency; a small tested local utility is acceptable.

## Risks and tradeoffs

| Risk/tradeoff | Decision/mitigation |
|---|---|
| A shared data provider touches broad view plumbing | Keep it as an adapter around existing keys/setters, migrate one feature at a time, and verify no data-shape or debounce changes. This avoids duplicate subscriptions and delayed cross-view state. |
| Whole-document Firestore writes can conflict across devices | Retain current behavior, re-check live values before mutation, avoid unsafe aggregate/toggle undo, and communicate limitations. Do not introduce a partial Firestore schema as part of this feature. |
| Search can expose sensitive note text on screen | Keep it local/authenticated, cap previews, omit telemetry, and leave richer note controls to Connected Brain Dump. |
| A global shortcut can disrupt typing | Support it intentionally in fields for global capture, but ignore composition/prevented events and provide Escape/focus restoration. |
| Broad result sets can make the dialog slow/noisy | Group, cap, memoize, and use deterministic relevance rather than infinite results or background search. |
| Deep navigation requires local component state changes | Use an ephemeral intent contract; if a target cannot be focused, the owning view still opens safely. |

## Open decisions resolved for version one

1. Mobile uses the shared accessible **BottomSheet** presentation from the responsive-navigation work, expanding to the available viewport above the soft keyboard.
2. Version one has no visible `>` command-only mode; commands and results remain in labelled groups.
3. An omitted note title is inferred from the first nonempty content line, with the documented `Untitled` fallback.
4. Undo toasts are owned by the application-shell `ToastRegion`, so they survive palette close and view navigation.
5. Large screens use an icon plus visible key hint in the page header; narrow screens use the icon-only trigger with the same accessible name.

## Future considerations

- Add a palette command that deliberately opens, rather than duplicates, richer Today Command Center capture flows.
- Let Connected Brain Dump provide tags, filters, linked-note results, and advanced ranking through the same `SearchProvider` contract.
- Add recently used commands only if stored locally and without recording note search terms.
- Add explicit task-folder selection, recurring-series creation, historical habit logging, or Day Planner block creation only after their page-level behaviors are intentionally generalized.
- Add route URLs/deep links if the application later adopts a router; map `NavigationIntent` to routes without changing command IDs.
- Revisit item-level Firestore writes or merge semantics if concurrent-device data loss becomes material.
