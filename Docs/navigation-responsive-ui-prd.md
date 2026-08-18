# Product Requirements Document: Navigation and Responsive UI Upgrade

## Status

Proposed v1 specification for the approved **Navigation and Responsive UI Upgrade**. This document is implementation-ready but does not change the product’s data model or introduce authentication, settings, PWA, AI, or command-palette functionality.

## Summary

Modernize the Dashboard shell so navigation is always easy to find and every current view works deliberately from a phone through a large desktop. Desktop gains a compact persistent navigation rail; phones gain a fixed bottom navigation bar. The existing dark glass visual identity remains.

The primary feature-specific change is a focused mobile To-Do experience: one selected day at a time, with an explicit week/day control and touch-safe task movement. Desktop remains the seven-day board and preserves its current task, recurring-task, folder, and drag-and-drop behavior. Job Applications, task data/behavior, and Habits are not redesigned; they receive only the presentation and interaction adaptations necessary for responsive, accessible use.

## Problem

The current application has six state-based views, but navigation is hidden inside the TopBar hamburger at every viewport. The content shell is desktop-oriented: the To-Do board becomes a 980px horizontally scrolling grid below 900px, Brain Dump retains a narrow permanent sidebar, Day Planner relies on mouse events, and many controls are too small or hover-only for a touch device. Feedback patterns also vary: some destructive actions use `window.confirm`, most saves are implicit, view loading is only text, and empty/error states are not standardized.

This creates three related issues:

- Navigation is undiscoverable and costly to reach frequently.
- Small-screen users must scroll or manipulate desktop interaction patterns instead of completing everyday actions directly.
- Keyboard, screen-reader, reduced-motion, contrast, focus, and feedback behavior are inconsistent across the app.

## Goals

- Make all six existing views continuously reachable on desktop/tablet and one tap away on mobile.
- Preserve the existing dark visual language, data storage keys, task semantics, Job Applications behavior, and Habit Tracker behavior.
- Preserve the desktop To-Do seven-day board and desktop native drag-and-drop behavior.
- Make mobile To-Do a fast, focused single-day experience with an intentional way to choose a day or a different week.
- Replace touch-hostile dependencies on native HTML drag and drop with explicit, accessible move/reorder alternatives.
- Standardize reusable buttons, dialogs, toast/live feedback, loading states, empty states, and destructive confirmations.
- Meet WCAG 2.2 AA expectations for keyboard access, focus, semantics, contrast, touch target size, reduced motion, and screen-reader announcements.
- Keep the changes front-end only and compatible with the present lazy-loaded, state-based App architecture.

## Non-goals

V1 does not include:

- New or user-selectable themes, appearance settings, personalization, or a light mode.
- Authentication changes, account management, password-gate redesign, or Firestore rules changes.
- PWA installation, offline feature work, notifications, AI, routing/deep links, or a backend.
- Changes to Job Applications calculations/data, To-Do data/semantics, recurrence rules, folders, or Habit Tracker data/streak logic.
- A redesign of the six-view information architecture or new views.
- A new desktop task-management workflow that replaces mouse drag-and-drop.
- Command Palette behavior. A separate PRD owns Cmd/Ctrl+K; this feature only reserves that shortcut and provides compatible navigation landmarks.

## Existing-system context and constraints

`src/App.jsx` owns the active-view state and renders the six lazy-loaded views without a router. `TopBar` currently carries date, clock, menu navigation, and Lock. The app body is a fixed-height shell with an independently scrolling `.content` region. Persisted data is localStorage plus debounced Firestore synchronization through `useSyncedStorage`; the remote document replaces the full value for each existing storage key.

| Existing view | Current responsive/interaction concern |
|---|---|
| Today / current Overview | Has a JavaScript `max-width: 1024px` layout switch and CSS column fallback; the approved Today Command Center will replace its primary card order, while this PRD owns responsive shell, targets, and focus behavior. |
| To-Do | Seven columns deliberately need desktop width; below 900px the board is horizontally scrollable and uses native HTML DnD. |
| Brain Dump | Fixed 210px note sidebar becomes 160px below 640px, leaving too little editor space on phones. |
| Job Applications | Centered single card, but count/date controls and history need target-size and flow adjustments. |
| Habit Tracker | Interactive seven-day dots and delete controls are visually/physically too small and delete is hover-revealed. |
| Day Planner | Mouse-only drag/resize, fixed side edit panel, and a timeline with a `100vh`-derived height are not phone-safe. |

The password gate must remain the first screen. Its successful-unlock and Lock behavior stay unchanged; this feature only makes its spacing, focus treatment, error announcement, and motion responsive/accessibility-safe.

