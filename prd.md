# Product Requirements Document: Unified To-Do Week View

## Status

Draft requirements agreed on August 6, 2026. This document defines the product behavior before implementation begins.

## Summary

Combine the existing To-Do page and Week Planner into a single **To-Do** experience. The new main view displays all seven days of the selected week at once. A global **This Week** list and the existing **Long Term** list remain available below the weekly board.

The result should provide one place to capture, organize, schedule, complete, and move tasks without switching between To-Do and Week Planner.

## Problem

Tasks are currently split between two separate experiences:

- To-Do contains Today, This Week, and Long Term lists.
- Week Planner contains seven daily columns and a separate view of This Week tasks.

This separation makes planning require moving between pages and creates two overlapping task-management interfaces.

## Goals

- Replace the separate To-Do and Week Planner experiences with one unified To-Do page.
- Show Monday through Sunday together in a single desktop view.
- Allow tasks to move freely between days, This Week, Long Term, and Long Term folders.
- Preserve tasks for past and future weeks.
- Keep the existing global This Week list and Long Term folder structure.
- Keep task creation and completion lightweight.
- Continue showing today's assigned tasks on the Overview dashboard.

## Non-goals

- Mobile or responsive layouts are not part of this version.
- Tasks will not have times, descriptions, priorities, tags, recurrence, or other metadata.
- Tasks cannot be renamed after creation.
- Incomplete tasks will not automatically roll into a new week.
- Automated migration of existing Today or Week Planner tasks is not required.

## Information architecture

The page remains named **To-Do**.

It contains two main areas:

1. A seven-column weekly board at the top.
2. Two supporting lists below the board, displayed side by side:
   - This Week
   - Long Term

The separate Week Planner entry point and link should be removed once the unified experience replaces it.

## Weekly board

### Week structure

- The board displays seven columns at the same time in this order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
- Each column displays its weekday and calendar date.
- The current day is visually highlighted when it is present in the selected week.
- The initial view is the current week.
- Controls are provided for Previous week, Today, and Next week.
- Selecting Today returns the board to the current week.
- Users can navigate to both past and future weeks.
- Tasks assigned to a date remain stored with that original date and appear again when the user returns to that week.

### Daily tasks

- Each day column displays an ordered list of tasks.
- Each task contains only:
  - Title
  - Completion state
- Each task row/card provides a checkbox and a delete control.
- Completed tasks remain visible in their assigned location with strikethrough styling.
- Tasks cannot be renamed.
- Every day column has a **+ Add task** control at the bottom, following the interaction pattern in the supplied reference image.
- Newly created tasks are added to the day where the control was used.

## This Week list

- This Week is a single global list of tasks that have not been assigned to a specific date.
- It remains the same while the user navigates between weeks.
- It is not duplicated or filtered according to the selected week.
- Tasks contain only a title and completion state.
- Completed tasks remain visible with strikethrough styling.
- Tasks can be added, completed, deleted, reordered, or dragged to another supported location.

## Long Term list

- Long Term is a single global list and remains the same while navigating between weeks.
- It retains the current folder structure and folder behavior.
- Users can create, expand, collapse, and delete folders.
- Tasks can exist either at the root of Long Term or inside a Long Term folder.
- Completed tasks remain visible with strikethrough styling.
- Tasks can be added, completed, deleted, reordered, and moved into or out of folders.
- Deleting a folder retains the current behavior: the folder and its contained tasks are removed.

## Drag-and-drop behavior

- Tasks can be manually reordered within any day or list.
- Tasks can be dragged between any day in any stored week, the global This Week list, and the global Long Term list.
- Tasks can be dragged into and out of Long Term folders.
- Dropping a task onto a specific task inserts it at that position.
- Dropping a task into empty space appends it to that location.
- Moving a task transfers the existing task; it does not create a duplicate.
- A task keeps its completion state when moved.
- Folders remain restricted to Long Term and cannot be moved into a day or This Week.

## Task deletion and completion

- Deleting a task removes it from its current location.
- No rename or edit-title action is provided.
- Marking a task complete does not move or hide it.
- Completed tasks remain draggable and deletable.

## Overview integration

- The Overview **Pending tasks** card displays tasks assigned to today's calendar date only.
- Tasks from the global This Week list and Long Term list do not appear in the Overview task card.
- Completion changes made on Overview update the same task shown in today's column on the unified To-Do page.

## Persistence and data behavior

- All task data continues to use the existing synchronized localStorage and Firestore system.
- Daily task storage must be date-based so multiple past and future weeks can coexist.
- Date keys use local calendar dates in `YYYY-MM-DD` format to avoid UTC midnight boundary issues.
- This Week remains global and can continue using the existing `todos-thisweek` storage key.
- Long Term remains global and can continue using the existing `todos-longterm` storage key.
- Daily tasks conceptually use the following shape:

```js
{
  "2026-08-03": [
    { id: 123, text: "Example task", done: false }
  ],
  "2026-08-04": []
}
```

- The implementation may choose the final synced key name, but there must be one canonical source of truth for date-assigned tasks.
- The old Today list and old Week Planner data must not remain as separate active task systems after launch.

## Migration plan

- Before implementation, the user will manually move existing tasks that must be retained into Long Term.
- Automated migration of existing `todos-today` or `week_planner_tasks` data is not required.
- The existing `todos-longterm` data and folder structure must be preserved.
- The existing global `todos-thisweek` data must be preserved.
- Implementation must not silently delete Long Term or This Week data.

## Desktop layout requirements

- All seven day columns must be visible simultaneously in the intended desktop viewport.
- The weekly board is the primary, topmost content area.
- Day columns use consistent widths and aligned headers.
- Each day column remains visually distinct, similar to the supplied reference image.
- This Week and Long Term appear side by side beneath the weekly board.
- Mobile behavior is intentionally deferred.

## Acceptance criteria

The feature is complete when:

1. There is one To-Do page and no separate Week Planner workflow.
2. The page opens to the current Monday-through-Sunday week.
3. All seven days are visible at once on desktop.
4. Today is visually highlighted.
5. Previous, Today, and Next controls navigate weeks correctly.
6. A task can be added to every individual day.
7. Past and future weeks retain their own daily tasks after navigation and reload.
8. Unfinished tasks remain in their original week and do not roll forward automatically.
9. This Week and Long Term appear side by side below the board.
10. This Week remains identical while navigating between weeks.
11. Long Term retains its current folders and nested tasks.
12. Tasks can be reordered and dragged between supported days, lists, and folders without duplication.
13. Completing a task leaves it visible with a strikethrough.
14. Tasks can be deleted but cannot be renamed.
15. Overview shows and updates only tasks assigned to today's date.
16. Existing This Week and Long Term data remain intact.
17. Task changes continue syncing through localStorage and Firestore.
