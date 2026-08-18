# Product Requirements Document: Connected Brain Dump

## Status

Revised version-one specification for the approved **Connected Brain Dump** feature. It reflects the product-scope decisions made on August 10, 2026 and is implementation-ready for the Dashboard codebase as it exists on that date.

This feature does not implement the separate Universal Command Palette, Today Command Center, or date-aware Day Planner initiatives. It provides a note-search integration contract that the Universal Command Palette may consume when that feature exists.

## Summary

Evolve **Brain Dump** from a permanent pinned note plus a small flat list of plain-text notes into a focused Markdown note workspace. Version one adds local note search with result previews, favorites and a Favorites filter, safe Markdown preview, editor metadata, and a responsive mobile note browser.

The feature deliberately keeps the existing simple note order: the permanent pinned note appears first, and regular notes remain in their stored array order. New regular notes are prepended, so notes created through the UI appear newest-first. There is no sort menu, Recently Opened section, tagging system, checklist system, archive, task/date linking, or note-to-task conversion.

The feature preserves the permanent pinned note, all existing regular-note content and IDs, the current active-note key, permanent deletion with confirmation, Clear content, the local-first Firestore synchronization model, and the Brain Dump top-level navigation destination.

## Problem

Brain Dump currently stores regular notes as `{ id, title, content }` in one array, with a separate permanent pinned note. A user can create, select, edit, clear, and delete notes, but cannot efficiently search old thoughts, mark important notes, or preview intentional formatting.

The desired improvement is a faster and more pleasant personal note workspace without turning Brain Dump into a knowledge graph, rich document editor, checklist manager, archive, or task-management surface.

## Goals

- Preserve the pinned note and every existing regular note without data loss or forced content conversion.
- Provide fast, local, deterministic search across note titles and Markdown source.
- Show bounded, useful search-result previews without persisting search queries or excerpts.
- Let users mark regular notes as favorites and filter the list to favorites.
- Provide a deliberately scoped Markdown authoring model that keeps all existing plain text valid and editable.
- Preserve the current visual order: pinned first, then regular notes in stored order, with new notes prepended.
- Keep permanent note deletion and Clear content behind confirmations.
- Show Saving/Saved status, character count, and last-edited metadata in the editor.
- Provide a usable mobile note browser below 768 px while keeping the editor as the primary surface.
- Continue rendering immediately from `localStorage` and synchronizing through `useSyncedStorage`.
- Expose a pure note search provider and note-navigation target for future Universal Command Palette integration.

## Confirmed version-one scope

### Included

- Local search over note titles and Markdown source.
- Search-result excerpts of at most 160 characters.
- Favorites for regular notes and a Favorites filter.
- Permanent pinned note, treated as a favorite for filtering but without an off toggle.
- Markdown source editing and a safe read-only Preview mode.
- Existing note ordering with newly created notes prepended.
- Permanent deletion of regular notes with confirmation, subject to the existing last-note protection.
- Clear content with confirmation.
- Saving/Saved status, character count, and last-edited metadata.
- Responsive mobile note browser in an accessible bottom sheet.
- Overview compatibility for the pinned note.
- Future Universal Command Palette search and note-open integration.

### Excluded

- Tags or tag filtering.
- Recent notes or recently opened tracking.
- User-selectable sorting.
- Structured checklists or checklist-to-task conversion.
- Links from notes to tasks or dates.
- Conversion of selected note text into To-Do tasks.
- Conversion IDs, task provenance, conversion recovery, or conversion Undo.
- Archive and restore. Regular-note deletion remains permanent.
- Any changes to `TodoCard`, To-Do storage, task IDs, task navigation, folders, recurring tasks, drag/drop, or task forms.

## Non-goals

Version one will not include:

