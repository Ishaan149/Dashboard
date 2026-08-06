import { useMemo, useRef, useState } from 'react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import Card from './Card'
import styles from './TodoCard.module.css'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mondayOf(date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  const offset = (value.getDay() + 6) % 7
  value.setDate(value.getDate() - offset)
  return value
}

function addDays(date, count) {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

function createTask(text) {
  return { id: Date.now() + Math.floor(Math.random() * 1000), text, done: false }
}

function sameLocation(a, b) {
  return a.type === b.type && a.date === b.date && a.folderId === b.folderId
}

function Checkmark() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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
      <span className={styles.dragHandle} aria-hidden="true">⠿</span>
      <button className={styles.checkbox} onClick={onToggle} aria-label={task.done ? `Mark ${task.text} incomplete` : `Mark ${task.text} complete`}>
        {task.done && <Checkmark />}
      </button>
      <span className={styles.taskText}>{task.text}</span>
      <button className={styles.delete} onClick={onDelete} aria-label={`Delete ${task.text}`}>×</button>
    </li>
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
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [dragTarget, setDragTarget] = useState(null)
  const [folderName, setFolderName] = useState('')
  const [showFolderForm, setShowFolderForm] = useState(false)
  const dragging = useRef(null)

  const todayKey = dateKey(new Date())
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return { date, key: dateKey(date), name: DAY_NAMES[index] }
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
    return longTasks.map(item => {
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
              <ul className={styles.list}>{(item.items || []).map(task => renderTask(task, folderLocation, true))}</ul>
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
      <button className={styles.todayButton} onClick={() => setWeekStart(mondayOf(new Date()))}>Today</button>
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
            const isToday = day.key === todayKey
            return (
              <section className={`${styles.dayColumn} ${isToday ? styles.todayColumn : ''}`} key={day.key} aria-label={`${day.name}, ${day.date.toLocaleDateString()}`}>
                <header className={styles.dayHeader}>
                  <span className={styles.dayName}>{day.name.slice(0, 3)}</span>
                  <span className={styles.dayDate}>{day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  {isToday && <span className={styles.todayPill}>Today</span>}
                </header>
                <DropList className={styles.dayBody} location={location} dragging={dragging} onDropAtEnd={dropAtEnd}>
                  <ul className={styles.list}>{tasks.map(task => renderTask(task, location))}</ul>
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
            <ul className={styles.list}>{weekTasks.map(task => renderTask(task, { type: 'week' }))}</ul>
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
    </div>
  )
}
