import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getAssignmentById, removeAssignment, changeVehicle, getAssignmentHistory,
} from '../../../services/api/assignmentService'
import { storeGetVehicles } from '../../../services/api/vehicleStore'
import { storeGetActiveAssignmentForVehicle } from '../../../services/api/assignmentStore'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { formatDateTime } from '../../../utils/formatters'
import styles from './AssignmentDetailPage.module.css'

export function AssignmentDetailPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [history, setHistory]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [modal, setModal]           = useState(null) // 'remove' | 'changeVehicle'
  const [reason, setReason]         = useState('')
  const [busy, setBusy]             = useState(false)
  const [toast, setToast]           = useState(null)
  // Change-vehicle state
  const [cvSearch, setCvSearch]     = useState('')
  const [cvSelected, setCvSelected] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200)
  }

  async function load() {
    const [a, h] = await Promise.all([getAssignmentById(assignmentId), getAssignmentHistory(assignmentId)])
    setAssignment(a); setHistory(h)
  }

  useEffect(() => {
    setLoading(true)
    load().then(() => setLoading(false)).catch(() => { setError('Assignment not found'); setLoading(false) })
  }, [assignmentId])

  async function confirmRemove() {
    setBusy(true)
    try {
      const updated = await removeAssignment(assignmentId, reason)
      setAssignment(updated)
      await load()
      setModal(null); setReason('')
      showToast('Assignment removed. Historical ride data preserved.', 'warning')
    } finally { setBusy(false) }
  }

  // Eligible replacement vehicles: active/available, verified, same fleet, no current assignment
  const eligibleVehicles = assignment
    ? storeGetVehicles({ fleet: assignment.fleetId })
        .filter((v) => (v.status === 'active' || v.status === 'available') && v.docStatus === 'verified')
        .filter((v) => v.id !== assignment.vehicleId)
        .filter((v) => !storeGetActiveAssignmentForVehicle(v.id))
    : []

  const filteredVehicles = cvSearch
    ? eligibleVehicles.filter((v) => `${v.make} ${v.model} ${v.regNo}`.toLowerCase().includes(cvSearch.toLowerCase()))
    : eligibleVehicles

  async function confirmChangeVehicle() {
    if (!cvSelected) return
    setBusy(true)
    try {
      const updated = await changeVehicle(assignmentId, cvSelected.id, `${cvSelected.make} ${cvSelected.model} ${cvSelected.year}`, cvSelected.regNo)
      setAssignment(updated)
      await load()
      setModal(null); setCvSelected(null); setCvSearch('')
      showToast(`Vehicle changed to ${cvSelected.make} ${cvSelected.model} (${cvSelected.regNo})`)
    } catch (e) {
      showToast(e.message ?? 'Change failed.', 'danger')
    } finally { setBusy(false) }
  }

  if (loading) return <LoadingState label="Loading assignment…" />
  if (error)   return <ErrorState description={error} />
  if (!assignment) return null

  const isActive = assignment.status === 'active'

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/fleet" className={styles.breadcrumbLink}>Fleet Management</Link>
        <span className={styles.sep}>/</span>
        <Link to="/fleet/assignments" className={styles.breadcrumbLink}>Assignments</Link>
        <span className={styles.sep}>/</span>
        <span className={styles.breadcrumbCurrent}>{assignment.id}</span>
      </nav>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Assignment Details</h1>
          <div className={styles.pageMeta}>
            <span className={styles.asnId}>{assignment.id}</span>
            <span className={styles.metaSep}>·</span>
            {isActive
              ? <span className="badge badge--success"><span className="badge__dot" />Active</span>
              : <span className="badge badge--neutral"><span className="badge__dot" />Removed</span>}
          </div>
        </div>
        <div className={styles.headerActions}>
          {isActive && (
            <>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setModal('changeVehicle'); setCvSelected(null); setCvSearch('') }}>Change Vehicle</button>
              <button type="button" className="btn btn--danger btn--sm" onClick={() => { setModal('remove'); setReason('') }}>Remove Assignment</button>
            </>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/fleet/assignments')}>← Back</button>
        </div>
      </div>

      {/* Details */}
      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Driver</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>Name</dt>
            <dd className={styles.infoValue}>
              <Link to={`/fleet/drivers/${assignment.driverId}`} className={styles.link}>{assignment.driverName}</Link>
            </dd>
            <dt className={styles.infoLabel}>Driver ID</dt>
            <dd className={styles.infoValue}><span className={styles.mono}>{assignment.driverId}</span></dd>
            <dt className={styles.infoLabel}>Phone</dt>
            <dd className={styles.infoValue}>{assignment.driverPhone ?? '—'}</dd>
          </dl>
          <div className={styles.panelAction}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(`/fleet/drivers/${assignment.driverId}`)}>View Driver Profile</button>
          </div>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Vehicle</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>Vehicle</dt>
            <dd className={styles.infoValue}>
              <Link to={`/fleet/vehicles/${assignment.vehicleId}`} className={styles.link}>{assignment.vehicleDisplay}</Link>
            </dd>
            <dt className={styles.infoLabel}>Registration</dt>
            <dd className={styles.infoValue}><span className={styles.plateBadge}>{assignment.vehicleReg}</span></dd>
          </dl>
          <div className={styles.panelAction}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(`/fleet/vehicles/${assignment.vehicleId}`)}>View Vehicle</button>
          </div>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Fleet</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>Fleet</dt>
            <dd className={styles.infoValue}>
              <Link to={`/fleet/${assignment.fleetId}`} className={styles.link}>{assignment.fleetName}</Link>
            </dd>
            <dt className={styles.infoLabel}>Fleet ID</dt>
            <dd className={styles.infoValue}><span className={styles.mono}>{assignment.fleetId}</span></dd>
          </dl>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Assignment Info</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>Assigned Date</dt>
            <dd className={styles.infoValue}>{assignment.assignedDate}</dd>
            <dt className={styles.infoLabel}>Assigned By</dt>
            <dd className={styles.infoValue}>{assignment.assignedBy}</dd>
            <dt className={styles.infoLabel}>Status</dt>
            <dd className={styles.infoValue}>
              {isActive
                ? <span className="badge badge--success"><span className="badge__dot" />Active</span>
                : <span className="badge badge--neutral"><span className="badge__dot" />Removed</span>}
            </dd>
            {assignment.removedDate && (
              <>
                <dt className={styles.infoLabel}>Removed Date</dt>
                <dd className={styles.infoValue}>{assignment.removedDate}</dd>
                <dt className={styles.infoLabel}>Removed By</dt>
                <dd className={styles.infoValue}>{assignment.removedBy}</dd>
              </>
            )}
            {assignment.notes && (
              <>
                <dt className={styles.infoLabel}>Notes</dt>
                <dd className={styles.infoValue}>{assignment.notes}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* History */}
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Assignment History</h3>
        {!history || history.length === 0
          ? <EmptyState title="No history" description="No events recorded for this assignment." />
          : (
            <div className={styles.timeline}>
              {[...history].reverse().map((item) => (
                <div key={item.id} className={styles.timelineItem}>
                  <span className={`${styles.timelineDot} ${item.tone === 'danger' ? styles.dotDanger : styles.dotDone}`} />
                  <div>
                    <div className={styles.timelineTitle}>{item.event}</div>
                    <div className={styles.timelineMeta}>{formatDateTime(item.timestamp)} · by {item.admin}</div>
                    {item.detail && <div className={styles.timelineDetail}>{item.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Remove modal */}
      {modal === 'remove' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Remove Assignment</h3>
            <p className={styles.modalDesc}>
              Remove the assignment between <strong>{assignment.driverName}</strong> and <strong>{assignment.vehicleDisplay}</strong>?
              Historical ride data will be preserved.
            </p>
            <div className={styles.reasonField}>
              <label className={styles.reasonLabel}>Reason (optional)</label>
              <textarea className={styles.reasonTextarea} rows={2} value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Driver transferred, vehicle retired…" />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--danger" onClick={confirmRemove} disabled={busy}>{busy ? 'Removing…' : 'Remove Assignment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Change vehicle modal */}
      {modal === 'changeVehicle' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox} style={{ maxWidth: 520 }}>
            <h3 className={styles.modalTitle}>Change Vehicle</h3>
            <p className={styles.modalDesc}>Select a replacement vehicle from the same fleet (<strong>{assignment.fleetName}</strong>).</p>
            <input className={styles.cvSearch} placeholder="Search vehicles…" value={cvSearch} onChange={(e) => setCvSearch(e.target.value)} />
            <div className={styles.cvList}>
              {filteredVehicles.length === 0
                ? <p className={styles.noItems}>No eligible vehicles available.</p>
                : filteredVehicles.map((v) => (
                  <button key={v.id} type="button"
                    className={`${styles.cvRow} ${cvSelected?.id === v.id ? styles.cvRowSelected : ''}`}
                    onClick={() => setCvSelected(v)}>
                    <span className={styles.cvAvatar}>{v.make[0]}{v.model[0]}</span>
                    <div className={styles.cvInfo}>
                      <span className={styles.cvName}>{v.make} {v.model} {v.year}</span>
                      <span className={styles.cvSub}><span className={styles.plateTiny}>{v.regNo}</span> · {v.type} · {v.rideType}</span>
                    </div>
                    {cvSelected?.id === v.id && <span className={styles.cvCheck}>✓</span>}
                  </button>
                ))}
            </div>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={confirmChangeVehicle} disabled={busy || !cvSelected}>{busy ? 'Saving…' : 'Confirm Change'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
