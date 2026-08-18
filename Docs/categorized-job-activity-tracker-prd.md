# Product Requirements Document: Categorized Job Activity Tracker

## Status

Proposed version-one requirements for the approved **Categorized Job Activity Tracker**. This document is implementation-ready, but it does not authorize deployment, production-database access, or changes to production data.

Amendment: `overview-command-palette-typed-job-logging-prd.md` supersedes every statement below that describes Overview or command-palette quick entries as Uncategorized, unchanged, or lacking a type chooser. The dedicated Job Applications page requirements remain unchanged.

## Summary

Rebuild the dedicated **Job Applications** page as a wider dashboard that keeps the existing count-based workflow while adding four fixed application categories and two independent outreach counters.

Applications are tracked as daily quantities rather than individual company or role records. The four application types are **Software Engineering**, **AI Applications**, **Backend**, and **Data**. Outreach is tracked through the independent daily counters **Emails** and **LinkedIn**. Every control uses the existing direct `+`/`−` interaction, and a count can never fall below zero.

The existing Overview presentation, existing aggregate statistics, general job-search note, and simple date/count history remain recognizable and are not redesigned. Existing application counts are interpreted as **Uncategorized** for compatibility, included in aggregate totals, and hidden from the four-category breakdown. No migration confirmation is required.

## Production data safety — mandatory

The production/current Firebase database must not be read, written, migrated, seeded, copied, inspected, or otherwise used during implementation or testing. This prohibition applies to automated tests, local development, manual QA, debugging, screenshots, demos, and one-off scripts.

- Unit and component tests must use in-memory fixtures and mocked storage/synchronization boundaries.
- Any integration or manual sync testing must use the Firebase Local Emulator Suite or a dedicated test Firebase project containing synthetic data only.
- Development and test builds must fail closed if they are configured with the production Firebase project ID or production credentials.
- Test configuration must be visibly distinguishable from production configuration. Test data must use synthetic records and must not be copied from production.
- No implementation task may perform an eager migration or bulk rewrite against any remote database.
- Deployment and any first use against production require the user's separate, explicit authorization after implementation has been reviewed and verified in the test environment.

The data model in this document describes the compatibility contract the client will use after an explicitly authorized release. It does not authorize touching the current database while building the feature.

## Problem

The current tracker records only one application total for each date. That preserves a useful measure of overall effort but cannot answer how the application mix is distributed among Software Engineering, AI Applications, Backend, and Data roles. It also omits two important job-search activities: emails sent and LinkedIn messages.

The dedicated `JobTracker.jsx` and `JobTracker.module.css` files are currently deleted in the working tree, while `App.jsx` still lazy-loads the Job Applications view and Overview still reads and updates `job_applications`. The dedicated page therefore needs to be rebuilt without disrupting Overview or existing saved counts.

## Goals

- Rebuild a functional dedicated Job Applications page using the existing dark visual language.
- Preserve fast daily quantity tracking rather than introducing individual job records.
- Track four fixed, mutually exclusive application types per date.
- Track Emails and LinkedIn as independent, uncategorized daily quantities.
- Let users browse and edit today, past dates, and future dates with identical behavior.
- Keep the existing global application summary periods, notes field, and simple history presentation.
- Include categorized applications in the unchanged Overview totals.
- Interpret existing aggregate counts safely as Uncategorized without an eager data rewrite.
- Preserve compatibility with Overview and command-palette logging flows. Their quick-entry behavior is superseded by `overview-command-palette-typed-job-logging-prd.md`.
- Maintain local-first behavior and synchronized storage after an explicitly authorized release.

## Non-goals

Version one does not include:

- Individual applications with company, position, URL, contact, salary, location, or freeform metadata.
- Application stages or outcomes such as replies, screenings, interviews, offers, rejections, or withdrawals.
- Multiple categories on one application count, secondary categories, editable categories, or an Other category.
- Categorizing Emails or LinkedIn activity by job type.
- Distinguishing LinkedIn connection requests, replies, or follow-ups. LinkedIn means messages sent.
- Distinguishing cold emails, recruiter replies, follow-ups, or thank-you emails. Emails means any job-search email sent.
- Linking an Email or LinkedIn count to a particular application.
- Goals, quotas, planned-versus-completed state, reminders, streaks, conversion rates, funnels, or recommendations.
- A history redesign, calendar view, new chart, new time-period calculation, export, or reporting system.
- Changes to the Overview layout, controls, labels, card order, or visual design, except as superseded by `overview-command-palette-typed-job-logging-prd.md`.
- Changes to the command-palette interface or a category picker in that flow, except as superseded by `overview-command-palette-typed-job-logging-prd.md`.
- Direct numeric entry, confirmations, toasts, or Undo for counter changes.
- Authentication, Firestore rules, routing, backend services, or database administration.

