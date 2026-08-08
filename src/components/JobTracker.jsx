import { useState } from 'react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { getMonthStartKey, getWeekStartKey, parseLocalDateKey, toLocalDateKey } from '../utils/date'
import Card from './Card'
import styles from './JobTracker.module.css'

function getToday() {
  return toLocalDateKey(new Date())
}

function formatDate(dateStr) {
  return parseLocalDateKey(dateStr)?.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) ?? dateStr
}

export default function JobTracker() {
  const today = getToday()
  const [records, setRecords] = useSyncedStorage('job_applications', [])
  const [note, setNote] = useSyncedStorage('job_note', '')
  const [selectedDate, setSelectedDate] = useState(today)

  const selectedRecord = records.find(r => r.date === selectedDate)
  const todayCount = selectedRecord ? selectedRecord.count : 0

  const weekStart = getWeekStartKey()
  const monthStart = getMonthStartKey()
  const weekCount = records.filter(r => r.date >= weekStart).reduce((sum, r) => sum + r.count, 0)
  const monthCount = records.filter(r => r.date >= monthStart).reduce((sum, r) => sum + r.count, 0)

  function upsert(delta) {
    setRecords(prev => {
      const exists = prev.find(r => r.date === selectedDate)
      if (exists) {
        return prev.map(r =>
          r.date === selectedDate
            ? { ...r, count: Math.max(0, r.count + delta) }
            : r
        )
      }
      return delta > 0 ? [...prev, { date: selectedDate, count: delta }] : prev
    })
  }

  const history = [...records]
    .filter(r => r.date !== selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date))

  const total = records.reduce((sum, r) => sum + r.count, 0)


  return (
    <Card title="Job Applications">
      <div className={styles.todaySection}>
        <div className={styles.countRow}>
          <button
            className={styles.countBtn}
            onClick={() => upsert(-1)}
            disabled={todayCount === 0}
            aria-label="Decrease count"
          >
            −
          </button>
          <div className={styles.countDisplay}>
            <span className={styles.count}>{todayCount}</span>
            <span className={styles.countLabel}>{selectedDate === today ? 'today' : 'selected'}</span>
          </div>
          <button
            className={styles.countBtn}
            onClick={() => upsert(1)}
            aria-label="Increase count"
          >
            +
          </button>
        </div>
        <input
          type="date"
          className={styles.dateInput}
          value={selectedDate}
          max={today}
          onChange={e => setSelectedDate(e.target.value)}
        />
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{weekCount}</span>
            <span className={styles.statLabel}>this week</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{monthCount}</span>
            <span className={styles.statLabel}>this month</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{total}</span>
            <span className={styles.statLabel}>all time</span>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.noteSection}>
        <p className={styles.historyHeading}>Notes</p>
        <textarea
          className={styles.noteArea}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Links, notes, anything job-search related…"
        />
      </div>

      <div className={styles.divider} />

      <div className={styles.historySection}>
        <p className={styles.historyHeading}>History</p>
        {history.length === 0 ? (
          <p className={styles.empty}>No history yet — start applying!</p>
        ) : (
          <ul className={styles.historyList}>
            {history.map(r => (
              <li key={r.date} className={styles.historyItem}>
                <span className={styles.historyDate}>{formatDate(r.date)}</span>
                <span className={styles.historyCount}>{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
