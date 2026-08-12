import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import AppShell from './components/AppShell'
import PasswordGate from './components/PasswordGate'
import { getViewLabel } from './components/navigation'
import { LoadingState, ToastProvider } from './components/ui'
import styles from './App.module.css'

const VIEWS = {
  overview:   lazy(() => import('./components/Overview')),
  todo:       lazy(() => import('./components/TodoCard')),
  braindump:  lazy(() => import('./components/BrainDump')),
  jobs:       lazy(() => import('./components/JobTracker')),
  habits:     lazy(() => import('./components/HabitTracker')),
  dayplanner: lazy(() => import('./components/DayPlanner')),
}

const FULL_WIDTH_VIEWS = new Set(['dayplanner', 'overview', 'todo', 'braindump'])

function ViewReady({ onReady, children }) {
  useEffect(() => {
    onReady()
  }, [onReady])

  return children
}

export default function App() {
  const [view, setView] = useState('overview')
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem('dashboard-unlocked') === 'true'
  )
  const shouldFocusAfterViewChange = useRef(false)

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
    ? `${styles.viewFull} ${view === 'todo' ? styles.viewTodo : ''} ${view === 'braindump' ? styles.viewBrainDump : ''}`
    : styles.view

  return (
    <ToastProvider>
      <AppShell activeView={view} onNavigate={handleNavigate} onLock={handleLock}>
        <div className={styles.content}>
          <div className={viewClassName} key={view}>
            <Suspense fallback={<LoadingState label={getViewLabel(view)} />}>
              <ViewReady onReady={handleViewReady}>
                <ActiveView onChange={handleNavigate} />
              </ViewReady>
            </Suspense>
          </div>
        </div>
      </AppShell>
    </ToastProvider>
  )
}
