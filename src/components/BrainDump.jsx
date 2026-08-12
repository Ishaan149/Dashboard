import { useEffect, useMemo, useRef, useState } from 'react'
import {
  clearBrainDumpNote,
  clearPinnedNote,
  createBrainDumpNote,
  deleteBrainDumpNote,
  normalizePinnedNote,
  normalizeRegularNotes,
  NOTE_CONTENT_LIMIT,
  NOTE_TITLE_LIMIT,
  PINNED_NOTE_ID,
  updateBrainDumpNote,
  updatePinnedNote,
} from '../domain/brainDump'
import { renderMarkdownPreview } from '../domain/brainDumpMarkdown'
import { getBrainDumpPageResults } from '../domain/brainDumpSearch'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { BottomSheet, Button, Dialog, useToast } from './ui'
import styles from './BrainDump.module.css'

function SearchIcon() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
}

function StarIcon({ filled = false }) {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>
}

function NotesIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
}

function BoltIcon({ filled = false }) {
  return <svg viewBox="0 0 24 24" width="17" height="17" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
}

function displayTitle(note) {
  if (note.title) return note.title
  return 'Untitled'
}

function NoteRow({ note, pinned = false, active, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.noteItem} ${pinned ? styles.pinnedItem : ''} ${active ? styles.noteItemActive : ''}`}
      onClick={() => onSelect(note.id)}
      aria-current={active ? 'true' : undefined}
    >
      <span className={styles.noteItemTopline}>
        <span className={styles.noteItemTitle}>{displayTitle(note)}</span>
        {!pinned && note.quickNote && <span className={styles.quickBadge} aria-label="Quick Note"><BoltIcon /></span>}
        {!pinned && note.favorite && <span className={styles.rowFavorite} aria-label="Favorite"><StarIcon filled /></span>}
      </span>
    </button>
  )
}

function NoteBrowser({
  idPrefix,
  query,
  onQueryChange,
  favoritesOnly,
  onToggleFavorites,
  quickNotesOnly,
  onToggleQuickNotes,
  results,
  activeId,
  onSelect,
  onNewNote,
  searchRef,
}) {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      const suffix = results.count === 1 ? 'result' : 'results'
      setAnnouncement(`${results.count} ${suffix}`)
    }, 350)
    return () => clearTimeout(timer)
  }, [results.count])

  const noRegularFavorites = favoritesOnly && results.regular.length === 0

  return (
    <div className={styles.browser}>
      <div className={styles.browserTools}>
        <div className={styles.searchWrap}>
          <label className={styles.srOnly} htmlFor={`${idPrefix}-search`}>Search notes</label>
          <SearchIcon />
          <input
            ref={searchRef}
            id={`${idPrefix}-search`}
            type="search"
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Search"
            autoComplete="off"
          />
          {query && (
            <button type="button" className={styles.clearSearch} onClick={() => onQueryChange('')} aria-label="Clear note search">×</button>
          )}
        </div>
        <Button variant="secondary" className={styles.newBtn} onClick={onNewNote}>+ New</Button>
      </div>

      <div className={styles.filters}>
        <button
          type="button"
          className={`${styles.filterBtn} ${styles.filterIconBtn} ${favoritesOnly ? styles.filterBtnActive : ''}`}
          onClick={onToggleFavorites}
          aria-pressed={favoritesOnly}
          title="Favorites"
        >
          <StarIcon filled={favoritesOnly} /><span className={styles.srOnly}>Favorites</span>
        </button>
        <button
          type="button"
          className={`${styles.filterBtn} ${styles.filterIconBtn} ${quickNotesOnly ? styles.quickFilterActive : ''}`}
          onClick={onToggleQuickNotes}
          aria-pressed={quickNotesOnly}
          title="Quick Notes"
        >
          <BoltIcon filled={quickNotesOnly} /><span className={styles.srOnly}>Quick Notes</span>
        </button>
      </div>

      <p className={styles.resultSummary} aria-hidden="true"><span>All notes</span><span>{results.count}</span></p>
      <p className={styles.srOnly} aria-live="polite">{announcement}</p>

      <div className={styles.noteList}>
        {results.pinned && (
          <>
            <NoteRow note={results.pinned} pinned active={activeId === PINNED_NOTE_ID} onSelect={onSelect} />
            {results.regular.length > 0 && <div className={styles.divider} aria-hidden="true" />}
          </>
        )}

        {results.regular.map(note => (
          <NoteRow key={note.id} note={note} active={activeId === note.id} onSelect={onSelect} />
        ))}

        {results.count === 0 && (
          <div className={styles.emptyResults}>
            <p>{query
              ? `No notes match “${query}”`
              : quickNotesOnly && favoritesOnly
                ? 'No favorite Quick Notes yet'
                : quickNotesOnly
                  ? 'No Quick Notes yet'
                  : 'No favorite notes yet'}</p>
            {query && <button type="button" onClick={() => onQueryChange('')}>Clear search</button>}
          </div>
        )}

        {noRegularFavorites && results.pinned && (
          <p className={styles.filterHint}>No regular favorites match. Your permanent pinned note is always a favorite.</p>
        )}
      </div>
    </div>
  )
}

export default function BrainDump() {
  const [notes, setNotes] = useSyncedStorage('brainDumpNotes', [])
  const [activeId, setActiveId] = useSyncedStorage('brainDumpActiveId', null)
  const [pinnedNote, setPinnedNote] = useSyncedStorage('brainDumpPinnedNote', { title: 'Pinned', content: '' })
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [quickNotesOnly, setQuickNotesOnly] = useState(false)
  const [mode, setMode] = useState('edit')
  const [mobileBrowserOpen, setMobileBrowserOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [draft, setDraft] = useState(null)
  const titleRef = useRef(null)
  const searchRef = useRef(null)
  const cancelRef = useRef(null)
  const noteActionsRef = useRef(null)
  const notesRef = useRef(notes)
  const pinnedRef = useRef(pinnedNote)
  const { showToast } = useToast()

  notesRef.current = notes
  pinnedRef.current = pinnedNote

  const validNotes = useMemo(() => normalizeRegularNotes(notes, { warn: true }), [notes])
  const normalizedPinned = useMemo(() => normalizePinnedNote(pinnedNote), [pinnedNote])
  const explicitPinned = activeId === PINNED_NOTE_ID
  const selectedRegular = explicitPinned ? null : validNotes.find(note => note.id === activeId)
  const activeNote = explicitPinned ? normalizedPinned : (selectedRegular ?? validNotes[0] ?? null)
  const effectiveActiveId = activeNote?.id ?? null
  const isPinned = effectiveActiveId === PINNED_NOTE_ID
  const results = useMemo(
    () => getBrainDumpPageResults({ notes, pinnedNote, query, favoritesOnly, quickNotesOnly }),
    [notes, pinnedNote, query, favoritesOnly, quickNotesOnly],
  )
  const resultIds = useMemo(() => new Set([
    ...(results.pinned ? [PINNED_NOTE_ID] : []),
    ...results.regular.map(note => note.id),
  ]), [results])
  const filtersActive = Boolean(query.trim() || favoritesOnly || quickNotesOnly)
  const outsideResults = Boolean(activeNote && filtersActive && !resultIds.has(activeNote.id))

  useEffect(() => {
    if (!activeNote) {
      setDraft(null)
      return
    }
    setDraft(previous => {
      const invalidLocalDraft = previous?.id === activeNote.id
        && (previous.title.length > NOTE_TITLE_LIMIT || previous.content.length > NOTE_CONTENT_LIMIT)
      if (invalidLocalDraft) return previous
      return { id: activeNote.id, title: activeNote.title, content: activeNote.content }
    })
  }, [activeNote?.id, activeNote?.title, activeNote?.content])

  useEffect(() => {
    function handleOutsidePress(event) {
      const menu = noteActionsRef.current
      if (menu?.open && !menu.contains(event.target)) menu.removeAttribute('open')
    }

    function handleEscape(event) {
      const menu = noteActionsRef.current
      if (event.key !== 'Escape' || !menu?.open) return
      menu.removeAttribute('open')
      menu.querySelector('summary')?.focus()
    }

    document.addEventListener('pointerdown', handleOutsidePress)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePress)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function focusTitle() {
    // Let a closing BottomSheet restore its trigger first, then move focus to
    // the selected note as the final, intentional destination.
    setTimeout(() => requestAnimationFrame(() => titleRef.current?.focus()), 0)
  }

  function selectNote(id) {
    if (id !== activeId) setActiveId(id)
    setMode('edit')
    setMobileBrowserOpen(false)
    focusTitle()
  }

  function addNote() {
    const created = createBrainDumpNote(notesRef.current)
    setNotes(created.notes)
    setActiveId(created.note.id)
    setMode('edit')
    setMobileBrowserOpen(false)
    focusTitle()
  }

  function persistField(field, value) {
    if (!activeNote) return
    if (field === 'title' && value.length > NOTE_TITLE_LIMIT) return
    if (field === 'content' && value.length > NOTE_CONTENT_LIMIT) return

    const now = Date.now()
    if (isPinned) {
      setPinnedNote(previous => updatePinnedNote(previous, { [field]: value }, now))
    } else {
      setNotes(previous => updateBrainDumpNote(previous, activeNote.id, { [field]: value }, now))
    }
  }

  function updateDraft(field, value) {
    setDraft(previous => ({
      id: activeNote.id,
      title: previous?.id === activeNote.id ? previous.title : activeNote.title,
      content: previous?.id === activeNote.id ? previous.content : activeNote.content,
      [field]: value,
    }))
    const current = draft?.id === activeNote.id ? draft[field] : activeNote[field]
    if (value !== current) persistField(field, value)
  }

  function toggleFavorite() {
    if (!activeNote || isPinned) return
    const now = Date.now()
    setNotes(previous => updateBrainDumpNote(previous, activeNote.id, { favorite: !activeNote.favorite }, now))
  }

  function clearFilters() {
    setQuery('')
    setFavoritesOnly(false)
    setQuickNotesOnly(false)
  }

  function confirmClear() {
    if (!activeNote) return
    const now = Date.now()
    if (activeNote.id === PINNED_NOTE_ID) {
      const result = clearPinnedNote(pinnedRef.current, now)
      if (!result.cleared) {
        showToast('The pinned note is already empty.', { tone: 'info' })
      } else {
        setPinnedNote(result.note)
      }
    } else {
      const result = clearBrainDumpNote(notesRef.current, activeNote.id, now)
      if (!result.cleared) {
        showToast(result.reason === 'missing' ? 'That note is no longer available.' : 'The note is already empty.', { tone: result.reason === 'missing' ? 'error' : 'info' })
      } else {
        setNotes(result.notes)
      }
    }
    setConfirmation(null)
  }

  function confirmDelete() {
    if (!activeNote || isPinned) return
    const result = deleteBrainDumpNote(notesRef.current, activeNote.id)
    if (!result.deleted) {
      const message = result.reason === 'missing'
        ? 'That note is no longer available.'
        : 'The final regular note cannot be deleted.'
      showToast(message, { tone: result.reason === 'missing' ? 'error' : 'info' })
    } else {
      setNotes(result.notes)
      setActiveId(result.nextActiveId)
      setMode('edit')
      focusTitle()
    }
    setConfirmation(null)
  }

  const hasActiveDraft = Boolean(draft && activeNote && draft.id === activeNote.id)
  const draftTitle = hasActiveDraft ? draft.title : (activeNote?.title ?? '')
  const draftContent = hasActiveDraft ? draft.content : (activeNote?.content ?? '')
  const titleInvalid = draftTitle.length > NOTE_TITLE_LIMIT
  const contentInvalid = draftContent.length > NOTE_CONTENT_LIMIT
  const titleOverage = Math.max(0, draftTitle.length - NOTE_TITLE_LIMIT)
  const contentOverage = Math.max(0, draftContent.length - NOTE_CONTENT_LIMIT)
  const canDelete = !isPinned && validNotes.length > 1
  const browserProps = {
    query,
    onQueryChange: setQuery,
    favoritesOnly,
    onToggleFavorites: () => setFavoritesOnly(value => !value),
    quickNotesOnly,
    onToggleQuickNotes: () => setQuickNotesOnly(value => !value),
    results,
    activeId: effectiveActiveId,
    onSelect: selectNote,
    onNewNote: addNote,
    searchRef,
  }

  return (
    <>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Note browser">
          <NoteBrowser {...browserProps} idPrefix="brain-dump-rail" />
        </aside>

        <section className={styles.editor} aria-label="Note editor">
          <div className={styles.mobileTopbar}>
            <Button variant="secondary" onClick={() => setMobileBrowserOpen(true)}><NotesIcon /> Notes</Button>
          </div>

          {activeNote ? (
            <>
              {outsideResults && (
                <div className={styles.outsideNotice} role="status">
                  <span>Outside current results</span>
                  <button type="button" onClick={clearFilters}>Clear filters</button>
                </div>
              )}

              <div className={styles.titleRow}>
                <input
                  ref={titleRef}
                  className={`${styles.titleInput} ${titleInvalid ? styles.invalidField : ''}`}
                  value={draftTitle}
                  onChange={event => updateDraft('title', event.target.value)}
                  placeholder="Untitled"
                  aria-label="Note title"
                  aria-invalid={titleInvalid}
                  aria-describedby={titleInvalid ? 'note-title-error' : undefined}
                />
                <div className={styles.titleActions}>
                  {isPinned ? (
                    <span className={styles.pinnedControl} title="Permanent favorite"><StarIcon filled /><span className={styles.srOnly}>Permanent favorite</span></span>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.favoriteBtn} ${activeNote.favorite ? styles.favoriteBtnActive : ''}`}
                      onClick={toggleFavorite}
                      aria-pressed={activeNote.favorite}
                      aria-label={activeNote.favorite ? 'Remove note from favorites' : 'Add note to favorites'}
                      title={activeNote.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    ><StarIcon filled={activeNote.favorite} /></button>
                  )}
                  <details ref={noteActionsRef} className={styles.moreMenu}>
                    <summary role="button" aria-label="Note actions" title="Note actions"><MoreIcon /></summary>
                    <div className={styles.moreMenuPopover}>
                      <button type="button" onClick={() => { noteActionsRef.current?.removeAttribute('open'); setConfirmation('clear') }} disabled={!draftContent}>Clear content</button>
                      {!isPinned && (
                        <button
                          type="button"
                          className={styles.menuDelete}
                          onClick={() => { noteActionsRef.current?.removeAttribute('open'); setConfirmation('delete') }}
                          disabled={!canDelete}
                          title={canDelete ? 'Permanently delete note' : 'The final regular note cannot be deleted'}
                        >Delete note</button>
                      )}
                    </div>
                  </details>
                </div>
              </div>
              {titleInvalid && <p id="note-title-error" className={styles.validationError}>Title is {titleOverage} {titleOverage === 1 ? 'character' : 'characters'} over the {NOTE_TITLE_LIMIT}-character limit. Shorten it to save.</p>}

              <div className={styles.modeBar}>
                <div className={styles.modeToggle} aria-label="Markdown mode">
                  <button type="button" className={mode === 'edit' ? styles.modeActive : ''} onClick={() => setMode('edit')} aria-pressed={mode === 'edit'}>Edit</button>
                  <button type="button" className={mode === 'preview' ? styles.modeActive : ''} onClick={() => setMode('preview')} aria-pressed={mode === 'preview'}>Preview</button>
                </div>
              </div>

              {mode === 'edit' ? (
                <div className={styles.editSurface}>
                  <textarea
                    key={activeNote.id}
                    className={`${styles.area} ${contentInvalid ? styles.invalidField : ''}`}
                    value={draftContent}
                    onChange={event => updateDraft('content', event.target.value)}
                    placeholder="Start writing in Markdown…"
                    aria-label="Note content"
                    aria-invalid={contentInvalid}
                    aria-describedby={contentInvalid ? 'note-content-error' : undefined}
                    spellCheck
                  />
                  {contentInvalid && <p id="note-content-error" className={styles.validationError}>Content is {contentOverage.toLocaleString()} {contentOverage === 1 ? 'character' : 'characters'} over the {NOTE_CONTENT_LIMIT.toLocaleString()}-character limit. Shorten it to save.</p>}
                </div>
              ) : (
                <div className={styles.previewSurface}>
                  {draftContent ? (
                    <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(draftContent) }} />
                  ) : (
                    <p className={styles.previewEmpty}>Nothing to preview yet.</p>
                  )}
                  <Button variant="secondary" className={styles.previewEditBtn} onClick={() => setMode('edit')}>Edit Markdown</Button>
                </div>
              )}

            </>
          ) : (
            <div className={styles.emptyEditor}>
              <h2>No regular notes yet</h2>
              <p>Create a note to start writing, or open your permanent pinned note.</p>
              <div>
                <Button variant="primary" onClick={addNote}>New note</Button>
                <Button variant="secondary" onClick={() => selectNote(PINNED_NOTE_ID)}>Open pinned note</Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <BottomSheet
        open={mobileBrowserOpen}
        onClose={() => setMobileBrowserOpen(false)}
        title="Notes"
        description="Search, filter, and choose a note."
        initialFocusRef={searchRef}
      >
        <div className={styles.sheetBrowser}><NoteBrowser {...browserProps} idPrefix="brain-dump-sheet" /></div>
      </BottomSheet>

      <Dialog
        open={confirmation === 'clear'}
        onClose={() => setConfirmation(null)}
        title="Clear note content?"
        description="This removes the entire note body but keeps its title, favorite state, and metadata."
        initialFocusRef={cancelRef}
        footer={(
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => setConfirmation(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmClear}>Clear content</Button>
          </>
        )}
      />

      <Dialog
        open={confirmation === 'delete'}
        onClose={() => setConfirmation(null)}
        title="Permanently delete this note?"
        description="This deletion cannot be undone. Only this regular note will be removed."
        initialFocusRef={cancelRef}
        footer={(
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => setConfirmation(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete permanently</Button>
          </>
        )}
      />
    </>
  )
}
