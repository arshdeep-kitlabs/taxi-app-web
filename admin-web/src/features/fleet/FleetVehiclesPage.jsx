import styles from './FleetManagementPage.module.css'

export function FleetVehiclesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Vehicles</h1>
          <p className={styles.subtitle}>View and manage all vehicles registered across all fleets.</p>
        </div>
      </div>
      <div className="panel" style={{ padding: 'var(--space-9)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Cross-fleet vehicle registry will appear here once vehicle data is connected.
        </p>
      </div>
    </div>
  )
}
