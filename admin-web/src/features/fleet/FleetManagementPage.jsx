import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFleets, getFleetStats } from '../../services/api/fleetService'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { FleetStatusBadge } from './components/FleetStatusBadge'
import { PlusIcon } from '../../components/icons'
import { formatDateTime, formatCurrency, formatNumber } from '../../utils/formatters'
import styles from './FleetManagementPage.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

const VEHICLE_OPTIONS = [
  { value: 'all', label: 'All sizes' },
  { value: 'small', label: '1–20 vehicles' },
  { value: 'medium', label: '21–50 vehicles' },
  { value: 'large', label: '50+ vehicles' },
]

function matchesVehicleFilter(count, filter) {
  if (filter === 'all') return true
  if (filter === 'small') return count <= 20
  if (filter === 'medium') return count > 20 && count <= 50
  if (filter === 'large') return count > 50
  return true
}

function SortIcon({ direction }) {
  if (!direction) return <span className={styles.sortNeutral}>↕</span>
  return <span className={styles.sortActive}>{direction === 'asc' ? '↑' : '↓'}</span>
}

const PAGE_SIZE = 10

export function FleetManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [fleets, setFleets] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    getFleetStats()
      .then(setStats)
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setPage(1)
    getFleets({ search, status })
      .then((data) => {
        if (!cancelled) {
          setFleets(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load fleets.')
      })
    return () => { cancelled = true }
  }, [search, status])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = (fleets ?? []).filter((f) => matchesVehicleFilter(f.vehicles, vehicleFilter))

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0
    let av = a[sortKey]
    let bv = b[sortKey]
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Fleet Management</h1>
          <p className={styles.subtitle}>
            Manage fleet operators, vehicles, drivers, assignments, documents, and fleet operations from one place.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/fleet/add')}>
          <PlusIcon size={16} />
          Add Fleet
        </button>
      </div>

      {/* Summary stat cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Fleets</span>
            <span className={styles.statValue}>{formatNumber(stats.totalFleets)}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAccent}`}>
            <span className={styles.statLabel}>Active Fleets</span>
            <span className={styles.statValue}>{formatNumber(stats.activeFleets)}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardWarning}`}>
            <span className={styles.statLabel}>Pending Fleets</span>
            <span className={styles.statValue}>{formatNumber(stats.pendingFleets)}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardDanger}`}>
            <span className={styles.statLabel}>Suspended Fleets</span>
            <span className={styles.statValue}>{formatNumber(stats.suspendedFleets)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Vehicles</span>
            <span className={styles.statValue}>{formatNumber(stats.totalVehicles)}</span>
          </div>
          <div className={`${styles.statCard} ${styles.statCardAccent}`}>
            <span className={styles.statLabel}>Active Vehicles</span>
            <span className={styles.statValue}>{formatNumber(stats.activeVehicles)}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Fleet Drivers</span>
            <span className={styles.statValue}>{formatNumber(stats.totalFleetDrivers)}</span>
          </div>
        </div>
      )}

      {/* Table section */}
      <div className={styles.tableSection}>
        <div className={styles.tableSectionHeader}>
          <h2 className={styles.tableSectionTitle}>All Fleets</h2>
        </div>

        <Toolbar>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search fleet name, owner or ID…"
            ariaLabel="Search fleets"
          />
          <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
          <FilterSelect value={vehicleFilter} onChange={setVehicleFilter} options={VEHICLE_OPTIONS} ariaLabel="Filter by vehicle count" />
          {fleets && <ResultCount count={filtered.length} noun="fleet" />}
        </Toolbar>

        {!fleets && !error && <LoadingState label="Loading fleets…" />}
        {error && <ErrorState description={error} />}

        {fleets && filtered.length === 0 && (
          <EmptyState
            title="No fleets found"
            description="Try a different name, ID, or clear the filters."
          />
        )}

        {fleets && filtered.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">
                      <button type="button" className={styles.sortBtn} onClick={() => handleSort('name')}>
                        Fleet Name <SortIcon direction={sortKey === 'name' ? sortDir : null} />
                      </button>
                    </th>
                    <th scope="col">Fleet Owner</th>
                    <th scope="col">
                      <button type="button" className={styles.sortBtn} onClick={() => handleSort('vehicles')}>
                        Vehicles <SortIcon direction={sortKey === 'vehicles' ? sortDir : null} />
                      </button>
                    </th>
                    <th scope="col">
                      <button type="button" className={styles.sortBtn} onClick={() => handleSort('drivers')}>
                        Drivers <SortIcon direction={sortKey === 'drivers' ? sortDir : null} />
                      </button>
                    </th>
                    <th scope="col">Active Rides</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <button type="button" className={styles.sortBtn} onClick={() => handleSort('createdAt')}>
                        Created <SortIcon direction={sortKey === 'createdAt' ? sortDir : null} />
                      </button>
                    </th>
                    <th scope="col" className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((fleet) => (
                    <tr key={fleet.id}>
                      <td>
                        <div className={styles.fleetCell}>
                          <span className={styles.fleetAvatar}>
                            {fleet.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className={styles.fleetName}>{fleet.name}</div>
                            <div className={styles.fleetId}>{fleet.id} · {fleet.city}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.ownerName}>{fleet.owner.name}</div>
                        <div className="table-cell-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{fleet.owner.email}</div>
                      </td>
                      <td className={styles.numCell}>{formatNumber(fleet.vehicles)}</td>
                      <td className={styles.numCell}>{formatNumber(fleet.drivers)}</td>
                      <td className={styles.numCell}>
                        {fleet.activeRides > 0 ? (
                          <span className={styles.activeRidesBadge}>{fleet.activeRides}</span>
                        ) : (
                          <span className="table-cell-muted">—</span>
                        )}
                      </td>
                      <td>
                        <FleetStatusBadge status={fleet.status} />
                      </td>
                      <td className="table-cell-muted">{formatDateTime(fleet.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => navigate(`/fleet/${fleet.id}`)}
                          >
                            View
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm">Edit</button>
                          {fleet.status !== 'suspended' ? (
                            <button type="button" className="btn btn--danger btn--sm">Suspend</button>
                          ) : (
                            <button type="button" className="btn btn--secondary btn--sm">Reinstate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
