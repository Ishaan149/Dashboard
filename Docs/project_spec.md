# Projects page specification

Status: Design confirmed; production implementation remains on hold until explicitly authorized.

Date: October 19, 2026.

## Problem Statement

The dashboard owner needs a dedicated place to organize personal projects of any kind, including coding, university, and other personal work. Existing To-Do and Brain Dump pages do not provide a project workspace that combines project context, several related notes, and a separate project checklist.

The primary need is a project notebook, rather than a dated progress journal or a detailed project-management system. The owner wants to arrange projects personally, open a project to work with its notes and tasks, and retain completed projects for reference.

## Solution

Add a Projects destination to the existing dashboard. Its landing page has separate Active and Completed views containing manually ordered project cards. Each card shows only the project name and category, plus the controls needed to open and reorder it.

Use the project card presentation selected from prototype C: tall, spacious cards in a responsive grid, with restrained borders, a small project icon, the name and category near the lower portion, and a footer containing drag and move controls. Preserve the dashboard's theme and navigation context. Descriptions, task counts, activity dates, and progress summaries do not appear on project cards.

Opening a card leads to the project workspace selected from prototype A. Project information and actions appear above the workspace. On desktop, a note index sits beside the main note editor/preview, with a task checklist in a side panel on the right. On phones, the task checklist appears first and the notes below it. Keep note selection usable at narrow widths without horizontal page overflow.

Projects have a name, an optional description, and an optional reusable custom category. Each project contains multiple titled Markdown notes and a separate, simple checklist. Notes autosave and have Edit/Preview modes. Project completion is manual, preserves every note and task, and is reversible by reopening the project.

## User Stories

1. As the dashboard owner, I want to open Projects from the dashboard navigation, so that my project workspace is easy to reach.
2. As the dashboard owner, I want to track coding, university, and other personal projects together, so that the page supports all my project work.
3. As the dashboard owner, I want separate Active and Completed views, so that current work stays distinct from finished projects.
4. As the dashboard owner, I want project cards showing just name and category, so that I can scan projects without extra detail.
5. As the dashboard owner, I want the spacious card presentation from prototype C, so that the project collection feels clear and calm.
6. As the dashboard owner, I want to open a project by selecting its card, so that I can access its notes and checklist.
7. As the dashboard owner, I want to create a project by supplying its name, so that capturing a new project is quick.
8. As the dashboard owner, I want to optionally describe and categorize a project, so that I can add useful context without filling unnecessary fields.
9. As the dashboard owner, I want to edit a project's name, description, and category later, so that its context can evolve.
10. As the dashboard owner, I want to drag project cards into my preferred order, so that the collection reflects my priorities.
11. As the dashboard owner, I want Move up and Move down alternatives, so that ordering does not depend on dragging.
12. As the dashboard owner, I want my project order to survive reloads and sync across devices, so that the arrangement remains familiar.
13. As the dashboard owner, I want to create and reuse my own categories, so that categorization matches my work.
14. As the dashboard owner, I want to rename a category once and see assigned projects reflect the change, so that category names remain consistent.
15. As the dashboard owner, I want deleting a category to leave its projects uncategorized, so that category maintenance does not delete project work.
16. As the dashboard owner, I want project information above the notes and tasks, so that I can quickly recall the project's purpose.
17. As the dashboard owner, I want prototype A's note index, editor, and task side panel on desktop, so that notes remain central while tasks stay accessible.
18. As the dashboard owner, I want the task checklist above notes on phones, so that the narrow-screen layout follows my preferred order.
19. As the dashboard owner, I want multiple titled notes within each project, so that distinct ideas and reference material stay organized.
20. As the dashboard owner, I want to select a note from the project's note index, so that I can switch between related documents.
21. As the dashboard owner, I want to create and rename notes, so that each document has a useful identity.
22. As the dashboard owner, I want to edit Markdown note content, so that I can express headings, lists, checkboxes, and links.
23. As the dashboard owner, I want Edit and Preview modes, so that I can write Markdown and read its formatted result.
24. As the dashboard owner, I want note titles and content to save automatically, so that writing does not require a separate Save action.
25. As the dashboard owner, I want notes ordered by their most recent edit, so that the material I am working on is easy to find.
26. As the dashboard owner, I want notes presented as documents rather than dated journal entries, so that the workspace supports ongoing reference and thought.
27. As the dashboard owner, I want to confirm note deletion, so that an accidental action does not immediately remove my writing.
28. As the dashboard owner, I want a separate checklist inside each project, so that project tasks remain independent of the dashboard's To-Do lists.
29. As the dashboard owner, I want to add, rename, and delete text-only checklist items, so that the checklist stays useful as work changes.
30. As the dashboard owner, I want to check and uncheck tasks, so that I can record completion and correct it later.
31. As the dashboard owner, I want to manually reorder tasks, so that I can arrange the work in a sensible sequence.
32. As the dashboard owner, I want completed tasks grouped below incomplete tasks, so that remaining work stays prominent.
33. As the dashboard owner, I want to complete a project manually even when some tasks remain unfinished, so that project status reflects my decision.
34. As the dashboard owner, I want completed projects to retain all notes and tasks and remain editable, so that completion does not discard context.
35. As the dashboard owner, I want to reopen a completed project, so that I can resume it with its contents intact.
36. As the dashboard owner, I want to return from a project to the card collection, so that I can move between projects.
37. As the dashboard owner, I want confirmation explaining that project deletion removes its notes and tasks, so that I understand the consequence before committing.
38. As the dashboard owner, I want existing project content to appear promptly from local storage and sync through the dashboard's existing mechanism, so that it behaves consistently with other pages.
39. As the dashboard owner, I want clear empty states for projects, notes, and tasks, so that I can start using an empty workspace.
40. As the dashboard owner, I want keyboard-operable controls and readable mobile layouts, so that the project workspace remains usable across devices and input methods.