## Product scope and v1 decisions

### Resolved defaults

- **Desktop navigation:** show an expanded persistent left rail at `>= 1200px`; do not hide view navigation in a menu.
- **Tablet navigation:** show a persistent compact icon rail from `768px` through `1199px`, with accessible text labels available to screen readers and visible tooltips on focus/hover. The page header remains visible.
- **Mobile navigation:** show all six destinations in a fixed bottom bar below `768px`. Each item has an icon and short visible label. Lock moves to the header overflow menu; it is not a seventh bottom-nav item.
- **Mobile To-Do default:** open the current local day within the current Monday–Sunday week. This is presentational local UI state only and resets to Today when the To-Do view remounts.
- **Mobile week switching:** the header displays a horizontally scrollable, one-week day strip. Previous/Next week buttons replace the selected week; tapping a day selects it. A Today button returns both the week and selected day to today.
- **Mobile task placement/reordering:** expose a `More` action for each movable item. It opens a bottom sheet with explicit destinations and, where valid, Move up/Move down controls. Do not attempt native HTML DnD on touch.
- **Mobile Day Planner:** tap an empty time row to create/select a block and tap a block to edit it in a bottom sheet. Start/end selects are the v1 touch alternative to drag/resize. Desktop pointer drag/resize remains.
- **Destructive actions:** use the shared accessible confirmation dialog for deleting a note/folder/habit/block, clearing a note/day, archiving a recurring series, and equivalent irreversible operations. Confirmation copy must name the affected item and impact.
- **Feedback:** operations apply optimistically through the existing state setters. A non-blocking toast announces completed, moved, deleted, archived, or locally queued changes; a live persistence indicator communicates local/offline/sync failure rather than falsely claiming remote save success.

### Later ideas (explicitly not v1)

- A user choice to collapse/expand the desktop rail, persisted navigation preferences, or theme settings.
- URL routing and per-view/per-day deep links.
- Gesture drag-and-drop, haptic feedback, undo history, batch selection, and configurable bottom-nav items.
- Replacing the To-Do day strip with a calendar picker or creating a multi-day mobile board.
- A universal command palette, its results, or its keyboard model.

## Viewport and device strategy

Use CSS media queries as the source of layout truth. JavaScript may use `matchMedia` only where markup must materially differ (mobile To-Do day view, Day Planner editor surface, or navigation structure); it must subscribe/unsubscribe safely and agree with the CSS token values below. Avoid branching based on user-agent, device name, or `window.innerWidth` outside a reusable viewport hook.

| Range | Intent | Shell behavior |
|---|---|---|
| `>= 1200px` (desktop) | Multiple-column work and pointer use | Expanded 216px navigation rail, full header, desktop view layouts. |
| `768px–1199px` (tablet/small laptop) | Dense but visible navigation | 64px compact rail, full header with adaptive date/clock, responsive content widths. |
| `480px–767px` (large phone) | One-handed portrait/landscape use | Header plus 72px safe-area-aware bottom navigation; no persistent side rail. |
| `< 480px` (small phone) | Minimum viable single-column interface | Same mobile navigation with reduced horizontal padding/type scale; never require horizontal page scrolling. |

Support landscape phones: retain bottom navigation, make the content area scrollable, and allow the mobile To-Do day strip to scroll horizontally rather than compressing targets below minimum size.

## Navigation information architecture

### Destinations and order

The navigation order is fixed in v1 and uses the existing view IDs:

1. Today (`overview`; retain `Overview` as an alias)
2. To-Do (`todo`)
3. Brain Dump (`braindump`)
4. Job Applications (`jobs`)
5. Habits (`habits`)
6. Day Planner (`dayplanner`)

The active destination is visually distinct, has `aria-current="page"`, and remains reachable by keyboard. Icons supplement—not replace—labels. Preserve the current icons/labels where practical; use the full **Job Applications** label in expanded navigation and **Jobs** only where space requires a short label.

### Desktop and tablet

- Add an app shell containing `<nav aria-label="Primary">`, the header, and `<main id="main-content" tabindex="-1">`.
- The expanded desktop rail contains the Dashboard mark, all six labeled nav buttons, and a bottom-aligned Lock action. It remains fixed while only main content scrolls.
- The compact tablet rail contains the same buttons at a minimum 44px by 44px target. Give each an accessible name and tooltip that appears on hover and keyboard focus. It must not become a hamburger menu.
- Selecting a view calls the existing `onChange(viewId)`, closes any transient panel, moves programmatic focus to `#main-content`/the view heading, and preserves the existing lazy load behavior.
- The header keeps current day/date and clock. At tablet widths, the full date may shorten (for example, `Mon, Aug 10`) before the clock is hidden; the date-to-Today control remains a labelled button. The current hamburger is removed from desktop/tablet once rail navigation exists.

