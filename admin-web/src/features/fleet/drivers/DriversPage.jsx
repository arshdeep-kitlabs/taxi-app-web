import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDrivers, getDriverStats } from '../../../services/api/driverService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { DriverStatusBadge, DriverDocStatusBadge } from './components/DriverStatusBadge'
import { PlusIcon } from '../../../components/icons'
import { formatNumber, formatCurrency } from '../../../utils/formatters'
import styles from './DriversPage.module.css'

// ── Filter option arrays ──────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'all', label: 'All statuses' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'on_trip', label: 'On Trip' },
  { value: 'pending', label: 'Pending Verification' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

const DOC_STATUS_OPTS = [
  { value: 'all', label: 'All doc statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
]

const ASSIGNMENT_OPTS = [
  { value: 'all', label: 'All vehicle assignments' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
]

const VERIFY_OPTS = [
  { value: 'all', label: 'All verification statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
]

const SORT_OPTS = [
  { value: 'default', label: 'Default sort' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'rides_desc', label: 'Most rides' },
  { value: 'earnings_desc', label: 'Highest earnings' },
  { value: 'rating_desc', label: 'Highest rating' },
]

function applySort(list, key) {
  const copy = [...list]
  if (key === 'name_asc')     return copy.sort((a, b) => a.fullName.localeCompare(b.fullName))
  if (key === 'name_desc')    return copy.sort((a, b) => b.fullName.localeCompare(a.fullName))
  if (key === 'rides_desc')   return copy.sort((a, b) => b.totalRides - a.totalRides)
  if (key === 'earnings_desc')return copy.sort((a, b) => b.totalEarnings - a.totalEarnings)
  if (key === 'rating_desc')  return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  return copy
}

const PAGE_SIZE = 10

export function DriversPage() {
  const navigate = useNavigate()
  const [search, setSearch]   = useState('')
  const [fleet, setFleet]     = useState('all')
  const [status, setStatus]   = useState('all')
  const [docStatus, setDocStatus] = useState('all')
  const [assignment, setAssignment] = useState('all')
  const [verifyStatus, setVerifyStatus] = useState('all')
  const [sort, setSort]       = useState('default')
  const [page, setPage]       = useState(1)
  const [drivers, setDrivers] = useState(null)
  const [stats, setStats]     = useState(null)
  const [error, setError]     = useState(null)

  // Fleet filter options (active fleets only)
  const activeFleets = storeGetFleets({ status: 'active' })
  const fleetOpts = [
    { value: 'all', label: 'All fleets' },
    ...activeFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  useEffect(() => { getDriverStats().then(setStats).catch(() => {}) }, [])

  useEffect(() => {
    let cancelled = false
    setPage(1)
    getDrivers({ search, fleet, status, docStatus, assignment, verificationStatus: verifyStatus })
      .then((data) => { if (!cancelled) { setDrivers(data); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load drivers.') })
    return () => { cancelled = true }
  }, [search, fleet, status, docStatus, assignment, verifyStatus])

  function resetFilters() {
    setSearch(''); setFleet('all'); setStatus('all')
    setDocStatus('all'); setAssignment('all'); setVerifyStatus('all')
    setSort('default'); setPage(1)
  }

  const sorted     = applySort(drivers ?? [], sort)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet Drivers</h1>
          <p className={styles.subtitle}>
            Manage drivers operating under Nomad fleets, review their verification status, fleet
            membership, vehicle information, documents, and operational status.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/fleet/drivers/add')}>
          <PlusIcon size={16} /> Add Driver
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span className={styles.statLabel}>Total Drivers</span><span className={styles.statValue}>{formatNumber(stats.total)}</span></div>
          <div className={`${styles.statCard} ${styles.statAccent}`}><span className={styles.statLabel}>Active Drivers</span><span className={styles.statValue}>{formatNumber(stats.active)}</span></div>
          <div className={`${styles.statCard} ${styles.statAccent}`}><span className={styles.statLabel}>Online</span><span className={styles.statValue}>{formatNumber(stats.online)}</span></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Offline</span><span className={styles.statValue}>{formatNumber(stats.offline)}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Pending Verification</span><span className={styles.statValue}>{formatNumber(stats.pending)}</span></div>
          <div className={`${styles.statCard} ${styles.statDanger}`}><span className={styles.statLabel}>Suspended</span><span className={styles.statValue}>{formatNumber(stats.suspended)}</span></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Unassigned</span><span className={styles.statValue}>{formatNumber(stats.unassigned)}</span></div>
        </div>
      )}

      {/* Table section */}
      <div className={styles.tableSection}>
        <Toolbar>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name, ID, phone, email, fleet…" ariaLabel="Search drivers" />
          <FilterSelect value={fleet} onChange={(v) => { setFleet(v); setPage(1) }} options={fleetOpts} ariaLabel="Filter by fleet" />
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_OPTS} ariaLabel="Filter by status" />
          <FilterSelect value={docStatus} onChange={(v) => { setDocStatus(v); setPage(1) }} options={DOC_STATUS_OPTS} ariaLabel="Filter by doc status" />
          <FilterSelect value={assignment} onChange={(v) => { setAssignment(v); setPage(1) }} options={ASSIGNMENT_OPTS} ariaLabel="Filter by vehicle assignment" />
          <FilterSelect value={verifyStatus} onChange={(v) => { setVerifyStatus(v); setPage(1) }} options={VERIFY_OPTS} ariaLabel="Filter by verification" />
          <FilterSelect value={sort} onChange={(v) => { setSort(v); setPage(1) }} options={SORT_OPTS} ariaLabel="Sort" />
          {drivers && <ResultCount count={sorted.length} noun="driver" />}
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>Reset</button>
        </Toolbar>

        {!drivers && !error && <LoadingState label="Loading drivers…" />}
        {error && <ErrorState description={error} />}
        {drivers && sorted.length === 0 && (
          <EmptyState title="No drivers found" description="Try a different search or reset the filters." />
        )}

        {drivers && sorted.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Driver ID</th>
                    <th>Fleet</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Doc Status</th>
                    <th>Rating</th>
                    <th>Total Rides</th>
                    <th>Earnings</th>
                    <th className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div className={styles.driverCell}>
                          <span className={styles.driverAvatar}>{d.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                          <div>
                            <div className={styles.driverName}>{d.fullName}</div>
                            <div className={styles.driverSub}>{d.driverType === 'independent' ? 'Independent' : 'Fleet Driver'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={styles.driverId}>{d.id}</span></td>
                      <td>
                        {d.fleetName
                          ? <div><div className={styles.fleetName}>{d.fleetName}</div><div className={styles.fleetId}>{d.fleetId}</div></div>
                          : <span className="table-cell-muted">Independent</span>
                        }
                      </td>
                      <td>
                        {d.vehicleDisplay
                          ? <div className={styles.vehicleDisplay}>{d.vehicleDisplay}</div>
                          : <span className="table-cell-muted">Unassigned</span>
                        }
                      </td>
                      <td><DriverStatusBadge status={d.status} /></td>
                      <td><DriverDocStatusBadge status={d.docStatus} /></td>
                      <td>{d.rating != null ? <span>{d.rating} ★</span> : <span className="table-cell-muted">—</span>}</td>
                      <td>{formatNumber(d.totalRides)}</td>
                      <td>{d.totalEarnings > 0 ? formatCurrency(d.totalEarnings) : <span className="table-cell-muted">—</span>}</td>
                      <td>
                        <div className={styles.actions}>
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(`/fleet/drivers/${d.id}`)}>View</button>
                          <button type="button" className="btn btn--ghost btn--sm">Edit</button>
                        </div>
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