## Implementation Decisions

The product behaviors below were agreed during the interview and prototype review. Technical recommendations are identified separately; they do not authorize implementation.

- **Navigation and shell:** Add a Projects destination through the shared navigation definitions and existing application view selection. Follow the lazy-loaded page pattern, shared page header, current theme, and main-content focus conventions. The application currently selects views using React state rather than URL routing; a routing migration is unnecessary for this feature.
- **Mobile navigation:** The current bottom navigation assumes six destinations. Accommodate Projects as an additional destination without clipping labels, making existing destinations unreachable, or compromising touch targets. This is an integration detail rather than a new navigation product feature.
- **Selected visual combination:** Use C's project collection and A's project workspace. Preserve the spacious card silhouette, restrained card content, note index alongside the editor, and desktop checklist side panel. Use the application's existing theme tokens rather than hardcoding the prototype's dark appearance.
- **Project collection:** Provide separate Active and Completed views. Render cards in the owner's stored manual order. Expose drag-and-drop and explicit move controls without requiring dragging to open or manage a project. Do not add search, category filters, activity sorting, description previews, or task counts to cards.
- **Project editing:** Name is required; description and category are optional. These are the only project metadata fields in scope. New projects start Active. Use the shared dialog and form conventions where appropriate.
- **Categories:** Categories are user-created, reusable, and independent of Day Planner categories. Support creation, assignment, renaming, and deletion. A category rename updates its display on all assigned projects. Deleting a category clears those assignments and retains every project and its contents.
- **Project workspace:** Show name, description when present, category when assigned, a return-to-projects action, project editing, and complete/reopen actions above the content. On desktop, use the A layout: note index, main editor/preview, then task side panel. On phones, show tasks first, then notes. Tasks and Notes tabs are not the selected layout.
- **Notes:** Each project has multiple independent titled Markdown documents. Support creation, selection, title/content editing, and confirmed deletion. Save edits automatically and sort by latest edit, with deterministic ordering for equal timestamps. Notes are not dated progress entries. Merely selecting a note, previewing it, or opening a project must not change its edit timestamp or note order.
- **Markdown:** Support headings, ordinary lists, Markdown checklist rendering, and clickable safe links. Preserve the dashboard's sanitized rendering approach. The existing Markdown renderer does not currently render checklist inputs; add a safe, narrowly scoped rendering capability for project notes. Checklist marks inside Markdown are document content, independent from the project's task list. They may be changed through Markdown source; direct interaction in Preview is not required. Preserve existing Brain Dump behavior unless a shared change is intentionally covered by regression tests.
- **Checklist:** Tasks contain editable text and a completed state. Support add, rename, delete, toggle, and manual reordering. Render incomplete items before a separate completed group while retaining manual ordering within the groups. Checklist items have no dates, priorities, subtasks, or intermediate status. They do not appear in To-Do or change its data.
- **Completion:** Only the explicit complete/reopen action changes project status. Unfinished tasks do not prevent completion, and checking every task does not automatically complete a project. Completed projects remain readable and editable. Completing or reopening never resets tasks, removes notes, or changes note content.
- **Deletion:** Confirm note and project deletion. The project confirmation explicitly describes removal of its notes and tasks. Canceling a confirmation makes no data changes. A Trash view or restore system is not included.
- **Persistence:** Reuse the existing synchronized storage boundary: immediate local cache, same-tab notifications, debounced Firestore writes, and real-time remote snapshots. The current remote write model replaces a stored value; this feature does not introduce collaborative conflict merging or stronger delivery guarantees. Persist project content, categories, status, and manual order. Do not move or rewrite existing To-Do or Brain Dump records.
- **Recommended data boundary:** Keep project-specific state behind one Projects-owned aggregate and use the existing synchronized storage interface. Represent projects, notes, tasks, and categories with stable IDs. Category assignments reference category identity rather than duplicating its name. Store manual ordering explicitly and note creation/edit timestamps for stable sorting. Preserve unrelated project records when editing one project. Exact record shapes and storage key names are implementation choices, not part of the user-facing contract.
- **Recommended ordering behavior:** Preserve a project's relative stored rank when moving between Active and Completed views, and restrict each reorder operation to the visible status view. Do not sort projects automatically after editing notes or tasks. These rules make manual ordering predictable without adding another product control.
- **Shared UI:** Reuse existing buttons, dialogs, focus management, and empty-state patterns where they fit. Use clear accessible names for project-specific reorder controls and task actions. Keep note editing usable while its title/content updates affect the note list order.