### Mobile

- Keep a compact top header with current weekday/date and an overflow button. The overflow contains Lock only in v1; it is a real menu button with Escape/outside-click/focus-return behavior.
- Render a fixed `<nav aria-label="Primary">` bottom bar with six equally distributed buttons. It has a solid/translucent dark surface, top border, backdrop support where available, and `padding-bottom: env(safe-area-inset-bottom)`.
- Bottom-nav items are at least 48px high, retain their label, and show the active state through more than color (filled container/indicator plus `aria-current`). Labels may be 10–11px but are never visually hidden.
- Add bottom padding to the scrollable content equal to the bar height plus safe area, so actions and fields are never obscured. On iOS keyboard appearance, content remains scrollable and focused controls are scrolled above the keyboard.
- Do not introduce a mobile drawer. Direct bottom navigation is the primary route to every view.

### Command Palette coexistence

The navigation layer must not bind, prevent default for, or describe Cmd/Ctrl+K. It may expose stable view IDs and semantic labels for the separate Command Palette feature to call `onChange`, but it owns no palette UI, search, shortcut hint, or result behavior. Keyboard navigation remains fully usable without it.

## Mobile To-Do interaction specification

### Structure

On desktop/tablet (`>= 768px`), render the current card title, week controls, all seven day columns, This Week/Long Term support cards, and Recurring Tasks management as today. Horizontal board scrolling is not used at these sizes because the rail leaves sufficient workspace only at the desktop/tablet layout thresholds; at 768–1199, columns may use a minimum width and a contained board scroller if necessary, never body-level overflow.

On mobile (`< 768px`), use this order:

1. To-Do title and compact week controls (`Previous week`, range label, `Today`, `Next week`).
2. A seven-item day strip labeled Mon–Sun plus date. The selected day has a clear filled/outlined state; today has a secondary Today marker. The strip represents the currently selected week.
3. One selected-day card with full weekday/date heading, recurring occurrences first, then manual dated tasks, Add task, and a meaningful empty state.
4. Collapsible **This Week** section.
5. Collapsible **Long Term** section, including folders and their tasks.
6. Collapsible **Recurring Tasks** section and its existing create/edit/archive capabilities.

Sections default to: selected day expanded; This Week and Long Term expanded if they contain items, otherwise collapsed; Recurring Tasks collapsed. Toggling a section is local, non-persisted UI state. A collapsed heading must announce its expanded/collapsed state and item count.

### Day and week behavior

- `selectedDate` is a local `YYYY-MM-DD` UI value derived with existing local-date utilities, not `toISOString`.
- First entry to To-Do selects today and `getMonday()` for its week. If a user changes weeks, the selected date becomes that week’s Monday by default. Tapping a day thereafter only changes the selected date.
- Previous/Next moves `weekStart` by exactly seven local calendar days using `addDays`; it does not alter, roll forward, delete, duplicate, or filter task data.
- Today sets `weekStart` to the current Monday and `selectedDate` to the current local date in one action.
- The selected-day content uses the same daily entry, recurring occurrence derivation, completion, skip, add, delete, folder, and data update functions as the desktop board. Recurring occurrences remain above manual tasks.
- The day strip provides `aria-label="Week of <date>"`; each day is a button named with full weekday and date, and the selected day has `aria-pressed="true"`.

### Touch-safe task actions

Native `draggable` is pointer-desktop behavior only. On touch/coarse-pointer contexts:

- Manual tasks show a visible 44px `More actions for <task>` button rather than relying on a tiny drag handle or hover-revealed delete.
- Its bottom sheet contains: Complete/Mark incomplete, Move to…, Move up, Move down, and Delete. Move up/down are disabled at boundaries and apply only within the current list.
- `Move to…` shows valid destinations: all seven dates of the displayed week, This Week, Long Term root, and each Long Term folder. The current location is marked and disabled. Choosing a destination performs the same move semantics as desktop: append by default; a destination-list action may place before a selected target only on desktop DnD.
- Folder rows provide Expand/Collapse, Move up, Move down, and Delete. Their contained manual tasks use the same task action sheet. Deleting a folder retains the existing behavior of deleting its contents, but requires confirmation.
- Recurring occurrences remain non-movable. Their actions are Complete/Mark incomplete and Skip, exactly as today.
- Recurring series rows provide Edit, Archive, Move up, and Move down. The existing desktop keyboard arrow reordering is retained and improved with a live announcement.
- After a move/delete/reorder, close the sheet, return focus to the originating row when it still exists (otherwise its nearest sibling/header), and announce the result in a polite live region.

