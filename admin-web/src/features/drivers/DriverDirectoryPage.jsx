import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDrivers } from '../../services/api/driversService'
import { DriverStatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { DriversSubNav } from './components/DriversSubNav'
import { getInitials, formatNumber, formatCurrency, formatDateTime } from '../../utils/formatters'
import styles from './DriversPage.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'blocked', label: 'Blocked' },
]

export function DriverDirectoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [drivers, setDrivers] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getDrivers({ search, status })
      .then((data) => {
        if (cancelled) return
        setDrivers(data)
        setError(null)
      })
      .catch((err) => {
        console.error('getDrivers failed:', err)
        if (!cancelled) setError('Unable to load drivers.')
      })

    return () => {
      cancelled = true
    }
  }, [search, status])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Drivers</h1>
        <p className={styles.subtitle}>Search drivers, manage profiles and review applications.</p>
      </div>

      <DriversSubNav />

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by name, ID, email or phone"
          ariaLabel="Search drivers"
        />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        {drivers && <ResultCount count={drivers.length} noun="driver" />}
      </Toolbar>

      {!drivers && !error && <LoadingState label="Loading drivers…" />}
      {error && <ErrorState description={error} />}

      {drivers && drivers.length === 0 && (
        <EmptyState
          title="No drivers match your search"
          description="Try a different name, ID, or clear the status filter."
        />
      )}

      {drivers && drivers.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Driver</th>
                <th scope="col">Contact</th>
                <th scope="col">City</th>
                <th scope="col">Rating</th>
                <th scope="col">Total Rides</th>
                <th scope="col">Earnings</th>
                <th scope="col">Joined</th>
                <th scope="col">Status</th>
                <th scope="col" className="visually-hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <div className={styles.driverCell}>
                      <span className={styles.avatar}>{getInitials(driver.name)}</span>
                      <div>
                        <div className={styles.driverName}>{driver.name}</div>
                        <div className={styles.driverId}>{driver.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell-muted">
                    {driver.email}
                    <br />
                    {driver.phone}
                  </td>
                  <td className="table-cell-muted">{driver.city}</td>
                  <td>{driver.rating != null ? driver.rating.toFixed(2) : '—'}</td>
                  <td>{formatNumber(driver.totalRides)}</td>
                  <td>{formatCurrency(driver.earnings)}</td>
                  <td className="table-cell-muted">{formatDateTime(driver.joinedAt)}</td>
                  <td>
                    <DriverStatusBadge status={driver.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => navigate(`/drivers/${driver.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
