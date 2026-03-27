import { useState, useRef } from 'react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import Card from './Card'
import styles from './GoalsCard.module.css'

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const EMPTY_WEEK = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

function getWeekDates() {
  const today = new Date()
  const dow = today.getDay() // 0=Sun, 1=Mon…6=Sat
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function Checkmark() {
  return (
    <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DayColumn({ label, date, tasks, onAdd, onToggle, onRemove, onDropTask, isToday }) {
  const [input, setInput] = useState('')
  const [dragOver, setDragOver] = useState(false)

  function add() {
    const text = input.trim()
    if (!text) return
    onAdd(text)
    setInput('')
  }

  return (
    <div
      className={`${styles.col} ${isToday ? styles.today : ''} ${dragOver ? styles.dropTarget : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
      onDrop={() => { setDragOver(false); onDropTask() }}
    >
      <div className={styles.colHeader}>
        <span className={styles.dayName}>{label}</span>
        <span className={styles.dateNum}>{date.getDate()}</span>
      </div>

      <div className={styles.addRow}>
        <input
          className={styles.input}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add…"
          maxLength={150}
        />
        <button className={styles.addBtn} onClick={add}>+</button>
      </div>

      <ul className={styles.list}>
        {tasks.map(task => (
          <li key={task.id} className={`${styles.item} ${task.done ? styles.done : ''}`}>
            <button
              className={styles.checkbox}
              onClick={() => onToggle(task.id)}
              aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
            >
              {task.done && <Checkmark />}
            </button>
            <span className={styles.text}>{task.text}</span>
            <button className={styles.delete} onClick={() => onRemove(task.id)} aria-label="Delete">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function GoalsCard() {
  const [week, setWeek] = useSyncedStorage('week_planner_tasks', EMPTY_WEEK)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [longTodos, setLongTodos] = useSyncedStorage('todos-longterm', [])
  const draggingText = useRef(null)

  const weekDates = getWeekDates()
  const todayIdx = (new Date().getDay() + 6) % 7 // Mon=0 … Sun=6

  function addTask(dayKey, text) {
    setWeek(prev => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), { id: Date.now(), text, done: false }],
    }))
  }

  function toggleTask(dayKey, id) {
    setWeek(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].map(t => t.id === id ? { ...t, done: !t.done } : t),
    }))
  }

  function removeTask(dayKey, id) {
    setWeek(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].filter(t => t.id !== id),
    }))
  }

  function handleClear() {
    if (!clearConfirm) { setClearConfirm(true); return }
    setWeek(EMPTY_WEEK)
    setClearConfirm(false)
  }

  function toggleTodo(id) {
    setLongTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  return (
    <Card title="Week Planner">
      <div className={styles.root}>
        <div className={styles.weekArea}>
          <div className={styles.toolbar}>
            <button
              className={`${styles.clearBtn} ${clearConfirm ? styles.confirm : ''}`}
              onClick={handleClear}
              onBlur={() => setClearConfirm(false)}
            >
              {clearConfirm ? 'Confirm clear?' : 'Clear Week'}
            </button>
          </div>
          <div className={styles.cols}>
            {DAYS.map((d, i) => (
              <DayColumn
                key={d.key}
                label={d.label}
                date={weekDates[i]}
                tasks={week[d.key] || []}
                onAdd={text => addTask(d.key, text)}
                onToggle={id => toggleTask(d.key, id)}
                onRemove={id => removeTask(d.key, id)}
                onDropTask={() => {
                  if (draggingText.current && !(week[d.key] || []).some(t => t.text === draggingText.current))
                    addTask(d.key, draggingText.current)
                }}
                isToday={i === todayIdx}
              />
            ))}
          </div>
        </div>

        <aside className={styles.todoPanel}>
          <h3 className={styles.todoPanelTitle}>Long Term</h3>
          {longTodos.length === 0 ? (
            <p className={styles.todoEmpty}>No long term tasks</p>
          ) : (
            <ul className={styles.todoList}>
              {longTodos.map(t => (
                <li
                  key={t.id}
                  className={`${styles.todoItem} ${t.done ? styles.todoDone : ''}`}
                  draggable
                  onDragStart={() => { draggingText.current = t.text }}
                  onDragEnd={() => { draggingText.current = null }}
                >
                  <button
                    className={styles.todoCheckbox}
                    onClick={() => toggleTodo(t.id)}
                    aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {t.done && <Checkmark />}
                  </button>
                  <span className={styles.todoText}>{t.text}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </Card>
  )
}
