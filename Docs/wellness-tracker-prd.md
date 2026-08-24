# Product Requirements Document: Wellness Tracker

## Status

Proposed, implementation-ready requirements for the approved **Wellness** page. This document defines the product and technical contract only. It does not authorize implementation, deployment, production-database access, or changes to current production data.

## Summary

Add a new top-level **Wellness** page to the dashboard containing two deliberately simple trackers in one vertically ordered view:

1. A nutrition tracker for logging food name, calories, and whole grams of protein.
2. A weight tracker for recording daily weight in kilograms and viewing the last four weeks on a line chart.

The nutrition tracker shows one local calendar day at a time, opens on today, and supports browsing and selecting other dates. Users may enter food manually or select an exact, reusable saved food. It totals calories and protein for the selected day but does not introduce calorie or protein goals, progress rings, limits, warnings, or achievement messaging.

The weight tracker accepts at most one effective entry per local date. A new entry for an already-recorded date replaces that date's weight. It shows the latest weight, change across the visible four-week period, and an accessible four-week line chart. It does not label the trend as increasing, decreasing, or stable.

Both food and weight records support editing and deletion. Data follows the dashboard's existing local-first `useSyncedStorage` pattern and synchronizes through Firestore.

## Production data safety — mandatory

The production/current Firebase database must not be read, written, migrated, cleared, seeded, copied, inspected, or otherwise used during implementation or testing. This restriction applies to automated tests, local development, manual QA, debugging, screenshots, demos, and one-off scripts.

- Unit and component tests must use in-memory fixtures and mocked synchronization boundaries.
- Manual synchronization testing must use the Firebase Local Emulator Suite or a dedicated test Firebase project containing synthetic data only.
- No implementation task may seed, transform, or bulk-rewrite remote Wellness data.
- Deployment and first production use require separate explicit authorization after implementation has been reviewed and verified in a test environment.

## Goals

- Make daily calorie and protein logging fast and understandable.
- Show unambiguous totals for the selected local date.
- Reduce repeat entry through a small reusable-food list.
- Make past food logs easy to browse, correct, and remove.
- Support one simple daily weight check-in in kilograms.
- Show four weeks of weight movement visually without interpreting the trend for the user.
- Match the dashboard's responsive, accessible, theme-aware design.
- Preserve local-first use and cross-device synchronization.

## Non-goals

Version one does not include:

- Calorie, protein, macro, weight, or body-composition goals.
- Progress rings, remaining-calorie calculations, warnings, streaks, badges, or celebrations.
- Increasing/decreasing/stable labels or configurable trend thresholds.
- Fat, carbohydrates, fiber, micronutrients, water, or other nutrition fields.
- Meal categories, meal planning, recipes, ingredients, portion multiplication, or quantity tracking.
- Barcode scanning, photo recognition, restaurant menus, or external nutrition databases.
- Serving descriptions such as `100 g`, `one cup`, or `one bowl`.
- Automatic calorie or protein calculation.
- Pounds or unit switching.
- Multiple weight readings retained for one date.
- Forecasting, target-weight projections, moving averages, or chart-range controls.
- Import, export, sharing, coaching, notifications, reminders, or integrations.
- A Wellness summary on the Today page or command-palette logging.

## Approved product decisions

- Destination and page label: **Wellness**.
- Page layout: nutrition first, weight underneath; no tabs and no top summary-card row.
- Food record fields: food name, calories, and protein only.
- Nutrition source: manual entry or reusable saved foods.
- Saved-food contract: one exact standard serving containing name, calories, and protein.
- Saved-food selection: values are fixed when selected and cannot be adjusted in the add flow.
- Saved-food management: simple dropdown with delete controls; no searchable picker in version one.
- Protein: whole grams only.
- Nutrition goals: none.
- Nutrition history: one selected day at a time, with previous/next navigation and a date picker.
- Default nutrition date: today.
- Weight unit: kilograms only.
- Expected weight frequency: daily, without enforcing a required entry every day.
- Same-day weight behavior: a new value replaces the existing value for that local date.
- Weight presentation: current weight, visible-period change, and a line chart.
- Chart range: today and the preceding 27 local dates.
- Missing chart days: connect adjacent recorded points across missing dates.
- Trend label: none.
- Food and weight records: both editable and deletable.
- Today page integration: none.

