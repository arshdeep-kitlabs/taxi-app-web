import { NavLink } from 'react-router-dom'
import { useRealtime } from '../../../context/RealtimeContext'
import styles from './DriversSubNav.module.css'

export function DriversSubNav() {
  const { pendingCount } = useRealtime()

  return (
    <nav className={styles.nav} aria-label="Driver management sections">
      <NavLink
        to="/drivers"
        end
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
      >
        Directory
      </NavLink>
      <NavLink
        to="/drivers/applications"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
      >
        Applications
        {pendingCount > 0 && <span className="badge badge--warning">{pendingCount}</span>}
      </NavLink>
    </nav>
  )
}