No gesture DnD is required in v1. A long press must not create a hidden alternative interaction.

## Responsive behavior by view

### Today / Overview

- Before the Today Command Center ships, preserve the existing Overview card data and ordering behavior. Once it ships, the Today Command Center PRD owns its content hierarchy: capture, priorities, schedule focus, action queue, review, then supporting cards. Do not force the old quote-first order onto the new feature.
- At `< 768px`, render the active Today/Overview composition as one logical column with 12px gaps; card padding is 16px (12px below 480px). Keep quick actions, but make each card action at least 44px high or pair it with a clearly labelled text button.
- Keep weather states explicit: loading, unavailable/error, and loaded. The fetch failure must remain non-blocking and show `Weather unavailable` rather than a blank metric.
- Replace hover-only sparkline tooltip dependence with focusable bars or an accessible textual seven-day summary; do not make a visual-only tooltip the sole source of data.
- Task/habit/job quick controls preserve their mutations. Give toggle buttons semantic labels, 44px targets on mobile, and a concise live confirmation.

### To-Do

- Follow the desktop/tablet and mobile specifications above. Preserve daily tasks, This Week, Long Term, folders, recurrence logic, archive behavior, and order exactly.
- On desktop, retain task/folder/series native DnD. Keep keyboard series reordering and add an accessible task/folder move alternative usable at every viewport.
- At mobile width, never render seven full columns or require the user to horizontally scroll the page to complete a task.

### Brain Dump

- Desktop/tablet retain sidebar plus editor. The sidebar is a semantic note list; note selection uses buttons (not clickable `div`s) with an active state.
- At `< 768px`, replace the fixed sidebar/editor split with a single editor. A `Notes` button opens the note list in a modal bottom sheet; selecting a note closes it and returns to the editor. Pinned remains first and cannot be deleted. `New Note` remains available in the editor header/sheet.
- The title and content editors retain auto-save behavior. Show `Saving locally…`, `Saved locally`, and a non-blocking sync/offline status; do not imply a confirmed Firestore write before it occurs.
- Clear/delete confirmations use the shared dialog. Ensure editor controls remain above bottom navigation and the textarea has a practical minimum height without forcing `100vh` overflow.

### Job Applications

- Retain date selection, counts, no-negative constraint, totals, note, and history unchanged.
- At mobile widths, keep the count stepper in one row with 48px plus/minus buttons. Stats may wrap to a 2+1 or vertically stacked arrangement at `< 480px`, preserving all three values and labels.
- Use full-width date input and note field where appropriate; history remains a contained scroll area only if its height is capped, otherwise flows with the page.
- Empty history remains present and accessible. Disabled decrement communicates why it is unavailable through native disabled semantics and visible muted state.

### Habit Tracker

- Retain definitions, daily/history toggles, deletion behavior, and streak calculations unchanged.
- Increase checkbox and seven-day history-dot hit areas to at least 40px by 40px (the visible dot may remain small inside the hit area). Preserve the existing full date in `aria-label`; add visible/accessible focus indication.
- Make Delete an always discoverable labeled/icon button at touch widths rather than hover-only; retain compact desktop styling if desired. Confirm before deleting a habit because the action removes its definition.
- On narrow screens, item metadata can wrap beneath the habit name; do not truncate controls or rely on hover to expose streak/delete actions.

### Day Planner

- Desktop/tablet retain timeline, settings bar, desktop pointer drag-to-move, lower resize handle, 15-minute snapping, selection, and side edit panel.
- At `< 768px`, settings controls wrap into two rows; Clear Day becomes a clear labeled button and its confirmation uses the shared dialog. The timeline becomes full width and keeps hour labels readable. The app page—not a nested full-screen trap—remains scrollable.
- A tapped block opens the editor as a modal bottom sheet. The sheet exposes label, category, start, end, and delete with standard form controls. It replaces touch drag/resize; selecting time applies the existing min-duration/range constraints.
- Tapping an empty hour creates/selects the existing one-hour block and opens the editor sheet. Make this instruction visible in the empty timeline state.
- The desktop edit panel must use semantic buttons/inputs; category removal and color choices must be keyboard-accessible buttons, not clickable spans.

### Password Gate