## Terminology

| Term | Definition |
|---|---|
| **Local date** | A calendar date in the user's current local timezone, stored as `YYYY-MM-DD`. |
| **Selected nutrition date** | The date whose totals and food records are currently displayed. |
| **Food record** | One logged occurrence containing a name, calories, protein, date, and stable ID. |
| **Saved food** | A reusable template containing a name, calories, and protein for one standard serving. |
| **Weight record** | The single effective kilogram value for one local date. |
| **Visible weight window** | Today and the preceding 27 local dates, inclusive. |
| **Visible-period change** | Latest visible weight minus earliest visible weight; unavailable with fewer than two points. |

## Information architecture and navigation

- Add `wellness` as a lazy-loaded top-level view in `src/App.jsx`.
- Add **Wellness** to the primary navigation using a distinct, non-emoji icon consistent with the existing line-icon system.
- Treat Wellness as a full-width view.
- Preserve the existing App Shell, page header, lazy-loading behavior, focus handoff, theme context, and mobile bottom-navigation conventions.
- Keep the page as one document-flow column:
  1. Nutrition tracker.
  2. Weight tracker.
- Do not add a Today-page card, route, modal-only workflow, nested page, or tab bar.

## Nutrition tracker

### Selected-date navigation

- Initialize the selected date to today's local date whenever the Wellness view mounts.
- Show a clearly labelled previous-day button, selected date control, and next-day button.
- Allow direct selection of any non-future local date through a native or accessible date input.
- Disable the next-day action when today is selected.
- Never allow a future date to be selected or logged.
- Display a friendly date label, including a clear **Today** label when applicable.
- Changing the selected date updates totals and records immediately without changing stored data.

### Daily totals

- Show the selected day's total calories and total protein within the nutrition section header or directly beneath the date controls.
- Calories are the sum of valid calorie values for that date.
- Protein is the sum of valid protein values for that date and is displayed as whole grams.
- Do not show goals, percentages, remaining values, warning colors, success states, or progress visualizations.
- An empty day displays `0 calories` and `0 g protein` plus a meaningful empty state.

### Manual food entry

- Provide fields for food name, calories, and protein.
- Provide an explicit **Add food** action; pressing Enter from the form also submits when valid.
- The new record uses the currently selected nutrition date.
- Trim surrounding whitespace from the food name.
- Food name is required and limited to 80 characters.
- Calories are required whole numbers from 0 through 20,000 inclusive.
- Protein is required whole grams from 0 through 1,000 inclusive.
- Reject blank, fractional, negative, non-numeric, infinite, or out-of-range numeric values with inline field-specific errors.
- Zero is permitted so incomplete or unusual nutrition data can still be represented intentionally.
- Do not infer nutrition values or add quantity/serving fields.
- Include an optional **Save as reusable food** checkbox in the manual form. When selected, a successful submission creates both the food record and a saved-food template with the same normalized values.
- If an exact saved-food duplicate already exists, add the food record but do not create a second template; provide neutral feedback.

### Add from saved food

- Present a simple select/dropdown listing saved foods by name, with calories and protein included in the visible option label when practical.
- Selecting a saved food populates a read-only preview of its calories and protein.
- The selected saved food's values cannot be adjusted in the add flow.
- An explicit **Add saved food** action creates a new food record for the selected nutrition date.
- Adding a saved food copies its name, calories, and protein into the food record. The record does not rely on the template remaining available later.
- If there are no saved foods, show a short explanation that a food can be saved while entering it manually.

### Saved-food management

- Keep management visually compact and adjacent to the saved-food dropdown.
- Permit deleting the currently selected saved food.
- Require confirmation before deletion because the action removes the reusable template.
- Deleting a saved food does not alter existing food records created from it.
- Version one does not require renaming or editing a saved-food template. Users may delete and recreate one.
- Saved-food names need not be unique; exact duplicates are prevented using normalized name, calories, and protein together.

