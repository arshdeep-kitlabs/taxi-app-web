import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getVehicleById, getVehicleDocs, approveVehicleDoc, rejectVehicleDoc,
  getMaintenance, addMaintenanceRecord, getVehicleRides, getVehicleHistory,
  updateVehicleStatus,
} from '../../../services/api/vehicleService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { VehicleStatusBadge, VehicleDocStatusBadge } from './components/VehicleStatusBadge'
import { formatDateTime, formatNumber, formatCurrency } from '../../../utils/formatters'
import styles from './VehicleDetailPage.module.css'

// ─── Tab list ────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Driver', 'Documents', 'Rides', 'Performance', 'Maintenance', 'History']

// ─── Overview tab ────────────────────────────────────────────────────────────
function OverviewTab({ vehicle, onStatusChange }) {
  const [changing, setChanging] = useState(false)

  async function changeStatus(s) {
    setChanging(true)
    try { await onStatusChange(s) } finally { setChanging(false) }
  }

  const INFO = [
    { label: 'Make',   value: vehicle.make },
    { label: 'Model',  value: vehicle.model },
    { label: 'Year',   value: vehicle.year },
    { label: 'Color',  value: vehicle.color || '—' },
    { label: 'Type',   value: vehicle.type },
    { label: 'Ride Type', value: vehicle.rideType },
    { label: 'Reg. Number', value: vehicle.regNo },
    { label: 'VIN',    value: vehicle.vin || '—' },
  ]

  return (
    <div className={styles.tabContent}>
      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Vehicle Information</h3>
          <dl className={styles.infoGrid}>
            {INFO.map(({ label, value }) => (
              <>
                <dt key={`dt-${label}`} className={styles.infoLabel}>{label}</dt>
                <dd key={`dd-${label}`} className={styles.infoValue}>{value}</dd>
              </>
            ))}
          </dl>
        </div>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Fleet & Status</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>Fleet</dt>
            <dd className={styles.infoValue}>
              <Link to={`/fleet/${vehicle.fleetId}`} className={styles.link}>{vehicle.fleetName}</Link>
              <span className={styles.infoSub}>{vehicle.fleetId}</span>
            </dd>
            <dt className={styles.infoLabel}>Current Status</dt>
            <dd className={styles.infoValue}><VehicleStatusBadge status={vehicle.status} /></dd>
            <dt className={styles.infoLabel}>Doc Status</dt>
            <dd className={styles.infoValue}><VehicleDocStatusBadge status={vehicle.docStatus} /></dd>
            <dt className={styles.infoLabel}>Last Active</dt>
            <dd className={styles.infoValue}>{vehicle.lastActive ? formatDateTime(vehicle.lastActive) : '—'}</dd>
            <dt className={styles.infoLabel}>Total Rides</dt>
            <dd className={styles.infoValue}>{formatNumber(vehicle.totalRides)}</dd>
          </dl>
          <div className={styles.statusActions}>
            <p className={styles.statusActionsLabel}>Change vehicle status:</p>
            <div className={styles.statusBtns}>
              {['active', 'available', 'maintenance', 'suspended', 'inactive'].map((s) => (
                <button key={s} type="button"
                  className={`btn btn--sm ${vehicle.status === s ? 'btn--primary' : 'btn--ghost'}`}
                  disabled={changing || vehicle.status === s}
                  onClick={() => changeStatus(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Driver tab ──────────────────────────────────────────────────────────────
function DriverTab({ vehicle }) {
  if (!vehicle.driverName) {
    return (
      <div className={styles.tabContent}>
        <EmptyState title="No driver assigned" description="This vehicle is currently unassigned. Use the Assign Driver button to assign a driver." />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-5)' }}>
          <button type="button" className="btn btn--primary">Assign Driver</button>
        </div>
      </div>
    )
  }
  return (
    <div className={styles.tabContent}>
      <div className={styles.panel} style={{ maxWidth: 420 }}>
        <h3 className={styles.panelTitle}>Assigned Driver</h3>
        <div className={styles.driverCard}>
          <span className={styles.driverAvatar}>{vehicle.driverName.slice(0,1)}</span>
          <div>
            <div className={styles.driverName}>{vehicle.driverName}</div>
            <div className={styles.driverSub}>{vehicle.driverId}</div>
          </div>
        </div>
        <div className={styles.driverActions}>
          <button type="button" className="btn btn--secondary btn--sm">View Driver</button>
          <button type="button" className="btn btn--ghost btn--sm">Unassign</button>
        </div>
      </div>
    </div>
  )
}

// ─── Documents tab ────────────────────────────────────────────────────────────
function DocumentsTab({ vehicleId, histRefresh, onHistRefresh }) {
  const [docs, setDocs]     = useState(null)
  const [loading, setLoading]= useState(true)
  const [modal, setModal]   = useState(null)  // { doc, action }
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)
  const [toast, setToast]   = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    setLoading(true)
    getVehicleDocs(vehicleId).then((d) => { setDocs(d); setLoading(false) })
  }, [vehicleId, histRefresh])

  async function confirm() {
    if (modal.action === 'reject' && !reason.trim()) return
    setBusy(true)
    try {
      if (modal.action === 'approve') {
        await approveVehicleDoc(vehicleId, modal.doc.id)
        showToast(`"${modal.doc.name}" approved`)
      } else {
        await rejectVehicleDoc(vehicleId, modal.doc.id, reason)
        showToast(`"${modal.doc.name}" rejected`, 'danger')
      }
      setDocs(await getVehicleDocs(vehicleId))
      onHistRefresh()
    } finally {
      setBusy(false); setModal(null); setReason('')
    }
  }

  if (loading) return <div className={styles.tabContent}><LoadingState label="Loading documents…" /></div>
  if (!docs?.length) return <div className={styles.tabContent}><EmptyState title="No documents" description="No documents have been uploaded for this vehicle." /></div>

  return (
    <div className={styles.tabContent}>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}
      <div className={styles.docCards}>
        {docs.map((doc) => (
          <div key={doc.id} className={`${styles.docCard} ${styles[`docCard--${doc.status}`]}`}>
            <div className={styles.docCardTop}>
              <span className={styles.docName}>{doc.name}</span>
              <VehicleDocStatusBadge status={doc.status} />
            </div>
            <div className={styles.docCardBody}>
              {doc.expiryDate && (
                <div className={styles.docMeta}>
                  <span className={styles.docMetaLabel}>Expiry</span>
                  <span className={styles.docMetaVal}>{doc.expiryDate}</span>
                </div>
              )}
              {doc.rejectionReason && (
                <div className={styles.docMeta}>
                  <span className={styles.docMetaLabel}>Reason</span>
                  <span className={styles.docMetaVal}>{doc.rejectionReason}</span>
                </div>
              )}
            </div>
            <div className={styles.docCardFooter}>
              <button type="button" className="btn btn--ghost btn--sm">View</button>
              {doc.status !== 'verified' && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setModal({ doc, action: 'approve' }); setReason('') }}>Approve</button>
              )}
              {doc.status !== 'rejected' && (
                <button type="button" className="btn btn--danger btn--sm" onClick={() => { setModal({ doc, action: 'reject' }); setReason('') }}>Reject</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>{modal.action === 'approve' ? 'Approve Document' : 'Reject Document'}</h3>
            <p className={styles.modalDesc}><strong>{modal.doc.name}</strong></p>
            {modal.action === 'reject' && (
              <div className={styles.reasonField}>
                <label className={styles.reasonLabel}>Rejection reason *</label>
                <textarea className={styles.reasonTextarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="State why this document is rejected…" />
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button"
                className={modal.action === 'approve' ? 'btn btn--primary' : 'btn btn--danger'}
                onClick={confirm} disabled={busy || (modal.action === 'reject' && !reason.trim())}>
                {busy ? 'Saving…' : modal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rides tab ───────────────────────────────────────────────────────────────
function RidesTab({ vehicleId }) {
  const [rides, setRides] = useState(null)
  const [search, setSearch] = useState('')
  useEffect(() => { getVehicleRides(vehicleId).then(setRides) }, [vehicleId])

  const filtered = (rides ?? []).filter((r) =>
    !search || `${r.rideId} ${r.driverName} ${r.pickupArea}`.toLowerCase().includes(search.toLowerCase())
  )

  if (!rides) return <div className={styles.tabContent}><LoadingState label="Loading rides…" /></div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search rides…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className={styles.resultCount}>{filtered.length} ride{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      {filtered.length === 0
        ? <EmptyState title="No rides found" description="No rides match the current filter." />
        : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ride ID</th><th>Date</th><th>Driver</th>
                  <th>Pickup</th><th>Distance</th><th>Fare</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.rideId}>
                    <td className={styles.mono}>{r.rideId}</td>
                    <td className="table-cell-muted">{formatDateTime(r.date)}</td>
                    <td>{r.driverName ?? '—'}</td>
                    <td>{r.pickupArea}</td>
                    <td>{r.distanceKm} km</td>
                    <td>{formatCurrency(r.fare)}</td>
                    <td><span className={`badge badge--${r.status === 'completed' ? 'success' : 'danger'}`}><span className="badge__dot" />{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

// ─── Performance tab ─────────────────────────────────────────────────────────
function PerformanceTab({ vehicle }) {
  const metrics = [
    { label: 'Total Rides',      value: formatNumber(vehicle.totalRides),           note: 'all time' },
    { label: 'Completed Rides',  value: formatNumber(vehicle.completedRides ?? Math.round(vehicle.totalRides * 0.94)), note: '94% completion' },
    { label: 'Cancelled Rides',  value: formatNumber(vehicle.cancelledRides ?? Math.round(vehicle.totalRides * 0.06)), note: '6% cancellation' },
    { label: 'Total Revenue',    value: formatCurrency(vehicle.totalRevenue ?? vehicle.totalRides * 38), note: 'gross earnings' },
    { label: 'Avg Fare',         value: formatCurrency(vehicle.avgFare ?? 38),      note: 'per ride' },
    { label: 'Avg Distance',     value: `${vehicle.avgDistance ?? 14} km`,          note: 'per ride' },
    { label: 'Avg Rating',       value: `${vehicle.avgRating ?? 4.7} ★`,            note: 'out of 5' },
    { label: 'Utilization Rate', value: `${vehicle.utilizationRate ?? 72}%`,        note: 'hours online vs operational' },
  ]
  return (
    <div className={styles.tabContent}>
      <div className={styles.perfGrid}>
        {metrics.map(({ label, value, note }) => (
          <div key={label} className={styles.perfCard}>
            <span className={styles.perfLabel}>{label}</span>
            <span className={styles.perfValue}>{value}</span>
            <span className={styles.perfNote}>{note}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Maintenance tab ─────────────────────────────────────────────────────────
function MaintenanceTab({ vehicleId }) {
  const [records, setRecords] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState({ type: '', date: '', mileage: '', cost: '', notes: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => { getMaintenance(vehicleId).then(setRecords) }, [vehicleId])

  async function submitAdd() {
    setBusy(true)
    try {
      await addMaintenanceRecord(vehicleId, form)
      setRecords(await getMaintenance(vehicleId))
      setAddModal(false)
      setForm({ type: '', date: '', mileage: '', cost: '', notes: '' })
    } finally { setBusy(false) }
  }

  if (!records) return <div className={styles.tabContent}><LoadingState label="Loading maintenance records…" /></div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabToolbar}>
        <h3 className={styles.tabSubtitle}>Maintenance Records</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to={`/fleet/maintenance?vehicle=${vehicleId}`}
            style={{ fontSize: 13, color: 'var(--nomad-sage,#5fa77c)', fontWeight: 600, textDecoration: 'none' }}>
            Fleet Maintenance →
          </Link>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAddModal(true)}>+ Add Record</button>
        </div>
      </div>

      {records.length === 0
        ? <EmptyState title="No maintenance records" description="No maintenance has been recorded for this vehicle." />
        : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Type</th><th>Date</th><th>Mileage</th><th>Cost</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.type}</td>
                    <td className="table-cell-muted">{r.date}</td>
                    <td>{r.mileage ? `${formatNumber(r.mileage)} km` : '—'}</td>
                    <td>{r.cost ? formatCurrency(r.cost) : '—'}</td>
                    <td className="table-cell-muted">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {addModal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setAddModal(false)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Add Maintenance Record</h3>
            <div className={styles.mForm}>
              <label className={styles.mLabel}>Type *</label>
              <input className={styles.mInput} placeholder="e.g. Oil Change, Tyre Rotation" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
              <label className={styles.mLabel}>Date *</label>
              <input type="date" className={styles.mInput} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              <label className={styles.mLabel}>Mileage (km)</label>
              <input type="number" className={styles.mInput} placeholder="e.g. 45000" value={form.mileage} onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} />
              <label className={styles.mLabel}>Cost (AED)</label>
              <input type="number" className={styles.mInput} placeholder="e.g. 250" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
              <label className={styles.mLabel}>Notes</label>
              <textarea className={styles.mTextarea} rows={3} placeholder="Any additional notes…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setAddModal(false)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={submitAdd} disabled={busy || !form.type.trim() || !form.date}>
                {busy ? 'Saving…' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── History tab ─────────────────────────────────────────────────────────────
function HistoryTab({ vehicleId, histRefresh }) {
  const [history, setHistory] = useState(null)
  useEffect(() => { getVehicleHistory(vehicleId).then(setHistory) }, [vehicleId, histRefresh])

  if (!history) return <div className={styles.tabContent}><LoadingState label="Loading history…" /></div>
  if (!history.length) return <div className={styles.tabContent}><EmptyState title="No history" description="No history recorded for this vehicle." /></div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.timeline}>
        {[...history].reverse().map((item) => {
          const isDanger = item.tone === 'danger'
          return (
            <div key={item.id} className={styles.timelineItem}>
              <span className={`${styles.timelineDot} ${isDanger ? styles.timelineDotDanger : styles.timelineDotDone}`} />
              <div className={styles.timelineBody}>
                <div className={styles.timelineTitle}>{item.event}</div>
                <div className={styles.timelineMeta}>{formatDateTime(item.timestamp)} · by {item.admin}</div>
                {item.detail && <div className={styles.timelineDetail}>{item.detail}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function VehicleDetailPage() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [histRefresh, setHistRefresh] = useState(0)

  useEffect(() => {
    setLoading(true)
    getVehicleById(vehicleId)
      .then((v) => { setVehicle(v); setLoading(false) })
      .catch(() => { setError('Vehicle not found'); setLoading(false) })
  }, [vehicleId])

  async function handleStatusChange(newStatus) {
    const updated = await updateVehicleStatus(vehicleId, newStatus)
    setVehicle(updated)
    setHistRefresh((n) => n + 1)
  }

  if (loading) return <LoadingState label="Loading vehicle details…" />
  if (error)   return <ErrorState description={error} />
  if (!vehicle) return null

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/fleet" className={styles.breadcrumbLink}>Fleet Management</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link to="/fleet/vehicles" className={styles.breadcrumbLink}>Vehicles</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{vehicle.make} {vehicle.model}</span>
      </nav>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.vehicleAvatar}>{vehicle.make.slice(0,1)}{vehicle.model.slice(0,1)}</span>
          <div>
            <h1 className={styles.pageTitle}>{vehicle.make} {vehicle.model} <span className={styles.vehicleYear}>({vehicle.year})</span></h1>
            <div className={styles.pageMeta}>
              <span className={styles.plateBadge}>{vehicle.regNo}</span>
              <span className={styles.metaSep}>·</span>
              <span>{vehicle.fleetName}</span>
              <span className={styles.metaSep}>·</span>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/fleet/vehicles')}>← Back</button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button key={tab} type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview'     && <OverviewTab vehicle={vehicle} onStatusChange={handleStatusChange} />}
      {activeTab === 'Driver'       && <DriverTab vehicle={vehicle} />}
      {activeTab === 'Documents'    && <DocumentsTab vehicleId={vehicleId} histRefresh={histRefresh} onHistRefresh={() => setHistRefresh((n) => n + 1)} />}
      {activeTab === 'Rides'        && <RidesTab vehicleId={vehicleId} />}
      {activeTab === 'Performance'  && <PerformanceTab vehicle={vehicle} />}
      {activeTab === 'Maintenance'  && <MaintenanceTab vehicleId={vehicleId} />}
      {activeTab === 'History'      && <HistoryTab vehicleId={vehicleId} histRefresh={histRefresh} />}
    </div>
  )
}
