import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortal } from '../context/PortalContext'
import { getFleetDrivers } from '../../../services/api/fleetService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import styles from './PortalDriversPage.module.css'

const STATUS_OPTS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended',label: 'Suspended' },
]

const STATUS_CFG = {
  active:    { variant: 'success', label: 'Active' },
  inactive:  { variant: 'neutral', label: 'Inactive' },
  suspended: { variant: 'danger',  label: 'Suspended' },
}

function DriverStatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

export function PortalDriversPage() {
  const { fleetId } = usePortal()
  const [all,      setAll]      = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  function load() {
    setLoading(true); setError(null)
    getFleetDrivers(fleetId)
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId])  // eslint-disable-line

  const filtered = all.filter((d) => {
    const q = search.toLowerCase()
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.phone?.includes(q) || d.licenseNumber?.toLowerCase().includes(q)
    const matchS = filterStatus === 'all' || d.status === filterStatus
    return matchQ && matchS
  })

  const active = all.filter((d) => d.status === 'active').length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Drivers</h1>
          <p className={styles.subtitle}>{all.length} drivers · {active} active</p>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableTop}>
          <Toolbar>
            <SearchField value={search} onChange={setSearch} placeholder="Search name, phone, license…" />
            <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTS} />
            <ResultCount count={filtered.length} label="driver" />
          </Toolbar>
        </div>

        {loading ? <LoadingState message="Loading drivers…" /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
         filtered.length === 0 ? <EmptyState title="No drivers found" message="Try adjusting your search." /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Phone</th>
                  <th>License</th>
                  <th>Vehicle Type</th>
                  <th>Status</th>
                  <th>Rating</th>
                  <th>Rides</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className={styles.driverName}>{d.name}</div>
                      <div className="table-cell-muted" style={{ fontSize: 11.5 }}>{d.id}</div>
                    </td>
                    <td className="table-cell-muted">{d.phone ?? '—'}</td>
                    <td className="table-cell-muted" style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{d.licenseNumber ?? '—'}</td>
                    <td className="table-cell-muted">{d.vehicleType ?? '—'}</td>
                    <td><DriverStatusBadge status={d.status} /></td>
                    <td style={{ fontWeight: 600 }}>{d.rating ? `${d.rating} ★` : '—'}</td>
                    <td className="table-cell-muted">{d.totalRides ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
