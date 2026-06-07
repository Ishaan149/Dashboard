import { useState, useEffect, useRef } from 'react'
import styles from './TopBar.module.css'

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const pad    = n => String(n).padStart(2, '0')

const NAV = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'todo',
    label: 'To-Do',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    id: 'braindump',
    label: 'Brain Dump',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z"/>
        <path d="M9 21h6"/>
      </svg>
    ),
  },
  {
    id: 'jobs',
    label: 'Job Apps',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="12.01"/><path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    id: 'habits',
    label: 'Habits',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l3 3 5-6"/>
      </svg>
    ),
  },
  {
    id: 'dayplanner',
    label: 'Day Planner',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/>
        <line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/>
      </svg>
    ),
  },
]

export default function TopBar({ view, onChange, onLock }) {
  const [now, setNow]   = useState(new Date())
  const [open, setOpen] = useState(false)
  const menuRef         = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const h    = now.getHours()
  const m    = now.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {/* Left: day + date */}
        <div className={styles.left}>
          <button className={styles.day} onClick={() => onChange('overview')} aria-label="Go to Overview">{DAYS[now.getDay()]}</button>
          <span className={styles.date}>{MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</span>
        </div>

        {/* Right: clock + menu */}
        <div className={styles.right}>
          <div className={styles.clock}>
            {h12}:{pad(m)} <span className={styles.ampm}>{ampm}</span>
          </div>

          <div className={styles.menuWrap} ref={menuRef}>
            <button
              className={`${styles.menuBtn} ${open ? styles.menuBtnOpen : ''}`}
              onClick={() => setOpen(v => !v)}
              aria-label="Open navigation"
              aria-expanded={open}
            >
              <span className={styles.menuBtnBar} />
              <span className={styles.menuBtnBar} />
              <span className={styles.menuBtnBar} />
            </button>

            {open && (
              <div className={styles.dropdown}>
                {NAV.map(item => (
                  <button
                    key={item.id}
                    className={`${styles.dropItem} ${view === item.id ? styles.dropItemActive : ''}`}
                    onClick={() => { onChange(item.id); setOpen(false) }}
                  >
                    <span className={styles.dropIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <div className={styles.dropDivider} />
                <button
                  className={`${styles.dropItem} ${styles.dropItemLock}`}
                  onClick={() => { setOpen(false); onLock() }}
                >
                  <span className={styles.dropIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  Lock
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
