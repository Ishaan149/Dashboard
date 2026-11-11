import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import AppShell from './components/AppShell'
import PasswordGate from './components/PasswordGate'
import { getViewLabel } from './components/navigation'
import { LoadingState, ToastProvider, useToast } from './components/ui'
import { timerDeadline, useDashboardClock } from './hooks/useDashboardClock'
import { ThemeProvider } from './theme/ThemeProvider'
import styles from './App.module.css'

const VIEWS = {
  overview:   lazy(() => import('./components/Overview')),
  todo:       lazy(() => import('./components/TodoCard')),
  braindump:  lazy(() => import('./components/BrainDump')),
  projects:   lazy(() => import('./components/Projects')),
  jobs:       lazy(() => import('./components/JobTracker')),
  habits:     lazy(() => import('./components/HabitTracker')),
  dayplanner: lazy(() => import('./components/DayPlanner')),
  settings:   lazy(() => import('./components/Settings')),
}

const FULL_WIDTH_VIEWS = new Set(['dayplanner', 'overview', 'todo', 'braindump', 'jobs', 'habits', 'projects'])

function ViewReady({ onReady, children }) {
  useEffect(() => {
    onReady()
  }, [onReady])

  return children
}

function TimerCompletionNotice({ deadline, dispatch }) {
  const { showToast } = useToast()
  useEffect(() => {
    if (deadline === null) return
    let timeout
    let announced = false

    function checkDeadline() {
      clearTimeout(timeout)
      if (announced) return
      const now = Date.now()
      if (now < deadline) {
        timeout = setTimeout(checkDeadline, deadline - now)
        return
      }
      if (document.hidden) return
      announced = true
      dispatch({ type: 'finish', now })
      showToast('Timer complete', { tone: 'success', duration: 8000 })
    }

    timeout = setTimeout(checkDeadline, Math.max(0, deadline - Date.now()))
    document.addEventListener('visibilitychange', checkDeadline)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('visibilitychange', checkDeadline)
    }
  }, [deadline, dispatch, showToast])
  return null
}

export default function App() {
  const [view, setView] = useState('overview')
  const [overviewJobType, setOverviewJobType] = useState('')
  const clock = useDashboardClock()
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem('dashboard-unlocked') === 'true'
  )
  const shouldFocusAfterViewChange = useRef(false)

  useEffect(() => {
    // Retire browser caches only; the archived Firestore records stay intact.
    for (const key of ['wellness_food_records', 'wellness_saved_foods', 'wellness_weight_records']) {
      try {
        localStorage.removeItem(key)
      } catch {}
    }
  }, [])

  function handleUnlock() {
    localStorage.setItem('dashboard-unlocked', 'true')
    setUnlocked(true)
  }

  function handleLock() {
    localStorage.removeItem('dashboard-unlocked')
    setUnlocked(false)
  }

  const focusMain = useCallback(() => {
    requestAnimationFrame(() => document.getElementById('main-content')?.focus())
  }, [])

  const handleViewReady = useCallback(() => {
    if (!shouldFocusAfterViewChange.current) return
    shouldFocusAfterViewChange.current = false
    focusMain()
  }, [focusMain])

  function handleNavigate(nextView) {
    if (!VIEWS[nextView]) return
    if (nextView === view) {
      focusMain()
    } else {
      shouldFocusAfterViewChange.current = true
    }
    setView(nextView)
  }

  if (!unlocked) return <PasswordGate onUnlock={handleUnlock} />

  const ActiveView = VIEWS[view]
  const isFullWidth = FULL_WIDTH_VIEWS.has(view)
  const viewClassName = isFullWidth
    ? `${styles.viewFull} ${view === 'todo' ? styles.viewTodo : ''} ${view === 'braindump' ? styles.viewBrainDump : ''} ${view === 'jobs' ? styles.viewJobs : ''} ${view === 'habits' ? styles.viewHabits : ''} ${view === 'projects' ? styles.viewProjects : ''}`
    : styles.view

  return (
    <ThemeProvider>
      <ToastProvider>
        <TimerCompletionNotice deadline={timerDeadline(clock.state.timer)} dispatch={clock.dispatch} />
        <AppShell activeView={view} onNavigate={handleNavigate}>
          <div className={styles.content}>
            <div className={viewClassName} key={view}>
              <Suspense fallback={<LoadingState label={getViewLabel(view)} />}>
                <ViewReady onReady={handleViewReady}>
                  <ActiveView
                    onChange={handleNavigate}
                    onLock={handleLock}
                    selectedJobType={overviewJobType}
                    onSelectedJobTypeChange={setOverviewJobType}
                    clock={view === 'overview' ? clock : undefined}
                  />
                </ViewReady>
              </Suspense>
            </div>
          </div>
        </AppShell>
      </ToastProvider>
    </ThemeProvider>
  )
}
