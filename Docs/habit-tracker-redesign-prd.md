# Product Requirements Document: Date-Clear Habit Tracker Redesign

## Status

Proposed, implementation-ready requirements for the approved Habit Tracker redesign. This document records product decisions only. It does not authorize implementation, deployment, production-database access, or changes to current production data.

## Summary

Redesign the dedicated **Habit Tracker** page so users can identify and edit recent dates without calculating a dot's position. Replace the current unlabeled seven-dot history inside each habit row with a single labeled seven-day grid: habits are rows, local calendar dates are columns, and every cell is a one-click binary completion control.

The system remains intentionally simple. Every habit is a daily yes/no habit. The page continues to optimize for fast check-ins while adding clear date context, inline renaming, and useful 7-day and 30-day completion summaries. It does not add schedules, quantities, durations, notes, reminders, categories, routines, or a calendar-month view.

Existing habit names and identifiers are retained at release, while existing completion history is reset once. New metadata records when each habit begins participating in analytics. The shared `habits` and `habit_logs` contracts remain compatible with Overview and the command palette, whose interfaces are outside this redesign.

## Production data safety — mandatory

The production/current Firebase database must not be read, written, migrated, cleared, seeded, copied, inspected, or otherwise used during implementation or testing. This restriction applies to automated tests, local development, manual QA, debugging, screenshots, demos, and one-off scripts.

- Unit and component tests must use in-memory fixtures and mocked storage/synchronization boundaries.
- Integration or manual synchronization testing must use the Firebase Local Emulator Suite or a dedicated test Firebase project containing synthetic data only.
- Development and test builds must fail closed if configured with the production Firebase project ID or production credentials.
- No implementation task may eagerly reset `habit_logs` or rewrite `habits` in a remote production database.
- Deployment and the one-time production history reset require the user's separate, explicit authorization after the implementation has been reviewed and verified in a test environment.
- The reset and migration contract below describes release behavior; it is not authorization to execute that behavior during development.

## Problem

The current Habit Tracker renders seven small completion dots for each habit. Their dates are available only through hover titles and inferred position. A user changing a past completion must count backward from today and calculate which dot represents the intended day. This is slow, error-prone, difficult on touch devices, and inaccessible to users who cannot use hover.

The existing page also lacks renaming and meaningful completion summaries. It exposes only a current streak and today's completed count, so users cannot quickly compare recent and monthly consistency.

## Goals

- Make every editable date identifiable at a glance without hover or date arithmetic.
- Preserve fast, one-click daily binary check-ins for today and the previous six local dates.
- Keep the dedicated page compact and consistent with the rest of the dashboard.
- Show useful 7-day and 30-day completion percentages overall and per habit.
- Preserve current and best streak information with explicit daily semantics.
- Allow users to add, rename, and delete habits without adding configuration complexity.
- Preserve existing habit names and IDs while resetting completion history exactly once at an explicitly authorized release.
- Keep Overview and command-palette habit logging compatible without redesigning those surfaces.
- Provide complete keyboard, screen-reader, touch, desktop, and narrow-screen support.

## Non-goals

This version does not include:

- Numeric, duration, rating, quantity, or custom-unit habits.
- Selected-weekday, weekly-frequency, interval, monthly, or other custom schedules.
- Categories, colors, icons, groups, routines, or manual reordering.
- Habit notes, completion notes, mood, difficulty, or custom metadata.
- Pause periods, end dates, archiving, soft deletion, or recovery of deleted habits.
- Reminders, browser notifications, emails, or scheduled automation.
- Grace days, streak freezes, forgiveness rules, or configurable streak behavior.
- Editing dates older than six days ago.
- Previous/next week navigation, expandable history, or month-calendar views.
- Changes to the Overview card or command-palette interfaces.
- Gamification, social features, recommendations, or comparisons between users.
- Import, export, or manual production-data administration.

## Existing system context

The application is a React/Vite client-side dashboard. `useSyncedStorage` caches whole values in `localStorage` and synchronizes them to Cloud Firestore with last-write-wins behavior. Local calendar dates use `YYYY-MM-DD` keys generated by helpers in `src/utils/date.js`; UTC conversion must not be used for habit dates.

Current habit persistence is:

