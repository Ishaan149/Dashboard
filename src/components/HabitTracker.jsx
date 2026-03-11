import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Card from './Card'
import styles from './HabitTracker.module.css'

function getDateKey(daysAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function getStreak(id, logs) {
  const todayKey = getDateKey(0)
  const todayDone = (logs[todayKey] || []).includes(id)
  let streak = 0
  let i = todayDone ? 0 : 1
  while (true) {
    const key = getDateKey(i)
    if ((logs[key] || []).includes(id)) {
      streak++
      i++
    } else {
      break
    }
  }
  return streak
}

function getLast7(id, logs) {
  return Array.from({ length: 7 }, (_, i) => {
    const key = getDateKey(6 - i)
    return (logs[key] || []).includes(id)
  })
}

export default function HabitTracker() {
  const [habits, setHabits] = useLocalStorage('habits', [])
  const [logs, setLogs]     = useLocalStorage('habit_logs', {})
  const [nameInput, setNameInput] = useState('')

  const todayKey  = getDateKey(0)
  const todayDone = logs[todayKey] || []
  const doneCount = habits.filter(h => todayDone.includes(h.id)).length

  function getDayLabel(daysAgo) {
    if (daysAgo === 0) return 'Today'
    if (daysAgo === 1) return 'Yesterday'
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function addHabit() {
    const name = nameInput.trim()
    if (!name) return
    setHabits(prev => [...prev, { id: Date.now(), name }])
    setNameInput('')
  }

  function deleteHabit(id) {
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  function toggleDay(id, daysAgo) {
    const key = getDateKey(daysAgo)
    setLogs(prev => {
      const existing = prev[key] || []
      const updated  = existing.includes(id)
        ? existing.filter(i => i !== id)
        : [...existing, id]
      return { ...prev, [key]: updated }
    })
  }

  return (
    <Card title="Habit Tracker" fullWidth>
      {/* Add row */}
      <div className={styles.addRow}>
        <input
          className={styles.input}
          placeholder="New habit..."
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addHabit()}
          maxLength={60}
        />
        <button className={styles.addBtn} onClick={addHabit}>+</button>
      </div>

      {/* Section header */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>Today's Habits</span>
        {habits.length > 0 && (
          <span className={styles.badge}>{doneCount} / {habits.length} done</span>
        )}
      </div>

      {/* Habit list */}
      {habits.length === 0 ? (
        <p className={styles.empty}>No habits yet — add one above</p>
      ) : (
        <ul className={styles.list}>
          {habits.map(habit => {
            const done   = todayDone.includes(habit.id)
            const streak = getStreak(habit.id, logs)
            const last7  = getLast7(habit.id, logs)
            return (
              <li key={habit.id} className={`${styles.item} ${done ? styles.done : ''}`}>
                <div className={styles.itemMain}>
                  <button
                    className={`${styles.checkbox} ${done ? styles.checked : ''}`}
                    onClick={() => toggleDay(habit.id, 0)}
                    aria-label="Toggle today"
                  />
<span className={styles.name}>{habit.name}</span>
                  <div className={styles.right}>
                    {streak > 0 && (
                      <span className={styles.streak}>🔥 {streak}</span>
                    )}
                    <button
                      className={styles.delete}
                      onClick={() => deleteHabit(habit.id)}
                      aria-label="Delete habit"
                    >✕</button>
                  </div>
                </div>
                <div className={styles.dots}>
                  {last7.map((filled, i) => {
                    const daysAgo = 6 - i
                    return (
                      <button
                        key={i}
                        className={`${styles.dot} ${filled ? styles.dotFilled : ''}`}
                        onClick={() => toggleDay(habit.id, daysAgo)}
                        title={getDayLabel(daysAgo)}
                        aria-label={`Toggle ${getDayLabel(daysAgo)}`}
                      />
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
