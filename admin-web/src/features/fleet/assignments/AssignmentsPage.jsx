import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAssignments, getAssignmentStats } from '../../../services/api/assignmentService'
import { storeGetDriverStats } from '../../../services/api/driverStore'
import { storeGetVehicleStats } from '../../../services/api/vehicleStore'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { PlusIcon } from '../../../components/icons'
import { formatNumber } from '../../../utils/formatters'
import styles from './AssignmentsPage.module.css'

const STATUS_OPTS = [
  { value: 'all',     label: 'All statuses' },
  { value: 'active',  label: 'Active' },
  { value: 'removed', label: 'Removed' },
]

const SORT_OPTS = [
  { value: 'default',  label: 'Default sort' },
  { value: 'driver',   label: 'Driver A–Z' },
  { value: 'fleet',    label: 'Fleet A–Z' },
  { value: 'date_desc',label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
]

function applySort(list, key) {
  const copy = [...list]
  if (key === 'driver')    return copy.sort((a, b) => a.driverName.localeCompare(b.driverName))
  if (key === 'fleet')     return copy.sort((a, b) => a.fleetName.localeCompare(b.fleetName))
  if (key === 'date_desc') return copy.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate))
  if (key === 'date_asc')  return copy.sort((a, b) => new Date(a.assignedDate) - new Date(b.assignedDate))
  return copy
}

const PAGE_SIZE = 10

export function AssignmentsPage() {
  const navigate = useNavigate()
  const [search, setSearch]   = useState('')
  const [fleet, setFleet]     = useState('all')
  const [status, setStatus]   = useState('active')
  const [sort, setSort]       = useState('default')
  const [page, setPage]       = useState(1)
  const [assignments, setAssignments] = useState(null)
  const [stats, setStats]     = useState(null)
  const [error, setError]     = useState(null)

  const activeFleets = storeGetFleets({ status: 'active' })
  const fleetOpts = [
    { value: 'all', label: 'All fleets' },
    ...activeFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  useEffect(() => {
    // Combine assignment stats with driver/vehicle unassigned counts
    getAssignmentStats().then((aStats) => {
      const dStats = storeGetDriverStats()
      const vStats = storeGetVehicleStats()
      setStats({
        total: aStats.total,
        active: aStats.active,
        unassignedDrivers: dStats.unassigned,
        unassignedVehicles: vStats.available,
      })
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setPage(1)
    getAssignments({ fleet, status, search })
      .then((data) => { if (!cancelled) { setAssignments(data); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load assignments.') })
    return () => { cancelled = true }
  }, [fleet, status, search])

  function resetFilters() {
    setSearch(''); setFleet('all'); setStatus('active'); setSort('default'); setPage(1)
  }

  const sorted     = applySort(assignments ?? [], sort)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assignments</h1>
          <p className={styles.subtitle}>
            View and manage driver–vehicle assignments across all fleets. Each driver can hold one
            active vehicle assignment at a time.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/fleet/assignments/new')}>
          <PlusIcon size={16} /> Assign Vehicle
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span className={styles.statLabel}>Total Assignments</span><span className={styles.statValue}>{formatNumber(stats.total)}</span></div>
          <div className={`${styles.statCard} ${styles.statAccent}`}><span className={styles.statLabel}>Active</span><span className={styles.statValue}>{formatNumber(stats.active)}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Unassigned Drivers</span><span className={styles.statValue}>{formatNumber(stats.unassignedDrivers)}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Unassigned Vehicles</span><span className={styles.statValue}>{formatNumber(stats.unassignedVehicles)}</span></div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableSection}>
        <Toolbar>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search driver, vehicle, plate, fleet…" ariaLabel="Search assignments" />
          <FilterSelect value={fleet}  onChange={(v) => { setFleet(v);  setPage(1) }} options={fleetOpts}   ariaLabel="Filter by fleet" />
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_OPTS} ariaLabel="Filter by status" />
          <FilterSelect value={sort}   onChange={(v) => { setSort(v);   setPage(1) }} options={SORT_OPTS}   ariaLabel="Sort" />
          {assignments && <ResultCount count={sorted.length} noun="assignment" />}
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>Reset</button>
        </Toolbar>

        {!assignments && !error && <LoadingState label="Loading assignments…" />}
        {error && <ErrorState description={error} />}
        {assignments && sorted.length === 0 && (
          <EmptyState title="No assignments found" description="Try a different filter, or create a new assignment." />
        )}

        {assignments && sorted.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Vehicle</th>
                    <th>Fleet</th>
                    <th>Status</th>
                    <th>Assigned Date</th>
                    <th className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className={styles.driverCell}>
                          <span className={styles.avatar}>{a.driverName.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                          <div>
                            <div className={styles.driverName}>{a.driverName}</div>
                            <div className={styles.driverId}>{a.driverId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.vehicleName}>{a.vehicleDisplay}</div>
                        <span className={styles.plateBadge}>{a.vehicleReg}</span>
                      </td>
                      <td>
                        <div className={styles.fleetName}>{a.fleetName}</div>
                        <div className={styles.fleetId}>{a.fleetId}</div>
                      </td>
                      <td>
                        {a.status === 'active'
                          ? <span className="badge badge--success"><span className="badge__dot" />Active</span>
                          : <span className="badge badge--neutral"><span className="badge__dot" />Removed</span>
                        }
                      </td>
                      <td className="table-cell-muted">{a.assignedDate}</td>
                      <td>
                        <div className={styles.actions}>
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(`/fleet/assignments/${a.id}`)}>View</button>
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