| Key | Current shape | Current consumers |
|---|---|---|
| `habits` | `[{ id: number, name: string }]` | Habit Tracker, Overview, command palette |
| `habit_logs` | `{ [localDateKey]: habitId[] }` | Habit Tracker, Overview, command palette |

The dedicated page currently supports adding and deleting habits, toggling today, editing the last seven days through unlabeled dots, and displaying a current streak. Overview can toggle today's habits. The command palette can log one of today's incomplete habits. Those shared consumers must continue to work after the redesign.

## Approved product decisions

- Primary goal: balance fast check-ins, useful analytics, and consistency motivation.
- Tracking type: binary done/not done only.
- Schedule: every habit is expected every day.
- Page structure: a polished, compact version of the existing list rather than a multi-page or calendar-first system.
- Editable history: today and the previous six days only.
- History presentation: one labeled grid with habits as rows and dates as columns.
- Date-label format: abbreviated weekday plus day of month, such as `Mon 17`.
- Analytics: last-7-day and last-30-day completion percentages.
- Organization: one simple list in its existing order.
- Management: add, rename, and delete.
- Streak rule: a missed scheduled day breaks the streak.
- Entry context: no notes or metadata.
- Existing data: preserve habit names and IDs but reset completion history.
- Scope: redesign the dedicated Habit Tracker page only; keep shared consumers compatible.
- Reminders: none.
- Visual direction: modernize the page while matching the rest of the dashboard.
- Historical interaction: a past cell toggles immediately with one click and no confirmation.

## Terminology

| Term | Definition |
|---|---|
| **Local date** | A calendar date in the user's current local timezone, stored as `YYYY-MM-DD`. |
| **Visible window** | Today plus the previous six local dates, ordered oldest to newest. |
| **Eligible day** | A date on or after the habit's `createdAt` date and no later than today. |
| **Completion** | The presence of a habit ID in the `habit_logs` array for a local date. |
| **Missed day** | An eligible date before today without a completion. |
| **Current streak** | Consecutive completed eligible days ending today, or ending yesterday when today is still incomplete. |
| **Best streak** | The longest consecutive sequence of completed eligible dates in retained history. |
| **Completion rate** | Completed eligible habit-days divided by total eligible habit-days in a requested period. |

## Information architecture

The top-level destination remains **Habits** and retains the existing `habits` view ID. The page remains a single dedicated view with this reading order:

1. Existing page/card title.
2. Quick-add habit control.
3. Overall analytics summary for the last 7 and 30 days.
4. Section heading and today's completion count.
5. Seven-day habit grid.
6. Empty state instead of analytics and grid when no habits exist.

No tabs, secondary routes, drawers, calendar pages, or separate insights page are introduced.

## Seven-day grid

### Structure

- Render one semantic grid or table with habits as rows and seven local dates as columns.
- Generate the visible window as today minus six days through today, ordered chronologically from left to right.
- The first column contains the habit name and row actions.
- Each date header permanently displays the abbreviated local weekday and numeric day, for example `Fri 15`.
- The current date header also displays a clear **Today** marker or equivalent persistent visual treatment.
- Do not require hover, tooltip reading, dot counting, or positional arithmetic to identify a date.
- Do not render or allow interaction with future dates.
- Do not provide navigation to dates outside the visible seven-day window.

Illustrative structure:

```text
Habit          Fri 15  Sat 16  Sun 17  Mon 18  Tue 19  Wed 20  Thu 21
Exercise          ✓       ○       ✓       ✓       ○       ✓       ○
Read              ✓       ✓       ✓       ○       ✓       ✓       ✓
```

### Completion cells

- Each cell represents exactly one habit and one local date.
- Activating a cell toggles the habit ID in that date's `habit_logs` array immediately.
- The same interaction applies to today and all six visible past dates.
- No confirmation, review step, save button, or undo control is required.
- Toggling one cell must not alter another habit or date.
- Prevent duplicate habit IDs within a date's completion array.
- A completed cell must have a visible checked state; an incomplete cell must have a visible unchecked state.
- State must not be communicated by color alone.
- A historical toggle must update streaks and analytics immediately.

### Date and timezone behavior

