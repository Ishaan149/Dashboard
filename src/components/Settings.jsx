import styles from './Settings.module.css'
import { LockIcon } from './navigation'
import { useTheme } from '../theme/ThemeProvider'

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
  const { theme, presets, selectPreset, setColor } = useTheme()

  return (
    <section className={styles.page} aria-label="Settings">
      <div className={styles.appearance} aria-labelledby="appearance-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Appearance</p>
          <h2 id="appearance-heading">Theme</h2>
          <p className={styles.helper}>Choose a dark theme and adjust its colors.</p>
        </div>

        <div className={styles.presetGrid} aria-label="Theme presets">
          {presets.map(preset => {
            const selected = theme.presetId === preset.id
            return (
              <button
                type="button"
                className={`${styles.presetCard} ${selected ? styles.presetSelected : ''}`}
                key={preset.id}
                aria-pressed={selected}
                onClick={() => selectPreset(preset.id)}
              >
                <span className={styles.presetHeader}>
                  <span>{preset.name}</span>
                  <span className={styles.checkmark} aria-hidden="true">✓</span>
                </span>
                <span
                  className={styles.preview}
                  aria-hidden="true"
                  style={{
                    '--preview-accent': preset.colors.accent,
                    '--preview-background': preset.colors.background,
                    '--preview-foreground': preset.colors.foreground,
                  }}
                >
                  <span className={styles.previewRail}><span /></span>
                  <span className={styles.previewMain}>
                    <span className={styles.previewHeader} />
                    <span className={styles.previewCards}><span /><span /></span>
                  </span>
                </span>
                {selected && <span className={styles.srOnly}>Selected</span>}
              </button>
            )
          })}
        </div>

        <div className={styles.colorControls} aria-label="Theme colors">
          {[
            ['accent', 'Accent'],
            ['background', 'Background'],
            ['foreground', 'Foreground'],
          ].map(([key, label]) => (
            <div className={styles.colorRow} key={key}>
              <span className={styles.colorLabel}>{label}</span>
              <input
                className={styles.colorInput}
                type="color"
                value={theme.colors[key]}
                aria-label={`Choose ${key} color`}
                onInput={event => setColor(key, event.currentTarget.value.toUpperCase())}
              />
            </div>
          ))}
        </div>
      </div>

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
