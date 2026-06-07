import styles from './Card.module.css'

export default function Card({ title, action, children, fullWidth = false }) {
  return (
    <div className={`${styles.card} ${fullWidth ? styles.full : ''}`}>
      <div className={styles.header}>
        <p className={styles.title}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}
