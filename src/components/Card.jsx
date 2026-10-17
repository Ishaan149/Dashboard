import { useId } from 'react'
import styles from './Card.module.css'

export default function Card({ title, action, children, fullWidth = false, collapsed = false, onToggle }) {
  const contentId = useId()
  return (
    <div className={`${styles.card} ${fullWidth ? styles.full : ''} ${onToggle && collapsed ? styles.collapsed : ''}`}>
      <div className={`${styles.header} ${onToggle && collapsed ? styles.collapsedHeader : ''}`}>
        {onToggle ? (
          <button className={styles.titleToggle} onClick={onToggle} aria-expanded={!collapsed} aria-controls={contentId}>
            <svg className={collapsed ? styles.collapsedChevron : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span className={styles.title}>{title}</span>
          </button>
        ) : <p className={styles.title}>{title}</p>}
        {action}
      </div>
      {onToggle ? <div id={contentId} hidden={collapsed}>{children}</div> : children}
    </div>
  )
}
