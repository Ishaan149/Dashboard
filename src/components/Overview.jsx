import { useSyncedStorage as useLocalStorage } from '../hooks/useSyncedStorage'
import { useState, useEffect } from 'react'
import { getDailyQuote } from '../data/quotes'
import Card from './Card'
import styles from './Overview.module.css'

const CATEGORY_COLORS = {
  work: '#10b981',
  gym:  '#f59e0b',
  uni:  '#6366f1',
  rest: '#6b7280',
}

function fmtMins(mins) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

function Checkmark() {
  return (
    <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Overview() {
  const [todayTodos]  = useLocalStorage('todos-today', [])
  const [jobRecords]  = useLocalStorage('job_applications', [])
  const [habits]      = useLocalStorage('habits', [])
  const [habitLogs]   = useLocalStorage('habit_logs', {})
  const [blocks]      = useLocalStorage('dayplanner-blocks', [])
  const [dpSettings]  = useLocalStorage('dayplanner-settings', { startHour: 10, endHour: 27 })

  const today     = getToday()
  const weekStart = getWeekStart()

  const jobsToday   = (() => { const r = jobRecords.find(r => r.date === today); return r ? r.count : 0 })()
  const jobsWeek    = jobRecords.filter(r => r.date >= weekStart).reduce((s, r) => s + r.count, 0)

  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=33.4255&longitude=-111.9400&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FPhoenix&forecast_days=1')
      .then(r => r.json())
      .then(d => setWeather({
        high: Math.round(d.daily.temperature_2m_max[0]),
        low:  Math.round(d.daily.temperature_2m_min[0]),
        rain: d.daily.precipitation_probability_max[0],
      }))
      .catch(() => {})
  }, [])

  const quote = getDailyQuote()

  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date()
    const raw = d.getHours() * 60 + d.getMinutes()
    if (dpSettings.endHour > 24 && raw < (dpSettings.endHour - 24) * 60) return raw + 1440
    return raw
  })
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      const raw = d.getHours() * 60 + d.getMinutes()
      setNowMinutes(dpSettings.endHour > 24 && raw < (dpSettings.endHour - 24) * 60 ? raw + 1440 : raw)
    }, 60_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpSettings.endHour])

  const sortedBlocks = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes)
  const shownBlocks  = sortedBlocks.slice(0, 5)
  const extraBlocks  = sortedBlocks.length - shownBlocks.length

  const pendingTodos = todayTodos.filter(t => !t.done)
  const shownTodos   = pendingTodos.slice(0, 5)
  const extraTodos   = pendingTodos.length - shownTodos.length

  const todayDone    = habitLogs[today] || []
  const shownHabits  = habits.slice(0, 6)

  return (
    <Card title="Overview">
      {/* Quote + Weather */}
      <div className={styles.quoteRow}>
        <div className={styles.quote}>
          <span className={styles.quoteText}>"{quote.text}"</span>
          <span className={styles.quoteAuthor}>— {quote.author}</span>
        </div>
        <div className={styles.weatherInline}>
          <span className={styles.bottomLabel}>Tempe, AZ</span>
          {weather ? (
            <div className={styles.weatherInfo}>
              <span className={styles.weatherTemp}>{weather.low}° – {weather.high}°</span>
              <span className={styles.weatherRain}>{weather.rain}% rain</span>
            </div>
          ) : (
            <span className={styles.weatherLoading}>—</span>
          )}
        </div>
      </div>

      {/* Content columns */}
      <div className={styles.cols}>
        {/* Pending tasks */}
        <div className={styles.col}>
          <p className={styles.colLabel}>Pending Today</p>
          {pendingTodos.length === 0 ? (
            <p className={styles.empty}>All done for today ✦</p>
          ) : (
            <>
              <ul className={styles.list}>
                {shownTodos.map(t => (
                  <li key={t.id} className={styles.item}>
                    <span className={styles.dot} />
                    <span className={styles.itemText}>{t.text}</span>
                  </li>
                ))}
              </ul>
              {extraTodos > 0 && (
                <p className={styles.more}>+{extraTodos} more</p>
              )}
            </>
          )}
        </div>

        {/* Today's habits */}
        <div className={styles.col}>
          <div className={styles.colHeader}>
            <p className={styles.colLabel}>Today's Habits</p>
            {habits.length > 0 && (
              <span className={styles.goalsBadge}>{habits.filter(h => todayDone.includes(h.id)).length}/{habits.length}</span>
            )}
          </div>
          {habits.length === 0 ? (
            <p className={styles.empty}>No habits set yet</p>
          ) : (
            <ul className={styles.list}>
              {shownHabits.map(h => {
                const done = todayDone.includes(h.id)
                return (
                  <li key={h.id} className={`${styles.item} ${done ? styles.done : ''}`}>
                    <span className={styles.checkbox}>
                      {done && <Checkmark />}
                    </span>
                    <span className={styles.itemText}>{h.name}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Today's schedule */}
      <div className={styles.scheduleCard}>
        <div className={styles.scheduleHeader}>
          <span className={styles.colLabel} style={{ marginBottom: 0 }}>Today's Schedule</span>
          {blocks.length > 0 && (
            <span className={styles.goalsBadge}>{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {blocks.length === 0 ? (
          <p className={styles.empty}>No blocks planned yet</p>
        ) : (
          <ul className={styles.scheduleList}>
            {shownBlocks.map(b => {
              const color    = CATEGORY_COLORS[b.category] ?? CATEGORY_COLORS.work
              const isNow    = nowMinutes >= b.startMinutes && nowMinutes < b.endMinutes
              return (
                <li key={b.id} className={`${styles.scheduleItem} ${isNow ? styles.scheduleNow : ''}`}>
                  <div className={styles.scheduleBar} style={{ background: color }} />
                  <div className={styles.scheduleInfo}>
                    <span className={styles.scheduleLabel}>
                      {b.label || b.category.charAt(0).toUpperCase() + b.category.slice(1)}
                    </span>
                    <span className={styles.scheduleTime}>
                      {fmtMins(b.startMinutes)} – {fmtMins(b.endMinutes)}
                    </span>
                  </div>
                  {isNow && <span className={styles.nowPill}>now</span>}
                </li>
              )
            })}
          </ul>
        )}
        {extraBlocks > 0 && <p className={styles.more}>+{extraBlocks} more</p>}
      </div>

      {/* Job apps row */}
      <div className={styles.jobsBar}>
        <span className={styles.bottomLabel}>Job Apps</span>
        <div className={styles.jobsRow}>
          <div className={styles.jobStat}>
            <span className={styles.jobNum}>{jobsToday}</span>
            <span className={styles.jobLabel}>today</span>
          </div>
          <div className={styles.jobStatDivider} />
          <div className={styles.jobStat}>
            <span className={styles.jobNum}>{jobsWeek}</span>
            <span className={styles.jobLabel}>this week</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
