import styles from './Settings.module.css'
import { LockIcon } from './navigation'

export const SHORTCUTS = Object.freeze([
  { key: 'K', label: 'Command palette' },
  { key: 'H', label: 'Home' },
  { key: 'T', label: 'To-Do' },
  { key: 'N', label: 'Brain Dump' },
  { key: 'J', label: 'Job Applications' },
])

function getPrimaryModifier() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) return '⌘'
  return 'Ctrl'
}

export default function Settings({ onLock }) {
  const modifier = getPrimaryModifier()

  return (
    <section className={styles.page} aria-labelledby="shortcut-heading">
      <div className={styles.intro}><h2 id="shortcut-heading">Shortcuts</h2></div>

      <div className={styles.shortcutList}>
        {SHORTCUTS.map(shortcut => (
          <div className={styles.shortcutRow} key={shortcut.key}>
            <div className={styles.shortcutCopy}>
              <strong>{shortcut.label}</strong>
            </div>
            <div className={styles.keys} aria-label={`${modifier} plus ${shortcut.key}`}>
              <kbd>{modifier}</kbd>
              <span aria-hidden="true">+</span>
              <kbd>{shortcut.key}</kbd>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.security}>
        <div>
          <p className={styles.eyebrow}>Security</p>
          <h3>Lock dashboard</h3>
        </div>
        <button type="button" className={styles.lockButton} onClick={onLock}>
          <LockIcon size={18} />
          Lock Dashboard
        </button>
      </div>
    </section>
  )
}
