import { lazy, Suspense, useRef } from 'react'
import PageHeader from './PageHeader'
import PrimaryNav from './PrimaryNav'
import styles from './AppShell.module.css'
import { useTheme } from '../theme/ThemeProvider'

const CommandPalette = lazy(() => import('./CommandPalette'))

function QuickNoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3h10l4 4v14H5z" />
      <path d="M15 3v5h4M9 13h6M12 10v6" />
    </svg>
  )
}

export default function AppShell({ activeView, onNavigate, children }) {
  const paletteRef = useRef(null)
  const { theme } = useTheme()
  const themeStyle = {
    '--theme-accent': theme.colors.accent,
    '--theme-background': theme.colors.background,
    '--theme-foreground': theme.colors.foreground,
  }

  return (
    <div className={styles.shell} style={themeStyle} data-theme={theme.presetId}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <PrimaryNav activeView={activeView} onNavigate={onNavigate} />
      <div className={styles.workspace}>
        <PageHeader activeView={activeView} onNavigate={onNavigate} />
        <main id="main-content" className={styles.main} tabIndex="-1">
          {children}
        </main>
      </div>
      <button
        type="button"
        className={styles.quickNoteWidget}
        onClick={() => paletteRef.current?.open()}
        aria-label="Open command palette"
        data-tooltip="Command palette"
      >
        <QuickNoteIcon />
      </button>
      <Suspense fallback={null}>
        <CommandPalette ref={paletteRef} onNavigate={onNavigate} />
      </Suspense>
    </div>
  )
}
