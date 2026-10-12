import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { usePortal } from '../context/PortalContext'
import {
  DashboardIcon, DriversIcon, VehicleIcon, AssignmentIcon,
  RidesIcon, FileTextIcon, WrenchIcon, PaymentsIcon,
  ReportsIcon, ConfigurationIcon, ShieldIcon,
} from '../../../components/icons'
import styles from './PortalShell.module.css'

const NAV = [
  { path: '/portal/dashboard',    label: 'Dashboard',    icon: DashboardIcon },
  { path: '/portal/drivers',      label: 'Drivers',      icon: DriversIcon },
  { path: '/portal/vehicles',     label: 'Vehicles',     icon: VehicleIcon },
  { path: '/portal/assignments',  label: 'Assignments',  icon: AssignmentIcon },
  { path: '/portal/rides',        label: 'Rides',        icon: RidesIcon },
  { path: '/portal/documents',    label: 'Documents',    icon: FileTextIcon },
  { path: '/portal/maintenance',  label: 'Maintenance',  icon: WrenchIcon },
  { path: '/portal/financials',   label: 'Financials',   icon: PaymentsIcon },
  { path: '/portal/reports',      label: 'Reports',      icon: ReportsIcon },
  { path: '/portal/settings',     label: 'Settings',     icon: ConfigurationIcon },
]

export function PortalShell() {
  const { fleet, user } = usePortal()
  const navigate = useNavigate()

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandLogoWrap}>
            <span className={styles.brandLogo}>N</span>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Fleet Portal</span>
            <span className={styles.brandTag}>Fleet Owner</span>
          </div>
        </div>

        {/* Fleet identity chip */}
        <div className={styles.fleetChip}>
          <ShieldIcon size={13} style={{ color: 'var(--nomad-sage)', flexShrink: 0 }} />
          <span className={styles.fleetChipName}>{fleet?.name ?? '…'}</span>
          <span className={styles.fleetChipId}>{fleet?.id ?? ''}</span>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
            >
              <Icon size={18} className={styles.navIcon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Back to Admin */}
        <div className={styles.sidebarFooter}>
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
            ← Back to Admin
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className={styles.main}>
        {/* Top header */}
        <header className={styles.topbar}>
          <div className={styles.topbarFleet}>
            <span className={styles.topbarFleetLabel}>Fleet</span>
            <span className={styles.topbarFleetName}>{fleet?.name ?? '…'}</span>
            {fleet && (
              <span className={`badge badge--${fleet.status === 'active' ? 'success' : 'warning'}`} style={{ fontSize: 11 }}>
                <span className="badge__dot" />{fleet.status}
              </span>
            )}
          </div>
          <div className={styles.topbarUser}>
            <div className={styles.userAvatar}>{user.initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>Fleet Owner</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
