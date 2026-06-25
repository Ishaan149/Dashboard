import { useState } from 'react'
import TopBar from './components/TopBar'
import Overview from './components/Overview'
import TodoCard from './components/TodoCard'
import GoalsCard from './components/GoalsCard'
import BrainDump from './components/BrainDump'
import JobTracker from './components/JobTracker'
import HabitTracker from './components/HabitTracker'
import DayPlanner from './components/DayPlanner'
import PasswordGate from './components/PasswordGate'
import styles from './App.module.css'

const VIEWS = {
  overview:   Overview,
  todo:       TodoCard,
  goals:      GoalsCard,
  braindump:  BrainDump,
  jobs:       JobTracker,
  habits:     HabitTracker,
  dayplanner: DayPlanner,
}

const FULL_WIDTH_VIEWS = new Set(['dayplanner', 'goals', 'overview', 'todo'])

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

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <TopBar view={view} onChange={setView} onLock={handleLock} />
        <div className={styles.content}>
          <div className={isFullWidth ? styles.viewFull : styles.view} key={view}>
            <ActiveView onChange={setView} />
          </div>
        </div>
      </div>
    </div>
  )
}