- All keys and displayed dates use the user's local calendar.
- Reuse or extend `src/utils/date.js`; do not derive date keys with `Date#toISOString()`.
- The grid must show the correct consecutive dates across month boundaries, year boundaries, daylight-saving changes, and variable month lengths.
- If the view remains mounted across local midnight, the visible window and Today marker must update without requiring a full application reload.

## Habit management

### Add

- Retain a compact input and explicit add button.
- Pressing Enter in the input also adds the habit.
- Trim surrounding whitespace and reject an empty result.
- Retain the existing maximum name length of 60 characters unless a shared validated constant replaces it.
- Assign a stable unique ID and the current local date as `createdAt`.
- New habits append to the existing list order.
- Adding a habit does not create a completion automatically.

### Rename

- Provide an inline rename action for every habit.
- Initialize editing with the current name and preserve the habit ID and completions.
- Save by explicit action or Enter; cancel by Escape or an explicit cancel action.
- Trim whitespace, reject an empty name, and enforce the same length limit as creation.
- Leaving the name unchanged must not perform a storage write.
- Duplicate names are allowed because identity is ID-based.

### Delete

- Provide a clearly labelled delete action.
- Require confirmation that names the habit and explains that its visible history will no longer be available.
- Confirming removes the habit definition.
- Historical IDs may remain in old `habit_logs` arrays for compatibility, but they must be ignored by UI and analytics.
- Cancelling must make no storage change and return focus to a sensible control.

## Analytics

### Overall summaries

- Display two overall summaries: **Last 7 days** and **Last 30 days**.
- Each summary shows a percentage and may also show the completed/eligible count for clarity.
- The current day participates in both periods; an incomplete current-day cell counts as incomplete.
- Dates before a habit's `createdAt` are excluded from both numerator and denominator.
- Deleted or unknown habit IDs are excluded.
- If there are no eligible habit-days, display an explicit neutral state rather than `NaN`, infinity, or a misleading zero percentage.

### Per-habit summaries

- Each habit row exposes its 7-day and 30-day completion percentages without requiring a separate page.
- Display the current streak and best streak in a compact form that does not obscure the date grid.
- Analytics update synchronously after any visible completion toggle.
- Percentages use whole-number rounding consistently throughout the page.

### Streak semantics

- Every eligible local date is scheduled because all habits are daily.
- A missing completion on any eligible past date breaks a streak.
- When today is complete, the current streak ends today and walks backward through consecutive completed dates.
- When today is incomplete, the in-progress day does not prematurely break the displayed current streak; calculation begins with yesterday.
- Best streak searches all retained log dates on or after `createdAt` through today.
- Dates before `createdAt`, future dates, deleted habits, and malformed log values do not participate.

## Responsive behavior

- On wide screens, show all seven date columns without body-level horizontal scrolling.
- On narrow screens, the grid may scroll horizontally within its own region.
- Keep the habit-name column sticky while horizontally scrolling when technically reliable.
- Keep date headers visible or sticky when vertically scrolling a long habit list when technically reliable.
- Do not collapse dates back into unlabeled dots on mobile.
- Touch targets must be at least 44 by 44 CSS pixels where practical, with sufficient spacing to avoid toggling the wrong date.
- The page must remain usable at a 320 CSS-pixel viewport width.

## Visual design

- Replace Habit Tracker-specific fixed colors with the dashboard's semantic theme tokens.
- Maintain the dashboard's compact, dark-first visual language while supporting all configured themes.
- Give the Today column a restrained but persistent background or border treatment.
- Give checked, unchecked, hover, pressed, disabled, and keyboard-focus states distinct treatments.
- Avoid decorative complexity that competes with date labels or makes dense rows hard to scan.
- Do not use emoji as the only streak indicator or status label.
- Respect reduced-motion preferences; completion feedback must not depend on animation.

## Accessibility

- Use semantic table/grid structure with associated row and column headers.
- Each completion control must expose the habit, full local date, and resulting state. Example: `Mark Read complete for Monday, August 17`.
- Checked state must be programmatically available through native checkbox semantics or an equivalent valid ARIA state.
- All add, rename, delete, confirm, cancel, and completion interactions must be keyboard operable.
- Provide visible focus indicators with sufficient contrast.
- Historical dates must be fully understandable without hover.
- Announce successful state changes without moving focus or causing disruptive repeated announcements.
- The delete confirmation must trap and restore focus according to the shared dialog behavior.