- A global `Cmd+K`/`Ctrl+K` shortcut, global result UI, or cross-feature result orchestration. Those belong to Universal Command Palette.
- A replacement Overview/Today Command Center home screen.
- WYSIWYG/contenteditable editing, arbitrary HTML, embedded media/files, tables, drawing, collaborative cursors, comments, or note sharing.
- AI summarization, semantic/vector search, embeddings, automatic organization, reminders, notifications, authentication, settings, PWA/offline-install work, or external calendar integration.
- Note-to-note links, backlinks, graph visualization, notebooks, saved searches, bulk actions, archive, trash retention, or recovery after confirmed permanent deletion.
- Any new To-Do behavior or task integration.

## Existing system context

The client-only React 18/Vite application has state-based navigation in `src/App.jsx`; it has no router. `TopBar` contains the existing Brain Dump destination (`braindump`), and `App` lazy-loads `src/components/BrainDump.jsx` only after the password convenience gate is unlocked. Brain Dump is a full-width view.

Current Brain Dump persistence is:

| Key | Current shape | Existing consumer |
|---|---|---|
| `brainDumpNotes` | `[{ id: string, title: string, content: string }]` | Brain Dump |
| `brainDumpActiveId` | regular note ID, `__pinned__`, or `null` | Brain Dump |
| `brainDumpPinnedNote` | `{ title: string, content: string }` | Brain Dump, Overview |

`Overview.jsx` reads and edits only the pinned note's `title` and `content`; those fields must remain present and string-valued. Once this feature lands, Overview must call the shared pinned-note update action so `updatedAt` advances and enhanced metadata is not dropped. The Overview card remains a plain textarea and does not gain Markdown preview or favorites controls.

`useSyncedStorage` persists each key independently as `dashboard/<key> -> { value, _secret }`. It reads local cache synchronously, defers ordinary writes until its first Firestore snapshot or subscription error, and applies remote whole-value replacement. This is local-first, last-write-wins synchronization; it is not a field-level merge or transaction system.

## Information architecture

The top-level view remains **Brain Dump**. No new route or top-level navigation destination is added.

### Browser rail

In reading order:

1. **New note** button.
2. Search field labelled **Search notes**.
3. **Favorites** filter toggle.
4. Permanent pinned note when it matches the current search/filter.
5. Regular-note results in stored array order.

The pinned note is visually distinct. In the default unfiltered view it always appears above regular notes. Search or the Favorites filter may exclude it only when it does not satisfy all active criteria; because pinned is treated as a favorite, the Favorites filter alone includes it.

Regular notes are never reordered for display. New notes are prepended to `brainDumpNotes`. Opening or editing a note does not move it. Existing or remotely supplied array order is preserved.

There is no Recent section, tag picker, Active/Archived control, or sort menu.

### Editor workspace

For the selected note, the editor displays:

