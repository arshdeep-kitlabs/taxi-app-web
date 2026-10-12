import { useEffect, useState } from 'react'
import { getOperationalAlerts } from '../../../services/api/dashboardService'
import { AlertSeverityBadge } from '../../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { formatRelativeTime } from '../../../utils/formatters'
import styles from './OperationalAlerts.module.css'

export function OperationalAlerts() {
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getOperationalAlerts()
      .then((data) => {
        if (!cancelled) setAlerts(data)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load operational alerts.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Operational Alerts</span>
          <div className="panel-header__subtitle">Conditions that may need action</div>
        </div>
      </div>

      {!alerts && !error && <LoadingState label="Loading alerts…" />}
      {error && <ErrorState description={error} />}
      {alerts && alerts.length === 0 && <EmptyState title="No active alerts" />}

      {alerts && alerts.length > 0 && (
        <div className={styles.list}>
          {alerts.map((alert) => (
            <div className={styles.item} key={alert.id}>
              <div className={styles.itemTop}>
                <span className={styles.itemTitle}>{alert.title}</span>
                <span className={styles.itemTime}>{formatRelativeTime(alert.timestamp)}</span>
              </div>
              <AlertSeverityBadge severity={alert.severity} />
              <span className={styles.itemMessage}>{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
