import { useLocation } from 'react-router-dom'
import { findNavItemByPath } from '../../app/navigation'
import { useAuth } from '../../features/auth/AuthContext'
import styles from './Header.module.css'

/** "Arshdeep Kaur" → "AK". One letter if there is only one name. */
function initialsOf(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

export function Header() {
  const location = useLocation()
  const { admin, signOut } = useAuth()
  const activeNavItem = findNavItemByPath(location.pathname)
  const title = activeNavItem?.label ?? 'Nomad Admin'

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.actions}>
        <div className={styles.profile}>
          <div className={styles.avatar}>{initialsOf(admin?.name)}</div>
          <div className={styles.profileText}>
            <span className={styles.profileName}>{admin?.name ?? 'Signed in'}</span>
            {/* No roles yet — every active admin can do everything. */}
            <span className={styles.profileRole}>Admin</span>
          </div>
        </div>

        <button className={styles.signOut} type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    </header>
  )
}