## Testing Decisions

This is the proposed implementation testing plan, based on existing repository patterns. No production feature or tests are implemented by this document.

- **Primary seam:** Test the Projects page through user-visible interactions with a stateful in-memory replacement for the existing synchronized storage hook. Prefer this single high-level seam for project, category, note, and task behavior instead of separately testing each internal handler or duplicating reducer logic in tests.
- **Prior art:** Existing Brain Dump component tests use React mounting, jsdom, mocked synchronized storage, and user actions. Habit Tracker component tests cover similar persistent page interactions. Follow those conventions with isolated synthetic fixtures.
- **Project lifecycle and ordering:** Cover creation/editing, required-name behavior, opening/returning, independent Active/Completed views, manual moves, and completion/reopening with unfinished tasks and unchanged contents. Verify stored order survives component remount and changes to content do not silently reorder cards.
- **Categories:** Verify reuse, renaming across assigned projects, and deletion clearing assignments without removing project data.
- **Notes:** Cover creating/selecting/renaming/editing, autosave observed at the storage boundary, Edit/Preview, edited-first ordering, and confirmed/canceled deletion. Reading, selecting, and previewing notes must not update their edit timestamps. Switching notes or editing titles must preserve text and selection identity.
- **Checklist independence:** Verify task addition/editing/deletion, manual order, toggle behavior, completed grouping, and project isolation. Assert that project operations never write To-Do or Brain Dump storage keys and never infer project completion from checklist completion.
- **Destructive actions:** Verify canceled confirmations preserve data and confirmed project deletion removes only that project and its nested contents. Category deletion must not cascade to project deletion.
- **Markdown behavior:** Exercise supported Markdown through the page preview. Use the existing Markdown safety test suite as prior art for narrowly targeted renderer regression coverage: unsafe links, raw HTML, and executable markup remain inert; supported checklist markup renders safely; existing Brain Dump rendering remains compatible.
- **Navigation integration:** Extend existing application/navigation tests only as needed to verify the new destination, lazy page loading, correct label, and main-content focus. Reuse the synchronized storage hook's existing tests instead of retesting its internals through Projects.
- **Responsive visual check:** Inspect C-style cards, A-style desktop detail layout, and the mobile tasks-first layout in the browser. Verify note selection, long names, empty states, keyboard move controls, focus visibility, and the additional mobile navigation destination remain usable without horizontal overflow.
- **Validation scope:** Use synthetic/local fixtures and mocked Firebase boundaries. Tests must not read or mutate the owner's live projects, To-Do, Brain Dump, or Firestore data. Run the relevant existing test suite and production build when implementation is authorized.

## Out of Scope

- Production implementation until the owner explicitly authorizes it.
- A dated project journal, activity feed, or progress-update timeline.
- Automatic activity/date sorting of project cards; project search or category filters.
- Project card descriptions, task counts, progress summaries, or latest-update timestamps.
- Additional project metadata such as target dates, separate reference-link fields, or priorities. Links can be written inside notes.
- Fixed category taxonomies or reuse of Day Planner's category list.
- Connecting project tasks to To-Do, the Day Planner, or other dashboard lists.
- Kanban boards, milestones, scheduling, recurring tasks, subtasks, dependencies, and automatic project completion.
- Note folders, manual note ordering, a rich-text editor, file/image uploads, or attachments.
- Import/export, sharing, collaboration, external project integrations, or new authentication flows.
- A Trash view, restore history, or note version history.
- New URL routing, deep-linking architecture, or unrelated navigation redesign.
- Changes to Brain Dump data or features beyond safely reusing or adapting rendering capabilities.
- Keeping, committing, promoting, or publishing the disposable prototype code or sample data.
- Publishing this specification to an external issue tracker; the requested deliverable is this local document.

## Further Notes

- The owner explicitly confirmed the feature design and kept implementation on hold before requesting a one-time prototype. The prototype request did not authorize production work.
- Final prototype feedback: “Like the card view of C and in project view of A.” This selects a combination of the project collection and workspace, not one complete variant.
- The later mobile choice is authoritative: tasks first, then notes. Do not substitute the earlier suggested slide-out task panel or Notes/Tasks tabs.
- The earlier journal terminology was explicitly rejected. Use Projects, notes, categories, and tasks throughout the interface.
- The prototype used synthetic data and in-memory state. Its code is disposable and must be discarded after this specification captures the decisions. The specification is the durable design record; a future implementation should be written against it rather than copied from the prototype.
- Pixel measurements, decorative prototype copy, browser variant controls, and the prototype's memory-state diagnostic are not product requirements.
