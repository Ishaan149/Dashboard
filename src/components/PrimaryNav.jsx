import { LockIcon, NAV_ITEMS, NavigationIcon } from './navigation'
import styles from './PrimaryNav.module.css'

function NavButton({ item, activeView, mobile, onNavigate }) {
  const active = activeView === item.id
  return (
    <button
      type="button"
      className={`${styles.navItem} ${mobile ? styles.mobileItem : ''} ${active ? styles.active : ''}`}
      onClick={() => onNavigate(item.id)}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      data-tooltip={item.label}
    >
      <span className={styles.icon}><NavigationIcon name={item.icon} /></span>
      <span className={mobile ? styles.mobileLabel : styles.label}>
        {mobile ? item.mobileLabel : item.label}
      </span>
    </button>
  )
}

export default function PrimaryNav({ activeView, onNavigate, onLock }) {
  return (
    <>
      <nav className={styles.rail} aria-label="Primary">
        <div className={styles.brand} aria-label="Dashboard">
          <span className={styles.brandMark} aria-hidden="true">D</span>
          <span className={styles.brandCopy}>
            <span className={styles.brandName}>Dashboard</span>
          </span>
        </div>
        <p className={styles.sectionLabel}>Workspace</p>
        <div className={styles.railItems}>
          {NAV_ITEMS.map(item => (
            <NavButton key={item.id} item={item} activeView={activeView} onNavigate={onNavigate} />
          ))}
        </div>
        <button type="button" className={`${styles.navItem} ${styles.lock}`} onClick={onLock} aria-label="Lock Dashboard" data-tooltip="Lock">
          <span className={styles.icon}><LockIcon /></span>
          <span className={styles.label}>Lock</span>
        </button>
      </nav>

      <nav className={styles.bottomNav} aria-label="Primary">
        {NAV_ITEMS.map(item => (
          <NavButton key={item.id} item={item} activeView={activeView} mobile onNavigate={onNavigate} />
        ))}
      </nav>
    </>
  )
}