- Preserve SHA-256 convenience-gate and unlock state behavior. Do not claim that this is secure authentication.
- At mobile widths, provide 20px minimum side gutters and avoid clipping when the virtual keyboard opens. The password input is correctly labeled, errors use `role="alert"`/`aria-describedby`, and submit is a minimum 44px target.
- Replace or suppress the shake/entry animations under reduced motion. Focus the password input on load as currently intended, without stealing focus after an error beyond returning it to the emptied input.

## Shared UI primitives and feedback patterns

Create presentation primitives (or a small scoped UI layer) rather than duplicating one-off CSS in each feature. They may live in `src/components/ui/` or an equivalent clearly named local location.

| Primitive | Required behavior |
|---|---|
| `AppShell` / `PrimaryNav` | Owns desktop rail, tablet compact rail, mobile bottom navigation, active state, landmarks, and safe-area content spacing. |
| `PageHeader` | Owns date/clock, mobile overflow menu, and page focus handoff. Replaces navigation responsibilities in current `TopBar`. |
| `Button` | Variants: primary, secondary, ghost, danger, icon. Enforces 44px mobile target, disabled state, `:focus-visible`, and non-color active/disabled cues. |
| `IconButton` | Requires accessible label/tooltip, has a 44px touch target, and never relies solely on hover for a destructive action. |
| `Dialog` | Accessible modal with labelled title/description, focus trap, initial safe focus, Escape/backdrop close when non-destructive, and focus return to trigger. Destructive confirmation requires an explicit Cancel and confirm action. |
| `BottomSheet` | Mobile dialog variant with drag handle only as decoration; keyboard, Escape, focus, and close button work without dragging. Supports scroll without background scroll bleed. |
| `ToastRegion` | One `aria-live="polite"` status region; success/info is concise and auto-dismisses after about 4 seconds, error remains until dismissed or condition changes. Do not announce every keystroke/autosave. |
| `EmptyState` | Short contextual message, optional primary action, never an empty visual void. Preserve current specific messages where useful. |
| `LoadingState` | Text plus lightweight indicator with `role="status"`; preserve view name while lazy view loads. No indefinite skeleton that masks an error. |
| `SyncStatus` | Distinguishes locally saved/queued, offline, and Firestore sync failure. It must not expose secrets or claim a remote save acknowledgment the current hook does not provide. |

Use shared CSS custom properties for surfaces, borders, text, spacing, radii, focus, z-indexes, and motion. Continue the dark `--bg`, glass, green accent, and existing font rather than adding theme selection.

## Accessibility requirements

### Semantics, focus, keyboard, and screen readers

- Use one `<h1>` for the active page/view and semantic headings in cards/sections. Do not rely only on visually styled `<p>` elements for hierarchy.
- Provide a first-focusable `Skip to main content` link. Changing views moves focus to the main content heading after the lazy component mounts; do not move focus for an incidental data update.
- All interactive controls are native buttons, inputs, selects, or links. Convert clickable note/folder/category display elements to buttons or provide full equivalent keyboard behavior.
- Every icon-only control has an explicit accessible name. Labels identify the affected task/note/block where meaningful.
- Visible `:focus-visible` rings must have at least a 3:1 contrast against adjacent colors and never be removed. Mouse-only outlines are not enough.
- Support Tab/Shift+Tab, Enter/Space activation, Escape to close menus/sheets/dialogs, arrow-key navigation in mutually exclusive day selection where implemented, and standard select/input behavior. Do not trap focus except inside an open modal.
- Announce view changes, save/move/delete/archive outcomes, validation errors, selected day changes, and sync failures via appropriate polite/assertive live regions. Use `role="alert"` for login and blocking form errors only.
- Ensure task completion controls communicate checked state (`aria-pressed` or checkbox semantics), recurring skip has a precise name, collapsed sections use `aria-expanded`, and active navigation uses `aria-current`.
- Keyboard users must be able to move/reorder manual tasks, folders, and recurring series without native DnD. Provide move/reorder actions and live feedback; do not rely on `draggable` alone.

### Touch, visual, motion, and contrast

- Minimum target: 44px by 44px for primary/nav/icon controls on mobile; 40px is permitted for dense repeated controls such as habit history only when clear spacing prevents accidental activation. Invisible hit-area expansion is acceptable.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text, key boundaries, focus indicators, and disabled-state distinction. Glass surfaces must remain legible without backdrop-filter.
- Pair state colors with text, icon, border, or shape changes. Completion, active nav, selected day, error, and disabled states cannot be color-only.
- Respect `prefers-reduced-motion: reduce`: remove transform/scale/shake/pulse/slide animation, use short opacity changes only if needed, and never animate drag or navigation in a way that impedes interaction.
- Support forced-colors/high-contrast mode: do not suppress system colors, preserve borders/outlines, and allow native form controls to remain legible. Test `forced-colors: active` and increase semantic border use instead of relying on translucent color mixing alone.

