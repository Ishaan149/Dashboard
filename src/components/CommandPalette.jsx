import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createBrainDumpNote, NOTE_TITLE_LIMIT } from '../domain/brainDump'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { NAV_ITEMS, NavigationIcon } from './navigation'
import { Button, IconButton, useToast } from './ui'
import { useModalFocus } from './ui/useModalFocus'
import styles from './CommandPalette.module.css'

const QUICK_NOTE_CONTENT_LIMIT = 10_000

const NAVIGATION_KEYWORDS = {
  overview: ['overview', 'home', 'dashboard'],
  todo: ['tasks', 'todos'],
  braindump: ['brain', 'notes'],
  jobs: ['jobs', 'applications', 'tracker'],
  habits: ['habit', 'tracker'],
  dayplanner: ['planner', 'calendar', 'schedule'],
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
}

function BoltIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
}

function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim().replace(/\s+/gu, ' ')
}

function matchesQuery(item, query) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return true
  const queryTokens = normalizedQuery.split(' ')
  const candidateTokens = normalize([item.label, ...(item.keywords ?? [])].join(' ')).split(' ')
  return queryTokens.every(token => candidateTokens.some(candidate => candidate.startsWith(token)))
}

function getShortcutLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) return '⌘K'
  return 'Ctrl K'
}

function deriveTitle(content) {
  const firstLine = content.split(/\r?\n/u).map(line => line.trim()).find(Boolean)
  return (firstLine || 'Untitled').slice(0, 80)
}

