import { useAuth } from '../context/AuthContext'
import styles from './SyncBadge.module.css'

export default function SyncBadge() {
  const { user, authLoading, signIn, logOut } = useAuth()

  if (authLoading) return null

  if (!user) {
    return (
      <button className={styles.badge} onClick={signIn} title="Sign in to sync across devices">
        <span className={`${styles.dot} ${styles.offline}`} />
        Sync off
      </button>
    )
  }

  return (
    <div className={styles.group}>
      <span className={styles.badge} title={`Synced as ${user.email}`}>
        <span className={`${styles.dot} ${styles.online}`} />
        Synced
      </span>
      <button className={styles.signOutBtn} onClick={logOut}>
        Sign out
      </button>
    </div>
  )
}