## Layout tokens and breakpoints

Add/standardize tokens in `src/index.css` (names may vary, values must remain coherent):

```css
:root {
  --nav-rail-expanded: 216px;
  --nav-rail-compact: 64px;
  --mobile-nav-height: 72px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --page-gutter-desktop: 32px;
  --page-gutter-mobile: 16px;
  --control-min-touch: 44px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --focus-ring: 0 0 0 3px oklch(0.72 0.085 160 / .55);
  --z-nav: 50;
  --z-popover: 100;
  --z-modal: 200;
  --z-toast: 250;
}
```

Use `1199px`, `767px`, and `479px` max-width breakpoints (or the equivalent mobile-first min-width rules) consistently. The 1024px Today/Overview content breakpoint may remain as an intermediate layout breakpoint, but it must not conflict with the 768px navigation switch. No page may cause horizontal body overflow from 320px upward.

## State and data impact

### Persisted state

There is no required data migration and no new Firestore/localStorage key in v1. Continue using the present keys and shapes, including `todos-daily`, `todos-thisweek`, `todos-longterm`, `todos-recurring`, `todos-recurring-state`, habit keys, job keys, Brain Dump keys, and Day Planner keys.

### Ephemeral UI state

The implementation may add component-local, non-persisted state for:

- active navigation/menu/dialog/sheet/toast;
- viewport mode;
- selected mobile To-Do week/date and local section expansion;
- source item/location for an explicit move action;
- selected mobile Day Planner block/editor;
- pending confirmation action and sync-display state.

Do not store layout mode, mobile selected date, nav preference, or dialog state in Firestore. All mutations must call the same existing update paths so local cache writes and the one-second debounced Firestore synchronization remain unchanged. Maintain local-date helpers for date keys and do not introduce UTC date generation.

## Component and CSS responsibilities

| Area | Responsibility / expected implementation touchpoint |
|---|---|
| `src/App.jsx` | Retain lazy views and active-view source of truth; compose app shell/navigation; supply focus handoff and view loading context. |
| `src/App.module.css` | Replace fixed shell assumptions with rail/mobile-nav dimensions, scroll containment, responsive content padding, and reduced-motion-safe view transition. |
| `src/components/TopBar.jsx` | Refactor into header-only/date-clock/mobile-overflow behavior or split into `PageHeader`; remove desktop/tablet navigation dropdown responsibility. |
| `src/components/TopBar.module.css` | Header adaptations, overflow menu, focus/target states; no independent navigation styling that conflicts with primary nav. |
| `src/index.css` | Shared tokens, body overflow rules, global focus-visible/reduced-motion/forced-colors rules, safe-area support, and scrollbar fallbacks. |
| `src/components/TodoCard.jsx` / CSS | Preserve desktop board/data logic; add reusable selected-week/day presentation and action-sheet move paths; define mobile selected-day layout and contained board behavior. |
| `src/components/DayPlanner.jsx`, `TimeBlock.jsx`, `BlockEditPanel.jsx` / CSS | Keep desktop mouse behavior; introduce touch/pointer-safe editor sheet and semantic controls; remove mouse-only or clickable-span dependencies. |
| `src/components/BrainDump.jsx` / CSS | Convert note list to accessible controls and swap phone sidebar for notes sheet; retain auto-save/data semantics. |
| `src/components/Overview.jsx` / CSS | Preserve current data integrations, support the separate Today Command Center content hierarchy when implemented, and make actions, summaries, loading/error/empty feedback, and breakpoints accessible. |
| `src/components/HabitTracker.jsx` / CSS | Preserve all logic; enlarge targets, make delete discoverable, and make history dots accessible/responsive. |
| `src/components/JobTracker.jsx` / CSS | Preserve logic; adapt count/stat/date/history layout and targets. |
| `src/components/PasswordGate.jsx` / CSS | Preserve unlock logic; add form association/error announcement, responsive gutters, and reduced-motion behavior. |
| Shared UI components/CSS | Provide Dialog, BottomSheet, ToastRegion, Button/IconButton and status/empty/loading patterns used consistently across views. |

Avoid a broad rewrite of `useSyncedStorage`, date utilities, recurrence domain logic, Job Tracker logic, or Habit Tracker logic. Keep feature CSS modules colocated; global rules are only for true tokens/resets/accessibility media queries.

## Loading, error, empty, and confirmation states

