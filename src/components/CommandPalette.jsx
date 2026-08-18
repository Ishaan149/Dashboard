import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createBrainDumpNote, NOTE_TITLE_LIMIT } from '../domain/brainDump'
import { adjustCategory, APPLICATION_CATEGORIES } from '../domain/jobActivity'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { getDateKey } from '../utils/date'
import { NavigationIcon } from './navigation'
import { Button, IconButton, useToast } from './ui'
import { useModalFocus } from './ui/useModalFocus'
import styles from './CommandPalette.module.css'

const QUICK_NOTE_CONTENT_LIMIT = 10_000
const TASK_TITLE_LIMIT = 200
const NAVIGATION_SHORTCUTS = Object.freeze([
  { key: 'h', view: 'overview' },
  { key: 't', view: 'todo' },
  { key: 'n', view: 'braindump' },
  { key: 'j', view: 'jobs' },
])

function SearchIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
}

function BoltIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
}

function ChevronDownIcon() {
  return <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>
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

const CommandPalette = forwardRef(function CommandPalette({ onNavigate }, ref) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('root')
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskTarget, setTaskTarget] = useState('today')
  const [selectedHabitId, setSelectedHabitId] = useState('')
  const [habitMenuOpen, setHabitMenuOpen] = useState(false)
  const [pendingExit, setPendingExit] = useState(null)
  const [returnStep, setReturnStep] = useState('root')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [, setDailyTasks] = useSyncedStorage('todos-daily', {})
  const [, setWeekTasks] = useSyncedStorage('todos-thisweek', [])
  const [habits] = useSyncedStorage('habits', [])
  const [habitLogs, setHabitLogs] = useSyncedStorage('habit_logs', {})
  const [notes, setNotes] = useSyncedStorage('brainDumpNotes', [])
  const [, setActiveId] = useSyncedStorage('brainDumpActiveId', null)
  const [, setJobRecords] = useSyncedStorage('job_applications', [])
  const panelRef = useRef(null)
  const queryRef = useRef(null)
  const taskTitleRef = useRef(null)
  const habitSelectRef = useRef(null)
  const keepEditingRef = useRef(null)
  const contentRef = useRef(null)
  const titleRef = useRef(null)
  const firstJobTypeRef = useRef(null)
  const jobCommitRef = useRef(false)
  const openRef = useRef(false)
  const stepRef = useRef('root')
  const { showToast } = useToast()

  openRef.current = open
  stepRef.current = step

  const commands = useMemo(() => [
    { id: 'note.quick', step: 'note', label: 'Quick Note', keywords: ['capture', 'write', 'brain dump'] },
    { id: 'task.today', step: 'task', target: 'today', label: 'Create Task Today', icon: 'taskToday', keywords: ['add task', 'todo', 'today'] },
    { id: 'task.week', step: 'task', target: 'week', label: 'Create Task This Week', icon: 'taskWeek', keywords: ['add task', 'todo', 'week'] },
    { id: 'habit.log', step: 'habit', label: 'Log Habit', icon: 'habits', keywords: ['complete habit', 'track habit', 'today'] },
    { id: 'jobs.log', step: 'jobs', label: 'Log Application', icon: 'jobs', keywords: ['job', 'jobs', 'application', 'applications', 'add job', ...APPLICATION_CATEGORIES.map(category => category.label)] },
  ], [])

  const groups = useMemo(() => {
    const matches = commands.filter(item => matchesQuery(item, query))
    return matches.length ? [{ label: 'Commands', items: matches }] : []
  }, [commands, query])

  const options = useMemo(() => groups.flatMap(group => group.items), [groups])

  useEffect(() => setActiveIndex(0), [query])
  useEffect(() => {
    if (activeIndex >= options.length) setActiveIndex(Math.max(0, options.length - 1))
  }, [activeIndex, options.length])

  const resetAction = useCallback(() => {
    setTaskTitle('')
    setTaskTarget('today')
    setSelectedHabitId('')
    setHabitMenuOpen(false)
    setPendingExit(null)
    setReturnStep('root')
    setTitle('')
    setContent('')
    setError('')
  }, [])

  const closeImmediately = useCallback(() => {
    openRef.current = false
    setOpen(false)
    setStep('root')
    stepRef.current = 'root'
    setQuery('')
    resetAction()
  }, [resetAction])

  const backToRootImmediately = useCallback(() => {
    setStep('root')
    stepRef.current = 'root'
    resetAction()
    requestAnimationFrame(() => {
      queryRef.current?.focus()
      queryRef.current?.select()
    })
  }, [resetAction])

  const keepEditing = useCallback(() => {
    const nextStep = returnStep === 'root' ? 'note' : returnStep
    setPendingExit(null)
    setStep(nextStep)
    stepRef.current = nextStep
  }, [returnStep])

  const requestExit = useCallback((destination) => {
    const currentStep = stepRef.current
    const hasUnsavedDraft = currentStep === 'task'
      ? Boolean(taskTitle.trim())
      : currentStep === 'note' && Boolean(title.trim() || content.trim())

    if (hasUnsavedDraft) {
      setPendingExit(destination)
      setReturnStep(currentStep)
      setStep('confirm')
      stepRef.current = 'confirm'
      return
    }

    if (destination === 'root') backToRootImmediately()
    else closeImmediately()
  }, [backToRootImmediately, closeImmediately, content, taskTitle, title])

  const discardChanges = useCallback(() => {
    if (pendingExit === 'root') backToRootImmediately()
    else closeImmediately()
  }, [backToRootImmediately, closeImmediately, pendingExit])

  const openPalette = useCallback(() => {
    if (openRef.current) {
      if (stepRef.current === 'confirm') keepEditing()
      else if (stepRef.current !== 'root') requestExit('root')
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
    setActiveIndex(0)
  }, [keepEditing, requestExit])

  useImperativeHandle(ref, () => ({ open: openPalette }), [openPalette])

  useEffect(() => {
    function handleShortcut(event) {
      if (event.defaultPrevented || event.isComposing) return
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.altKey || event.shiftKey) return

      const key = event.key.toLocaleLowerCase()
      if (key === 'k') {
        event.preventDefault()
        openPalette()
        return
      }

      const command = NAVIGATION_SHORTCUTS.find(item => item.key === key)
      if (!command) return

      event.preventDefault()
      if (openRef.current && stepRef.current !== 'root') return

      if (command.view) {
        onNavigate?.(command.view)
        if (openRef.current) closeImmediately()
        return
      }

      openRef.current = true
      setOpen(true)
      setQuery('')
      setError('')
      if (command.step === 'task') setTaskTarget(command.target)
      setStep(command.step)
      stepRef.current = command.step
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [closeImmediately, onNavigate, openPalette])

  const handleDismiss = useCallback(() => {
    if (stepRef.current === 'confirm') keepEditing()
    else if (stepRef.current !== 'root') requestExit('root')
    else closeImmediately()
  }, [closeImmediately, keepEditing, requestExit])

  useModalFocus({
    open,
    containerRef: panelRef,
    initialFocusRef: queryRef,
    onClose: handleDismiss,
  })

  const todayKey = getDateKey(0)
  const loggedHabitIds = habitLogs[todayKey] || []
  const availableHabits = habits.filter(habit => !loggedHabitIds.includes(habit.id))
  const selectedHabit = availableHabits.find(habit => String(habit.id) === selectedHabitId)

  useEffect(() => {
    if (!open) return
    if (step === 'task') requestAnimationFrame(() => taskTitleRef.current?.focus())
    if (step === 'habit') requestAnimationFrame(() => habitSelectRef.current?.focus())
    if (step === 'note') requestAnimationFrame(() => contentRef.current?.focus())
    if (step === 'confirm') requestAnimationFrame(() => keepEditingRef.current?.focus())
    if (step === 'jobs') requestAnimationFrame(() => firstJobTypeRef.current?.focus())
  }, [open, step])

  function activate(item) {
    if (item.view) {
      onNavigate?.(item.view)
      closeImmediately()
      return
    }
    if (item.step === 'task') {
      setTaskTarget(item.target)
    } else if (item.step === 'habit') {
      setSelectedHabitId(String(availableHabits[0]?.id ?? ''))
    } else if (item.step === 'jobs') {
      jobCommitRef.current = false
    }
    setStep(item.step)
    stepRef.current = item.step
    setError('')
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

  function createTaskRecord(text) {
    return { id: Date.now() + Math.floor(Math.random() * 1000), text, done: false }
  }

  function saveTask(event) {
    event.preventDefault()
    const text = taskTitle.trim()
    if (!text) {
      setError('Enter a task title before saving.')
      taskTitleRef.current?.focus()
      return
    }
    if (text.length > TASK_TITLE_LIMIT) {
      setError(`Task titles cannot exceed ${TASK_TITLE_LIMIT} characters.`)
      taskTitleRef.current?.focus()
      return
    }

    const task = createTaskRecord(text)
    if (taskTarget === 'today') {
      setDailyTasks(previous => ({
        ...previous,
        [todayKey]: [...(previous[todayKey] || []), task],
      }))
    } else {
      setWeekTasks(previous => [...previous, task])
    }
    closeImmediately()
    showToast(`Task added to ${taskTarget === 'today' ? 'Today' : 'This Week'}.`)
  }

  function saveHabit(event) {
    event.preventDefault()
    const selectedHabit = availableHabits.find(habit => String(habit.id) === selectedHabitId)
    if (!selectedHabit) {
      setError(availableHabits.length ? 'Choose a habit to log.' : 'All habits are already logged for today.')
      return
    }

    setHabitLogs(previous => {
      const existing = previous[todayKey] || []
      if (existing.includes(selectedHabit.id)) return previous
      return { ...previous, [todayKey]: [...existing, selectedHabit.id] }
    })
    closeImmediately()
    showToast(`${selectedHabit.name} logged for today.`)
  }

  function logApplication(category) {
    if (jobCommitRef.current) return
    jobCommitRef.current = true
    setJobRecords(previous => adjustCategory(previous, getDateKey(0), category.key, 1))
    closeImmediately()
    showToast(`${category.label} application logged for today.`)
  }

  function handleJobTypeKeyDown(event) {
    const options = [...event.currentTarget.querySelectorAll('[role="option"]')]
    const currentIndex = options.indexOf(document.activeElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : (Math.max(0, currentIndex) + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
      options[nextIndex]?.focus()
    }
  }

  function handleHabitSelectKeyDown(event) {
    if (event.key === 'Escape' && habitMenuOpen) {
      event.preventDefault()
      event.stopPropagation()
      setHabitMenuOpen(false)
      habitSelectRef.current?.focus()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !availableHabits.length) return
    event.preventDefault()
    const currentIndex = Math.max(0, availableHabits.findIndex(habit => String(habit.id) === selectedHabitId))
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? availableHabits.length - 1
        : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + availableHabits.length) % availableHabits.length
    setSelectedHabitId(String(availableHabits[nextIndex].id))
    setHabitMenuOpen(true)
    setError('')
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
    closeImmediately()
    showToast('Quick Note saved to Brain Dump.')
  }

  if (!open) return null

  return createPortal(
    <div className={styles.backdrop} onMouseDown={event => {
      if (event.target !== event.currentTarget) return
      if (stepRef.current === 'root') closeImmediately()
      else if (stepRef.current === 'confirm') keepEditing()
      else requestExit('close')
    }}>
      <section
        ref={panelRef}
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label={step === 'root' ? 'Command palette' : step === 'task' ? `Create Task ${taskTarget === 'today' ? 'Today' : 'This Week'}` : step === 'habit' ? 'Log Habit' : step === 'jobs' ? 'Log Application' : step === 'confirm' ? 'Discard unsaved changes' : 'Capture Quick Note'}
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
                placeholder="Search commands"
                aria-label="Search commands"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-results"
                aria-activedescendant={options[activeIndex] ? `palette-option-${options[activeIndex].id}` : undefined}
                autoComplete="off"
              />
              <IconButton className={styles.closeButton} label="Close command palette" onClick={closeImmediately}><CloseIcon /></IconButton>
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
                        <span className={`${styles.optionIcon} ${item.icon ? '' : styles.optionIconAction}`}>
                          {item.icon ? <NavigationIcon name={item.icon} /> : <BoltIcon />}
                        </span>
                        <span className={styles.optionText}><strong>{item.label}</strong></span>
                      </button>
                    )
                  })}
                </div>
              ))}
              {!options.length && <div className={styles.empty}>No matching commands</div>}
            </div>
            <div className={styles.paletteFooter} aria-hidden="true">
              <span><kbd>↑</kbd><kbd>↓</kbd> Move</span>
              <span><kbd>↵</kbd> Open</span>
              <span><kbd>Esc</kbd> Close</span>
            </div>
          </>
        ) : step === 'confirm' ? (
          <div className={styles.captureForm}>
            <div className={styles.formHeader}>
              <span />
              <IconButton label="Keep editing" onClick={keepEditing}><CloseIcon /></IconButton>
            </div>
            <div className={styles.formIntro}><BoltIcon /><h2>Discard changes?</h2></div>
            <p className={styles.discardCopy}>Your unsaved {returnStep === 'task' ? 'task' : 'note'} will be lost.</p>
            <div className={styles.formActions}>
              <Button ref={keepEditingRef} variant="secondary" onClick={keepEditing}>Keep Editing</Button>
              <Button variant="danger" onClick={discardChanges}>Discard</Button>
            </div>
          </div>
        ) : step === 'jobs' ? (
          <div className={styles.captureForm}>
            <div className={styles.formHeader}>
              <button type="button" className={styles.backButton} onClick={backToRootImmediately}>← Back</button>
              <IconButton label="Close command palette" onClick={closeImmediately}><CloseIcon /></IconButton>
            </div>
            <div className={styles.formIntro}><NavigationIcon name="jobs" /><h2>Log Application</h2></div>
            <p className={styles.jobInstruction}>Choose a job type to log for today</p>
            <div className={styles.jobTypeOptions} role="listbox" aria-label="Job types" onKeyDown={handleJobTypeKeyDown}>
              {APPLICATION_CATEGORIES.map((category, index) => (
                <button
                  ref={index === 0 ? firstJobTypeRef : undefined}
                  key={category.key}
                  type="button"
                  className={`${styles.option} ${styles.jobTypeOption}`}
                  role="option"
                  aria-selected="false"
                  onClick={() => logApplication(category)}
                >
                  <span className={styles.optionText}><strong>{category.label}</strong></span>
                </button>
              ))}
            </div>
          </div>
        ) : step === 'task' ? (
          <form className={styles.captureForm} onSubmit={saveTask}>
            <div className={styles.formHeader}>
              <button type="button" className={styles.backButton} onClick={() => requestExit('root')}>← Back</button>
              <IconButton label="Close command palette" onClick={() => requestExit('close')}><CloseIcon /></IconButton>
            </div>
            <div className={styles.formIntro}><NavigationIcon name="todo" /><h2>Create Task {taskTarget === 'today' ? 'Today' : 'This Week'}</h2></div>
            <label className={styles.field}>
              <span>Task</span>
              <input
                ref={taskTitleRef}
                value={taskTitle}
                onChange={event => { setTaskTitle(event.target.value); setError('') }}
                placeholder="What needs to get done?"
                maxLength={TASK_TITLE_LIMIT}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'task-error' : undefined}
              />
            </label>
            {error && <p id="task-error" className={styles.error} role="alert">{error}</p>}
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={closeImmediately}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={!taskTitle.trim()}>Create Task</Button>
            </div>
          </form>
        ) : step === 'habit' ? (
          <form className={styles.captureForm} onSubmit={saveHabit}>
            <div className={styles.formHeader}>
              <button type="button" className={styles.backButton} onClick={backToRootImmediately}>← Back</button>
              <IconButton label="Close command palette" onClick={closeImmediately}><CloseIcon /></IconButton>
            </div>
            <div className={styles.formIntro}><NavigationIcon name="habits" /><h2>Log Habit</h2></div>
            {availableHabits.length ? (
              <div className={styles.field}>
                <span id="habit-select-label">Habit</span>
                <div className={styles.selectWrap} onKeyDown={handleHabitSelectKeyDown}>
                  <button
                    ref={habitSelectRef}
                    type="button"
                    className={styles.selectTrigger}
                    aria-labelledby="habit-select-label habit-select-value"
                    aria-haspopup="listbox"
                    aria-expanded={habitMenuOpen}
                    aria-controls="habit-select-options"
                    onClick={() => setHabitMenuOpen(value => !value)}
                  >
                    <span id="habit-select-value">{selectedHabit?.name}</span>
                    <span className={`${styles.selectChevron} ${habitMenuOpen ? styles.selectChevronOpen : ''}`} aria-hidden="true"><ChevronDownIcon /></span>
                  </button>
                  {habitMenuOpen && (
                    <div id="habit-select-options" className={styles.selectMenu} role="listbox" aria-labelledby="habit-select-label">
                      {availableHabits.map(habit => {
                        const selected = String(habit.id) === selectedHabitId
                        return (
                          <button
                            key={habit.id}
                            type="button"
                            className={`${styles.selectOption} ${selected ? styles.selectOptionSelected : ''}`}
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setSelectedHabitId(String(habit.id))
                              setHabitMenuOpen(false)
                              setError('')
                              requestAnimationFrame(() => habitSelectRef.current?.focus())
                            }}
                          >
                            <span>{habit.name}</span>
                            {selected && <span className={styles.selectCheck} aria-hidden="true">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : <p className={styles.emptyAction}>All habits are already logged for today.</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.formActions}>
              <Button variant="secondary" onClick={closeImmediately}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={!availableHabits.length}>Log Habit</Button>
            </div>
          </form>
        ) : (
          <form className={styles.captureForm} onSubmit={saveQuickNote}>
            <div className={styles.formHeader}>
              <button type="button" className={styles.backButton} onClick={() => requestExit('root')}>← Back</button>
              <IconButton label="Close command palette" onClick={() => requestExit('close')}><CloseIcon /></IconButton>
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
              <Button variant="secondary" onClick={closeImmediately}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={!content.trim()}>Save Quick Note</Button>
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
