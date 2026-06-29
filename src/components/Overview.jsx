import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { useState, useEffect, useRef } from 'react'
import { getDailyQuote } from '../data/quotes'
import { DEFAULT_CATEGORIES } from '../data/categories'
import styles from './Overview.module.css'

// ── icons ─────────────────────────────────────────────────────────────────────
const ICheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 12.5l5 5 11-12" />
  </svg>
)
const IArrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" width="12" height="12" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const ISun = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="4.2" fill="currentColor" fillOpacity=".12" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7" />
  </svg>
)
const IDrop   = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3.5C12 3.5 5.5 10 5.5 14.5a6.5 6.5 0 0013 0C18.5 10 12 3.5 12 3.5z" />
  </svg>
)
const IBook   = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 5.5A2 2 0 016 4h5v15H6a2 2 0 00-2 1.2zM20 5.5A2 2 0 0018 4h-5v15h5a2 2 0 012 1.2z" />
  </svg>
)
const ILotus  = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 4c1.8 2 2.6 4 2.6 6.5M12 4c-1.8 2-2.6 4-2.6 6.5M4 11c2 0 4 1 5.4 3M20 11c-2 0-4 1-5.4 3M12 19c-3.5 0-6.4-2.2-8-5 2.8-1 5.4-.5 8 2 2.6-2.5 5.2-3 8-2-1.6 2.8-4.5 5-8 5z" />
  </svg>
)
const ISpark  = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M13 3l-2 7h5l-7 11 2-8H6z" />
  </svg>
)
const IMoon   = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 14.5A8 8 0 119.5 4 6.5 6.5 0 0020 14.5z" />
  </svg>
)
const ICase   = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
    <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
  </svg>
)

const HABIT_ICONS = [IDrop, IBook, ILotus, ISpark, IMoon, ICase]

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtMin(min, compact = false) {
  const h   = Math.floor(min / 60) % 24
  const m   = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  if (compact && m === 0) return `${h12} ${ampm}`
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function toLocalDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDateKey(daysAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return toLocalDateStr(d)
}

function getWeekStart() {
  const now  = new Date()
  const day  = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon  = new Date(now)
  mon.setDate(now.getDate() + diff)
  return toLocalDateStr(mon)
}

// ── sub-components ────────────────────────────────────────────────────────────
function CardHead({ title, action, onAction }) {
  return (
    <div className={styles.cardHead}>
      <div className={styles.cardTitle}>
        <span className={styles.accentDot} />
        {title}
      </div>
      {action && (
        <span className={styles.link} onClick={onAction} role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onAction?.()}>
          {action} <IArrow />
        </span>
      )}
    </div>
  )
}

function QuoteCard({ quote }) {
  return (
    <div className={styles.card}>
      <CardHead title="Daily quote" />
      <div className={styles.quoteMark}>&ldquo;</div>
      <div>
        <span className={styles.quoteText}>{quote.text}</span>
        <span className={styles.quoteAuthor}>{quote.author}</span>
      </div>
    </div>
  )
}

function WeatherCard({ weather }) {
  return (
    <div className={styles.card}>
      <CardHead title="Weather" />
      <div className={styles.weatherTop}>
        <ISun className={styles.sunIcon} />
        <div className={styles.weatherTemp}>
          {weather ? `${weather.high}°` : '—'}
        </div>
        <div className={styles.weatherMeta}>
          <div className={styles.weatherCond}>
            {weather ? `${weather.low}° – ${weather.high}°` : 'Loading…'}
          </div>
          <div className={styles.weatherPlace}>Tempe, AZ</div>
          {weather && <div className={styles.weatherRain}>{weather.rain}% rain</div>}
        </div>
      </div>
    </div>
  )
}

function BrainDumpCard({ note, onChange, onNavigate }) {
  const [saved, setSaved] = useState(true)
  const timer = useRef(null)
  const content = note?.content ?? ''

  function handle(e) {
    onChange(e.target.value)
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(true), 700)
  }

  return (
    <div className={`${styles.card} ${styles.brainCard}`}>
      <CardHead title={note?.title ?? 'Brain dump'} action="Open" onAction={() => onNavigate('braindump')} />
      <textarea
        className={styles.brainArea}
        value={content}
        onChange={handle}
        placeholder="Drop any thought, idea, or reminder here…"
        spellCheck
      />
      <div className={styles.brainFoot}>
        <span className={styles.saveState}>
          <span className={`${styles.saveDot} ${saved ? '' : styles.saveDotSaving}`} />
          {saved ? 'Saved' : 'Saving…'}
        </span>
        <span className={styles.charCount}>
          {content.length ? `${content.length} chars` : 'Empty'}
        </span>
      </div>
    </div>
  )
}