### Daily food list

- List only food records belonging to the selected nutrition date.
- Preserve deterministic entry order using `createdAt`, with older entries first.
- Each row displays food name, calories, and protein.
- Each row exposes labelled Edit and Delete actions without relying on hover.
- Editing opens an inline form or shared dialog prefilled with that record's values.
- Editing uses the same validation rules as manual entry and preserves the record ID, date, and creation timestamp.
- Editing a record changes only that occurrence; it never changes or creates a saved-food template.
- Deleting a record requires confirmation naming the food and selected date.
- Totals update synchronously after add, edit, or delete.

## Weight tracker

### Weight entry

- Provide a local date field defaulting to today and a weight field measured in kilograms.
- Future dates are not allowed.
- Weight is required and must be a finite value from 20 through 500 kg inclusive.
- Allow one decimal place and normalize stored/displayed weight to one decimal place.
- Reject blank, non-numeric, negative, infinite, or out-of-range input with inline errors.
- If no record exists for the selected date, the primary action is **Add weight**.
- If a record already exists for the selected date, show its value in the form and use **Update weight**. Submitting replaces that date's value; it does not create a second record.
- Successful entry updates the chart and metrics immediately.

### Current weight and visible-period change

- Display these as compact text metrics inside the weight section, not as standalone top summary cards.
- **Current weight** is the newest record on or before today, even if it falls outside the visible 28-day chart window.
- **Four-week change** uses the latest and earliest records inside the visible window.
- Display change with a sign and unit, for example `+1.2 kg`, `-0.7 kg`, or `0.0 kg`.
- With fewer than two visible records, show a neutral unavailable value such as `—` and supporting text such as `Add another entry to see change`.
- Do not attach increasing, decreasing, stable, good, bad, warning, or success language/color semantics to the change.

### Four-week line chart

- Plot all weight records from today minus 27 days through today on a linear date x-axis and linear kilogram y-axis.
- Connect consecutive recorded points directly across dates without readings; do not synthesize, interpolate, or carry forward stored values.
- Render a visible point for every recorded value.
- With one visible record, render the single point and no misleading line.
- With no visible records, render an intentional empty chart state rather than empty axes.
- Derive y-axis bounds from visible values with restrained padding so small changes remain legible. Handle identical values without division by zero.
- Show enough date labels to establish the four-week time range without overcrowding the chart.
- A tooltip or focus detail may show full local date and exact kilograms, but must not be the only accessible representation of the data.
- Build the chart with lightweight React/SVG and existing project dependencies unless implementation review identifies a compelling accessibility reason for a library.
- Do not add range switching, smoothing, averages, projections, zones, or a trend indicator.

### Weight-record management

- Provide a compact recent-record list beneath the chart solely for editing and deletion.
- Order records newest first and initially show records from the visible four-week window.
- Each row displays full local date, exact kilograms, Edit, and Delete.
- Editing preserves the date and updates the kilogram value using the entry validation rules.
- Deleting requires confirmation naming the date and weight.
- The chart, current weight, and visible-period change update synchronously after edits and deletions.
- If deleting the current weight reveals an older record outside the chart window, that older record becomes the current weight while the four-week chart remains unchanged.

## Data model

Use three independent synchronized keys so routine edits do not rewrite unrelated feature data.

### `wellness_food_records`

```js
[
  {
    id: "food_<stable-id>",
    date: "2026-08-24",
    name: "Greek yogurt",
    calories: 160,
    proteinGrams: 18,
    createdAt: 1787544000000,
    updatedAt: 1787544000000
  }
]
```

### `wellness_saved_foods`

```js
[
  {
    id: "saved_food_<stable-id>",
    name: "Greek yogurt",
    calories: 160,
    proteinGrams: 18,
    createdAt: 1787544000000
  }
]
```

### `wellness_weight_records`

```js
{
  "2026-08-24": {
    weightKg: 78.4,
    createdAt: 1787544000000,
    updatedAt: 1787544000000
  }
}
```

### Data rules

