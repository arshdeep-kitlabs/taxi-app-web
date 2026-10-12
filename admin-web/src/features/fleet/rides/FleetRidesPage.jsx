import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getFleetRides, getRideStats } from '../../../services/api/fleetRidesService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { RideLifecycleBadge } from '../../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import styles from './FleetRidesPage.module.css'

// ── Payment method pill ───────────────────────────────────────────────────────
const PM_LABEL = { card: '💳 Card', cash: '💵 Cash', wallet: '👛 Wallet' }

// ── Filter options ────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'all',       label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'ongoing',   label: 'Ongoing' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'requested', label: 'Requested' },
]

const DATE_OPTS = [
  { value: 'all',   label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d',    label: 'Last 7 days' },
  { value: '30d',   label: 'Last 30 days' },
  { value: '90d',   label: 'Last 90 days' },
]

function dateRange(key) {
  const now = new Date()
  const pad = (v) => String(v).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = fmt(now)
  if (key === 'today') return { dateFrom: today, dateTo: today }
  if (key === '7d')  { const d = new Date(now); d.setDate(d.getDate() - 7);  return { dateFrom: fmt(d), dateTo: today } }
  if (key === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return { dateFrom: fmt(d), dateTo: today } }
  if (key === '90d') { const d = new Date(now); d.setDate(d.getDate() - 90); return { dateFrom: fmt(d), dateTo: today } }
  return { dateFrom: null, dateTo: null }
}

const PAGE_SIZE = 15

export function FleetRidesPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch]   = useState('')
  const [fleet, setFleet]     = useState(() => searchParams.get('fleet') ?? 'all')
  const [status, setStatus]   = useState('all')
  const [dateKey, setDateKey] = useState('all')
  const [page, setPage]       = useState(1)
  const [rides, setRides]     = useState(null)
  const [stats, setStats]     = useState(null)
  const [error, setError]     = useState(null)

  const allFleets = storeGetFleets()
  const fleetOpts = [
    { value: 'all', label: 'All fleets' },
    ...allFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  const { dateFrom, dateTo } = dateRange(dateKey)

  useEffect(() => {
    let cancelled = false
    setPage(1)
    Promise.all([
      getFleetRides({ fleetId: fleet, status, search, dateFrom, dateTo }),
      getRideStats(fleet === 'all' ? undefined : fleet),
    ])
      .then(([r, s]) => { if (!cancelled) { setRides(r); setStats(s); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load rides.') })
    return () => { cancelled = true }
  }, [search, fleet, status, dateKey])

  function reset() {
    setSearch(''); setFleet('all'); setStatus('all'); setDateKey('all'); setPage(1)
  }

  const totalPages = rides ? Math.max(1, Math.ceil(rides.length / PAGE_SIZE)) : 1
  const paged      = rides ? rides.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet Rides</h1>
          <p className={styles.subtitle}>Search, monitor and review all rides across your fleets. Historical records are preserved.</p>
        </div>
        <Link to="/fleet/performance" className={`btn btn--secondary`}>View Performance</Link>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span className={styles.statLabel}>Total Rides</span><span className={styles.statValue}>{stats.total}</span></div>
          <div className={`${styles.statCard} ${styles.statAccent}`}><span className={styles.statLabel}>Completed</span><span className={styles.statValue}>{stats.completed}</span></div>
          <div className={`${styles.statCard} ${styles.statDanger}`}><span className={styles.statLabel}>Cancelled</span><span className={styles.statValue}>{stats.cancelled}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Active Now</span><span className={styles.statValue}>{stats.active}</span></div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableSection}>
        <Toolbar>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Ride ID, customer, driver, location…" ariaLabel="Search rides" />
          <FilterSelect value={fleet}   onChange={(v) => { setFleet(v);   setPage(1) }} options={fleetOpts}   ariaLabel="Filter by fleet" />
          <FilterSelect value={status}  onChange={(v) => { setStatus(v);  setPage(1) }} options={STATUS_OPTS} ariaLabel="Filter by status" />
          <FilterSelect value={dateKey} onChange={(v) => { setDateKey(v); setPage(1) }} options={DATE_OPTS}   ariaLabel="Filter by date" />
          {rides && <ResultCount count={rides.length} noun="ride" />}
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>Reset</button>
        </Toolbar>

        {!rides && !error && <LoadingState label="Loading rides…" />}
        {error && <ErrorState description={error} />}
        {rides && rides.length === 0 && <EmptyState title="No rides found" description="Try a different search or reset filters." />}

        {rides && rides.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ride ID</th>
                    <th>Customer</th>
                    <th>Driver</th>
                    <th>Vehicle</th>
                    <th>Pickup → Destination</th>
                    <th>Fare</th>
                    <th>Status</th>
                    <th>Date / Time</th>
                    <th className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className={styles.rideId}>{r.id}</span>
                        <div className={styles.pmLabel}>{PM_LABEL[r.paymentMethod] ?? r.paymentMethod}</div>
                      </td>
                      <td>
                        <span className={styles.name}>{r.customerName}</span>
                        <div className={styles.sub}>{r.customerId}</div>
                      </td>
                      <td>
                        <span className={styles.name}>{r.driverName}</span>
                        <div className={styles.sub}>{r.driverId}</div>
                      </td>
                      <td>
                        <span className={styles.name}>{r.vehicleDisplay}</span>
                        <div className={styles.sub}>{r.vehicleReg}</div>
                      </td>
                      <td>
                        <div className={styles.route}>
                          <span className={styles.routePickup}>{r.pickup}</span>
                          <span className={styles.routeArrow}>→</span>
                          <span className={styles.routeDrop}>{r.destination}</span>
                        </div>
                        {(r.distanceKm || r.durationMin) && (
                          <div className={styles.sub}>{r.distanceKm} km · {r.durationMin} min</div>
                        )}
                      </td>
                      <td>
                        <span className={styles.fare}>{formatCurrency(r.fare)}</span>
                        {r.rating && <div className={styles.rating}>★ {r.rating}</div>}
                      </td>
                      <td><RideLifecycleBadge status={r.status} /></td>
                      <td className={styles.dateTime}>{formatDateTime(r.startedAt)}</td>
                      <td>
                        <Link to={`/rides/${r.id}`} className="btn btn--ghost btn--sm">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