## Empty, loading, and error states

- With no habits, show an intentional empty state explaining how to create the first habit and keep the add control available.
- Do not show meaningless analytics or an empty grid shell when there are no habits.
- Preserve local-first usability while synchronization is unavailable.
- A synchronization failure must not silently roll back a local completion or block continued use.
- Follow existing shared loading and error conventions; do not introduce a page-specific spinner system.

## Data model and compatibility

### Habit definitions

Continue using the `habits` synchronized key, extending each definition with a local creation date:

```js
{
  id: 1724198400000,
  name: 'Read',
  createdAt: '2026-08-21',
}
```

Rules:

- `id` remains the identity used by all consumers and log arrays.
- `name` remains a trimmed string with a maximum of 60 characters.
- `createdAt` is a valid local `YYYY-MM-DD` key and is immutable after creation.
- During the approved one-time migration, existing valid habits receive the migration/reset local date as `createdAt`.
- Consumers must tolerate legacy habits without `createdAt` until migration is complete by using the authorized reset date or the earliest safe eligible date supplied by a shared normalization function.
- Malformed records must be ignored or normalized defensively without crashing the view.

### Completion logs

Retain the existing `habit_logs` shape:

```js
{
  '2026-08-20': [1724198400000],
  '2026-08-21': [1724198400000, 1724198400001],
}
```

Rules:

- Object keys are valid local calendar dates.
- Each value is a de-duplicated array of habit IDs.
- The grid, Overview, and command palette continue to toggle IDs using this shape.
- Analytics ignore IDs that do not correspond to an active habit definition.
- Do not change the shape merely to render the redesigned grid.

### Migration metadata

Use an explicit synchronized metadata contract to prevent repeated resets. The exact key name may follow established naming conventions, but its logical content must include a version and reset date, for example:

```js
{
  version: 2,
  resetDate: '2026-08-21',
}
```

The implementation must define one authoritative, idempotent migration function with these outcomes:

1. Detect that the Habit Tracker data version is older than version 2.
2. Preserve each valid existing habit's ID, name, and list order.
3. Add `createdAt` equal to the local migration date.
4. Replace existing completion history with an empty `habit_logs` object.
5. Record the new version and reset date so reloads and other clients do not repeat the reset.

Because the current synchronization hook writes separate whole documents without transactions, implementation must not assume that three independent client writes are atomic. Before implementation begins, the migration should be designed as a recoverable state machine or a single authoritative versioned payload so interruption or another device cannot restore stale history or repeatedly clear new completions. Production execution remains separately authorized.

## Integration requirements

### Overview

- Keep the current Overview Habit card layout and interaction unchanged.
- Continue reading `habits` and today's array from `habit_logs`.
- Ignore the new `createdAt` property where it is not needed.
- A completion toggled in the redesigned grid must appear in Overview through existing synchronized storage behavior.

### Command palette

- Keep the existing Log Habit flow unchanged.
- Continue listing today's incomplete active habits and adding their IDs to today's `habit_logs` array.
- Ignore the new `createdAt` property where it is not needed.
- A habit renamed on the dedicated page must appear under its new name in the palette.

## Implementation architecture

- Move date-window, completion-rate, current-streak, best-streak, normalization, and migration logic into pure domain functions rather than leaving it embedded in the React component.
- Keep persistence mutations centralized and use functional state updates to reduce stale-write risk.
- Reuse shared `Button`, `Dialog`, toast/live-region, theme, and date primitives where they satisfy these requirements.
- Keep the view lazy-loaded through the existing `habits` route.
- Avoid adding a third-party calendar or chart dependency; the required grid and percentage summaries can be implemented with native React and CSS.
- Do not couple analytics to rendered DOM state.

## Testing requirements

### Domain tests

Cover at minimum:

- Seven consecutive local dates in oldest-to-newest order.
- Month-end, year-end, leap-day, and daylight-saving boundaries.
- Completion toggling without duplicates.
- Eligible-day calculation using `createdAt`.
- 7-day and 30-day overall and per-habit percentages.
- Zero eligible-day behavior.
- Current streak when today is complete and incomplete.
- Streak break on a missed past day.
- Best-streak calculation.
- Ignoring future logs, pre-creation logs, malformed values, and deleted habit IDs.
- Idempotent one-time migration that preserves habits and resets logs once.
- Recovery from each partially completed migration state.

