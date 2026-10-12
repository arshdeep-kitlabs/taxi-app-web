import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../app/navigation'
import { ChevronDownIcon, ChevronUpIcon } from '../icons'
import styles from './Sidebar.module.css'

function NavGroup({ item }) {
  const location = useLocation()
  const isChildActive = item.children.some(
    (c) => location.pathname === c.path || location.pathname.startsWith(`${c.path}/`),
  )
  const [open, setOpen] = useState(isChildActive)
  const IconComponent = item.icon

  return (
    <div className={styles.navGroup}>
      <button
        type="button"
        className={`${styles.navLink} ${styles.navGroupTrigger} ${isChildActive ? styles.navLinkActive : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <IconComponent size={18} />
        <span className={styles.navLabel}>{item.label}</span>
        <span className={styles.navGroupChevron}>
          {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </span>
      </button>

      {open && (
        <div className={styles.navChildren}>
          {item.children.map(({ key, label, path }) => (
            <NavLink
              key={key}
              to={path}
              end={path === item.path}
              className={({ isActive }) =>
                `${styles.navChild} ${isActive ? styles.navChildActive : ''}`
              }
            >
              <span className={styles.navChildDot} />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand}>
        <div className={styles.brandMark}>N</div>
        <div className={styles.brandText}>
          <span className={styles.brandName}>Nomad</span>
          <span className={styles.brandTag}>Taxi Admin</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            return <NavGroup key={item.key} item={item} />
          }
          const IconComponent = item.icon
          // Fleet Portal gets a special divider + distinct styling
          if (item.external) {
            return (
              <div key={item.key} className={styles.portalEntry}>
                <div className={styles.portalDivider} />
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `${styles.navLink} ${styles.portalLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  <IconComponent size={18} />
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={styles.portalBadge}>Portal</span>
                </NavLink>
              </div>
            )
          }
          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <IconComponent size={18} />
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className={styles.footer}>Nomad Admin v1.0</div>
    </aside>
  )
}
