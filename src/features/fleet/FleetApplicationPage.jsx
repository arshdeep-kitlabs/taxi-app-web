import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getFleetById,
  approveFleet,
  rejectFleet,
  getFleetDocuments,
  approveDocument,
  rejectDocument,
  getApplicationHistory,
  getFleetDrivers,
  getFleetVehicles,
} from '../../services/api/fleetService'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { FleetStatusBadge } from './components/FleetStatusBadge'
import { Modal } from '../../components/ui/Modal'
import { ChevronRightIcon, CheckIcon } from '../../components/icons'
import { formatDateTime, formatNumber } from '../../utils/formatters'
import styles from './FleetApplicationPage.module.css'
import pendingStyles from './PendingFleetsPage.module.css'

const TABS = [
  { key: 'fleet-info',   label: 'Fleet Information' },
  { key: 'owner-info',   label: 'Fleet Owner Information' },
  { key: 'documents',    label: 'Fleet Documents' },
  { key: 'vehicles',     label: 'Vehicles' },
  { key: 'drivers',      label: 'Drivers' },
  { key: 'history',      label: 'Application History' },
]

/* ---- Sub-components ---- */

function DetailRow({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value || '—'}</span>
    </div>
  )
}

function FleetInfoTab({ fleet }) {
  const typeLabels = {
    taxi: 'Taxi Company',
    transportation: 'Transportation Company',
    corporate: 'Corporate Fleet',
    private: 'Private Fleet',
    other: 'Other',
  }

  return (
    <div className={styles.panel}>
      <div className="panel-header"><span className="panel-header__title">Fleet Information</span></div>
      <div className={styles.detailList}>
        <DetailRow label="Fleet ID" value={<span className={styles.mono}>{fleet.id}</span>} />
        <DetailRow label="Fleet Name" value={fleet.name} />
        <DetailRow label="Business / Company Name" value={fleet.businessName} />
        <DetailRow label="Business Registration No." value={fleet.businessRegNo} />
        <DetailRow label="Fleet Type" value={typeLabels[fleet.fleetType] ?? fleet.fleetType} />
        <DetailRow label="Number of Vehicles" value={formatNumber(fleet.vehicles)} />
        <DetailRow label="Number of Drivers" value={formatNumber(fleet.drivers)} />
        <DetailRow label="City" value={fleet.city} />
        <DetailRow label="Submitted" value={formatDateTime(fleet.submittedAt || fleet.createdAt)} />
        <DetailRow label="Status" value={<FleetStatusBadge status={fleet.status} />} />
      </div>
    </div>
  )
}

function OwnerInfoTab({ fleet }) {
  const o = fleet.owner
  return (
    <div className={styles.panel}>
      <div className="panel-header"><span className="panel-header__title">Fleet Owner Information</span></div>
      <div className={styles.detailList}>
        <DetailRow label="Full Name" value={o.name} />
        <DetailRow label="Email Address" value={o.email} />
        <DetailRow label="Phone Number" value={o.phone} />
        <DetailRow label="Address" value={o.address} />
        <DetailRow label="City" value={o.city} />
        <DetailRow label="Country" value={o.country} />
      </div>
    </div>
  )
}

function DocVerifyBadge({ status }) {
  const map = {
    verified: { cls: 'success', label: 'Verified' },
    pending:  { cls: 'warning', label: 'Pending Review' },
    rejected: { cls: 'danger',  label: 'Rejected' },
    missing:  { cls: 'neutral', label: 'Not Uploaded' },
  }
  const cfg = map[status] ?? map.pending
  return (
    <span className={`badge badge--${cfg.cls}`}>
      <span className="badge__dot" />
      {cfg.label}
    </span>
  )
}

