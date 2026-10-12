import { useEffect, useState } from 'react'
import { usePortal } from '../context/PortalContext'
import { getFleetMaintenance } from '../../../services/api/vehicleService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import styles from './PortalMaintenancePage.module.css'

const STATUS_OPTS = [
  { value: 'all',                  label: 'All statuses' },
  { value: 'operational',          label: 'Operational' },
  { value: 'maintenance_required', label: 'Service Required' },
  { value: 'under_maintenance',    label: 'Under Maintenance' },
  { value: 'suspended',            label: 'Suspended' },
]

const STATUS_CFG = {
  operational:          { variant: 'success', label: 'Operational' },
  maintenance_required: { variant: 'warning', label: 'Service Required' },
  under_maintenance:    { variant: 'danger',  label: 'Under Maintenance' },
  suspended:            { variant: 'neutral', label: 'Suspended' },
}

function MaintBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

function nextServiceTag(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0)   return { label: 'Overdue',               cls: 'danger' }
  if (diff <= 7)  return { label: `Due in ${Math.ceil(diff)}d`, cls: 'danger' }
  if (diff <= 30) return { label: `Due in ${Math.ceil(diff)}d`, cls: 'warning' }
  return null
}

export function PortalMaintenancePage() {
  const { fleetId } = usePortal()
  const [all,     setAll]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  function load() {
    setLoading(true); setError(null)
    getFleetMaintenance({ fleetId, maintenanceStatus: filterStatus === 'all' ? 'all' : filterStatus, search })
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId, filterStatus, search])  // eslint-disable-line

  const needAttention = all.filter((v) =>
    v.maintenanceStatus === 'maintenance_required' || v.maintenanceStatus === 'under_maintenance'
  ).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Maintenance</h1>
          <p className={styles.subtitle}>{all.length} vehicles · {needAttention > 0 ? `${needAttention} need attention` : 'all operational'}</p>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableTop}>
          <Toolbar>
            <SearchField value={search} onChange={(v) => { setSearch(v) }} placeholder="Search vehicle, plate…" />
            <FilterSelect label="Status" value={filterStatus} onChange={(v) => { setFilterStatus(v) }} options={STATUS_OPTS} />
            <ResultCount count={all.length} label="vehicle" />
          </Toolbar>
        </div>

        {loading ? <LoadingState message="Loading maintenance…" /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
         all.length === 0 ? <EmptyState title="No vehicles found" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Maint. Status</th>
                  <th>Last Service</th>
                  <th>Next Service</th>
                  <th>Last Record</th>
                  <th>Mileage</th>
                </tr>
              </thead>
              <tbody>
                {all.map((v) => {
                  const tag = nextServiceTag(v.nextServiceDate)
                  return (
                    <tr key={v.vehicleId}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{v.vehicleDisplay}</div>
                        <div className="table-cell-muted" style={{ fontSize: 11.5 }}>{v.vehicleId}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5 }}>{v.plate}</td>
                      <td><MaintBadge status={v.maintenanceStatus} /></td>
                      <td className="table-cell-muted">{v.lastServiceDate ?? '—'}</td>
                      <td>
                        <span className="table-cell-muted" style={{ fontSize: 13 }}>{v.nextServiceDate ?? '—'}</span>
                        {tag && (
                          <span className={`badge badge--${tag.cls}`} style={{ marginLeft: 6, fontSize: 10.5 }}>
                            <span className="badge__dot" />{tag.label}
                          </span>
                        )}
                      </td>
                      <td className="table-cell-muted">{v.lastRecordType ?? '—'}</td>
                      <td className="table-cell-muted">{v.currentMileage ? `${v.currentMileage.toLocaleString()} km` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.note}>
        To add maintenance records or change vehicle status, contact your Nomad fleet manager or use the Admin Dashboard.
      </div>
    </div>
  )
}