- Local dates must use existing local-date utilities; do not derive keys with `Date#toISOString()`.
- IDs must be stable and collision-resistant within the local dataset.
- Normalization functions must tolerate malformed synchronized values and return safe canonical structures.
- Unknown properties may be ignored, but malformed entries must not crash rendering or contaminate totals.
- Numeric values are stored as numbers, never formatted strings.
- Weight is keyed by date so the one-entry-per-day rule is structural and replacement is atomic within the synchronized value.
- Food records are independent snapshots. Deleting or changing a saved food never changes historical records.
- No migration is required because all three keys are new.

## Synchronization and conflict behavior

- Use `useSyncedStorage` for all three keys, retaining local-first rendering and Firestore synchronization.
- Follow the hook's existing whole-value, last-write-wins behavior; version one does not introduce per-record Firestore documents or conflict resolution.
- UI updates are optimistic and should remain usable offline.
- Do not claim a remote save has completed when only local state has changed.
- Cross-tab updates must recalculate the selected day's totals, weight metrics, chart, and lists without remounting.

## Responsive layout

- On wide desktop viewports, show nutrition and weight side by side in a slightly nutrition-weighted two-column layout.
- Stack nutrition above weight when the available viewport is too narrow for both trackers to remain readable.
- Within each desktop tracker column, use compact rows or wrapping controls to improve information density without horizontal scrolling.
- On mobile, stack form controls and actions in a logical label/input/action order.
- Date navigation must fit without causing body-level horizontal scrolling.
- The chart must scale to its container and remain readable at 320 CSS pixels wide.
- Record rows may wrap metadata below names/dates, but Edit and Delete must remain discoverable.
- Interactive touch targets should be at least 44 by 44 CSS pixels where practical.
- Account for the existing fixed mobile bottom navigation and safe-area padding.

## Visual design

- Match the dashboard's existing theme tokens, glass surfaces, borders, spacing, radii, and dark-first visual language.
- Support every configured dashboard theme; do not introduce fixed page-specific colors that fail in alternate themes.
- Use restrained visual hierarchy: section title, controls/totals, record list, then the next tracker.
- Use tabular numerals for calorie, protein, and weight values.
- Do not communicate weight movement with positive/negative color semantics.
- Avoid decorative gauges, rings, gradients, or illustrations that imply goals.
- Respect reduced-motion preferences; no information may depend on animation.

## Accessibility

- Every input has a persistent programmatic label and associated validation message.
- Previous/next date controls expose the destination date in their accessible name where practical.
- Food and weight rows use semantic lists or tables with clear labels.
- Edit, Delete, Add, Update, saved-food selection, and confirmations are fully keyboard operable.
- Shared dialogs must trap focus, close safely, and restore focus to the invoking control.
- Success and deletion feedback uses the existing polite toast region without moving focus.
- The chart includes an accessible name and textual data representation. Each visible point must be keyboard-focusable or equivalently represented in an adjacent screen-reader-accessible list.
- Chart meaning must not depend on color, hover, or pointer precision.
- Focus indicators must remain visible against every supported theme.

## Empty, loading, and error states

- A nutrition day with no records explains that food can be added manually or from saved foods.
- No saved foods explains how to create one from manual entry.
- No weight history invites the user to record a first weight.
- Weight history outside the visible window may still produce a current-weight metric, while the chart clearly states that no entries exist in the last four weeks.
- Invalid synchronized records are ignored safely rather than displayed as `NaN`, `undefined`, or broken SVG geometry.
- Preserve local edits if synchronization is unavailable; follow existing app conventions for non-blocking failures.
- Lazy loading uses the App Shell's existing shared loading state.

## Domain logic

Create a dedicated domain module, such as `src/domain/wellness.js`, containing pure functions for:

- Normalizing food records, saved foods, and weight records.
- Validating and normalizing food names and nutrition values.
- Detecting exact saved-food duplicates.
- Filtering and sorting food records by local date.
- Calculating daily calorie and protein totals.
- Validating and rounding kilograms.
- Upserting the single weight record for a date.
- Selecting current weight.
- Building the 28-day visible weight series.
- Calculating visible-period change.
- Producing safe chart bounds and point coordinates.

