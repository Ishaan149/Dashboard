import { Button } from './Button'
import styles from './StatusState.module.css'

export default function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className={`${styles.state} ${styles.empty}`}>
      <p>{message}</p>
      {actionLabel && onAction && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
