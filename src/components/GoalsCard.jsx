import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Card from './Card'
import styles from './GoalsCard.module.css'

function Checkmark() {
  return (
    <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GoalColumn({ label, icon, storageKey }) {
  const [items, setItems] = useLocalStorage(storageKey, [])
  const [input, setInput] = useState('')

  function add() {
    const text = input.trim()
    if (!text) return
    setItems(prev => [...prev, { id: Date.now(), text, done: false }])
    setInput('')
  }

  function toggle(id) {
    setItems(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g))
  }

  function remove(id) {
    setItems(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className={styles.col}>
      <div className={styles.colLabel}>
        <span className={styles.icon}>{icon}</span> {label}
      </div>

      <div className={styles.addRow}>
        <input
          className={styles.input}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add goal…"
          maxLength={150}
        />
        <button className={styles.addBtn} onClick={add}>+</button>
      </div>

      <ul className={styles.list}>
        {items.map(g => (
          <li key={g.id} className={`${styles.item} ${g.done ? styles.done : ''}`}>
            <button
              className={styles.checkbox}
              onClick={() => toggle(g.id)}
              aria-label={g.done ? 'Mark incomplete' : 'Mark complete'}
            >
              {g.done && <Checkmark />}
            </button>
            <span className={styles.text}>{g.text}</span>
            <button className={styles.delete} onClick={() => remove(g.id)} aria-label="Delete">✕</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function GoalsCard() {
  return (
    <Card title="Goals">
      <div className={styles.cols}>
        <GoalColumn label="This Week"  icon="📅" storageKey="goals_weekly"  />
        <div className={styles.divider} />
        <GoalColumn label="This Month" icon="🗓" storageKey="goals_monthly" />
      </div>
    </Card>
  )
}
