import { useState } from 'react'
import Orbs from './components/Orbs'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Overview from './components/Overview'
import TodoCard from './components/TodoCard'
import GoalsCard from './components/GoalsCard'
import BrainDump from './components/BrainDump'
import JobTracker from './components/JobTracker'
import HabitTracker from './components/HabitTracker'
import LoginPrompt from './components/LoginPrompt'
import { useAuth } from './context/AuthContext'
import styles from './App.module.css'

const VIEWS = {
  overview:  <Overview />,
  todo:      <TodoCard />,
  goals:     <GoalsCard />,
  braindump: <BrainDump />,
  jobs:      <JobTracker />,
  habits:    <HabitTracker />,
}

export default function App() {
  const [view, setView] = useState('overview')
  const { user, authLoading } = useAuth()
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('sync-prompt-dismissed') === 'true'
  )

  function handleDismiss() {
    localStorage.setItem('sync-prompt-dismissed', 'true')
    setDismissed(true)
  }

  const showLoginPrompt = !authLoading && user === null && !dismissed

  return (
    <div className={styles.layout}>
      {showLoginPrompt && <LoginPrompt onDismiss={handleDismiss} />}
      <Orbs />
      <Sidebar active={view} onChange={setView} />
      <div className={styles.main}>
        <TopBar view={view} />
        <div className={styles.content}>
          <div className={styles.view} key={view}>
            {VIEWS[view]}
          </div>
        </div>
      </div>
    </div>
  )
}
