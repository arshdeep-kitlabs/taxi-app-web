import { useEffect, useState } from 'react'
import { usePortal } from '../context/PortalContext'
import { getVehicles } from '../../../services/api/vehicleService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import styles from './PortalVehiclesPage.module.css'

const STATUS_OPTS = [
  { value: 'all',       label: 'All statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'suspended', label: 'Suspended' },
]

const STATUS_CFG = {
  active:      { variant: 'success', label: 'Active' },
  available:   { variant: 'info',    label: 'Available' },
  maintenance: { variant: 'warning', label: 'Maintenance' },
  suspended:   { variant: 'danger',  label: 'Suspended' },
}

function VehicleStatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

export function PortalVehiclesPage() {
  const { fleetId } = usePortal()
  const [all, setAll]         = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  function load() {
    setLoading(true); setError(null)
    getVehicles({ fleet: fleetId })
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId])  // eslint-disable-line

  const filtered = all.filter((v) => {
    const q = search.toLowerCase()
    const matchQ = !q || v.plate?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q)
    const matchS = filterStatus === 'all' || v.status === filterStatus
    return matchQ && matchS
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Vehicles</h1>
          <p className={styles.subtitle}>{all.length} vehicles registered to your fleet</p>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableTop}>
          <Toolbar>
            <SearchField value={search} onChange={setSearch} placeholder="Search plate, make, model…" />
            <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTS} />
            <ResultCount count={filtered.length} label="vehicle" />
          </Toolbar>
        </div>

        {loading ? <LoadingState message="Loading vehicles…" /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
         filtered.length === 0 ? <EmptyState title="No vehicles found" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Type</th>
                  <th>Year</th>
                  <th>Colour</th>
                  <th>Status</th>
                  <th>Maint. Status</th>
                  <th>Next Service</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className={styles.vehicleName}>{v.make} {v.model}</div>
                      <div className="table-cell-muted" style={{ fontSize: 11.5 }}>{v.id}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{v.plate}</td>
                    <td className="table-cell-muted">{v.type}</td>
                    <td className="table-cell-muted">{v.year}</td>
                    <td className="table-cell-muted">{v.color ?? '—'}</td>
                    <td><VehicleStatusBadge status={v.status} /></td>
                    <td className="table-cell-muted">{v.maintenanceStatus?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="table-cell-muted" style={{ fontSize: 12.5 }}>{v.nextServiceDate ?? '—'}</td>
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