const CommandPalette = forwardRef(function CommandPalette({ activeView, onNavigate }, ref) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('root')
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [notes, setNotes] = useSyncedStorage('brainDumpNotes', [])
  const [, setActiveId] = useSyncedStorage('brainDumpActiveId', null)
  const panelRef = useRef(null)
  const queryRef = useRef(null)
  const contentRef = useRef(null)
  const titleRef = useRef(null)
  const openRef = useRef(false)
  const stepRef = useRef('root')
  const { showToast } = useToast()

  openRef.current = open
  stepRef.current = step

  const quickNoteCommand = useMemo(() => ({
    id: 'note.quick',
    kind: 'action',
    label: 'New Quick Note',
    keywords: ['quick note', 'capture', 'write', 'brain dump'],
  }), [])

  const navigationCommands = useMemo(() => NAV_ITEMS.map(item => ({
    id: `navigate.${item.id}`,
    kind: 'navigation',
    view: item.id,
    label: item.label,
    icon: item.icon,
    keywords: NAVIGATION_KEYWORDS[item.id],
  })), [activeView])

  const groups = useMemo(() => {
    const actionMatches = matchesQuery(quickNoteCommand, query) ? [quickNoteCommand] : []
    const navigationMatches = navigationCommands.filter(item => matchesQuery(item, query))
    return [
      { label: query.trim() ? 'Commands' : 'Suggested', items: actionMatches },
      { label: 'Navigate', items: navigationMatches },
    ].filter(group => group.items.length)
  }, [navigationCommands, query, quickNoteCommand])

  const options = useMemo(() => groups.flatMap(group => group.items), [groups])

  useEffect(() => setActiveIndex(0), [query])
  useEffect(() => {
    if (activeIndex >= options.length) setActiveIndex(Math.max(0, options.length - 1))
  }, [activeIndex, options.length])

  const resetCapture = useCallback(() => {
    setTitle('')
    setContent('')
    setError('')
  }, [])

  const closeRoot = useCallback(() => {
    openRef.current = false
    setOpen(false)
    setStep('root')
    stepRef.current = 'root'
    setQuery('')
    resetCapture()
  }, [resetCapture])

  const backToRoot = useCallback(() => {
    setStep('root')
    stepRef.current = 'root'
    resetCapture()
    requestAnimationFrame(() => {
      queryRef.current?.focus()
      queryRef.current?.select()
    })
  }, [resetCapture])

  const openPalette = useCallback(() => {
    if (openRef.current) {
      if (stepRef.current !== 'root') backToRoot()
      else requestAnimationFrame(() => {
        queryRef.current?.focus()
        queryRef.current?.select()
      })
      return
    }
    openRef.current = true
    setOpen(true)
    setStep('root')
    stepRef.current = 'root'
  }, [backToRoot])

  useImperativeHandle(ref, () => ({ open: openPalette }), [openPalette])

  useEffect(() => {
    function handleShortcut(event) {
      if (event.defaultPrevented || event.isComposing || event.key.toLocaleLowerCase() !== 'k') return
      if (!(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      openPalette()
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [openPalette])

  const handleDismiss = useCallback(() => {
    if (stepRef.current === 'capture') backToRoot()
    else closeRoot()
  }, [backToRoot, closeRoot])

  useModalFocus({
    open,
    containerRef: panelRef,
    initialFocusRef: queryRef,
    onClose: handleDismiss,
  })

  useEffect(() => {
    if (open && step === 'capture') requestAnimationFrame(() => contentRef.current?.focus())
  }, [open, step])

  function activate(item) {
    if (item.kind === 'action') {
      setStep('capture')
      stepRef.current = 'capture'
      setError('')
      return
    }
    closeRoot()
    setTimeout(() => onNavigate(item.view), 0)
  }

  function handleRootKeyDown(event) {
    if (!options.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex(index => (index + direction + options.length) % options.length)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      activate(options[activeIndex])
    }
  }

  function saveQuickNote(event) {
    event.preventDefault()
    if (!content.trim()) {
      setError('Enter some note content before saving.')
      contentRef.current?.focus()
      return
    }
    if (content.length > QUICK_NOTE_CONTENT_LIMIT) {
      setError(`Quick Notes cannot exceed ${QUICK_NOTE_CONTENT_LIMIT.toLocaleString()} characters.`)
      contentRef.current?.focus()
      return
    }
    const cleanTitle = title.trim()
    if (cleanTitle.length > NOTE_TITLE_LIMIT) {
      setError(`Titles cannot exceed ${NOTE_TITLE_LIMIT} characters.`)
      titleRef.current?.focus()
      return
    }

    const created = createBrainDumpNote(notes, {
      title: cleanTitle || deriveTitle(content),
      content,
      quickNote: true,
    })
    setNotes(created.notes)
    setActiveId(created.note.id)
    closeRoot()
    showToast('Quick Note saved to Brain Dump.')
  }

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop} onMouseDown={event => {
      if (event.target === event.currentTarget) closeRoot()
    }}>
      <section
        ref={panelRef}
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label={step === 'root' ? 'Command palette' : 'Capture Quick Note'}
        tabIndex="-1"
      >
        {step === 'root' ? (
          <>
            <div className={styles.searchRow}>
              <SearchIcon />
              <input
                ref={queryRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={handleRootKeyDown}
                placeholder="Search commands and pages"
                aria-label="Search commands and pages"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-results"
                aria-activedescendant={options[activeIndex] ? `palette-option-${options[activeIndex].id}` : undefined}
                autoComplete="off"
              />
              <IconButton className={styles.closeButton} label="Close command palette" onClick={closeRoot}><CloseIcon /></IconButton>
            </div>
            <div id="command-palette-results" className={styles.results} role="listbox" aria-label="Commands">
              {groups.map(group => (
                <div key={group.label} className={styles.group} role="group" aria-label={group.label}>
                  <p className={styles.groupLabel}>{group.label}</p>
                  {group.items.map(item => {
                    const index = options.indexOf(item)
                    const active = index === activeIndex
                    return (
                      <button
                        id={`palette-option-${item.id}`}
                        key={item.id}
                        type="button"
                        className={`${styles.option} ${active ? styles.optionActive : ''}`}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => activate(item)}
                      >
                        <span className={`${styles.optionIcon} ${item.kind === 'action' ? styles.optionIconAction : ''}`}>{item.kind === 'action' ? <BoltIcon /> : <NavigationIcon name={item.icon} />}</span>
                        <span className={styles.optionText}><strong>{item.label}</strong></span>
                        {item.kind === 'navigation' && item.view === activeView && <span className={styles.currentBadge}>Current</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
              {!options.length && <div className={styles.empty}>No matching commands or pages</div>}
            </div>
          </>
        ) : (
          <form className={styles.captureForm} onSubmit={saveQuickNote}>
            <div className={styles.formHeader}>
              <button type="button" className={styles.backButton} onClick={backToRoot}>← Back</button>
              <IconButton label="Close command palette" onClick={closeRoot}><CloseIcon /></IconButton>
            </div>
            <div className={styles.formIntro}><BoltIcon /><h2>Capture Quick Note</h2></div>
            <label className={styles.field}>
              <span>Note</span>
              <textarea
                ref={contentRef}
                value={content}
                onChange={event => { setContent(event.target.value); setError('') }}
                onKeyDown={event => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) saveQuickNote(event)
                }}
                placeholder="What do you want to remember?"
                maxLength={QUICK_NOTE_CONTENT_LIMIT}
                aria-invalid={Boolean(error && !content.trim())}
                aria-describedby={error ? 'quick-note-error' : 'quick-note-hint'}
              />
            </label>
            <p id="quick-note-hint" className={styles.hint}>Markdown supported · {content.length.toLocaleString()} / {QUICK_NOTE_CONTENT_LIMIT.toLocaleString()}</p>
            <label className={styles.field}>
              <span>Title <small>Optional</small></span>
              <input ref={titleRef} value={title} onChange={event => { setTitle(event.target.value); setError('') }} maxLength={NOTE_TITLE_LIMIT} placeholder="Derived from the first line if blank" />
            </label>
            {error && <p id="quick-note-error" className={styles.error} role="alert">{error}</p>}
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={closeRoot}>Cancel</Button>
              <Button variant="primary" type="submit">Save Quick Note</Button>
            </div>
            <p className={styles.submitHint}>{getShortcutLabel().startsWith('⌘') ? '⌘ Enter' : 'Ctrl Enter'} to save</p>
          </form>
        )}
      </section>
    </div>,
    document.body,
  )
})

export default CommandPalette
