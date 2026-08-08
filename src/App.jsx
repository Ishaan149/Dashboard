import { lazy, Suspense, useState } from 'react'
import TopBar from './components/TopBar'
import PasswordGate from './components/PasswordGate'
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

export default function App() {
  const [view, setView] = useState('overview')
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem('dashboard-unlocked') === 'true'
  )

  function handleUnlock() {
    localStorage.setItem('dashboard-unlocked', 'true')
    setUnlocked(true)
  }

  function handleLock() {
    localStorage.removeItem('dashboard-unlocked')
    setUnlocked(false)
  }

  if (!unlocked) return <PasswordGate onUnlock={handleUnlock} />

  const ActiveView = VIEWS[view]
  const isFullWidth = FULL_WIDTH_VIEWS.has(view)
  const viewClassName = isFullWidth
    ? `${styles.viewFull} ${view === 'todo' ? styles.viewTodo : ''}`
    : styles.view

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <TopBar view={view} onChange={setView} onLock={handleLock} />
        <div className={styles.content}>
          <div className={viewClassName} key={view}>
            <Suspense fallback={<p className={styles.loading} role="status">Loading view…</p>}>
              <ActiveView onChange={setView} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