## Existing system context

The application is a React 18/Vite client-side application. Persisted values use `useSyncedStorage`, which caches data in `localStorage` and synchronizes whole values to Cloud Firestore with last-write-wins behavior. Dates use local `YYYY-MM-DD` keys through `src/utils/date.js`.

Current job data uses:

| Key | Current shape | Current consumers |
|---|---|---|
| `job_applications` | `[{ date: 'YYYY-MM-DD', count: number }]` | Overview, former Job Applications page, command-palette/provider code |
| `job_note` | freeform string | Former Job Applications page |

The former dedicated page selected today on mount, allowed a date to be selected, showed `+`/`−` controls, displayed this-week/this-month/all-time application counts, retained one global notes textarea, and listed other dates in descending order as date plus application count.

Overview reads `job_applications`, calculates today's and weekly totals, displays a seven-day sparkline, and exposes `+`/`−` controls for today. Its visual and information design must remain unchanged.

## Terminology

| Term | Definition |
|---|---|
| **Activity date** | The local `YYYY-MM-DD` date selected on the Job Applications page. |
| **Categorized application** | One application quantity assigned to exactly one of the four fixed job types. |
| **Categorized total** | The sum of Software Engineering, AI Applications, Backend, and Data for one date. |
| **Uncategorized** | The portion of a date's aggregate application count that is not represented by the four categorized counts. Existing records and logs from unchanged quick-entry surfaces fall into this portion. |
| **Overall application count** | Categorized total plus Uncategorized for a date. This is the value used by Overview, aggregate statistics, and History. |
| **Outreach** | The independent Emails and LinkedIn daily counts. Outreach is not part of the application total. |

## Approved product decisions

- Dedicated page: rebuild it and keep a compact Overview summary.
- Record granularity: daily quantities, not individual applications.
- Application categories: exactly four fixed types in this order: Software Engineering, AI Applications, Backend, Data.
- Classification: each categorized quantity belongs to exactly one type.
- Outreach: simple independent daily counters, with no application links and no job-type categories.
- Emails: count any job-search email sent.
- LinkedIn: count messages sent only.
- Existing data: treat as Uncategorized automatically.
- Logging: separate `+`/`−` controls; no direct number field.
- Decrement: immediate and clamped at zero; no confirmation, Undo, or toast.
- Dates: past, present, and future behave identically. Future entries are not a separate plan or target state and are included in existing aggregate calculations immediately.
- Initial date: always local today when the page mounts.
- Week start: Monday.
- Overview: no presentation redesign; its totals include all categorized and Uncategorized applications.
- Overview quick controls: superseded by `overview-command-palette-typed-job-logging-prd.md`; new quick entries require one of the four fixed types.
- Command palette: superseded by `overview-command-palette-typed-job-logging-prd.md`; new quick entries require one of the four fixed types.
- Notes: retain the existing single global notes field unchanged.
- History: retain the existing date plus overall application-count presentation.
- Empty dates: remove a date only when every application category, Uncategorized, Emails, and LinkedIn is zero.
- Styling: continue the existing green accent rather than assigning colors to job types.
- Desktop shape: a wide dashboard with summary across the top, full-width logging, and Notes and History below.
- Mobile priority: summary statistics appear first.

## Information architecture

The top-level destination remains **Job Applications** and retains the existing `jobs` view ID. The view becomes a full-width dashboard rather than a narrow centered card.

Reading order:

1. Page heading and selected-date control.
2. Existing application summary: this week, this month, and all time.
3. Full-width logging area.
   - **Applications** section with the four fixed job-type counters.
   - **Outreach** section with Emails and LinkedIn counters.
4. Existing global Notes area.
5. Existing History list.

On wide screens, the application counters use a balanced two-by-two grid. At widths where four compact controls fit without crowding labels or targets, the implementation may use a four-column row. Emails and LinkedIn appear side by side. Notes and History may share a two-column lower region when space permits, but their DOM/reading order remains Notes then History.