- **Lazy view:** show `Loading <view label>…` with `role="status"`; preserve app shell/nav so the user can navigate elsewhere. If a lazy import fails, show an inline error state with Retry and navigation remains available.
- **Persistence:** local changes remain immediate. If Firestore subscription/write fails, show a persistent, dismissible-but-returning sync warning such as `Changes are saved on this device; cloud sync is unavailable.` Do not lose local editing capability.
- **Weather:** retain loading then `Weather unavailable` failure state without retry loops; optionally expose a retry button if implemented.
- **Empty states:** selected To-Do day (`No tasks for <day>. Add a task to plan this day.`), This Week, Long Term, Recurring Tasks, habits, jobs history, schedule, notes content, and Overview cards use clear contextual copy and a nearby action where that action is safe.
- **Destructive confirmation:** indicate title, impact, cancel, and danger confirm action. Examples: deleting a folder explicitly says its contained tasks will also be deleted; clearing Day Planner says all blocks will be removed. Confirmation is required before the existing destructive mutation.
- **Validation:** retain title limits and current constraints. Show messages adjacent to invalid fields, link with `aria-describedby`, and do not announce validation until submit/interaction requires it.

## Browser support

Support the latest two stable versions of Chrome, Edge, Firefox, and Safari on desktop; Safari on iOS 16+ and Chrome on Android 10+ on mobile. The core experience must work without backdrop-filter, hover, native drag-and-drop, or a fine pointer. `env(safe-area-inset-bottom)`, `prefers-reduced-motion`, and `forced-colors` have safe fallbacks. Use supported CSS/React APIs already compatible with the Vite/React 18 build; do not add a browser-specific dependency for v1.

## Testing matrix

### Automated

- Keep existing Vitest recurrence/date tests passing.
- Add unit tests for navigation destination order/active labeling; mobile To-Do week/date selection; Today/previous/next behavior; and explicit move/reorder destination rules. Assert no data-shape mutation beyond existing setters.
- Add component tests for dialogs (focus/escape/return), bottom sheets, menu state, toast/live messages, view-loading status, mobile nav active state, and responsive markup modes.
- Add browser tests for desktop mouse DnD preservation and touch/coarse-pointer alternatives. Mock storage/sync errors and weather failure.
- Add automated accessibility checks (for example axe) for every view, mobile nav, dialog/sheet, password error, and empty/loading/error state. Include keyboard-only tests for navigation, task move, series reorder, note selection, and Day Planner editor.

### Manual viewport/device checks

| Scenario | Required verification |
|---|---|
| 320×568 and 375×667 portrait | No horizontal body overflow; bottom nav/keyboard safe area; all primary controls reachable. |
| 390×844 and 430×932 portrait | Mobile To-Do day/week switching, task actions, sheets, dialogs, and all six destinations work one-handed. |
| 667×375 / 844×390 landscape | Header and bottom nav do not overlap content; scroll/focus remains usable. |
| 768×1024 tablet | Compact rail visible; no hamburger-only navigation; Brain Dump, To-Do, and Day Planner adapt without clipped controls. |
| 1024×768 small laptop | Overview logical order/layout is coherent; rail/header/content scroll independently. |
| 1280×800 and 1440×900 desktop | Expanded rail, desktop To-Do seven-day board, mouse DnD, Day Planner drag/resize, and side editor work. |
| Keyboard only | Skip link, all destinations, dialogs/sheets, data actions, move/reorder paths, and focus return work. |
| Screen reader | NVDA + Firefox and VoiceOver + Safari checks for landmarks, names, state changes, alerts, and live feedback. |
| Accessibility preferences | `prefers-reduced-motion`, browser 200% zoom/reflow, and forced-colors/high-contrast remain understandable/operable. |
| Network/sync | Weather failure, offline Firestore, and lazy-view failure retain usable UI and honest status messaging. |

## Rollout and release plan

1. Implement shell tokens/landmarks/navigation in a feature branch while preserving the existing view IDs and `onChange` contract.
2. Add shared primitives and apply them first to navigation, confirmations, loading, and feedback.
3. Implement responsive views, with To-Do mobile mode and explicit task actions verified against current persistence/domain behavior before changing other view presentation.
4. Run unit/component/browser accessibility checks, production build, and the manual matrix above against a Firebase-backed staging/development environment.
5. Deploy normally through the existing GitHub Pages pipeline. No data migration, feature flag, backfill, or Firestore deployment is required.
6. Monitor console/sync errors and manually validate cross-device task/habit/job updates after release. Rollback is a front-end deployment rollback; existing data remains compatible.

