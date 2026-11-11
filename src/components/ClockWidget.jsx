import { useEffect, useId, useRef, useState } from 'react'
import { elapsedAt, TIMER_DURATION_LIMITS } from '../hooks/useDashboardClock'
import { Button } from './ui'
import overview from './Overview.module.css'
import styles from './ClockWidget.module.css'

const PRESETS = [30, 45, 60]
const pad = value => String(value).padStart(2, '0')

function formatClock(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  return `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds % 60)}`
}

function ClockIcon({ path, filled = false }) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

export default function ClockWidget({ clock: { state, dispatch } }) {
  const durationId = useId()
  const { mode, timer } = state
  const isTimer = mode === 'timer'
  const active = state[mode]
  const [now, setNow] = useState(Date.now)
  const [durationPanel, setDurationPanel] = useState(null)
  const durationOpen = durationPanel !== null
  const readout = useRef(null)
  const durationButton = useRef(null)
  const primaryButton = useRef(null)
  const minutesInput = useRef(null)

  useEffect(() => {
    if (active.startedAt === null) return
    const update = () => setNow(Date.now())
    update()
    const interval = setInterval(update, 200)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
    }
  }, [active.startedAt])

  useEffect(() => {
    if (durationPanel === 'custom') minutesInput.current?.focus()
  }, [durationPanel])

  useEffect(() => {
    if (!durationOpen) return
    function dismissOutside(event) {
      if (!readout.current?.contains(event.target)) setDurationPanel(null)
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
    }
  }, [durationOpen])

  const elapsed = elapsedAt(active, now)
  const remaining = Math.max(0, timer.duration - elapsed)
  const finished = isTimer && remaining === 0
  const running = active.startedAt !== null && !finished
  const paused = !finished && !running && elapsed > 0
  const canSetDuration = isTimer && !running && !paused
  const showTimerProgress = isTimer && (running || paused)
  const showReset = running || elapsed > 0
  const primaryLabel = finished ? 'Restart' : running ? 'Pause' : paused ? 'Resume' : 'Start'
  const display = formatClock(isTimer ? Math.ceil(remaining / 1000) : Math.floor(elapsed / 1000))
  const remainingPercent = remaining / timer.duration * 100
  const digits = <span className={styles.digits} role="timer"
    aria-label={isTimer ? 'Time remaining' : 'Elapsed time'}>{display}</span>

  function switchMode() {
    setDurationPanel(null)
    setNow(Date.now())
    dispatch({ type: 'select', mode: isTimer ? 'stopwatch' : 'timer' })
  }

  function closeDuration() {
    setDurationPanel(null)
    durationButton.current?.focus()
  }

  function handlePrimary() {
    setDurationPanel(null)
    const timestamp = Date.now()
    setNow(timestamp)
    dispatch({ type: 'toggle', now: timestamp })
  }

  function setDuration(duration) {
    dispatch({ type: 'duration', duration })
    closeDuration()
  }

  function submitDuration(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const seconds = Number(data.get('minutes')) * 60 + Number(data.get('seconds'))
    if (seconds < 1) {
      minutesInput.current.setCustomValidity('Enter at least one second.')
      minutesInput.current.reportValidity()
      return
    }
    setDuration(seconds * 1000)
  }

  return (
    <section className={`${overview.card} ${durationOpen ? styles.openCard : ''}`} aria-label="Clock" onKeyDown={event => {
      if (event.key === 'Escape' && durationOpen) {
        event.stopPropagation()
        closeDuration()
      }
    }}>
      <div className={overview.cardHead}>
        <h2 className={overview.cardTitle}>{isTimer ? 'Timer' : 'Stopwatch'}</h2>
        <button type="button" className={styles.switchMode} onClick={switchMode}>
          {isTimer ? 'Stopwatch' : 'Timer'} <ClockIcon path="M8 5l7 7-7 7" />
        </button>
      </div>

      <div className={styles.row}>
        <div ref={readout} className={styles.readout}>
          {canSetDuration ? (
            <button ref={durationButton} className={styles.durationTrigger} type="button"
              aria-label={`Set timer duration, ${display}`} aria-expanded={durationOpen}
              aria-controls={durationOpen ? durationId : undefined}
              onClick={() => setDurationPanel(panel => panel ? null : 'presets')}>
              {digits}
              <ClockIcon path={durationOpen ? 'M5 15l7-7 7 7' : 'M5 9l7 7 7-7'} />
            </button>
          ) : digits}
          {finished && <span className={`${styles.caption} ${styles.finished}`}>Time’s up</span>}
          {!isTimer && paused && <span className={styles.caption}>Paused</span>}
          {canSetDuration && durationOpen && (
            <div id={durationId} className={styles.durationPanel}>
              {durationPanel === 'presets' ? (
                <div className={styles.presets} role="group" aria-label="Timer duration">
                  {PRESETS.map(minutes => (
                    <button key={minutes} type="button" aria-pressed={timer.duration === minutes * 60_000}
                      onClick={() => setDuration(minutes * 60_000)}>
                      {minutes === 60 ? '1 hour' : `${minutes} min`}
                    </button>
                  ))}
                  <button type="button" className={styles.customToggle}
                    aria-label="Set custom duration" title="Set custom duration"
                    onClick={() => setDurationPanel('custom')}>
                    <ClockIcon path="m14 6 4 4M3 21l1-5L16 4a2.8 2.8 0 0 1 4 4L8 20z" />
                  </button>
                </div>
              ) : (
                <form className={styles.custom} aria-label="Custom timer duration" onSubmit={submitDuration}
                  onInput={() => minutesInput.current?.setCustomValidity('')}>
                  <label>
                    <span>Min</span>
                    <input ref={minutesInput} type="number" name="minutes" min="0" max={TIMER_DURATION_LIMITS.minutes} inputMode="numeric"
                      aria-label="Minutes" defaultValue={Math.floor(timer.duration / 60_000)} />
                  </label>
                  <label>
                    <span>Sec</span>
                    <input type="number" name="seconds" min="0" max={TIMER_DURATION_LIMITS.seconds} inputMode="numeric"
                      aria-label="Seconds" defaultValue={(timer.duration / 1000) % 60} />
                  </label>
                  <Button type="submit" className={styles.action}>Set</Button>
                </form>
              )}
            </div>
          )}
        </div>
        <div className={styles.actions}>
          {showReset && (
            <Button variant="ghost" className={styles.reset} aria-label="Reset" title="Reset" onClick={() => {
              setDurationPanel(null)
              dispatch({ type: 'reset' })
              primaryButton.current?.focus()
            }}>
              <ClockIcon path="M4 11a8 8 0 1 1 2 6M4 5v6h6" />
            </Button>
          )}
          <div className={styles.transportSlot}>
            <Button ref={primaryButton}
              className={`${styles.transport} ${showTimerProgress ? styles.transportWithRing : ''}`}
              data-accent={!running} aria-label={primaryLabel} title={primaryLabel} onClick={handlePrimary}>
              {running
                ? <ClockIcon path="M9 6v12m6-12v12" />
                : <ClockIcon path="m8 5 11 7-11 7z" filled />}
            </Button>
            {showTimerProgress && (
              <svg className={styles.timerRing} data-running={running} viewBox="0 0 44 44"
                role="progressbar" aria-label="Timer progress"
                aria-valuenow={Math.ceil(remainingPercent)} aria-valuetext={`${Math.ceil(remainingPercent)}% remaining`}>
                <circle className={styles.ringTrack} cx="22" cy="22" r="20.5" />
                <circle className={styles.ringProgress} cx="22" cy="22" r="20.5" pathLength="100"
                  transform="rotate(-90 22 22)" strokeDasharray={`${remainingPercent} 100`} />
              </svg>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