On narrow screens, the page is a single column in the same semantic order: summary, date/logging, Notes, History. Application counters use a two-column grid, falling back to full-width rows on very small screens. Outreach uses two columns where touch targets and labels fit, otherwise two full-width rows. The page must never require body-level horizontal scrolling.

## Detailed behavior

### Opening and choosing a date

- The selected activity date initializes to local today every time the Job Applications view mounts.
- Use a native date input backed by existing local-date helpers. Do not use `Date#toISOString()` to derive a calendar key.
- Do not set a maximum date. Past, today, and future dates are all selectable.
- Changing the selected date is read-only by itself and must not create a stored record.
- Future dates have the same labels, controls, styling, storage, totals, and editability as today and past dates. Do not show Planned, Target, or Future badges.

### Application logging

- Present one counter for each fixed application type in this order:
  1. Software Engineering
  2. AI Applications
  3. Backend
  4. Data
- Each counter shows its selected-date value and provides semantic Decrease and Increase buttons.
- Increase adds exactly one to that category and exactly one to the date's overall application count.
- Decrease subtracts exactly one from that category and the overall application count. It is disabled at zero and can never make either value negative.
- The categorized total is derived from the four category values; it is never independently editable.
- Uncategorized is not shown as a fifth counter and cannot be changed from the dedicated page.
- Existing Uncategorized values remain included in Overview, History, and current aggregate statistics but are omitted from the four-category breakdown.
- Do not invent a category when a categorized field is missing or invalid; normalize it to zero in memory.

### Outreach logging

- Show an **Outreach** section below the application controls.
- Show two independent counters labelled **Emails** and **LinkedIn**.
- Increase/decrease changes only the selected outreach value by one and clamps it at zero.
- Outreach does not change application category values, categorized totals, the overall application count, Overview, the existing application summary, or the numeric value shown in History.
- All outreach counters remain editable for past, present, and future dates.

### Overview integration

- Preserve the Overview card's current layout, labels, total metrics, sparkline, and `+`/`−` controls.
- Its displayed application count is the date's overall application count, so categorized applications appear automatically without a new category UI.
- Superseded by `overview-command-palette-typed-job-logging-prd.md`: Overview Increase and Decrease adjust the selected fixed type for local today while preserving legacy Uncategorized and outreach values.
- Overview does not show Emails or LinkedIn in version one.

### Command-palette compatibility

- Superseded by `overview-command-palette-typed-job-logging-prd.md`: the command palette exposes a four-type chooser and writes the selected category while preserving legacy Uncategorized and outreach values.
- Search/navigation behavior remains unchanged.

### Summary statistics

- Retain the former dedicated page's this-week, this-month, and all-time application summary presentation and calculations.
- These are overall application totals and therefore include both categorized and Uncategorized applications.
- Outreach does not appear in these summary statistics.
- Do not add selected-date, trailing-seven-day, trailing-thirty-day, planned, outreach, or category-specific summary metrics.
- Future-dated application values participate immediately in the existing calculations. Version one deliberately does not introduce planned-versus-completed filtering or change the current period logic.

### Notes

- Retain one synchronized `job_note` freeform string and the existing textarea behavior.
- Notes are global, not associated with the selected date, job category, or outreach activity.
- Preserve the existing placeholder and implicit save/sync behavior where practical.
- Do not make Notes collapsible and do not create per-date notes.

### History

- Preserve the former History interaction and visual intent; a broader history redesign is deferred.
- Sort stored date records in descending date order and omit the currently selected date, matching the former page.
- Each row shows only formatted date and overall application count.
- Do not show category breakdowns, Emails, LinkedIn, charts, expansions, or filters in History.
- A retained record containing outreach but zero applications appears with application count `0`; this follows the approved unchanged History contract.
- Remove a date record only when overall application count, all four categories, Emails, and LinkedIn are all zero. A date with any outreach or application value must remain stored.

## Data model and compatibility

### Extended `job_applications` record

Continue using the existing `job_applications` synchronized key. Extend a dated record without requiring an eager migration:

```js
{
  date: '2026-08-14',
  count: 7,
  categories: {
    softwareEngineering: 2,
    aiApplications: 1,
    backend: 2,
    data: 1,
  },
  emails: 3,
  linkedin: 2,
}
```

The compatibility equations are:

```js
categorizedTotal =
  softwareEngineering + aiApplications + backend + data

overallApplicationCount = max(normalizedCount, categorizedTotal)

uncategorized = max(0, overallApplicationCount - categorizedTotal)
```

Rules:

- A legacy `{ date, count }` record is valid. Missing categories, Emails, and LinkedIn normalize to zero in memory, so its entire `count` is Uncategorized.
- Automatic migration means compatible interpretation on read, not an eager database rewrite. Merely opening the page must not write, reshape, sort, or delete records.
- Write enhanced fields only when the user explicitly changes that date through an authorized app environment.
- `count` remains the aggregate compatibility field consumed by existing surfaces. A categorized increment/decrement updates both the category and `count` atomically within the same local state update.
- As amended by `overview-command-palette-typed-job-logging-prd.md`, Overview and command-palette quick entries use categorized adjustments that preserve existing Uncategorized quantities and enhanced fields.
- If malformed data contains `count < categorizedTotal`, use `categorizedTotal` as the safe in-memory overall count and repair only when the user explicitly edits that record. Never discard valid category quantities to fit a malformed aggregate.
- Normalize counts to finite, non-negative integers. Invalid/missing values become zero in memory. Do not persist normalization solely because data was read.
- Preserve unknown object fields when updating a record so compatible future metadata is not silently lost.
- Keep at most one logical record per date. Pure normalization helpers may merge duplicate fixture records deterministically for display, but implementation must not run a production cleanup or bulk rewrite.
- Date arithmetic and comparisons use local calendar helpers from `src/utils/date.js`.

No new synchronized key is required. `job_note` remains unchanged.

## State-update invariants

All write helpers must maintain these invariants in one setter callback using the latest available state:

1. All six visible counters are non-negative integers.
2. `count >= categorizedTotal` after an explicit edit.
3. Categorized changes adjust `count` by the same delta.
4. Outreach changes never adjust `count` or category values.
5. Uncategorized changes adjust only `count` and never reduce it below `categorizedTotal`.
6. Existing enhanced and unknown fields survive unrelated updates.
7. A record is removed only when every application and outreach value is zero.
8. Navigating to or rendering a date never creates or modifies a record.

Extract these rules into pure domain helpers rather than duplicating arithmetic in Job Applications, Overview, and command-palette code.

## Visual and interaction requirements

- Retain the dashboard's dark glass styling and existing green accent for application types and outreach; do not introduce per-category colors.
- Use clear section headings so application categories and outreach are not confused.
- Buttons are at least 44 by 44 CSS pixels on touch layouts and retain visible focus treatment.
- Every Increase/Decrease button has a contextual accessible name, for example `Increase Backend applications for Friday, August 14, 2026`.
- Disabled zero-value Decrease controls use native `disabled` semantics.
- Counter changes are optimistic and visually evident from the changed value. Do not show a confirmation toast, modal, or Undo action.
- The summary remains first on mobile, followed by the logging surface.
- Use semantic headings, landmarks, and list markup. Do not communicate category or control state through color alone.
- Respect reduced-motion preferences and existing focus conventions.
- Loading, sync, and error behavior should reuse existing shared states rather than falsely claiming remote persistence.

## Implementation boundaries

Expected implementation areas after separate approval include:

- Recreate `src/components/JobTracker.jsx` and `src/components/JobTracker.module.css` as the wide responsive page.
- Add pure job-activity normalization and update helpers under `src/domain/` with focused unit tests.
- Update `src/App.jsx` so `jobs` uses the full-width view container.
- Update Overview calculations and typed controls to use the shared overall/category helpers while retaining the card's aggregate presentation.
- Preserve enhanced record fields in any command-palette/provider job mutation.
- Update relevant documentation only after behavior is implemented and verified.

Avoid a broad rewrite of `useSyncedStorage`, Firebase initialization, application navigation, Overview, the command palette, or unrelated feature code.

## Test strategy

### Mandatory environment isolation

- Unit/component tests: mock `useSyncedStorage` and Firebase modules; use only deterministic in-memory fixtures.
- Integration tests: use Firebase Emulator Suite by default. A dedicated test Firebase project is acceptable only when explicitly configured for testing and populated solely with synthetic data.
- Add an environment guard used by integration/manual test setup that refuses to start when the configured project ID matches production or is not explicitly identified as a test project/emulator.
- Never fall back from a missing emulator/test configuration to the normal Firebase configuration.
- Never run automated cleanup, migration, or seed scripts against production.
- Record the test project/emulator setup in implementation documentation without recording secrets.