function TasksCard({ tasks, onToggle, onNavigate }) {
  const pending = tasks.filter(t => !t.done)
  const shown   = [...pending, ...tasks.filter(t => t.done)].slice(0, 5)
  const extra   = tasks.length - 5

  return (
    <div className={styles.card}>
      <CardHead title="Pending tasks" action="All tasks" onAction={() => onNavigate('todo')} />
      {tasks.length === 0 ? (
        <p className={styles.emptyMsg}>All caught up for today</p>
      ) : (
        <>
          <div className={styles.taskList}>
            {shown.map(t => (
              <div
                key={t.id}
                className={`${styles.task} ${t.done ? styles.taskDone : ''}`}
                onClick={() => onToggle(t.id)}
              >
                <span className={styles.check}>
                  <ICheck width={12} height={12} />
                </span>
                <span className={styles.taskMain}>
                  <span className={styles.taskTitle}>{t.text}</span>
                </span>
              </div>
            ))}
          </div>
          <div className={styles.moreRow}>
            {extra > 0
              ? <span className={styles.morePill}>+{extra} more</span>
              : <span className={styles.faint}>All shown</span>}
            <span className={styles.faint}>{pending.length} left today</span>
          </div>
        </>
      )}
    </div>
  )
}

function HabitsCard({ habits, todayDone, onToggle, onNavigate }) {
  const done = habits.filter(h => todayDone.includes(h.id)).length
  const pct  = habits.length ? Math.round((done / habits.length) * 100) : 0

  return (
    <div className={styles.card}>
      <CardHead title="Today's habits" action="All habits" onAction={() => onNavigate('habits')} />
      {habits.length === 0 ? (
        <p className={styles.emptyMsg}>No habits set yet</p>
      ) : (
        <>
          <div className={styles.habitRow}>
            {habits.map((h, i) => {
              const Icon  = HABIT_ICONS[i % HABIT_ICONS.length]
              const isDone = todayDone.includes(h.id)
              return (
                <div
                  key={h.id}
                  className={`${styles.habit} ${isDone ? styles.habitDone : ''}`}
                  onClick={() => onToggle(h.id)}
                  title={h.name}
                >
                  <Icon className={styles.hicon} />
                  <span className={styles.hname}>{h.name}</span>
                </div>
              )
            })}
          </div>
          <div className={styles.habitFoot}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.habitCount}>
              {done}<span>/{habits.length} done</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ScheduleCard({ blocks, categories, nowMin, onNavigate }) {
  const past    = blocks.filter(b => nowMin >= b.endMinutes)
  const current = blocks.find(b => nowMin >= b.startMinutes && nowMin < b.endMinutes)
  const future  = blocks.filter(b => b.startMinutes > nowMin)
  const shown   = [
    ...past.slice(-2),
    ...(current ? [current] : []),
    ...future.slice(0, 3),
  ]
  const extra = Math.max(0, future.length - 3)

  return (
    <div className={styles.card}>
      <CardHead title="Today's schedule" action="Calendar" onAction={() => onNavigate('dayplanner')} />
      {blocks.length === 0 ? (
        <p className={styles.emptyMsg}>No blocks planned yet</p>
      ) : (
        <div className={styles.sched}>
          {shown.map(b => {
            const isNow  = nowMin >= b.startMinutes && nowMin < b.endMinutes
            const isPast = nowMin >= b.endMinutes
            const cat    = categories.find(c => c.id === b.category) ?? categories[0]
            const color  = cat?.color ?? 'oklch(0.72 0.085 160)'
            const title  = b.label || cat?.label || 'Untitled'
            return (
              <div
                key={b.id}
                className={[
                  styles.block,
                  isNow  ? styles.blockNow  : '',
                  isPast ? styles.blockPast : '',
                ].join(' ')}
              >
                <div className={styles.blockTime}>
                  <b>{fmtMin(b.startMinutes, true)}</b>
                  {fmtMin(b.endMinutes, true)}
                </div>
                <div className={styles.blockBody}>
                  <span className={styles.blockBar} style={{ background: color }} />
                  <span className={styles.blockTitle}>{title}</span>
                  {isNow && <span className={styles.nowPill}>Now</span>}
                </div>
              </div>
            )
          })}
          {extra > 0 && (
            <p className={styles.faint} style={{ paddingTop: 8 }}>+{extra} more blocks</p>
          )}
        </div>
      )}
    </div>
  )
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function JobsCard({ today, week, spark, onAdjust, onNavigate }) {
  const max = Math.max(...spark, 1)
  return (
    <div className={styles.card}>
      <CardHead title="Job applications" action="Tracker" onAction={() => onNavigate('jobs')} />
      <div className={styles.jobsStats}>
        <div className={styles.jstat}>
          <div className={styles.big}>{today}</div>
          <div className={styles.lbl}>sent today</div>
        </div>
        <div className={styles.jdivider} />
        <div className={styles.jstat}>
          <div className={styles.big}>{week}</div>
          <div className={styles.lbl}>this week</div>
        </div>
      </div>
      <div className={styles.spark}>
        {spark.map((v, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          const label = DAY_ABBR[d.getDay()]
          return (
            <div key={i} className={styles.sparkWrap}>
              <span className={styles.sparkTip}>{label}: {v} app</span>
              <div
                className={`${styles.sparkBar} ${v === max && v > 0 ? styles.sparkBarTall : ''}`}
                style={{ height: `${(v / max) * 100}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className={styles.jobsStepper}>
        <button
          className={styles.stepBtn}
          onClick={() => onAdjust(-1)}
          disabled={today === 0}
          aria-label="Remove application"
        >−</button>
        <span className={styles.stepLabel}>Log an application</span>
        <button
          className={styles.stepBtn}
          onClick={() => onAdjust(1)}
          aria-label="Add application"
        >+</button>
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function Overview({ onChange }) {
  const [todayTodos, setTodayTodos] = useSyncedStorage('todos-today', [])
  const [jobRecords, setJobRecords] = useSyncedStorage('job_applications', [])
  const [habits]                    = useSyncedStorage('habits', [])
  const [habitLogs, setHabitLogs]   = useSyncedStorage('habit_logs', {})
  const [blocks]                    = useSyncedStorage('dayplanner-blocks', [])
  const [categories]                = useSyncedStorage('dayplanner-categories', DEFAULT_CATEGORIES)
  const [dpSettings]                = useSyncedStorage('dayplanner-settings', { startHour: 10, endHour: 27 })
  const [pinnedNote, setPinnedNote] = useSyncedStorage('brainDumpPinnedNote', { title: 'Pinned', content: '' })

  const today     = getDateKey(0)
  const weekStart = getWeekStart()

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

  const [nowMinutes, setNowMinutes] = useState(() => {
    const d   = new Date()
    const raw = d.getHours() * 60 + d.getMinutes()
    return dpSettings.endHour > 24 && raw < (dpSettings.endHour - 24) * 60 ? raw + 1440 : raw
  })
  useEffect(() => {
    const id = setInterval(() => {
      const d   = new Date()
      const raw = d.getHours() * 60 + d.getMinutes()
      setNowMinutes(dpSettings.endHour > 24 && raw < (dpSettings.endHour - 24) * 60 ? raw + 1440 : raw)
    }, 60_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpSettings.endHour])

  const quote       = getDailyQuote()
  const todayDone   = habitLogs[today] || []
  const sortedBlocks = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes)

  const jobsToday = (() => {
    const r = jobRecords.find(r => r.date === today)
    return r ? r.count : 0
  })()
  const jobsWeek = jobRecords.filter(r => r.date >= weekStart).reduce((s, r) => s + r.count, 0)
  const jobSpark = Array.from({ length: 7 }, (_, i) => {
    const key = getDateKey(6 - i)
    const r   = jobRecords.find(r => r.date === key)
    return r ? r.count : 0
  })

  function adjustJobs(delta) {
    setJobRecords(prev => {
      const existing = prev.find(r => r.date === today)
      if (existing) {
        return prev.map(r =>
          r.date === today ? { ...r, count: Math.max(0, r.count + delta) } : r
        )
      }
      if (delta > 0) return [...prev, { date: today, count: delta }]
      return prev
    })
  }

  function toggleTask(id) {
    setTodayTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function toggleHabit(id) {
    setHabitLogs(prev => {
      const existing = prev[today] || []
      const updated  = existing.includes(id)
        ? existing.filter(i => i !== id)
        : [...existing, id]
      return { ...prev, [today]: updated }
    })
  }

  const activeNote = { ...pinnedNote }
  function updateBrainDump(val) {
    setPinnedNote(prev => ({ ...prev, content: val }))
  }

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (isMobile) {
    return (
      <div className={styles.mobileGrid}>
        <QuoteCard quote={quote} />
        <ScheduleCard blocks={sortedBlocks} categories={categories} nowMin={nowMinutes} onNavigate={onChange} />
        <TasksCard tasks={todayTodos} onToggle={toggleTask} onNavigate={onChange} />
        <HabitsCard habits={habits} todayDone={todayDone} onToggle={toggleHabit} onNavigate={onChange} />
        <JobsCard today={jobsToday} week={jobsWeek} spark={jobSpark} onAdjust={adjustJobs} onNavigate={onChange} />
        <WeatherCard weather={weather} />
        <BrainDumpCard note={activeNote} onChange={updateBrainDump} onNavigate={onChange} />
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      <div className={styles.col}>
        <QuoteCard quote={quote} />
        <WeatherCard weather={weather} />
        <BrainDumpCard note={activeNote} onChange={updateBrainDump} onNavigate={onChange} />
      </div>
      <div className={styles.col}>
        <JobsCard today={jobsToday} week={jobsWeek} spark={jobSpark} onAdjust={adjustJobs} onNavigate={onChange} />
        <TasksCard tasks={todayTodos} onToggle={toggleTask} onNavigate={onChange} />
      </div>
      <div className={styles.col}>
        <HabitsCard habits={habits} todayDone={todayDone} onToggle={toggleHabit} onNavigate={onChange} />
        <ScheduleCard blocks={sortedBlocks} categories={categories} nowMin={nowMinutes} onNavigate={onChange} />
      </div>
    </div>
  )
}
