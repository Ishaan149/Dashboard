import styles from './Card.module.css'

export default function Card({ title, children, fullWidth = false }) {
  return (
    <div className={`${styles.card} ${fullWidth ? styles.full : ''}`}>
      <p className={styles.title}>{title}</p>
      {children}
    </div>
  )
}
