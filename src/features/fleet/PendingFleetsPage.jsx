import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingFleets, approveFleet, rejectFleet, getFleetDocuments } from '../../services/api/fleetService'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { FleetStatusBadge } from './components/FleetStatusBadge'
import { Modal } from '../../components/ui/Modal'
import { formatDateTime, formatNumber } from '../../utils/formatters'
import styles from './FleetManagementPage.module.css'
import pendingStyles from './PendingFleetsPage.module.css'

function DocCount({ fleetId }) {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    getFleetDocuments(fleetId).then((docs) => {
      const total = docs.length
      const verified = docs.filter((d) => d.status === 'verified').length
      setCounts({ total, verified })
    }).catch(() => setCounts(null))
  }, [fleetId])

  if (!counts) return <span className="table-cell-muted">—</span>

  return (
    <span className={`${pendingStyles.docCount} ${counts.verified === counts.total && counts.total > 0 ? pendingStyles.docCountDone : ''}`}>
      {counts.verified} / {counts.total} verified
    </span>
  )
}

export function PendingFleetsPage() {
  const navigate = useNavigate()
  const [fleets, setFleets] = useState(null)
  const [error, setError] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(() => {
    let cancelled = false
    getPendingFleets()
      .then((data) => { if (!cancelled) { setFleets(data); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load pending fleets.') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => { return load() }, [load])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove() {
    if (!approveTarget) return
    setProcessing(true)
    try {
      await approveFleet(approveTarget.id)
      setApproveTarget(null)
      load()
      showToast(`${approveTarget.name} approved successfully.`)
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return
    setProcessing(true)
    try {
      await rejectFleet(rejectTarget.id, rejectReason.trim())
      setRejectTarget(null)
      setRejectReason('')
      load()
      showToast(`${rejectTarget.name} application rejected.`, 'danger')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${pendingStyles.toast} ${pendingStyles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Pending Fleets</h1>
          <p className={styles.subtitle}>Review and approve fleet operators awaiting verification.</p>
        </div>
      </div>

      {!fleets && !error && <LoadingState label="Loading pending fleets…" />}
      {error && <ErrorState description={error} />}

      {fleets && fleets.length === 0 && (
        <EmptyState
          title="No pending fleets"
          description="All fleet applications have been reviewed."
        />
      )}

      {fleets && fleets.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fleet Name</th>
                <th>Fleet Owner</th>
                <th>Vehicles</th>
                <th>Drivers</th>
                <th>Documents</th>
                <th>Submitted</th>
                <th>Status</th>
                <th className="visually-hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fleets.map((fleet) => (
                <tr key={fleet.id}>
                  <td>
                    <div className={styles.fleetCell}>
                      <span className={styles.fleetAvatar}>
                        {fleet.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className={styles.fleetName}>{fleet.name}</div>
                        <div className={styles.fleetId}>{fleet.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.ownerName}>{fleet.owner.name}</div>
                    <div className="table-cell-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{fleet.owner.email}</div>
                  </td>
                  <td className={styles.numCell}>{formatNumber(fleet.vehicles)}</td>
                  <td className={styles.numCell}>{formatNumber(fleet.drivers)}</td>
                  <td><DocCount fleetId={fleet.id} /></td>
                  <td className="table-cell-muted">{formatDateTime(fleet.submittedAt || fleet.createdAt)}</td>
                  <td><FleetStatusBadge status={fleet.status} /></td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => navigate(`/fleet/pending/${fleet.id}`)}
                      >
                        View Application
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => setApproveTarget(fleet)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => { setRejectTarget(fleet); setRejectReason('') }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve confirmation modal */}
      {approveTarget && (
        <Modal
          title="Approve this fleet?"
          onClose={() => setApproveTarget(null)}
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setApproveTarget(null)} disabled={processing}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleApprove} disabled={processing}>
                {processing ? 'Approving…' : 'Approve Fleet'}
              </button>
            </>
          }
        >
          <p className={pendingStyles.confirmText}>
            You are about to approve <strong>{approveTarget.name}</strong>.
          </p>
          <p className={pendingStyles.confirmSub}>
            Once approved, this fleet can begin operating on the Nomad platform and will receive ride assignments.
          </p>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <Modal
          title="Reject Fleet Application"
          onClose={() => setRejectTarget(null)}
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setRejectTarget(null)} disabled={processing}>Cancel</button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
              >
                {processing ? 'Rejecting…' : 'Reject Application'}
              </button>
            </>
          }
        >
          <p className={pendingStyles.confirmText}>
            You are rejecting the application for <strong>{rejectTarget.name}</strong>.
          </p>
          <label className={pendingStyles.reasonLabel}>
            Reason for rejection <span className={pendingStyles.required}>*</span>
            <textarea
              className={pendingStyles.reasonTextarea}
              rows={4}
              placeholder="e.g. Insurance document has expired."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </label>
        </Modal>
      )}
    </div>
  )
}
