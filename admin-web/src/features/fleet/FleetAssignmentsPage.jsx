import styles from './FleetManagementPage.module.css'

export function FleetAssignmentsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Assignments</h1>
          <p className={styles.subtitle}>View all driver–vehicle assignments across all fleets.</p>
        </div>
      </div>
      <div className="panel" style={{ padding: 'var(--space-9)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Cross-fleet assignment data will appear here once the assignments service is connected.
        </p>
      </div>
    </div>
  )
}
