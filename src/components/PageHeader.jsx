import { useEffect, useRef, useState } from 'react'
import { NavigationIcon, getViewLabel } from './navigation'
import styles from './PageHeader.module.css'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = number => String(number).padStart(2, '0')

export default function PageHeader({ activeView, onNavigate }) {
  const [now, setNow] = useState(new Date())
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const settingsRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    settingsRef.current?.focus()

    function closeAndReturnFocus() {
      setOpen(false)
      requestAnimationFrame(() => triggerRef.current?.focus())
    }

    function handlePointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) closeAndReturnFocus()
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAndReturnFocus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const hours = now.getHours()
  const minutes = now.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  const isoTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(hours)}:${pad(minutes)}`

  function goToToday() {
    setOpen(false)
    onNavigate('overview')
  }

  return (
    <header className={styles.header}>
      <div className={styles.headingGroup}>
        <h1 className={styles.title}>{getViewLabel(activeView)}</h1>
        <button type="button" className={styles.dateButton} onClick={goToToday} aria-label="Go to Today">
          <span className={styles.fullDate}>{DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}, {now.getFullYear()}</span>
          <span className={styles.shortDate}>{SHORT_DAYS[now.getDay()]}, {SHORT_MONTHS[now.getMonth()]} {now.getDate()}</span>
        </button>
      </div>

      <div className={styles.actions}>
        <time className={styles.clock} dateTime={isoTime}>
          {displayHour}:{pad(minutes)} <span className={styles.ampm}>{ampm}</span>
        </time>

        <div className={styles.menuWrap} ref={wrapRef}>
          <button
            ref={triggerRef}
            type="button"
            className={`${styles.menuButton} ${open ? styles.menuButtonOpen : ''}`}
            onClick={() => setOpen(value => !value)}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span aria-hidden="true">•••</span>
          </button>
          {open && (
            <div className={styles.menu} role="menu">
              <button
                ref={settingsRef}
                type="button"
                className={styles.settingsAction}
                role="menuitem"
                onClick={() => { setOpen(false); onNavigate('settings') }}
              >
                <NavigationIcon name="settings" size={18} />
                Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
