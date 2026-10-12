import { useEffect, useState } from 'react'
import { getDashboardStats } from '../../../services/api/dashboardService'
import { StatCard } from '../../../components/ui/StatCard'
import { ErrorState } from '../../../components/ui/States'
import { formatNumber, formatCurrency } from '../../../utils/formatters'
import {
  RidesIcon,
  DriversIcon,
  CheckIcon,
  CloseIcon,
  PaymentsIcon,
} from '../../../components/icons'
import styles from './StatGrid.module.css'

const METRICS = [
  { key: 'activeRides', label: 'Active Rides', icon: RidesIcon, format: formatNumber },
  { key: 'availableDrivers', label: 'Available Drivers', icon: DriversIcon, format: formatNumber },
  { key: 'completedRidesToday', label: 'Completed Rides (Today)', icon: CheckIcon, format: formatNumber },
  { key: 'cancelledRidesToday', label: 'Cancelled Rides (Today)', icon: CloseIcon, format: formatNumber },
  { key: 'revenueToday', label: 'Revenue (Today)', icon: PaymentsIcon, format: formatCurrency },
]

export function StatGrid() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load dashboard metrics.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <ErrorState description={error} />
  }

  if (!stats) {
    return (
      <div className={styles.grid}>
        {METRICS.map((metric) => (
          <div key={metric.key} className={styles.skeletonCard} aria-hidden="true" />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {METRICS.map((metric) => {
        const entry = stats[metric.key]
        return (
          <StatCard
            key={metric.key}
            label={metric.label}
            icon={metric.icon}
            value={metric.format(entry.value)}
            deltaLabel={entry.deltaLabel}
            trend={entry.trend}
          />
        )
      })}
    </div>
  )
}
