import { useEffect, useMemo, useRef, useState } from 'react'
import { formatFullHabitDate, formatHabitDate, getHabitCompletionSummary, getHabitDateWindow, getOverallCompletionSummary, HABIT_NAME_LIMIT, normalizeHabitName, normalizeHabits, normalizeHabitLogs, toggleHabitCompletion } from '../domain/habits'
import { getDateKey } from '../utils/date'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { Button, Dialog, useToast } from './ui'
import styles from './HabitTracker.module.css'

function getLegacyCreatedAt(logs, todayKey) {
  return Object.keys(normalizeHabitLogs(logs)).sort().find(date => date <= todayKey) ?? todayKey
}
function makeHabitId(habits) { let id = Date.now(); const ids = new Set(habits.map(habit => habit.id)); while (ids.has(id)) id += 1; return id }
function Summary({ label, summary }) {
  return (
    <div className={styles.summary}>
      <span>{label}</span>
      <strong>{summary.percentage === null ? '—' : `${summary.percentage}%`}</strong>
      <small>{summary.eligible ? `${summary.completed}/${summary.eligible} complete` : 'No eligible days'}</small>
    </div>
  )
}

export default function HabitTracker() {
  const [storedHabits, setHabits] = useSyncedStorage('habits', [])
  const [storedLogs, setLogs] = useSyncedStorage('habit_logs', {})
  const [nameInput, setNameInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editError, setEditError] = useState('')
  const [actionMenuId, setActionMenuId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const renameInputRef = useRef(null)
  const actionButtonRefs = useRef(new Map())
  const { showToast } = useToast()
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(id) }, [])

  const todayKey = getDateKey(0, now)
  const logs = useMemo(() => normalizeHabitLogs(storedLogs), [storedLogs])
  const habits = useMemo(() => normalizeHabits(storedHabits, getLegacyCreatedAt(logs, todayKey)), [storedHabits, logs, todayKey])
  const dates = useMemo(() => getHabitDateWindow(7, now), [now])
  const overall7 = useMemo(() => getOverallCompletionSummary(habits, logs, 7, now), [habits, logs, now])
  const overall30 = useMemo(() => getOverallCompletionSummary(habits, logs, 30, now), [habits, logs, now])
  useEffect(() => { if (editingId !== null) requestAnimationFrame(() => renameInputRef.current?.focus()) }, [editingId])

  function validateName(value) { const name = String(value ?? '').trim(); return !name ? 'Enter a habit name.' : name.length > HABIT_NAME_LIMIT ? `Habit names cannot exceed ${HABIT_NAME_LIMIT} characters.` : '' }
  function addHabit(event) {
    event?.preventDefault(); const error = validateName(nameInput); if (error) { setInputError(error); return }
    const name = normalizeHabitName(nameInput)
    setHabits(previous => [...(Array.isArray(previous) ? previous : []), { id: makeHabitId(Array.isArray(previous) ? previous : []), name, createdAt: todayKey }])
    setNameInput(''); setInputError(''); showToast(`${name} added.`)
  }
  function saveRename(habit) {
    const error = validateName(editingName); if (error) { setEditError(error); return }
    const name = normalizeHabitName(editingName)
    if (name !== habit.name) { setHabits(previous => previous.map(item => item.id === habit.id ? { ...item, name } : item)); showToast(`${name} renamed.`) }
    setEditingId(null); setEditError('')
  }
  function toggle(habit, dateKey) {
    setLogs(previous => toggleHabitCompletion(previous, dateKey, habit.id))
  }
  function confirmDelete() {
    if (!pendingDelete) return
    const habit = pendingDelete; setHabits(previous => previous.filter(item => item.id !== habit.id)); setPendingDelete(null); setActionMenuId(null); showToast(`${habit.name} deleted.`)
  }
  function cancelDelete() {
    const habitId = pendingDelete?.id
    setPendingDelete(null)
    setActionMenuId(null)
    requestAnimationFrame(() => actionButtonRefs.current.get(habitId)?.focus())
  }
  return <div className={styles.page}>
    <section className={styles.overviewRow} aria-label="Habit controls and completion summaries">
      <div className={styles.addPanel}>
        <div className={styles.eyebrow}>Quick add</div>
        <form className={styles.addRow} onSubmit={addHabit}>
          <label className={styles.visuallyHidden} htmlFor="new-habit">New habit name</label>
          <input id="new-habit" className={styles.input} placeholder="Add a daily habit…" value={nameInput} onChange={event => { setNameInput(event.target.value); setInputError('') }} maxLength={HABIT_NAME_LIMIT} aria-invalid={Boolean(inputError)} aria-describedby={inputError ? 'new-habit-error' : undefined} />
          <Button variant="primary" className={styles.addBtn} type="submit">Add habit</Button>
        </form>
        {inputError && <p id="new-habit-error" className={styles.error} role="alert">{inputError}</p>}
      </div>
      <Summary label="Last 7 days" summary={overall7} />
      <Summary label="Last 30 days" summary={overall30} />
    </section>
    {habits.length === 0 ? <div className={styles.empty}><p>No habits yet.</p><span>Add your first daily habit above to start tracking it.</span></div> : <section className={styles.trackerPanel}>
      <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>Habit tracker</span><h2>Daily check-ins</h2></div></div>
      <div className={styles.gridRegion} tabIndex="0" aria-label="Seven-day habit grid"><table className={styles.grid}>
        <caption className={styles.visuallyHidden}>Habit completion grid for the last seven local dates</caption><thead><tr><th scope="col" className={styles.habitHeader}>Habit</th>{dates.map(({ key }) => <th key={key} scope="col" className={key === todayKey ? styles.todayColumn : ''} aria-current={key === todayKey ? 'date' : undefined}><span>{formatHabitDate(key)}</span>{key === todayKey && <small>Today</small>}</th>)}</tr></thead>
        <tbody>{habits.map(habit => {
          const summary7 = getHabitCompletionSummary(habit, logs, 7, now); const summary30 = getHabitCompletionSummary(habit, logs, 30, now); const isEditing = editingId === habit.id
          return <tr key={habit.id}><th scope="row" className={styles.habitCell}>{isEditing ? <div className={styles.renameForm}>
            <input ref={renameInputRef} value={editingName} maxLength={HABIT_NAME_LIMIT} aria-label={`Rename ${habit.name}`} aria-invalid={Boolean(editError)} onChange={event => { setEditingName(event.target.value); setEditError('') }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveRename(habit) } if (event.key === 'Escape') { setEditingId(null); setEditError('') } }} />
            <div className={styles.actions}><button type="button" onClick={() => saveRename(habit)}>Save</button><button type="button" onClick={() => { setEditingId(null); setEditError('') }}>Cancel</button></div>{editError && <span className={styles.inlineError} role="alert">{editError}</span>}
          </div> : <>
            <div className={styles.habitTopline}>
              <div className={styles.habitName}>{habit.name}</div>
              <div className={styles.actionMenuWrap} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActionMenuId(null) }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setActionMenuId(null); event.currentTarget.querySelector('button')?.focus() } }}>
                <button ref={element => { if (element) actionButtonRefs.current.set(habit.id, element); else actionButtonRefs.current.delete(habit.id) }} type="button" className={styles.moreButton} aria-label={`Actions for ${habit.name}`} aria-haspopup="menu" aria-expanded={actionMenuId === habit.id} onClick={() => setActionMenuId(current => current === habit.id ? null : habit.id)}>•••</button>
                {actionMenuId === habit.id && <div className={styles.actionMenu} role="menu">
                  <button type="button" role="menuitem" onClick={() => { setActionMenuId(null); setEditingId(habit.id); setEditingName(habit.name); setEditError('') }} aria-label={`Rename ${habit.name}`}>Rename</button>
                  <button type="button" role="menuitem" className={styles.delete} onClick={() => { setActionMenuId(null); setPendingDelete(habit) }} aria-label={`Delete ${habit.name}`}>Delete</button>
                </div>}
              </div>
            </div>
            <div className={styles.metrics} aria-label={`${habit.name} analytics`}><span>7 days <b>{summary7.percentage ?? '—'}%</b></span><i aria-hidden="true">·</i><span>30 days <b>{summary30.percentage ?? '—'}%</b></span></div>
          </>}</th>
          {dates.map(({ key }) => { const complete = (logs[key] ?? []).includes(habit.id); const fullDate = formatFullHabitDate(key); return <td key={key} className={key === todayKey ? styles.todayColumn : ''}><button type="button" role="checkbox" aria-checked={complete} aria-label={`Mark ${habit.name} ${complete ? 'incomplete' : 'complete'} for ${fullDate}`} className={`${styles.completion} ${complete ? styles.complete : ''}`} onClick={() => toggle(habit, key)}><span aria-hidden="true">{complete ? '✓' : '○'}</span><span className={styles.visuallyHidden}>{complete ? 'Complete' : 'Incomplete'}</span></button></td> })}</tr>
        })}</tbody></table></div>
    </section>}
    <Dialog open={Boolean(pendingDelete)} title={`Delete ${pendingDelete?.name ?? 'habit'}?`} description={`Deleting ${pendingDelete?.name ?? 'this habit'} removes it from the tracker. Its visible history will no longer be available.`} destructive onClose={cancelDelete} footer={<><Button variant="secondary" onClick={cancelDelete}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Delete habit</Button></>} />
  </div>
}
