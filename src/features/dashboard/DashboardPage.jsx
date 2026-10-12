import { StatGrid } from './components/StatGrid'
import { PendingApplicationsPanel } from './components/PendingApplicationsPanel'
import { OperationalAlerts } from './components/OperationalAlerts'
import { RecentActivity } from './components/RecentActivity'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.subtitle}>Live snapshot of platform operations</p>
      </div>

      <StatGrid />

      <div className={styles.mainRow}>
        <PendingApplicationsPanel />
        <OperationalAlerts />
      </div>

      <RecentActivity />
    </div>
  )
}