### Component tests

Cover at minimum:

- Permanent `ddd D` labels for all seven visible dates.
- Persistent Today identification.
- Correct full-date accessible names.
- One-click current and historical toggling.
- Immediate analytics and streak updates.
- Adding a habit with `createdAt`.
- Rename save, cancel, empty validation, length validation, and ID preservation.
- Delete confirmation, cancel, and focus restoration.
- Empty state.
- Keyboard operation and checked semantics.
- Narrow-screen grid structure without hidden date identity.

### Regression tests

- Overview continues to render and toggle today's habits.
- Command palette continues to list and log incomplete habits.
- Cross-mounted `useSyncedStorage` consumers receive local changes.
- Existing navigation and lazy loading remain functional.
- Theme tests confirm the redesigned page uses semantic tokens.
- The full automated test suite and production build pass.

### Manual verification

Verify with synthetic data only:

- Desktop and 320-pixel mobile layouts.
- Mouse, touch, and keyboard interaction.
- Screen-reader announcement and header association.
- Light/dark or all currently configured themes.
- Local midnight rollover while the view is mounted.
- Offline edits and later synchronization in a non-production test environment.
- Two test clients updating different habit cells to document current last-write-wins limitations.
- An interrupted migration and successful recovery without a second reset.

## Acceptance criteria

1. The page always shows exactly today and the previous six local dates in chronological order.
2. Every date is permanently labelled with abbreviated weekday and day number.
3. Today is visibly and programmatically identifiable without hover.
4. Users can toggle any visible habit/date cell with one activation.
5. Users never need to count dots or calculate days backward to edit history.
6. Habits remain daily binary records with no schedule or value configuration.
7. The page shows accurate overall and per-habit completion rates for the last 7 and 30 days.
8. Current and best streaks follow the approved daily missed-day rules.
9. Users can add, rename, and confirm deletion of habits.
10. New habits are excluded from analytics for dates before their creation.
11. Existing habit names, IDs, and order are preserved by the approved migration.
12. Existing completion history is cleared exactly once during the separately authorized release migration.
13. Overview and command-palette habit interactions remain functionally unchanged and compatible.
14. The redesigned page uses dashboard theme tokens and works at 320 CSS pixels without body-level horizontal scrolling.
15. All interactive behavior is keyboard and screen-reader accessible.
16. Automated tests and the production build pass without accessing production Firebase data.

## Delivery sequence

1. Add pure habit-domain utilities and tests.
2. Define and test the recoverable, idempotent migration with synthetic data.
3. Build the semantic seven-day grid and completion interactions.
4. Add habit creation, inline renaming, and confirmed deletion.
5. Add 7-day/30-day analytics and streak presentation.
6. Apply responsive, themed, and accessible styling.
7. Add component and integration regression coverage.
8. Run automated, build, accessibility, responsive, and synthetic synchronization verification.
9. Review the completed implementation and migration behavior with the user.
10. Request separate authorization before deployment or any production history reset.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Date ambiguity persists on narrow screens. | Keep permanent date labels and use contained horizontal scrolling with a sticky habit column. |
| UTC conversion selects the wrong day near midnight. | Use local date helpers exclusively and test boundary cases. |
| New habits lower historical completion rates. | Exclude dates before immutable `createdAt`. |
| Migration clears history repeatedly or after new completions. | Use explicit synchronized version metadata and an idempotent, recoverable migration protocol. |
| Separate last-write-wins documents produce a partial migration. | Design and test interrupted states before release; do not rely on independent writes being atomic. |
| Deleted IDs distort analytics. | Calculate only for active habit definitions. |
| Dense grid causes mobile mis-taps. | Use 44-pixel touch targets, persistent headers, and contained scrolling. |
| Shared consumers break when habits gain metadata. | Preserve IDs, names, log shape, and add Overview/command-palette regression tests. |

## Deferred opportunities

Only after this version is used and evaluated should a later proposal consider longer history navigation, richer charts, custom schedules, quantitative habits, reminders, categories, notes, archiving, or export. None is implied by this specification.
