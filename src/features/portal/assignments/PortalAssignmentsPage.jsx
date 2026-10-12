import { useEffect, useState } from 'react'
import { usePortal } from '../context/PortalContext'
import { getAssignments } from '../../../services/api/assignmentService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatDateTime } from '../../../utils/formatters'
import styles from './PortalAssignmentsPage.module.css'

const STATUS_OPTS = [
  { value: 'all',      label: 'All' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const STATUS_CFG = {
  active:   { variant: 'success', label: 'Active' },
  inactive: { variant: 'neutral', label: 'Inactive' },
}

function AssignBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

export function PortalAssignmentsPage() {
  const { fleetId } = usePortal()
  const [all,     setAll]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  function load() {
    setLoading(true); setError(null)
    getAssignments({ fleet: fleetId })
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId])  // eslint-disable-line

  const filtered = all.filter((a) => {
    const q = search.toLowerCase()
    const matchQ = !q || a.driverName?.toLowerCase().includes(q) || a.vehicleDisplay?.toLowerCase().includes(q) || a.vehicleReg?.toLowerCase().includes(q)
    const matchS = filterStatus === 'all' || a.status === filterStatus
    return matchQ && matchS
  })

  const active = all.filter((a) => a.status === 'active').length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assignments</h1>
          <p className={styles.subtitle}>{active} active driver–vehicle assignments</p>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableTop}>
          <Toolbar>
            <SearchField value={search} onChange={setSearch} placeholder="Search driver, vehicle, plate…" />
            <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTS} />
            <ResultCount count={filtered.length} label="assignment" />
          </Toolbar>
        </div>

        {loading ? <LoadingState message="Loading assignments…" /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
         filtered.length === 0 ? <EmptyState title="No assignments found" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Plate</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className={styles.cellBold}>{a.driverName}</div>
                      <div className="table-cell-muted" style={{ fontSize: 11.5 }}>{a.driverId}</div>
                    </td>
                    <td>
                      <div className={styles.cellBold}>{a.vehicleDisplay}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5 }}>{a.vehicleReg}</td>
                    <td><AssignBadge status={a.status} /></td>
                    <td className="table-cell-muted" style={{ fontSize: 12.5 }}>{a.assignedAt ? formatDateTime(a.assignedAt) : '—'}</td>
                    <td className="table-cell-muted" style={{ fontSize: 12.5, maxWidth: 180 }}>{a.notes ?? '—'}</td>
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
