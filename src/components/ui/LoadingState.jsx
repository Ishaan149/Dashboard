import styles from './StatusState.module.css'

export default function LoadingState({ label = 'content' }) {
  return (
    <div className={styles.state} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Loading {label}…</span>
    </div>
  )
}
