import { useEffect, useState } from 'react'
import { getRecentActivity } from '../../../services/api/dashboardService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { formatRelativeTime } from '../../../utils/formatters'
import styles from './RecentActivity.module.css'

export function RecentActivity() {
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getRecentActivity()
      .then((data) => {
        if (!cancelled) setActivity(data)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load recent activity.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Recent Activity</span>
          <div className="panel-header__subtitle">Latest actions across the platform</div>
        </div>
      </div>

      {!activity && !error && <LoadingState label="Loading activity…" />}
      {error && <ErrorState description={error} />}
      {activity && activity.length === 0 && <EmptyState title="No recent activity" />}

      {activity && activity.length > 0 && (
        <div className={styles.list}>
          {activity.map((item) => (
            <div className={styles.item} key={item.id}>
              <div className={styles.dotCol}>
                <span className={styles.dot} />
              </div>
              <div className={styles.body}>
                <span className={styles.text}>
                  <span className={styles.actor}>{item.actor}</span> {item.action}{' '}
                  <span className={styles.entity}>{item.entityLabel}</span>
                </span>
                <span className={styles.time}>{formatRelativeTime(item.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
