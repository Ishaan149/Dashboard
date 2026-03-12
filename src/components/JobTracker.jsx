import { useSyncedStorage as useLocalStorage } from '../hooks/useSyncedStorage'
import Card from './Card'
import styles from './JobTracker.module.css'

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

function getMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export default function JobTracker() {
  const today = getToday()
  const [records, setRecords] = useLocalStorage('job_applications', [])
  const [note, setNote] = useLocalStorage('job_note', '')

  const todayRecord = records.find(r => r.date === today)
  const todayCount = todayRecord ? todayRecord.count : 0

  const weekStart = getWeekStart()
  const monthStart = getMonthStart()
  const weekCount = records.filter(r => r.date >= weekStart).reduce((sum, r) => sum + r.count, 0)
  const monthCount = records.filter(r => r.date >= monthStart).reduce((sum, r) => sum + r.count, 0)

  function upsert(delta) {
    setRecords(prev => {
      const exists = prev.find(r => r.date === today)
      if (exists) {
        return prev.map(r =>
          r.date === today
            ? { ...r, count: Math.max(0, r.count + delta) }
            : r
        )
      }
      return [...prev, { date: today, count: Math.max(0, delta) }]
    })
  }

  const history = [...records]
    .filter(r => r.date !== today)
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
            <span className={styles.countLabel}>today</span>
          </div>
          <button
            className={styles.countBtn}
            onClick={() => upsert(1)}
            aria-label="Increase count"
          >
            +
          </button>
        </div>
        <p className={styles.dateLabel}>{formatToday()}</p>
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
