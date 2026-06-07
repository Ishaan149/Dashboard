import { useState, useRef } from 'react'
import { useSyncedStorage as useLocalStorage } from '../hooks/useSyncedStorage'
import Card from './Card'
import styles from './TodoCard.module.css'

function Checkmark({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TodoItem({ item, onToggle, onDelete, onDragStart }) {
  return (
    <li
      className={`${styles.item} ${item.done ? styles.done : ''}`}
      draggable
      onDragStart={onDragStart}
    >
      <span className={styles.dragHandle} aria-hidden="true">⠿</span>
      <button
        className={styles.checkbox}
        onClick={onToggle}
        aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
      >
        {item.done && <Checkmark />}
      </button>
      <span className={styles.text}>{item.text}</span>
      <button className={styles.delete} onClick={onDelete} aria-label="Delete task">✕</button>
    </li>
  )
}


const IArrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" width="12" height="12" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export default function TodoCard({ onChange }) {
  const [todayTodos, setTodayTodos] = useLocalStorage('todos-today', [])
  const [longTodos, setLongTodos] = useLocalStorage('todos-longterm', [])
  const dragging = useRef(null) // { id, from: 'today' | 'long' }

  function addTo(list, text) {
    const item = { id: Date.now(), text, done: false }
    if (list === 'today') setTodayTodos(prev => [...prev, item])
    else setLongTodos(prev => [...prev, item])
  }

  function toggle(list, id) {
    if (list === 'today') setTodayTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
    else setLongTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function remove(list, id) {
    if (list === 'today') setTodayTodos(prev => prev.filter(t => t.id !== id))
    else setLongTodos(prev => prev.filter(t => t.id !== id))
  }

  function handleDragStart(id, from) {
    dragging.current = { id, from }
  }

  function handleDrop(to) {
    if (!dragging.current) return
    const { id, from } = dragging.current
    if (from === to) return

    const srcList = from === 'today' ? todayTodos : longTodos
    const item = srcList.find(t => t.id === id)
    if (!item) return

    if (from === 'today') {
      setTodayTodos(prev => prev.filter(t => t.id !== id))
      setLongTodos(prev => [...prev, item])
    } else {
      setLongTodos(prev => prev.filter(t => t.id !== id))
      setTodayTodos(prev => [...prev, item])
    }
    dragging.current = null
  }

  // Attach drag start to items via render
  function renderItems(list, todos) {
    return todos.map(t => (
      <TodoItem
        key={t.id}
        item={t}
        onToggle={() => toggle(list, t.id)}
        onDelete={() => remove(list, t.id)}
        onDragStart={() => handleDragStart(t.id, list)}
      />
    ))
  }

  const plannerBtn = onChange && (
    <button className={styles.plannerLink} onClick={() => onChange('goals')}>
      Week Planner <IArrow />
    </button>
  )

  return (
    <Card title="To-Do" action={plannerBtn}>
      <div className={styles.columns}>
        <SectionShell
          title="Today"
          todos={todayTodos}
          onAdd={text => addTo('today', text)}
          onDrop={() => handleDrop('today')}
          renderItems={() => renderItems('today', todayTodos)}
        />
        <div className={styles.divider} />
        <SectionShell
          title="Long Term"
          todos={longTodos}
          onAdd={text => addTo('long', text)}
          onDrop={() => handleDrop('long')}
          renderItems={() => renderItems('long', longTodos)}
        />
      </div>
    </Card>
  )
}

function SectionShell({ title, todos, onAdd, onDrop, renderItems }) {
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
      className={`${styles.section} ${dragOver ? styles.dropTarget : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop() }}
    >
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add a task…"
          maxLength={200}
        />
        <button className={styles.addBtn} onClick={add}>Add</button>
      </div>
      {todos.length === 0 ? (
        <p className={styles.empty}>{dragOver ? 'Drop here…' : "No tasks — you're clear ✦"}</p>
      ) : (
        <ul className={styles.list}>{renderItems()}</ul>
      )}
    </div>
  )
}