## Acceptance criteria

- [ ] At `>=1200px`, every view and Lock action are visibly available in an expanded persistent rail; at 768–1199px an accessible compact rail remains visible; below 768px, a fixed six-item labeled bottom nav is visible and content is padded above it.
- [ ] The active view is clearly indicated visually and with `aria-current`; switching view keeps lazy loading and moves focus to the loaded view’s main heading.
- [ ] Mobile To-Do shows one selected day, a seven-day strip, and exact Previous/Today/Next week controls. Week navigation changes only presentation state and never modifies tasks.
- [ ] Desktop retains the seven-day To-Do board and native mouse drag/drop for manual tasks, folders, and series. Existing task, recurrence, folder, archive, Job Applications, and Habit data behavior remains unchanged.
- [ ] A coarse-pointer/keyboard user can complete, skip, delete (with confirmation), move, and reorder every applicable To-Do item without native drag/drop. Recurring occurrences remain non-movable.
- [ ] Each of the six views has a defined responsive layout with no horizontal page overflow at 320px; Brain Dump and Day Planner have usable phone-specific editing/navigation surfaces.
- [ ] Buttons/icon controls meet target-size requirements, hover-only essential actions are exposed for touch/keyboard, and all controls have accessible names and visible focus states.
- [ ] Dialogs/bottom sheets trap and return focus correctly; Escape works where appropriate; destructive actions use the shared confirmation pattern.
- [ ] Loading, empty, weather error, validation, and persistence/sync states are clear, accessible, and do not misrepresent Firestore confirmation.
- [ ] Reduced-motion and forced-colors/high-contrast modes are supported; the existing dark visual identity is retained and no theme/settings UI is introduced.
- [ ] Cmd/Ctrl+K has no behavior added or intercepted by this work, and the application still builds, recurrence tests pass, and the testing matrix is complete.

## Dependencies

- Existing React 18/Vite/CSS Modules implementation and current `App` view IDs.
- Existing `useSyncedStorage`, local-date utilities, recurrence domain functions, and Firestore/localStorage synchronization contract.
- A decision on whether to add a small, tested dialog/focus utility or implement the necessary focus management locally. Any dependency must preserve the current build/browser support and be justified by accessibility coverage.
- No backend, Firebase schema, authentication, settings, PWA, AI, or Command Palette dependency is required.

## Risks and tradeoffs

| Risk / tradeoff | Mitigation / decision |
|---|---|
| A rail reduces content width on small laptops. | Use the compact 64px rail below 1200px; contain only the To-Do board’s horizontal scrolling where required. |
| Maintaining desktop and mobile To-Do markup can drift. | Share date/location/task mutation helpers and row/action components; test the same state transitions in both surfaces. |
| The existing full-document Firestore sync can overwrite concurrent edits. | Do not add new persisted UI state or alter mutation shapes; retain current behavior and surface sync errors honestly. |
| Native DnD is inaccessible/unreliable on touch. | Keep it for desktop efficiency but make explicit move/reorder actions the complete accessible path. |
| More dialogs/sheets can create focus bugs. | Centralize implementation, test focus trap/return/Escape, and avoid nested modals. |
| Glass/low-contrast styling can fail accessibility. | Tokenize contrast, provide focus/border fallbacks, test without backdrop-filter and in forced colors. |
| Mobile bottom navigation can obscure forms/keyboard. | Reserve safe-area-aware content padding and scroll focused elements into view. |

## Open decisions

These do not block implementation; the listed default should be used unless product direction changes before build.

| Decision | V1 default |
|---|---|
| Expanded rail collapse control | Do not provide one; responsive rail widths are automatic. |
| Bottom-nav label for Job Applications | Use `Jobs` visibly and `Job Applications` as the accessible name. |
| Tablet To-Do board | Use a contained horizontal board scroller only if seven usable columns cannot fit; do not switch tablet to the mobile single-day mode before 768px. |
| Toast duration | About four seconds for success/info; sync error persists until resolution/dismissal. |
| Destructive undo | Not in v1; confirmation is the safety mechanism. |
| Dialog implementation library | Prefer existing React/CSS implementation if it can meet the focus requirements; otherwise add the smallest accessible dependency with tests. |

## Future considerations

- User-controlled rail collapse, navigation order, visual preferences, and themes.
- Router-based URLs and shareable date/view links.
- Command Palette integration using stable view IDs and actions defined in its separate PRD.
- Gesture DnD, undo, richer task actions, batch operations, and notification/reminder flows.
- Cross-device conflict resolution or item-level Firestore documents if concurrent editing becomes material.
