import { useState, useEffect } from 'react'
import styles from './TopBar.module.css'

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const pad    = n => String(n).padStart(2, '0')

const TITLES = {
  overview:  'Overview',
  todo:      'To-Do',
  goals:     'Goals',
  braindump: 'Brain Dump',
  habits:    'Habit Tracker',
}

export default function TopBar({ view }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h    = now.getHours()
  const m    = now.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12

  return (
    <div className={styles.wrap}>
      {/* Main topbar row */}
      <div className={styles.bar}>
        <div className={styles.left}>
          <h1 className={styles.title}>{TITLES[view]}</h1>
          <span className={styles.date}>
            {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
          </span>
        </div>
        <div className={styles.right}>
          <div className={styles.clock}>
            {h12}:{pad(m)} <span className={styles.ampm}>{ampm}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