### Domain tests

Cover at minimum:

- Reading a legacy `{ date, count }` record as entirely Uncategorized without mutating the fixture.
- Normalizing missing, negative, fractional, non-numeric, and malformed fields.
- Computing categorized, Uncategorized, and overall totals.
- Incrementing and decrementing each category while keeping `count` synchronized.
- Preventing category and Uncategorized decrements below zero.
- Incrementing/decrementing Emails and LinkedIn without changing application totals.
- Preserving unknown fields through all mutations.
- Removing a record only when every application and outreach quantity is zero.
- Retaining a zero-application record when outreach remains.
- Handling malformed `count < categorizedTotal` safely.
- Treating past, present, and future date keys identically.

### Component and integration tests

Cover at minimum:

- Today is selected on mount and date navigation does not create records.
- Four application controls render in the approved order.
- Emails and LinkedIn render as independent outreach controls.
- Past and future dates expose the same editable controls as today.
- Summary statistics remain application-only and include Uncategorized.
- Notes remain global and synchronized through the mocked/test boundary.
- History remains date plus overall count and excludes the selected date.
- Overview retains its aggregate presentation, includes Uncategorized totals, and modifies only the selected category.
- Overview Decrease cannot borrow from another category or reduce Uncategorized.
- Command-palette typed logging preserves enhanced fields and existing Uncategorized quantities.
- Keyboard operation, accessible names, focus visibility, and disabled semantics.
- Responsive layouts at wide desktop, tablet, 480–767px, and below 480px without horizontal page overflow.

### Manual QA

Using synthetic data in the emulator or dedicated test project only:

- Seed legacy records and verify they appear in totals/history but not category breakdowns.
- Edit each category and outreach counter across past, today, and future dates.
- Verify a future application affects the unchanged statistics immediately.
- Verify Overview counts categorized applications while its visual presentation remains unchanged.
- Verify cross-device-style replacement behavior using two test clients against the test environment.
- Verify reload/local cache behavior, offline queuing, and recovery without contacting production.
- Verify the global Notes field and a date containing outreach but zero applications.

## Acceptance criteria

1. The Job Applications destination loads a rebuilt, responsive, full-width page.
2. The page tracks Software Engineering, AI Applications, Backend, and Data quantities independently for every selected date.
3. The page tracks independent Emails and LinkedIn quantities for every selected date.
4. All counters use direct `+`/`−` controls, stop at zero, and remain editable for past, present, and future dates.
5. Existing counts are interpreted as Uncategorized without an eager migration or render-time write.
6. Uncategorized is included in aggregate statistics, Overview, and History but is not shown as a dedicated page counter.
7. Categorized changes update the aggregate compatibility count; outreach changes do not.
8. As amended, Overview retains its aggregate presentation, includes all applications, and changes only the selected fixed type through its quick controls.
9. As amended, the command palette offers a fixed type chooser and preserves enhanced fields and existing Uncategorized quantities when logging.
10. Existing this-week, this-month, all-time, Notes, and History behavior remains recognizable and is not expanded into a new analytics system.
11. Dates are removed only when all application and outreach values are zero.
12. The page is keyboard accessible, screen-reader meaningful, touch-safe, and usable without horizontal page scrolling.
13. Automated and manual verification passes using mocks, the Firebase emulator, or a dedicated synthetic test project only.
14. No production/current Firebase database read, write, migration, seed, inspection, or test occurs without the user's later explicit authorization.

## Deferred ideas

- Individual company/role application records and richer metadata.
- Editable categories, Other, multi-category tagging, or secondary types.
- Application outcomes and funnel/conversion analytics.
- Weekly goals, planned-versus-completed tracking, streaks, and reminders.
- Outreach subtypes and links to applications or contacts.
- Category/outreach history breakdowns, charts, calendar views, and filters.
- Direct numeric entry, bulk edits, Undo, and import/export.

## Release gate

Implementation completion does not authorize production deployment or production data access. Before release, the user must explicitly approve both:

1. deploying the implementation; and
2. allowing the deployed client to use the current production database under its normal application behavior.

Until both approvals are given, all development, test, demonstration, and verification activity remains isolated to mocks, an emulator, or a dedicated synthetic test Firebase project.