Keep calculations outside the React component so edge cases are deterministic and directly testable.

## Component structure

The implementation may adjust exact boundaries, but should favor small components along these lines:

```text
Wellness
├── NutritionTracker
│   ├── DateNavigator
│   ├── DailyNutritionTotals
│   ├── ManualFoodForm
│   ├── SavedFoodControl
│   └── FoodRecordList
└── WeightTracker
    ├── WeightForm
    ├── WeightMetrics
    ├── WeightChart
    └── WeightRecordList
```

Use the shared `Button`, `Dialog`, toast, empty-state, and theme primitives instead of duplicating them.

## Testing requirements

### Domain tests

- Food normalization rejects malformed collections and entries safely.
- Daily totals include only the requested local date and sum zero values correctly.
- Nutrition validation handles blank, fractional, negative, non-numeric, and boundary values.
- Exact saved-food duplicate detection uses normalized name plus nutrition values.
- Deleting a saved food does not affect logged food snapshots.
- Weight upsert replaces the same date and preserves other dates.
- Weight rounding accepts one decimal place and rejects invalid ranges.
- Current weight selects the latest non-future record, including one outside the chart window.
- Four-week filtering handles month/year boundaries and includes both endpoints.
- Visible-period change uses the earliest and latest visible records, not object insertion order.
- Chart coordinates remain finite for zero, one, identical, sparse, and boundary datasets.

### Component tests

- Wellness is reachable from primary navigation and receives focus through the existing view handoff.
- Nutrition opens on today and cannot navigate into the future.
- Switching dates changes displayed totals and entries without mutating records.
- Manual and saved-food add flows create the expected records.
- Saved-food values are read-only during the saved-food add flow.
- Food edits and confirmed deletions update totals; cancellation changes nothing.
- Same-day weight submission updates rather than duplicates.
- Chart and metrics update after weight add, edit, replace, and delete.
- Empty states render for no food, no saved foods, and no visible weights.
- Dialogs restore focus and all actions work from the keyboard.
- Alternate themes and narrow viewports do not hide required controls.

### Test isolation

- Mock `useSyncedStorage` or the Firestore boundary in component tests.
- Use deterministic clocks and local dates; test at least one month boundary and one year boundary.
- Do not connect automated tests to any remote Firebase project.

## Acceptance criteria

The feature is complete when all of the following are true:

1. **Wellness** appears as a responsive top-level dashboard destination and opens without disrupting existing views.
2. Nutrition is first and weight is underneath, with no tabs or separate top summary-card row.
3. The nutrition tracker opens on today and supports previous, next, and direct non-future date selection.
4. A user can add a valid food name, whole calories, and whole protein grams manually.
5. A user can optionally save a manual food as a reusable exact template.
6. A user can add an unmodified saved food from a simple dropdown and delete saved templates safely.
7. The selected day's calorie and protein totals update immediately after every food mutation.
8. Food records for the selected date can be edited and deleted with validation and confirmation.
9. A user can add or update one kilogram weight per local date; a repeated date never produces two effective records.
10. The weight section shows the current weight and four-week change without qualitative trend language.
11. The line chart plots the last 28 local dates, connects recorded points across missing days, and behaves safely with zero, one, or identical values.
12. Weight records can be edited and deleted, and every dependent metric/chart updates immediately.
13. No goals, meal categories, quantity fields, external food lookup, pounds, Today-page summary, or trend indicator appears.
14. The feature remains usable with keyboard, screen reader, touch, alternate themes, offline-local state, and a 320px-wide viewport.
15. Automated tests pass without accessing production or any remote Firebase database.

## Implementation sequence

1. Add pure Wellness domain types, normalization, validation, totals, and weight-series calculations with unit tests.
2. Build the Nutrition tracker and its component tests using mocked synchronized storage.
3. Build the Weight tracker, accessible SVG chart, management list, and component tests.
4. Add the Wellness view, navigation item/icon, full-width layout treatment, and focus/loading integration.
5. Complete responsive, alternate-theme, keyboard, screen-reader, and reduced-motion verification.
6. Run the full existing test suite and production build in a non-production environment.