function DocumentsTab({ fleetId, onHistoryChange }) {
  const [docs, setDocs] = useState(null)
  const [rejectDocTarget, setRejectDocTarget] = useState(null)
  const [rejectDocReason, setRejectDocReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState(null)

  const reload = useCallback(() => {
    getFleetDocuments(fleetId).then(setDocs).catch(() => setDocs([]))
  }, [fleetId])

  useEffect(() => { reload() }, [reload])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleApproveDoc(doc) {
    setProcessing(true)
    try {
      await approveDocument(fleetId, doc.id)
      reload()
      onHistoryChange?.()
      showToast(`${doc.name} verified.`)
    } finally {
      setProcessing(false)
    }
  }

  async function handleRejectDoc() {
    if (!rejectDocTarget || !rejectDocReason.trim()) return
    setProcessing(true)
    try {
      await rejectDocument(fleetId, rejectDocTarget.id, rejectDocReason.trim())
      setRejectDocTarget(null)
      setRejectDocReason('')
      reload()
      onHistoryChange?.()
      showToast(`${rejectDocTarget.name} rejected.`, 'danger')
    } finally {
      setProcessing(false)
    }
  }

  if (!docs) return <LoadingState label="Loading documents…" />

  return (
    <>
      {toast && (
        <div className={`${pendingStyles.toast} ${pendingStyles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      {docs.length === 0 ? (
        <div className={styles.emptyTab}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>No documents have been uploaded for this fleet.</p>
        </div>
      ) : (
        <div className={styles.docGrid}>
          {docs.map((doc) => (
            <div key={doc.id} className={`${styles.docCard} ${styles[`docCard--${doc.status}`]}`}>
              <div className={styles.docCardTop}>
                <div>
                  <div className={styles.docCardName}>{doc.name}</div>
                  {doc.docNumber && (
                    <div className={styles.docCardMeta}>Doc No: <span className={styles.mono}>{doc.docNumber}</span></div>
                  )}
                </div>
                <DocVerifyBadge status={doc.status} />
              </div>

              <div className={styles.docCardBody}>
                {doc.uploadedAt ? (
                  <>
                    <div className={styles.docCardRow}>
                      <span className={styles.docCardRowLabel}>Uploaded</span>
                      <span>{formatDateTime(doc.uploadedAt)}</span>
                    </div>
                    {doc.expiryDate && (
                      <div className={styles.docCardRow}>
                        <span className={styles.docCardRowLabel}>Expires</span>
                        <span>{doc.expiryDate}</span>
                      </div>
                    )}
                    {doc.status === 'rejected' && doc.rejectionReason && (
                      <div className={`${styles.docCardRow} ${styles.rejectionRow}`}>
                        <span className={styles.docCardRowLabel}>Rejection reason</span>
                        <span className={styles.rejectionText}>{doc.rejectionReason}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className={styles.docMissing}>Document not yet uploaded by fleet owner.</p>
                )}
              </div>

              {doc.status !== 'missing' && (
                <div className={styles.docCardFooter}>
                  <button type="button" className="btn btn--ghost btn--sm">View</button>
                  {doc.status !== 'verified' && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={processing}
                      onClick={() => handleApproveDoc(doc)}
                    >
                      Approve
                    </button>
                  )}
                  {doc.status !== 'rejected' && (
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={processing}
                      onClick={() => { setRejectDocTarget(doc); setRejectDocReason('') }}
                    >
                      Reject
                    </button>
                  )}
                  {doc.status === 'verified' && (
                    <button type="button" className="btn btn--ghost btn--sm">Replace</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject document modal */}
      {rejectDocTarget && (
        <Modal
          title="Reject Document"
          onClose={() => setRejectDocTarget(null)}
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setRejectDocTarget(null)} disabled={processing}>Cancel</button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleRejectDoc}
                disabled={processing || !rejectDocReason.trim()}
              >
                {processing ? 'Rejecting…' : 'Reject Document'}
              </button>
            </>
          }
        >
          <p className={pendingStyles.confirmText}>
            Rejecting: <strong>{rejectDocTarget.name}</strong>
          </p>
          <label className={pendingStyles.reasonLabel}>
            Reason for rejection <span className={pendingStyles.required}>*</span>
            <textarea
              className={pendingStyles.reasonTextarea}
              rows={3}
              placeholder="e.g. Insurance document has expired."
              value={rejectDocReason}
              onChange={(e) => setRejectDocReason(e.target.value)}
            />
          </label>
        </Modal>
      )}
    </>
  )
}

function VehiclesTab({ fleetId }) {
  const [vehicles, setVehicles] = useState(null)

  useEffect(() => {
    getFleetVehicles(fleetId).then(setVehicles).catch(() => setVehicles([]))
  }, [fleetId])

  if (!vehicles) return <LoadingState label="Loading vehicles…" />

  if (vehicles.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          No vehicles registered yet. Vehicles can be added once the fleet is approved.
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Vehicle</th><th>Plate</th><th>Type</th><th>Year</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td><div style={{ fontWeight: 'var(--font-weight-medium)' }}>{v.make} {v.model}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{v.id}</div></td>
              <td><span className={styles.plateBadge}>{v.plate}</span></td>
              <td className="table-cell-muted">{v.type}</td>
              <td className="table-cell-muted">{v.year}</td>
              <td>
                {v.status === 'active' && <span className="badge badge--success"><span className="badge__dot" />Active</span>}
                {v.status === 'maintenance' && <span className="badge badge--warning"><span className="badge__dot" />Maintenance</span>}
                {v.status === 'inactive' && <span className="badge badge--neutral"><span className="badge__dot" />Inactive</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DriversTab({ fleetId }) {
  const [drivers, setDrivers] = useState(null)

  useEffect(() => {
    getFleetDrivers(fleetId).then(setDrivers).catch(() => setDrivers([]))
  }, [fleetId])

  if (!drivers) return <LoadingState label="Loading drivers…" />

  if (drivers.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          No drivers assigned yet. Drivers can be added once the fleet is approved.
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>Driver</th><th>Phone</th><th>Rating</th><th>Total Rides</th><th>Status</th></tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id}>
              <td>
                <div className={styles.personCell}>
                  <span className={styles.personAvatar}>{d.name.split(' ').map((n) => n[0]).join('').slice(0,2)}</span>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>{d.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{d.id}</div>
                  </div>
                </div>
              </td>
              <td className="table-cell-muted">{d.phone}</td>
              <td>{d.rating.toFixed(2)}</td>
              <td>{formatNumber(d.rides)}</td>
              <td>
                <span className={`badge badge--${d.status === 'active' ? 'success' : 'danger'}`}>
                  <span className="badge__dot" />{d.status === 'active' ? 'Active' : 'Suspended'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HistoryTab({ fleetId, refresh }) {
  const [history, setHistory] = useState(null)

  useEffect(() => {
    getApplicationHistory(fleetId).then(setHistory).catch(() => setHistory([]))
  }, [fleetId, refresh])

  if (!history) return <LoadingState label="Loading history…" />

  if (history.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>No history yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.historyList}>
      {[...history].reverse().map((evt, i) => (
        <div key={evt.id} className={styles.historyItem}>
          <div className={styles.historyRail}>
            <span className={`${styles.historyDot} ${evt.tone === 'cancelled' ? styles.historyDotDanger : styles.historyDotDone}`} />
            {i < history.length - 1 && <span className={styles.historyLine} />}
          </div>
          <div className={styles.historyBody}>
            <p className={styles.historyEvent}>{evt.event}</p>
            <div className={styles.historyMeta}>
              {evt.admin && <span className={styles.historyAdmin}>{evt.admin}</span>}
              {evt.admin && <span className={styles.historyMetaDot}>·</span>}
              <span>{formatDateTime(evt.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---- Main page ---- */

export function FleetApplicationPage() {
  const { fleetId } = useParams()
  const navigate = useNavigate()
  const [fleet, setFleet] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('fleet-info')
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState(null)
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const loadFleet = useCallback(() => {
    getFleetById(fleetId)
      .then(setFleet)
      .catch(() => setError('Application not found.'))
  }, [fleetId])

  useEffect(() => { loadFleet() }, [loadFleet])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function refreshHistory() {
    setHistoryRefresh((n) => n + 1)
  }

  async function handleApprove() {
    setProcessing(true)
    try {
      await approveFleet(fleetId)
      setApproveOpen(false)
      loadFleet()
      refreshHistory()
      showToast('Fleet approved successfully.')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setProcessing(true)
    try {
      await rejectFleet(fleetId, rejectReason.trim())
      setRejectOpen(false)
      setRejectReason('')
      loadFleet()
      refreshHistory()
      showToast('Fleet application rejected.', 'danger')
    } finally {
      setProcessing(false)
    }
  }

  if (!fleet && !error) return <LoadingState label="Loading application…" />
  if (error) return <ErrorState description={error} />

  const canApprove = fleet.status === 'pending'
  const canReject  = fleet.status === 'pending'

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${pendingStyles.toast} ${pendingStyles[`toast--${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <button type="button" className={styles.breadcrumbLink} onClick={() => navigate('/fleet')}>Fleet Management</button>
        <ChevronRightIcon size={14} />
        <button type="button" className={styles.breadcrumbLink} onClick={() => navigate('/fleet/pending')}>Pending Fleets</button>
        <ChevronRightIcon size={14} />
        <span className={styles.breadcrumbCurrent}>{fleet.name}</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.fleetAvatar}>{fleet.name.slice(0,2).toUpperCase()}</span>
          <div>
            <div className={styles.headerTitleRow}>
              <h1 className={styles.title}>Fleet Application</h1>
              <FleetStatusBadge status={fleet.status} />
            </div>
            <div className={styles.headerMeta}>
              <span className={styles.metaBold}>{fleet.name}</span>
              <span className={styles.metaDot}>·</span>
              <span>{fleet.id}</span>
              <span className={styles.metaDot}>·</span>
              <span>Owner: {fleet.owner.name}</span>
              <span className={styles.metaDot}>·</span>
              <span>{fleet.owner.email}</span>
              <span className={styles.metaDot}>·</span>
              <span>Submitted {formatDateTime(fleet.submittedAt || fleet.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {canApprove && (
            <button type="button" className="btn btn--primary" onClick={() => setApproveOpen(true)}>
              Approve Fleet
            </button>
          )}
          {canReject && (
            <button type="button" className="btn btn--danger" onClick={() => { setRejectOpen(true); setRejectReason('') }}>
              Reject Fleet
            </button>
          )}
          {!canApprove && !canReject && (
            <button type="button" className="btn btn--secondary" onClick={() => navigate(`/fleet/${fleetId}`)}>
              View Fleet Details
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className={styles.tabs} aria-label="Application sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'fleet-info'  && <FleetInfoTab fleet={fleet} />}
        {activeTab === 'owner-info'  && <OwnerInfoTab fleet={fleet} />}
        {activeTab === 'documents'   && <DocumentsTab fleetId={fleet.id} onHistoryChange={refreshHistory} />}
        {activeTab === 'vehicles'    && <VehiclesTab fleetId={fleet.id} />}
        {activeTab === 'drivers'     && <DriversTab fleetId={fleet.id} />}
        {activeTab === 'history'     && <HistoryTab fleetId={fleet.id} refresh={historyRefresh} />}
      </div>

      {/* Approve modal */}
      {approveOpen && (
        <Modal
          title="Approve this fleet?"
          onClose={() => setApproveOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setApproveOpen(false)} disabled={processing}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleApprove} disabled={processing}>
                {processing ? 'Approving…' : 'Approve Fleet'}
              </button>
            </>
          }
        >
          <p className={pendingStyles.confirmText}>You are about to approve <strong>{fleet.name}</strong>.</p>
          <p className={pendingStyles.confirmSub}>Once approved, this fleet can begin operating on the Nomad platform and will receive ride assignments.</p>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectOpen && (
        <Modal
          title="Reject Fleet Application"
          onClose={() => setRejectOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setRejectOpen(false)} disabled={processing}>Cancel</button>
              <button type="button" className="btn btn--danger" onClick={handleReject} disabled={processing || !rejectReason.trim()}>
                {processing ? 'Rejecting…' : 'Reject Application'}
              </button>
            </>
          }
        >
          <p className={pendingStyles.confirmText}>You are rejecting the application for <strong>{fleet.name}</strong>.</p>
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
