import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVehicles, getVehicleStats } from '../../../services/api/vehicleService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { VehicleStatusBadge, VehicleDocStatusBadge } from './components/VehicleStatusBadge'
import { PlusIcon } from '../../../components/icons'
import { formatDateTime, formatNumber } from '../../../utils/formatters'
import styles from './VehiclesPage.module.css'

const STATUS_OPTS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending Verification' },
]

const DOC_STATUS_OPTS = [
  { value: 'all', label: 'All doc statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
]

const TYPE_OPTS = [
  { value: 'all', label: 'All types' },
  { value: 'Sedan', label: 'Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'MPV', label: 'MPV' },
  { value: 'Hatchback', label: 'Hatchback' },
  { value: 'Van', label: 'Van' },
]

const RIDE_TYPE_OPTS = [
  { value: 'all', label: 'All ride types' },
  { value: 'Standard', label: 'Standard' },
  { value: 'XL', label: 'XL' },
  { value: 'Premium', label: 'Premium' },
  { value: 'Pool', label: 'Pool' },
]

const SORT_OPTS = [
  { value: 'default', label: 'Default sort' },
  { value: 'name_asc', label: 'Vehicle A–Z' },
  { value: 'name_desc', label: 'Vehicle Z–A' },
  { value: 'rides_desc', label: 'Most rides' },
  { value: 'lastActive_desc', label: 'Recently active' },
]

function applySort(list, sortKey) {
  const copy = [...list]
  if (sortKey === 'name_asc')       return copy.sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))
  if (sortKey === 'name_desc')      return copy.sort((a, b) => `${b.make} ${b.model}`.localeCompare(`${a.make} ${a.model}`))
  if (sortKey === 'rides_desc')     return copy.sort((a, b) => b.totalRides - a.totalRides)
  if (sortKey === 'lastActive_desc')return copy.sort((a, b) => new Date(b.lastActive ?? 0) - new Date(a.lastActive ?? 0))
  return copy
}

const PAGE_SIZE = 10

export function VehiclesPage() {
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState('all')
  const [docStatus, setDocStatus] = useState('all')
  const [type, setType]           = useState('all')
  const [rideType, setRideType]   = useState('all')
  const [sort, setSort]           = useState('default')
  const [page, setPage]           = useState(1)
  const [vehicles, setVehicles]   = useState(null)
  const [stats, setStats]         = useState(null)
  const [error, setError]         = useState(null)

  useEffect(() => { getVehicleStats().then(setStats).catch(() => {}) }, [])

  useEffect(() => {
    let cancelled = false
    setPage(1)
    getVehicles({ search, status, docStatus, type, rideType })
      .then((data) => { if (!cancelled) { setVehicles(data); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load vehicles.') })
    return () => { cancelled = true }
  }, [search, status, docStatus, type, rideType])

  function resetFilters() {
    setSearch(''); setStatus('all'); setDocStatus('all')
    setType('all'); setRideType('all'); setSort('default'); setPage(1)
  }

  const sorted = applySort(vehicles ?? [], sort)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Vehicles</h1>
          <p className={styles.subtitle}>
            Manage all vehicles operating on the Nomad platform and monitor their fleet assignment,
            driver assignment, verification, and operational status.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/fleet/vehicles/add')}>
          <PlusIcon size={16} /> Add Vehicle
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span className={styles.statLabel}>Total Vehicles</span><span className={styles.statValue}>{formatNumber(stats.total)}</span></div>
          <div className={`${styles.statCard} ${styles.statAccent}`}><span className={styles.statLabel}>Active</span><span className={styles.statValue}>{formatNumber(stats.active)}</span></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Available</span><span className={styles.statValue}>{formatNumber(stats.available)}</span></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Assigned</span><span className={styles.statValue}>{formatNumber(stats.assigned)}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Maintenance</span><span className={styles.statValue}>{formatNumber(stats.maintenance)}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Pending Verification</span><span className={styles.statValue}>{formatNumber(stats.pendingVerification)}</span></div>
          <div className={`${styles.statCard} ${styles.statDanger}`}><span className={styles.statLabel}>Expiring Documents</span><span className={styles.statValue}>{formatNumber(stats.expiringDocs)}</span></div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.tableSection}>
        <Toolbar>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search vehicle, plate, fleet, driver…" ariaLabel="Search vehicles" />
          <FilterSelect value={type} onChange={(v) => { setType(v); setPage(1) }} options={TYPE_OPTS} ariaLabel="Filter by type" />
          <FilterSelect value={rideType} onChange={(v) => { setRideType(v); setPage(1) }} options={RIDE_TYPE_OPTS} ariaLabel="Filter by ride type" />
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_OPTS} ariaLabel="Filter by status" />
          <FilterSelect value={docStatus} onChange={(v) => { setDocStatus(v); setPage(1) }} options={DOC_STATUS_OPTS} ariaLabel="Filter by doc status" />
          <FilterSelect value={sort} onChange={(v) => { setSort(v); setPage(1) }} options={SORT_OPTS} ariaLabel="Sort" />
          {vehicles && <ResultCount count={sorted.length} noun="vehicle" />}
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>Reset</button>
        </Toolbar>

        {!vehicles && !error && <LoadingState label="Loading vehicles…" />}
        {error && <ErrorState description={error} />}
        {vehicles && sorted.length === 0 && (
          <EmptyState title="No vehicles found" description="Try a different search or reset the filters." />
        )}

        {vehicles && sorted.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Reg. Number</th>
                    <th>Fleet</th>
                    <th>Driver</th>
                    <th>Ride Type</th>
                    <th>Status</th>
                    <th>Doc Status</th>
                    <th>Last Active</th>
                    <th className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className={styles.vehicleCell}>
                          <span className={styles.vehicleAvatar}>{v.make.slice(0,1)}{v.model.slice(0,1)}</span>
                          <div>
                            <div className={styles.vehicleName}>{v.make} {v.model}</div>
                            <div className={styles.vehicleSub}>{v.year} · {v.color} · {v.type}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={styles.plateBadge}>{v.regNo}</span></td>
                      <td>
                        <div className={styles.fleetName}>{v.fleetName}</div>
                        <div className={styles.fleetId}>{v.fleetId}</div>
                      </td>
                      <td>
                        {v.driverName
                          ? <div><div className={styles.driverName}>{v.driverName}</div></div>
                          : <span className="table-cell-muted">Unassigned</span>
                        }
                      </td>
                      <td><span className={styles.rideTypePill}>{v.rideType}</span></td>
                      <td><VehicleStatusBadge status={v.status} /></td>
                      <td><VehicleDocStatusBadge status={v.docStatus} /></td>
                      <td className="table-cell-muted">
                        {v.lastActive ? formatDateTime(v.lastActive) : <span>Never</span>}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(`/fleet/vehicles/${v.id}`)}>View</button>
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