- Editable title.
- Favorite toggle for regular notes.
- Markdown **Edit**/**Preview** toggle.
- Permanent **Delete note** action for eligible regular notes.
- **Clear content** action.
- Markdown source editor or sanitized rendered preview.
- Footer status, character count, and last-edited metadata.

The permanent pinned note has editable title/content and Markdown preview. It has no favorite toggle or Delete action and is treated as a favorite by selectors. It remains safe for the Overview card because that card continues to use only `title` and `content`.

### Narrow screens

Below 768 px, the editor becomes the primary full-width surface. A **Notes** button opens the note browser in the shared accessible bottom sheet. Selecting a note closes the sheet and focuses the selected note's title. Search, Favorites, and New note remain available inside the sheet. The layout must remain usable at 320 px with no horizontal page scrolling and no hover-only action.

## Markdown editing and preview

Version one uses a controlled `textarea` that stores **Markdown source in the existing `content` string**, plus an explicit Preview mode. Existing plain-text content remains valid Markdown and is never rewritten simply because the feature was opened.

Supported rendered Markdown is a fixed safe CommonMark subset:

- Paragraphs and headings.
- Emphasis and strong text.
- Inline code and fenced code blocks.
- Ordered and unordered lists.
- Block quotes and horizontal rules.
- Links using only safe `http`, `https`, and `mailto` URLs.

Raw HTML is rendered as text and is never injected. Images, tables, task-list syntax, arbitrary attributes, and embedded media are not rendered in version one.

Edit is the default mode. Preview is read-only and presents a visible **Edit** control. Markdown source is canonical; rendering is pure and never writes HTML back to storage. Copy and paste remain plain source text. The Overview textarea remains plain text.

Validation limits are:

- Title: maximum 200 UTF-16 code units. A blank title is stored as entered and displays as `Untitled`.
- Content: maximum 50,000 UTF-16 code units. Blank content is valid.
- Newly created notes start with `{ title: 'Untitled', content: '' }` plus the version-one metadata.

## Detailed interaction flows

### Create and select a note

- **New note** creates one regular note, prepends it to `brainDumpNotes`, makes it active, and focuses the title.
- Selecting a regular or pinned note updates `brainDumpActiveId` only when the selected ID changes.
- Selecting a search result opens the same underlying note without clearing the query.
- An active note that no longer matches the search or Favorites filter stays open with an `Outside current results` indicator and a one-click **Clear filters** action. Filtering never discards an edit or silently changes the editor.
- An invalid active ID never implies pinned. Use pinned only for explicit `__pinned__`; otherwise fall back to the first valid regular note in stored order. If no valid regular note exists, offer a New note recovery action.
- Active-ID repair is persisted only after explicit valid selection or note creation; rendering a fallback alone does not write.

### Edit a note

- Title and content changes update the selected note optimistically.
- Every actual title or content change sets `updatedAt` to the action's `Date.now()` value exactly once.
- Favorite changes also update `updatedAt`, because they are an intentional note edit.
- A no-op update does not change timestamps or trigger a write.
- Editing shows the existing Saving/Saved/Auto-saves affordance. This is a local persistence status and must not claim confirmed cloud synchronization.
- Character count is the current content string's UTF-16 `length`.
- Last edited is derived from `updatedAt`. If a legacy note has no timestamp, omit the value or show `Last edited unknown`; never invent a timestamp during read.

### Clear content

- **Clear content** is disabled when content is already empty.
- Confirmation is required before clearing.
- It clears only `content`, preserves title/favorite/unknown fields, and updates `updatedAt`.
- It does not delete the note.

### Delete a regular note

- The pinned note cannot be deleted.
- A regular note may be permanently deleted only when more than one valid regular note remains, preserving the current last-note protection.
- Confirmation clearly states that deletion is permanent and cannot be undone.
- After deleting the active note, select the first remaining regular note in stored order. If none is eligible, fall back safely without manufacturing or deleting data.
- Deletion removes only the selected regular-note record. No archive or trash record is created.

## Search and Favorites

Search is local, case-insensitive, Unicode-normalized with NFKC, trimmed, and whitespace-collapsed. It token-prefix matches each query token against a note's title and Markdown source.

Ranking is deterministic:

1. Exact normalized title match.
2. Title prefix match.
3. Other title-token match.
4. Body match.

Within the same tier, retain the existing `brainDumpNotes` array order. The pinned note remains a separately rendered system result above regular results when it matches.

Search-result previews are at most 160 characters:

- For title matches, show a bounded beginning excerpt from content when available.
- For body matches, show a whitespace-collapsed excerpt around the first match.
- Empty content displays `Empty note`.
- Previews are derived in memory and never persisted.

Search begins after the user enters a non-empty query. Version one does not use fuzzy edit distance, semantic search, remote APIs, query history, or query persistence.

The **Favorites** filter includes favorite regular notes plus the permanent pinned note, subject to the current search query. Search and Favorites compose with logical AND. Favorite metadata does not alter note order or create a separate stored list.

## Data model and storage keys

No new synchronized storage key is required. Version one enhances records stored in the three existing keys.

All epoch fields are integer milliseconds from `Date.now()`, not ISO strings. New user-created IDs use `crypto.randomUUID()` and are created only during a confirmed user action, never during render. `__pinned__` remains a reserved UI ID and must never be generated for a regular note.

### Enhanced regular notes: `brainDumpNotes`

```js
[
  {
    id: "0f75466a-0e75-4ad1-95b5-9ee27ddc2f9d",
    title: "Portfolio ideas",
    content: "## Next steps\n\nDraft the case study.",
    contentFormat: "markdown",
    favorite: true,
    createdAt: 1786272000000,
    updatedAt: 1786272300000
  }
]
```

Rules:

- `id`, `title`, and `content` remain compatible with the current shape and normalize to strings for runtime use.
- `contentFormat` is `markdown` for version-one records. It is metadata and never causes legacy content to be rewritten.
- `favorite` defaults to `false`.
- `createdAt` and `updatedAt` are recorded for new notes. Missing legacy values remain `0` in normalized runtime selectors until that record is written forward.
- Array order is authoritative for display. Sorting must not rewrite or reorder the array.
- Unknown fields are preserved on write-forward updates.

### Enhanced pinned note: `brainDumpPinnedNote`

```js
{
  title: "Pinned",
  content: "Call the dentist.",
  contentFormat: "markdown",
  createdAt: 1786272000000,
  updatedAt: 1786272300000
}
```

Pinned has no stored `id` or `favorite` field. Its runtime identity is always `__pinned__`, and selectors treat it as active and favorite.

Provide shared pinned-note update actions that preserve unknown fields and update `updatedAt` only when title or content actually changes. Brain Dump, Overview, and any future Today quick-capture integration must use these actions once enhanced metadata exists. An older deployed build that writes only `{ title, content }` remains defensively readable.

### Selected note: `brainDumpActiveId`

The key remains a regular-note ID, `__pinned__`, or `null`. It is not expanded to store search, Favorites, Markdown mode, mobile-sheet state, or editor state.

## Migration and backward compatibility

No destructive or eager whole-array migration runs on mount. Normalize legacy fields defensively in memory and use **lazy write-forward migration** only for the individual record the user changes or creates. This avoids a stale local cache overwriting a newer remote document while `useSyncedStorage` awaits its first snapshot.

| Existing data | Version-one read behavior | First write-forward behavior |
|---|---|---|
| Legacy regular note `{ id, title, content }` | Preserve all three values; treat as non-favorite Markdown; use `0` for missing timestamps. | Add missing optional fields only to that changed record; preserve unknown fields and leave siblings untouched. |
| Legacy pinned note `{ title, content }` | Preserve both strings; treat as a favorite Markdown note; use `0` for missing timestamps. | Merge enhanced metadata while preserving title/content and unknown fields. |
| `brainDumpActiveId: null` | Display the first valid regular note without immediately writing. | Write only on explicit selection or note creation. |
| Missing/deleted active ID | Fall back safely to the first valid regular note; never infer pinned. | Repair only after explicit selection or creation. |
| Malformed or duplicate regular record | Ignore only the invalid record; the first deterministic valid duplicate-ID winner remains visible. | Never auto-delete malformed remote data. |

Legacy note order is retained exactly. Do not sort legacy records by missing timestamps and do not invent `Date.now()` values while reading. When a legacy note is first changed, use that action's `now` for missing `createdAt` and `updatedAt`.

The feature must not read, write, migrate, or otherwise alter any To-Do, recurring-task, Habit, Job, Planner, authentication, or settings key.

## Universal Command Palette contract

Universal Command Palette owns its global shell, shortcut, cross-feature grouping, and ranking. Connected Brain Dump owns the canonical note selector and exposes a pure provider compatible with the Palette's documented contract:

```ts
type SearchResult = {
  id: string
  providerId: string
  group: 'notes'
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

Implement `brainDumpSearchProvider` with `id: 'notes'`. It receives normalized current regular and pinned notes, returns bounded results, and performs no writes. Each result target is `{ view: 'braindump', target: { kind: 'note', id } }`, using `__pinned__` for pinned.

Brain Dump's page search reuses the same normalization and preview helpers, while owning its local query and Favorites filter. If Palette note capture exists, it must call a shared `createBrainDumpNote` action so captured notes receive version-one defaults and are prepended consistently.

The app-shell note navigation intent is ephemeral. Brain Dump consumes a note intent by selecting the target note, clearing local search/Favorites only if needed to make the result visible, opening Edit mode, focusing the title, and then clearing the intent. The intent is never persisted.

This PRD does not add global Palette UI and does not require any To-Do navigation receiver.

## Component and domain responsibilities

Implementation should split pure behavior from the current `BrainDump.jsx` without over-componentizing the small UI:

| Module/component | Responsibility |
|---|---|
| `src/domain/brainDump.js` | Pure normalization, validation, shared note creation/update/deletion actions, pinned update actions, favorite handling, ID boundaries, and timestamp rules. No React or Firebase writes. |
| `src/domain/brainDumpSearch.js` | Pure text normalization, matching, ranking, preview extraction, local page results, and `brainDumpSearchProvider`. |
| `src/components/BrainDump.jsx` | Own synchronized bindings and local UI state; compose browser/editor; manage save-status timers, mobile sheet, confirmation flows, and focus. |
| `NoteBrowser` | New note, search, Favorites filter, pinned/regular results, keyboard selection, result count, and empty states. It may remain colocated if concise. |
| `NoteEditor` | Title, favorite, Edit/Preview, safe Markdown rendering, Delete, Clear content, status, count, and last-edited metadata. It may remain colocated if concise. |
| `src/components/Overview.jsx` | Continue displaying/editing pinned title/content only, but delegate mutation to the shared updater so metadata is preserved. |
| `src/App.jsx` | Own and clear an ephemeral note navigation intent if Palette integration is present. |

Do not add `taskIngress`, task destination dialogs, link panels, checklist panels, conversion records, or To-Do receiver changes.

Do not mount a second independent set of `useSyncedStorage` hooks solely for search or Palette integration. Provider adapters consume the already synchronized snapshot.

## Persistence, offline, and conflict behavior

- Every persisted mutation uses `useSyncedStorage` for its existing key.
- Local state and `localStorage` update immediately; Firestore writes retain the hook's existing one-second debounce.
- Searching, filtering, rendering previews, switching Edit/Preview, opening the mobile sheet, and calculating character count must never write to storage.
- Explicit note selection may update `brainDumpActiveId`; it does not modify or reorder the selected note.
- UI status may say `Saving…`, `Saved`, or `Auto-saves` based on local timers. It must not claim confirmed cloud synchronization.
- Offline status does not disable drafting, searching, favoriting, deletion, or Clear content. `navigator.onLine` is advisory only.
- Remote snapshots replace whole values per key. Before permanent deletion or Clear content, use the latest normalized in-memory record and cancel safely if it is no longer available.
- Concurrent changes to different regular notes can still conflict because `brainDumpNotes` is one last-write-wins value. Version one does not promise field-level merging.
- Defensive selectors skip malformed records while rendering valid siblings and never auto-delete malformed remote data.

## Responsive and accessibility requirements

- The layout remains usable at 320 px. Below 768 px, the note browser uses the shared accessible bottom sheet and the editor remains full-width.
- Search, clear-search, Favorites, New note, note rows, favorite, Edit/Preview, Delete, Clear content, and close-sheet controls are labelled semantic buttons/inputs and keyboard reachable.
- Note rows use buttons or an equivalent correct roving-tabindex pattern; clickable non-semantic `div`s in the current sidebar must be replaced.
- Search uses `type="search"`, has an explicit label, and exposes result count through a polite live region without announcing every keystroke.
- Current selection, favorite state, active filter, and Markdown mode are conveyed programmatically (`aria-current`, `aria-pressed`, and appropriate labels) as well as visually.
- Deletion and Clear content use accessible confirmation dialogs: labelled modal, focus trap, Escape close, focus restoration, no background interaction, and Cancel as default focus.
- Touch targets are at least 44 by 44 CSS pixels where practical. Hover may reveal an affordance but cannot be its sole access path.
- Preview headings, lists, quotes, links, and code are readable by assistive technology. External safe links use `rel="noreferrer noopener"`.
- Respect `prefers-reduced-motion` for the bottom sheet and status transitions.
- Maintain dark-theme contrast for muted metadata, selected rows, focus rings, favorite state, errors, and destructive actions. Do not rely on color alone.

## Loading, empty, error, and validation states

| Situation | Required behavior |
|---|---|
| Initial local render / remote hydration | Render cached or initial normalized notes immediately; do not block on Firestore or show a fake loading spinner. |
| No valid regular note | Keep pinned accessible and show a New note recovery action. |
| No search results | Show `No notes match “query”` with Clear search. |
| No favorite regular notes | Pinned remains visible when otherwise matched; explain that no regular favorites exist. |
| Active note outside results | Keep it open with `Outside current results` and Clear filters. |
| Invalid title/content length | Retain entered value in local UI, identify the limit, focus the invalid field on submit/blur as appropriate, and do not persist an invalid value. |
| Note removed remotely before Clear/Delete | Cancel safely and state that the note is no longer available. |
| Malformed persisted record | Skip only the invalid record/field and show valid siblings; log a non-sensitive development warning. |
| Firestore write/subscription error | Preserve optimistic local UI under the existing hook; never discard a draft because cloud sync is unavailable. |

## Testing requirements

Add deterministic Vitest domain tests. Component/browser tests are strongly recommended for search, focus, Markdown preview, and mobile behavior.

At minimum cover:

- Legacy regular and pinned normalization preserves `id`, `title`, `content`, unknown fields, and array order without eager mutation.
- `__pinned__` is never generated as a regular-note ID.
- New-note creation prepends the record and produces valid timestamps/default metadata.
- Title/content/favorite updates preserve unknown fields, update `updatedAt` exactly once, and ignore no-op changes.
- Shared pinned updates from Brain Dump and Overview preserve enhanced metadata.
- Markdown sanitization renders raw HTML as text and permits only documented link schemes.
- Search normalization, token-prefix matching, exact-title ranking, body excerpts, 160-character bounds, pinned handling, and stable array-order ties.
- Favorites and search compose with AND; neither query nor filter state is persisted.
- Search, preview, filter changes, count rendering, and mobile-sheet opening cause no storage write.
- Permanent deletion protects pinned and the final regular note, requires confirmation, removes only the target, and selects a safe fallback.
- Clear content preserves title/favorite/unknown fields and safely handles stale targets.
- Invalid or duplicate persisted records do not hide valid siblings or trigger cleanup writes.
- Palette provider results and note navigation intents are bounded, pure, and use `__pinned__` correctly.

Recommended React tests cover keyboard note selection, focus after New note and search-result selection, Favorites filtering, Edit/Preview mode, accessible confirmations, active-note-outside-results behavior, and the mobile bottom-sheet flow.

Manual verification must include a clean production build, TopBar and Overview navigation, pinned edits from both Brain Dump and Overview, localStorage reload, offline drafting, permanent-delete confirmation, and a two-tab/device Firestore last-write-wins scenario.

## Rollout

1. Add pure note normalization/update and search/preview modules with unit coverage.
2. Add a vetted Markdown parser/sanitizer configured to the fixed safe subset.
3. Update Brain Dump UI with search, Favorites, Edit/Preview, metadata, confirmations, and the responsive bottom sheet while retaining all three existing storage keys.
4. Update Overview to use the shared pinned-note updater without changing its visible card.
5. Add or update the Universal Command Palette note provider/capture integration only when the Palette contract exists; do not add its global UI in this feature branch.
6. Verify remote hydration does not eagerly rewrite old note arrays, then release without a feature flag for this personal dashboard.

Update `README.md` and `Full.md` only in the implementation change that ships the feature, not as part of this PRD-only revision.

## Acceptance criteria

The feature is complete when all of the following are true:

1. Existing pinned and regular notes, IDs, titles, content, active selection, and array order remain accessible after upgrade; no eager migration overwrites remote data.
2. The default browser shows pinned first and regular notes in stored order; newly created notes are prepended, and opening/editing never reorders notes.
3. Local search covers titles and Markdown source with deterministic ranking and bounded result previews.
4. Users can favorite/unfavorite regular notes and filter to Favorites without changing stored order.
5. Pinned remains permanent, is treated as a favorite, and stays compatible with Overview through a metadata-preserving updater.
6. Notes store Markdown source in `content`, offer a safe Preview, and never execute raw HTML or persist rendered HTML.
7. The editor displays local save status, character count, and last-edited metadata.
8. Clear content requires confirmation, clears only the body, and preserves all other note data.
9. Eligible regular notes can be permanently deleted with confirmation; pinned and the final regular note remain protected.
10. No tags, Recent section, sort menu, checklists, archive, note links, task conversion, task provenance, or conversion Undo is introduced.
11. No To-Do component, key, task shape, task ID behavior, or navigation receiver changes as part of this feature.
12. Search, filtering, preview, and other read-only interactions do not write synchronized data.
13. All persistence continues through the existing localStorage/Firestore hook and remains usable offline under its current last-write-wins constraints.
14. The UI is keyboard, screen-reader, touch, narrow-screen, and reduced-motion usable as specified.
15. The pure note provider can expose and open Brain Dump results through the Universal Command Palette contract without requiring the Palette UI to ship with this feature.
16. Deterministic tests cover normalization, ordering, updates/timestamps, Markdown safety, search/ranking/previews, Favorites, deletion, Clear content, malformed data, and Palette targets.

## Dependencies

- Existing `useSyncedStorage` and Firestore configuration; no new backend service or synchronized key.
- A vetted client-side Markdown parser/sanitizer compatible with React 18/Vite and configured to the fixed policy above.
- The Universal Command Palette's documented `NavigationIntent` and `SearchProvider` types for optional shared integration. Brain Dump remains fully usable if Palette has not shipped.
- The shared accessible bottom-sheet pattern described by the Navigation and Responsive UI requirements.

## Risks and tradeoffs

| Risk/tradeoff | Resolution in version one |
|---|---|
| Whole-array Firestore replacement can lose concurrent changes. | Preserve the current platform behavior, read current in-memory state before destructive actions, and do not promise merge conflict resolution. |
| Markdown is less discoverable than rich text. | Provide a visible Edit/Preview toggle and concise Markdown hints while preserving plain-text simplicity. |
| Permanent deletion has no recovery path. | Require explicit confirmation, clearly label permanence, protect pinned, and retain the existing final-regular-note guard. |
| Favorites live inside the shared notes array. | Preserve unknown fields and update only the targeted record through pure actions; defer item-level documents. |
| Legacy notes lack timestamps. | Show unknown/omit metadata until first edit and never invent timestamps during read. |
| Search previews can expose sensitive text on screen. | Keep search local, bound excerpts, persist no query telemetry, and call no external search API. |

## Resolved product decisions

1. **Search:** include local title/body search and bounded result previews.
2. **Favorites:** include a regular-note toggle and filter; pinned behaves as a favorite.
3. **Ordering:** keep the current fixed order rather than adding sorting controls.
4. **Recent notes:** do not add a duplicated recent-shortcuts section.
5. **Markdown:** include source editing and safe Preview.
6. **Mobile:** include the bottom-sheet note browser below 768 px.
7. **Metadata:** show save status, character count, and last-edited time.
8. **Deletion:** keep confirmed permanent deletion and final-note protection; do not replace it with archive.
9. **Clear content:** retain it with confirmation.
10. **Pinned:** retain the permanent Overview-compatible pinned note.
11. **Palette:** expose note search/navigation integration without building the global Palette UI here.
12. **Excluded systems:** no tags, checklists, links, task conversion, archive, To-Do changes, or associated storage models.

## Future considerations

The following ideas are explicitly deferred and require a new product decision before implementation:

- Tags, tag management, Recent notes, sorting choices, saved searches, archive/restore, trash retention, and bulk actions.
- Structured checklists or Markdown task-list interoperability.
- Note-to-task/date links, note-text conversion, checklist conversion, task provenance, idempotency records, and Undo.
- Note-to-note links, backlinks, graph view, notebooks, attachments, tables, drawings, export/import, or collaborative editing.
- AI summarization, semantic search, suggested organization, or external indexing.
- Item-level Firestore documents, revisions, or merge strategies if concurrent editing becomes material.
