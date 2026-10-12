import { useEffect, useState } from 'react'
import { usePortal } from '../context/PortalContext'
import { getFleetRides } from '../../../services/api/fleetRidesService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import styles from './PortalRidesPage.module.css'

const STATUS_OPTS = [
  { value: 'all',       label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'ongoing',   label: 'Ongoing' },
  { value: 'requested', label: 'Requested' },
]

const STATUS_CFG = {
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'danger',  label: 'Cancelled' },
  ongoing:   { variant: 'info',    label: 'Ongoing' },
  requested: { variant: 'warning', label: 'Requested' },
}

function RideBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

const PAGE_SIZE = 15

export function PortalRidesPage() {
  const { fleetId } = usePortal()
  const [all,     setAll]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage]       = useState(1)

  function load() {
    setLoading(true); setError(null)
    getFleetRides({ fleetId, status: filterStatus, search })
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId, filterStatus, search])  // eslint-disable-line

  const total = all.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePg = Math.min(page, pages)
  const slice = all.slice((safePg - 1) * PAGE_SIZE, safePg * PAGE_SIZE)

  const completedCount = all.filter((r) => r.status === 'completed').length
  const totalRevenue   = all.filter((r) => r.status === 'completed').reduce((s, r) => s + r.fare, 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Rides</h1>
          <p className={styles.subtitle}>{completedCount} completed · {formatCurrency(totalRevenue)} total revenue</p>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableTop}>
          <Toolbar>
            <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search ride, customer, driver…" />
            <FilterSelect label="Status" value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1) }} options={STATUS_OPTS} />
            <ResultCount count={total} label="ride" />
          </Toolbar>
        </div>

        {loading ? <LoadingState message="Loading rides…" /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
         slice.length === 0 ? <EmptyState title="No rides found" /> : (
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
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id}>
                      <td><span className={styles.rideId}>{r.id}</span></td>
                      <td>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.customerName}</div>
                      </td>
                      <td className="table-cell-muted">{r.driverName}</td>
                      <td className="table-cell-muted" style={{ fontSize: 12.5 }}>{r.vehicleDisplay}<br/><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.vehicleReg}</span></td>
                      <td className="table-cell-muted" style={{ fontSize: 12.5, maxWidth: 200 }}>
                        {r.pickup?.slice(0, 20)}{r.pickup?.length > 20 ? '…' : ''} → {r.destination?.slice(0, 20)}{r.destination?.length > 20 ? '…' : ''}
                      </td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(r.fare)}</td>
                      <td className="table-cell-muted">{r.rating ? `${r.rating} ★` : '—'}</td>
                      <td><RideBadge status={r.status} /></td>
                      <td className="table-cell-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {r.startedAt ? new Date(r.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className={styles.pagination}>
                <button className="btn btn--secondary" disabled={safePg === 1}     onClick={() => setPage(safePg - 1)}>← Prev</button>
                <span className={styles.pageInfo}>Page {safePg} of {pages}</span>
                <button className="btn btn--secondary" disabled={safePg === pages} onClick={() => setPage(safePg + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
