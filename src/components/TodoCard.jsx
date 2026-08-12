import { useMemo, useRef, useState } from 'react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { addDays, getMonday, toLocalDateKey } from '../utils/date'
import {
  getRecurringOccurrences,
  makeOccurrenceId,
  setOccurrenceCompleted,
  skipOccurrence,
  toIsoWeekday,
} from '../domain/recurringTasks'
import Card from './Card'
import styles from './TodoCard.module.css'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function createTask(text) {
  return { id: Date.now() + Math.floor(Math.random() * 1000), text, done: false }
}

function orderByCompletion(items) {
  return [...items.filter(item => !item.done), ...items.filter(item => item.done)]
}

function sameLocation(a, b) {
  return a.type === b.type && a.date === b.date && a.folderId === b.folderId
}

function Chevron({ collapsed }) {
  return (
    <svg className={collapsed ? styles.chevronCollapsed : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function TaskRow({ task, nested = false, dragOver = false, onToggle, onDelete, onDragStart, onDragEnd, onDragOver, onDrop }) {
  return (
    <li
      className={`${styles.task} ${task.done ? styles.done : ''} ${nested ? styles.nested : ''} ${dragOver ? styles.taskDragOver : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button className={styles.checkbox} onClick={onToggle} aria-label={task.done ? `Mark ${task.text} incomplete` : `Mark ${task.text} complete`} />
      <span className={styles.taskText}>{task.text}</span>
      <button className={styles.delete} onClick={onDelete} aria-label={`Delete ${task.text}`}>×</button>
    </li>
  )
}

function RecurringOccurrenceRow({ occurrence, onToggle, onSkip }) {
  return (
    <li className={`${styles.task} ${occurrence.done ? styles.done : ''}`}>
      <button className={styles.checkbox} onClick={onToggle} aria-label={occurrence.done ? `Mark ${occurrence.text} incomplete` : `Mark ${occurrence.text} complete`} />
      <span className={styles.taskText}>{occurrence.text}</span>
      <button className={styles.delete} onClick={onSkip} aria-label={`Skip ${occurrence.text} occurrence`}>×</button>
    </li>
  )
}

function SeriesForm({ initial, onSave, onCancel }) {
  const [text, setText] = useState(initial.text)
  const [weekdays, setWeekdays] = useState(initial.weekdays)
  const trimmed = text.trim()
  const valid = Boolean(trimmed && weekdays.length)

  function submit(event) {
    event.preventDefault()
    if (valid) onSave(trimmed, [...weekdays].sort((a, b) => a - b))
  }

  return (
    <form className={styles.seriesForm} onSubmit={submit}>
      <input
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder="Task title…"
        aria-label="Recurring task title"
        aria-invalid={!trimmed}
        maxLength={200}
        autoFocus
      />
      <div className={styles.weekdayControls} aria-label="Repeat on weekdays">
        {DAY_SHORT_NAMES.map((name, index) => {
          const weekday = index + 1
          const selected = weekdays.includes(weekday)
          return (
            <button
              key={weekday}
              type="button"
              className={selected ? styles.weekdaySelected : ''}
              aria-label={`${name}, ${selected ? 'selected' : 'not selected'}`}
              aria-pressed={selected}
              onClick={() => setWeekdays(previous => selected ? previous.filter(day => day !== weekday) : [...previous, weekday])}
            >
              {name.slice(0, 1)}
            </button>
          )
        })}
      </div>
      <div className={styles.seriesFormActions}>
        <span className={styles.validation} role="status">
          {[!trimmed ? 'Enter a title.' : '', weekdays.length === 0 ? 'Select at least one weekday.' : ''].filter(Boolean).join(' ')}
        </span>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.saveButton} disabled={!valid}>Save</button>
      </div>
    </form>
  )
}

function AddTask({ onAdd, compact = false }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  function submit() {
    const text = value.trim()
    if (!text) return
    onAdd(text)
    setValue('')
    setOpen(false)
  }

  if (!open) {
    return <button className={`${styles.addTaskTrigger} ${compact ? styles.compactTrigger : ''}`} onClick={() => setOpen(true)}>+ Add task</button>
  }

  return (
    <div className={styles.addForm}>
      <input
        value={value}
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') submit()
          if (event.key === 'Escape') { setValue(''); setOpen(false) }
        }}
        placeholder="Task title…"
        aria-label="Task title"
        maxLength={200}
        autoFocus
      />
      <button onClick={submit}>Add</button>
    </div>
  )
}

function DropList({ className = '', location, dragging, children, empty, onDropAtEnd }) {
  const [active, setActive] = useState(false)
  return (
    <div
      className={`${className} ${active ? styles.dropZoneActive : ''}`}
      onDragOver={event => { event.preventDefault(); if (dragging.current) setActive(true) }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActive(false) }}
      onDrop={event => { event.preventDefault(); setActive(false); onDropAtEnd(location) }}
    >
      {children}
      {empty && <p className={styles.empty}>{active ? 'Drop task here' : 'No tasks yet'}</p>}
    </div>
  )
}

export default function TodoCard() {
  const [dailyTasks, setDailyTasks] = useSyncedStorage('todos-daily', {})
  const [weekTasks, setWeekTasks] = useSyncedStorage('todos-thisweek', [])
  const [longTasks, setLongTasks] = useSyncedStorage('todos-longterm', [])
  const [recurringSeries, setRecurringSeries] = useSyncedStorage('todos-recurring', [])
  const [recurringState, setRecurringState] = useSyncedStorage('todos-recurring-state', {})
  const [weekStart, setWeekStart] = useState(() => getMonday())
  const [dragTarget, setDragTarget] = useState(null)
  const [folderName, setFolderName] = useState('')
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [showSeriesForm, setShowSeriesForm] = useState(false)
  const [editingSeriesId, setEditingSeriesId] = useState(null)
  const dragging = useRef(null)

  const todayKey = toLocalDateKey(new Date())
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return { date, key: toLocalDateKey(date), name: DAY_NAMES[index] }
  }), [weekStart])

  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  function tasksAt(location) {
    if (location.type === 'day') return dailyTasks[location.date] || []
    if (location.type === 'week') return weekTasks
    if (location.folderId != null) return longTasks.find(item => item.isFolder && item.id === location.folderId)?.items || []
    return longTasks
  }

  function findTask(location, id) {
    return tasksAt(location).find(item => item.id === id && !item.isFolder)
  }

  function updateLocation(location, updater) {
    if (location.type === 'day') {
      setDailyTasks(previous => ({ ...previous, [location.date]: updater(previous[location.date] || []) }))
    } else if (location.type === 'week') {
      setWeekTasks(updater)
    } else if (location.folderId != null) {
      setLongTasks(previous => previous.map(item => item.isFolder && item.id === location.folderId ? { ...item, items: updater(item.items || []) } : item))
    } else {
      setLongTasks(updater)
    }
  }

  function addTask(location, text) {
    updateLocation(location, items => [...items, createTask(text)])
  }

  function toggleTask(location, id) {
    updateLocation(location, items => items.map(item => item.id === id ? { ...item, done: !item.done } : item))
  }

  function deleteTask(location, id) {
    updateLocation(location, items => items.filter(item => item.id !== id))
  }

  function startTaskDrag(event, location, id) {
    dragging.current = { kind: 'task', location, id }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
  }

  function endDrag() {
    dragging.current = null
    setDragTarget(null)
  }

  function insert(items, task, targetId = null) {
    const result = [...items]
    const index = targetId == null ? result.length : result.findIndex(item => item.id === targetId)
    result.splice(index < 0 ? result.length : index, 0, task)
    return result
  }

  function moveTask(targetLocation, targetId = null) {
    const source = dragging.current
    if (!source || source.kind !== 'task') return
    const task = findTask(source.location, source.id)
    if (!task || (sameLocation(source.location, targetLocation) && source.id === targetId)) return endDrag()

    if (source.location.type === 'day' && targetLocation.type === 'day') {
      setDailyTasks(previous => {
        const sourceItems = [...(previous[source.location.date] || [])]
        const found = sourceItems.find(item => item.id === source.id)
        if (!found) return previous
        const without = sourceItems.filter(item => item.id !== source.id)
        if (source.location.date === targetLocation.date) {
          return { ...previous, [source.location.date]: insert(without, found, targetId) }
        }
        const targetItems = previous[targetLocation.date] || []
        return {
          ...previous,
          [source.location.date]: without,
          [targetLocation.date]: insert(targetItems, found, targetId),
        }
      })
    } else if (sameLocation(source.location, targetLocation)) {
      updateLocation(source.location, items => insert(items.filter(item => item.id !== source.id), task, targetId))
    } else {
      updateLocation(source.location, items => items.filter(item => item.id !== source.id))
      updateLocation(targetLocation, items => insert(items, task, targetId))
    }
    endDrag()
  }

  function dropOnTask(event, location, id) {
    event.preventDefault()
    event.stopPropagation()
    moveTask(location, id)
  }

  function renderTask(task, location, nested = false) {
    const targetKey = `${location.type}:${location.date || ''}:${location.folderId || ''}:${task.id}`
    return (
      <TaskRow
        key={task.id}
        task={task}
        nested={nested}
        dragOver={dragTarget === targetKey}
        onToggle={() => toggleTask(location, task.id)}
        onDelete={() => deleteTask(location, task.id)}
        onDragStart={event => startTaskDrag(event, location, task.id)}
        onDragEnd={endDrag}
        onDragOver={event => { event.preventDefault(); event.stopPropagation(); setDragTarget(targetKey) }}
        onDrop={event => dropOnTask(event, location, task.id)}
      />
    )
  }

  function toggleRecurringOccurrence(occurrence) {
    setRecurringState(previous => setOccurrenceCompleted(previous, occurrence.seriesId, occurrence.dateKey, !occurrence.done))
  }

  function renderRecurringOccurrence(occurrence) {
    return (
      <RecurringOccurrenceRow
        key={occurrence.id}
        occurrence={occurrence}
        onToggle={() => toggleRecurringOccurrence(occurrence)}
        onSkip={() => setRecurringState(previous => skipOccurrence(previous, occurrence.seriesId, occurrence.dateKey))}
      />
    )
  }

  function createSeries(text, weekdays) {
    setRecurringSeries(previous => [...(Array.isArray(previous) ? previous : []), {
      id: crypto.randomUUID(),
      text,
      createdDate: todayKey,
      archivedDate: null,
      scheduleRevisions: [{ effectiveFrom: todayKey, weekdays }],
    }])
    setShowSeriesForm(false)
  }

  function updateSeries(series, text, weekdays) {
    const currentOccurrence = getRecurringOccurrences([series], recurringState, todayKey)[0]
    if (currentOccurrence?.done && !weekdays.includes(toIsoWeekday(todayKey))) {
      const id = makeOccurrenceId(series.id, todayKey)
      setRecurringState(previous => ({ ...previous, [id]: { status: 'done', preserveOccurrence: true } }))
    }
    setRecurringSeries(previous => (Array.isArray(previous) ? previous : []).map(item => item.id !== series.id ? item : {
      ...item,
      text,
      scheduleRevisions: [
        ...(Array.isArray(item.scheduleRevisions) ? item.scheduleRevisions : []).filter(revision => revision?.effectiveFrom !== todayKey),
        { effectiveFrom: todayKey, weekdays },
      ].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)),
    }))
    setEditingSeriesId(null)
  }

  function archiveSeries(series) {
    const confirmed = window.confirm(`Archive “${series.text}”? Today’s occurrence will remain, but future occurrences will stop.`)
    if (!confirmed) return
    setRecurringSeries(previous => (Array.isArray(previous) ? previous : []).map(item => item.id === series.id ? { ...item, archivedDate: todayKey } : item))
    setEditingSeriesId(null)
  }

  function startSeriesDrag(event, id) {
    dragging.current = { kind: 'series', id }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  function dropOnSeries(event, targetId) {
    event.preventDefault()
    const source = dragging.current
    if (source?.kind === 'series' && source.id !== targetId) {
      setRecurringSeries(previous => {
        const moved = previous.find(series => series.id === source.id)
        if (!moved) return previous
        const result = previous.filter(series => series.id !== source.id)
        const targetIndex = result.findIndex(series => series.id === targetId)
        result.splice(targetIndex < 0 ? result.length : targetIndex, 0, moved)
        return result
      })
    }
    endDrag()
  }

  function moveSeriesBy(id, direction) {
    setRecurringSeries(previous => {
      if (!Array.isArray(previous)) return []
      const activeIndices = previous.flatMap((series, index) => series?.archivedDate == null ? [index] : [])
      const activeIndex = activeIndices.findIndex(index => previous[index]?.id === id)
      const targetActiveIndex = activeIndex + direction
      if (activeIndex < 0 || targetActiveIndex < 0 || targetActiveIndex >= activeIndices.length) return previous
      const index = activeIndices[activeIndex]
      const target = activeIndices[targetActiveIndex]
      const result = [...previous]
      ;[result[index], result[target]] = [result[target], result[index]]
      return result
    })
  }

  function addFolder() {
    const name = folderName.trim()
    if (!name) return
    setLongTasks(previous => [...previous, { id: Date.now() + Math.floor(Math.random() * 1000), name, isFolder: true, collapsed: false, items: [] }])
    setFolderName('')
    setShowFolderForm(false)
  }

  function startFolderDrag(event, id) {
    event.stopPropagation()
    dragging.current = { kind: 'folder', id }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
  }

  function dropOnFolder(event, folder) {
    event.preventDefault()
    event.stopPropagation()
    const source = dragging.current
    if (!source) return
    if (source.kind === 'folder') {
      if (source.id !== folder.id) {
        setLongTasks(previous => {
          const moved = previous.find(item => item.id === source.id && item.isFolder)
          if (!moved) return previous
          const result = previous.filter(item => item.id !== source.id)
          const index = result.findIndex(item => item.id === folder.id)
          result.splice(index < 0 ? result.length : index, 0, moved)
          return result
        })
      }
      return endDrag()
    }
    moveTask({ type: 'long', folderId: folder.id })
  }

  function dropAtEnd(location) {
    if (dragging.current?.kind === 'folder') {
      if (location.type === 'long' && location.folderId == null) {
        const id = dragging.current.id
        setLongTasks(previous => {
          const moved = previous.find(item => item.id === id && item.isFolder)
          return moved ? [...previous.filter(item => item.id !== id), moved] : previous
        })
      }
      return endDrag()
    }
    moveTask(location)
  }

  function renderLongItems() {
    return orderByCompletion(longTasks).map(item => {
      if (!item.isFolder) return renderTask(item, { type: 'long', folderId: null })
      const folderLocation = { type: 'long', folderId: item.id }
      const folderTarget = dragTarget === `folder:${item.id}`
      return (
        <li className={styles.folder} key={item.id}>
          <div
            className={`${styles.folderRow} ${folderTarget ? styles.folderDragOver : ''}`}
            draggable
            onDragStart={event => startFolderDrag(event, item.id)}
            onDragEnd={endDrag}
            onDragOver={event => { event.preventDefault(); event.stopPropagation(); setDragTarget(`folder:${item.id}`) }}
            onDrop={event => dropOnFolder(event, item)}
          >
            <span className={styles.dragHandle} aria-hidden="true">⠿</span>
            <button className={styles.folderToggle} onClick={() => setLongTasks(previous => previous.map(entry => entry.id === item.id ? { ...entry, collapsed: !entry.collapsed } : entry))} aria-label={item.collapsed ? `Expand ${item.name}` : `Collapse ${item.name}`}>
              <Chevron collapsed={item.collapsed} />
            </button>
            <span className={styles.folderName}>{item.name}</span>
            <span className={styles.folderCount}>{(item.items || []).filter(task => task.done).length}/{(item.items || []).length}</span>
            <button className={styles.delete} onClick={() => setLongTasks(previous => previous.filter(entry => entry.id !== item.id))} aria-label={`Delete folder ${item.name}`}>×</button>
          </div>
          {!item.collapsed && (
            <DropList className={styles.folderContents} location={folderLocation} dragging={dragging} empty={(item.items || []).length === 0} onDropAtEnd={dropAtEnd}>
              <ul className={styles.list}>{orderByCompletion(item.items || []).map(task => renderTask(task, folderLocation, true))}</ul>
              <AddTask compact onAdd={text => addTask(folderLocation, text)} />
            </DropList>
          )}
        </li>
      )
    })
  }

  const weekControls = (
    <div className={styles.weekControls}>
      <span className={styles.range}>{rangeLabel}</span>
      <button onClick={() => setWeekStart(previous => addDays(previous, -7))} aria-label="Previous week">‹</button>
      <button className={styles.todayButton} onClick={() => setWeekStart(getMonday())}>Today</button>
      <button onClick={() => setWeekStart(previous => addDays(previous, 7))} aria-label="Next week">›</button>
    </div>
  )

  return (
    <div className={styles.page}>
      <Card title="To-Do" action={weekControls}>
        <div className={styles.weekBoard}>
          {days.map(day => {
            const location = { type: 'day', date: day.key }
            const tasks = dailyTasks[day.key] || []
            const occurrences = getRecurringOccurrences(recurringSeries, recurringState, day.key)
            const isToday = day.key === todayKey
            return (
              <section className={styles.dayColumn} key={day.key} aria-label={`${day.name}, ${day.date.toLocaleDateString()}`}>
                <header className={styles.dayHeader}>
                  <span className={`${styles.dayName} ${isToday ? styles.todayDayName : ''}`}>{day.name.slice(0, 3)}</span>
                  <span className={styles.dayDate}>{day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </header>
                <DropList className={styles.dayBody} location={location} dragging={dragging} onDropAtEnd={dropAtEnd}>
                  <ul className={styles.list}>
                    {occurrences.filter(occurrence => !occurrence.done).map(renderRecurringOccurrence)}
                    {tasks.filter(task => !task.done).map(task => renderTask(task, location))}
                    {occurrences.filter(occurrence => occurrence.done).map(renderRecurringOccurrence)}
                    {tasks.filter(task => task.done).map(task => renderTask(task, location))}
                  </ul>
                  <AddTask compact onAdd={text => addTask(location, text)} />
                </DropList>
              </section>
            )
          })}
        </div>
      </Card>

      <div className={styles.supportGrid}>
        <Card title="This Week">
          <DropList className={styles.supportBody} location={{ type: 'week' }} dragging={dragging} empty={weekTasks.length === 0} onDropAtEnd={dropAtEnd}>
            <ul className={styles.list}>{orderByCompletion(weekTasks).map(task => renderTask(task, { type: 'week' }))}</ul>
            <AddTask onAdd={text => addTask({ type: 'week' }, text)} />
          </DropList>
        </Card>

        <Card title="Long Term">
          <DropList className={styles.supportBody} location={{ type: 'long', folderId: null }} dragging={dragging} empty={longTasks.length === 0} onDropAtEnd={dropAtEnd}>
            <ul className={styles.list}>{renderLongItems()}</ul>
            <div className={styles.longActions}>
              <AddTask onAdd={text => addTask({ type: 'long', folderId: null }, text)} />
              {!showFolderForm ? (
                <button className={styles.addFolder} onClick={() => setShowFolderForm(true)}>+ New folder</button>
              ) : (
                <div className={styles.addForm}>
                  <input value={folderName} onChange={event => setFolderName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addFolder(); if (event.key === 'Escape') setShowFolderForm(false) }} placeholder="Folder name…" aria-label="Folder name" autoFocus />
                  <button onClick={addFolder}>Create</button>
                </div>
              )}
            </div>
          </DropList>
        </Card>
      </div>

      <Card
        title="Recurring Tasks"
        action={!showSeriesForm && <button className={styles.newSeriesButton} onClick={() => { setEditingSeriesId(null); setShowSeriesForm(true) }}>+ New recurring task</button>}
      >
        <div className={styles.recurringManagement}>
          {showSeriesForm && (
            <SeriesForm
              initial={{ text: '', weekdays: [toIsoWeekday(new Date())] }}
              onSave={createSeries}
              onCancel={() => setShowSeriesForm(false)}
            />
          )}
          <ul className={styles.seriesList}>
            {(Array.isArray(recurringSeries) ? recurringSeries : []).filter(series => series?.archivedDate == null).map(series => {
              const latest = Array.isArray(series.scheduleRevisions) ? series.scheduleRevisions.reduce((selected, revision) => {
                if (!revision?.effectiveFrom || revision.effectiveFrom > todayKey) return selected
                return !selected || revision.effectiveFrom >= selected.effectiveFrom ? revision : selected
              }, null) : null
              const weekdays = Array.isArray(latest?.weekdays) ? latest.weekdays : []
              if (editingSeriesId === series.id) {
                return (
                  <li className={styles.seriesEditRow} key={series.id}>
                    <SeriesForm
                      initial={{ text: series.text || '', weekdays }}
                      onSave={(text, nextWeekdays) => updateSeries(series, text, nextWeekdays)}
                      onCancel={() => setEditingSeriesId(null)}
                    />
                  </li>
                )
              }
              return (
                <li
                  className={styles.seriesRow}
                  key={series.id}
                  draggable
                  onDragStart={event => startSeriesDrag(event, series.id)}
                  onDragEnd={endDrag}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => dropOnSeries(event, series.id)}
                >
                  <button
                    className={styles.seriesDragHandle}
                    aria-label={`Reorder ${series.text}; use arrow keys`}
                    title="Drag or use arrow keys to reorder"
                    onKeyDown={event => {
                      if (event.key === 'ArrowUp') { event.preventDefault(); moveSeriesBy(series.id, -1) }
                      if (event.key === 'ArrowDown') { event.preventDefault(); moveSeriesBy(series.id, 1) }
                    }}
                  >⠿</button>
                  <span className={styles.seriesDetails}>
                    <span className={styles.seriesTitle}>{series.text}</span>
                    <span className={styles.seriesSchedule}>{weekdays.map(day => DAY_SHORT_NAMES[day - 1]).filter(Boolean).join(', ')}</span>
                  </span>
                  <button className={styles.seriesAction} onClick={() => { setShowSeriesForm(false); setEditingSeriesId(series.id) }}>Edit</button>
                  <button className={`${styles.seriesAction} ${styles.archiveAction}`} onClick={() => archiveSeries(series)}>Archive</button>
                </li>
              )
            })}
          </ul>
          {!showSeriesForm && !editingSeriesId && (Array.isArray(recurringSeries) ? recurringSeries : []).every(series => series?.archivedDate != null) && (
            <p className={styles.emptySeries}>No recurring tasks yet.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
