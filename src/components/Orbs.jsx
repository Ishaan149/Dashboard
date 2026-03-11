import styles from './Orbs.module.css'

export default function Orbs() {
  return (
    <div className={styles.orbs} aria-hidden="true">
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />
    </div>
  )
}
