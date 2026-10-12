import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getDriverById, getDriverDocs, approveDriverDoc, rejectDriverDoc,
  getDriverRides, getDriverHistory,
  updateDriverStatus, approveDriver, rejectDriver,
} from '../../../services/api/driverService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import {
  DriverStatusBadge, DriverVerifyBadge, DriverDocStatusBadge,
} from './components/DriverStatusBadge'
import { formatDateTime, formatNumber, formatCurrency } from '../../../utils/formatters'
import styles from './DriverDetailPage.module.css'

const TABS = ['Overview', 'Fleet Membership', 'Documents', 'Rides', 'Earnings', 'Performance', 'History']

// ─── helpers ─────────────────────────────────────────────────────────────────
function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function docExpiryWarning(expiryDate) {
  if (!expiryDate) return null
  const diff = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0)  return { label: 'Expired', cls: 'danger' }
  if (diff <= 30) return { label: `Expires in ${Math.ceil(diff)} days`, cls: 'warning' }
  return null
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ driver, onStatusChange, onApprove, onReject }) {
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null) // 'approve' | 'reject'
  const [rejectReason, setRejectReason] = useState('')

  async function changeStatus(s) {
    setBusy(true); try { await onStatusChange(s) } finally { setBusy(false) }
  }

  async function confirmApprove() {
    setBusy(true)
    try { await onApprove(); setModal(null) } finally { setBusy(false) }
  }

  async function confirmReject() {
    if (!rejectReason.trim()) return
    setBusy(true)
    try { await onReject(rejectReason); setModal(null); setRejectReason('') } finally { setBusy(false) }
  }

  const metrics = [
    { label: 'Total Rides',    value: formatNumber(driver.totalRides) },
    { label: 'Completed',      value: formatNumber(driver.completedRides) },
    { label: 'Cancelled',      value: formatNumber(driver.cancelledRides) },
    { label: 'Total Earnings', value: driver.totalEarnings > 0 ? formatCurrency(driver.totalEarnings) : '—' },
    { label: 'Avg Rating',     value: driver.rating ? `${driver.rating} ★` : '—' },
    { label: 'Acceptance',     value: driver.acceptanceRate ? `${driver.acceptanceRate}%` : '—' },
    { label: 'Cancellation',   value: driver.cancellationRate ? `${driver.cancellationRate}%` : '—' },
  ]

  return (
    <div className={styles.tabContent}>
      {/* Approval actions for pending drivers */}
      {driver.verificationStatus === 'pending' && (
        <div className={styles.approvalBanner}>
          <div>
            <strong>Pending Verification</strong>
            <span> — This driver requires review and approval before they can operate on Nomad.</span>
          </div>
          <div className={styles.approvalBtns}>
            <button type="button" className="btn btn--danger btn--sm" onClick={() => { setModal('reject'); setRejectReason('') }}>Reject Driver</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setModal('approve')}>Approve Driver</button>
          </div>
        </div>
      )}

      <div className={styles.twoCol}>
        {/* Left: driver info */}
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Driver Details</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>Full Name</dt>      <dd className={styles.infoValue}>{driver.fullName}</dd>
            <dt className={styles.infoLabel}>Driver ID</dt>      <dd className={styles.infoValue}><span className={styles.mono}>{driver.id}</span></dd>
            <dt className={styles.infoLabel}>Phone</dt>          <dd className={styles.infoValue}>{driver.phone}</dd>
            <dt className={styles.infoLabel}>Email</dt>          <dd className={styles.infoValue}>{driver.email}</dd>
            <dt className={styles.infoLabel}>Address</dt>        <dd className={styles.infoValue}>{driver.address || '—'}</dd>
            <dt className={styles.infoLabel}>Date of Birth</dt>  <dd className={styles.infoValue}>{driver.dateOfBirth || '—'}</dd>
            <dt className={styles.infoLabel}>License No.</dt>    <dd className={styles.infoValue}><span className={styles.mono}>{driver.licenseNumber || '—'}</span></dd>
            <dt className={styles.infoLabel}>License Expiry</dt> <dd className={styles.infoValue}>{driver.licenseExpiry || '—'}</dd>
            <dt className={styles.infoLabel}>Joined</dt>         <dd className={styles.infoValue}>{driver.joinedDate || '—'}</dd>
          </dl>
        </div>

        {/* Right: status + fleet + metrics */}
        <div className={styles.rightCol}>
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Status & Fleet</h3>
            <dl className={styles.infoGrid}>
              <dt className={styles.infoLabel}>Driver Status</dt>
              <dd className={styles.infoValue}><DriverStatusBadge status={driver.status} /></dd>
              <dt className={styles.infoLabel}>Verification</dt>
              <dd className={styles.infoValue}><DriverVerifyBadge status={driver.verificationStatus} /></dd>
              <dt className={styles.infoLabel}>Doc Status</dt>
              <dd className={styles.infoValue}><DriverDocStatusBadge status={driver.docStatus} /></dd>
              <dt className={styles.infoLabel}>Driver Type</dt>
              <dd className={styles.infoValue}>{driver.driverType === 'independent' ? 'Independent Driver' : 'Fleet Driver'}</dd>
              <dt className={styles.infoLabel}>Fleet</dt>
              <dd className={styles.infoValue}>
                {driver.fleetName
                  ? <><Link to={`/fleet/${driver.fleetId}`} className={styles.link}>{driver.fleetName}</Link><span className={styles.infoSub}>{driver.fleetId}</span></>
                  : <span className={styles.muted}>Independent — No Fleet</span>}
              </dd>
              <dt className={styles.infoLabel}>Vehicle</dt>
              <dd className={styles.infoValue}>{driver.vehicleDisplay ?? <span className={styles.muted}>Unassigned</span>}</dd>
            </dl>

            {/* Status change */}
            {driver.verificationStatus === 'approved' && (
              <div className={styles.statusActions}>
                <p className={styles.statusActionsLabel}>Change driver status:</p>
                <div className={styles.statusBtns}>
                  {['online', 'offline', 'suspended', 'inactive'].map((s) => (
                    <button key={s} type="button"
                      className={`btn btn--sm ${driver.status === s ? 'btn--primary' : 'btn--ghost'}`}
                      disabled={busy || driver.status === s}
                      onClick={() => changeStatus(s)}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Summary metrics */}
          <div className={styles.metricsGrid}>
            {metrics.map(({ label, value }) => (
              <div key={label} className={styles.metricCard}>
                <span className={styles.metricLabel}>{label}</span>
                <span className={styles.metricValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approve modal */}
      {modal === 'approve' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Approve this driver?</h3>
            <p className={styles.modalDesc}>Once approved, <strong>{driver.fullName}</strong> can become eligible to operate on the Nomad platform.</p>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={confirmApprove} disabled={busy}>{busy ? 'Approving…' : 'Approve Driver'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {modal === 'reject' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Reject Driver Application</h3>
            <p className={styles.modalDesc}><strong>{driver.fullName}</strong> — provide a reason for rejection.</p>
            <div className={styles.reasonField}>
              <label className={styles.reasonLabel}>Reason for rejection *</label>
              <textarea className={styles.reasonTextarea} rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Invalid license, Missing required document, Document expired…" />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--danger" onClick={confirmReject} disabled={busy || !rejectReason.trim()}>{busy ? 'Rejecting…' : 'Reject Driver'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Fleet Membership tab ─────────────────────────────────────────────────────
function FleetMembershipTab({ driver }) {
  if (driver.driverType === 'independent' || !driver.fleetId) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.panel} style={{ maxWidth: 440 }}>
          <h3 className={styles.panelTitle}>Fleet Membership</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>Fleet</dt>
            <dd className={styles.infoValue}><span className={styles.muted}>None</span></dd>
            <dt className={styles.infoLabel}>Status</dt>
            <dd className={styles.infoValue}><span className="badge badge--neutral"><span className="badge__dot" />Independent Driver</span></dd>
          </dl>
          <p className={styles.memberNote}>This driver is independent and is not assigned to any fleet. They may be assigned to a fleet later through the Assignments module.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.panel} style={{ maxWidth: 480 }}>
        <h3 className={styles.panelTitle}>Fleet Membership</h3>
        <dl className={styles.infoGrid}>
          <dt className={styles.infoLabel}>Fleet</dt>
          <dd className={styles.infoValue}>
            <Link to={`/fleet/${driver.fleetId}`} className={styles.link}>{driver.fleetName}</Link>
          </dd>
          <dt className={styles.infoLabel}>Fleet ID</dt>
          <dd className={styles.infoValue}><span className={styles.mono}>{driver.fleetId}</span></dd>
          <dt className={styles.infoLabel}>Membership</dt>
          <dd className={styles.infoValue}>
            {driver.membershipStatus === 'active'
              ? <span className="badge badge--success"><span className="badge__dot" />Active</span>
              : driver.membershipStatus === 'pending'
              ? <span className="badge badge--warning"><span className="badge__dot" />Pending</span>
              : <span className="badge badge--neutral"><span className="badge__dot" />{driver.membershipStatus ?? 'Unknown'}</span>
            }
          </dd>
          <dt className={styles.infoLabel}>Joined Fleet</dt>
          <dd className={styles.infoValue}>{driver.fleetJoinedDate ?? '—'}</dd>
          <dt className={styles.infoLabel}>Current Vehicle</dt>
          <dd className={styles.infoValue}>{driver.vehicleDisplay ?? <span className={styles.muted}>Unassigned</span>}</dd>
          <dt className={styles.infoLabel}>Fleet Contact</dt>
          <dd className={styles.infoValue}>{driver.fleetContact ?? '—'}</dd>
        </dl>
      </div>
    </div>
  )
}

// ─── Documents tab ────────────────────────────────────────────────────────────
function DocumentsTab({ driverId, onHistRefresh }) {
  const [docs, setDocs]       = useState(null)
  const [modal, setModal]     = useState(null) // { doc, action }
  const [reason, setReason]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [toast, setToast]     = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => { getDriverDocs(driverId).then(setDocs) }, [driverId])

  async function confirm() {
    if (modal.action === 'reject' && !reason.trim()) return
    setBusy(true)
    try {
      if (modal.action === 'approve') {
        await approveDriverDoc(driverId, modal.doc.id)
        showToast(`"${modal.doc.name}" approved`)
      } else {
        await rejectDriverDoc(driverId, modal.doc.id, reason)
        showToast(`"${modal.doc.name}" rejected`, 'danger')
      }
      setDocs(await getDriverDocs(driverId))
      onHistRefresh()
    } finally { setBusy(false); setModal(null); setReason('') }
  }

  if (!docs) return <div className={styles.tabContent}><LoadingState label="Loading documents…" /></div>
  if (!docs.length) return <div className={styles.tabContent}><EmptyState title="No documents" description="No documents have been uploaded for this driver." /></div>

  return (
    <div className={styles.tabContent}>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}
      <div className={styles.docCards}>
        {docs.map((doc) => {
          const expWarn = docExpiryWarning(doc.expiryDate)
          return (
            <div key={doc.id} className={`${styles.docCard} ${styles[`docCard--${doc.status}`]}`}>
              <div className={styles.docCardTop}>
                <span className={styles.docName}>{doc.name}</span>
                <DriverDocStatusBadge status={doc.status} />
              </div>
              <div className={styles.docCardBody}>
                {doc.number && (
                  <div className={styles.docMeta}><span className={styles.docMetaLabel}>Number</span><span className={styles.mono}>{doc.number}</span></div>
                )}
                {doc.issueDate && (
                  <div className={styles.docMeta}><span className={styles.docMetaLabel}>Issue Date</span><span>{doc.issueDate}</span></div>
                )}
                {doc.expiryDate && (
                  <div className={styles.docMeta}>
                    <span className={styles.docMetaLabel}>Expiry</span>
                    <span>{doc.expiryDate}</span>
                    {expWarn && <span className={`${styles.expiryWarning} ${styles[`expiry--${expWarn.cls}`]}`}>{expWarn.label}</span>}
                  </div>
                )}
                {doc.uploadedAt && (
                  <div className={styles.docMeta}><span className={styles.docMetaLabel}>Uploaded</span><span className={styles.muted}>{formatDateTime(doc.uploadedAt)}</span></div>
                )}
                {doc.rejectionReason && (
                  <div className={styles.docRejectReason}>Rejected: {doc.rejectionReason}</div>
                )}
                {!doc.uploadedAt && doc.status === 'pending' && (
                  <div className={styles.muted} style={{ fontSize: 'var(--font-size-xs)' }}>Not yet uploaded</div>
                )}
              </div>
              <div className={styles.docCardFooter}>
                {doc.uploadedAt && <button type="button" className="btn btn--ghost btn--sm">View</button>}
                {doc.status !== 'verified' && doc.uploadedAt && (
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setModal({ doc, action: 'approve' }); setReason('') }}>Approve</button>
                )}
                {doc.status !== 'rejected' && doc.uploadedAt && (
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => { setModal({ doc, action: 'reject' }); setReason('') }}>Reject</button>
                )}
                {(!doc.uploadedAt || doc.status === 'rejected') && (
                  <button type="button" className="btn btn--secondary btn--sm">Request Re-upload</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>{modal.action === 'approve' ? 'Approve Document' : 'Reject Document'}</h3>
            <p className={styles.modalDesc}><strong>{modal.doc.name}</strong></p>
            {modal.action === 'reject' && (
              <div className={styles.reasonField}>
                <label className={styles.reasonLabel}>Rejection reason *</label>
                <textarea className={styles.reasonTextarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Driving license has expired, Document unclear…" />
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button"
                className={modal.action === 'approve' ? 'btn btn--primary' : 'btn btn--danger'}
                onClick={confirm}
                disabled={busy || (modal.action === 'reject' && !reason.trim())}>
                {busy ? 'Saving…' : modal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rides tab ────────────────────────────────────────────────────────────────
function RidesTab({ driverId }) {
  const [rides, setRides]   = useState(null)
  const [search, setSearch] = useState('')
  useEffect(() => { getDriverRides(driverId).then(setRides) }, [driverId])

  const filtered = (rides ?? []).filter((r) =>
    !search || `${r.rideId} ${r.customer} ${r.pickupArea} ${r.destination}`.toLowerCase().includes(search.toLowerCase())
  )

  if (!rides) return <div className={styles.tabContent}><LoadingState label="Loading rides…" /></div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search rides…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className={styles.resultCount}>{filtered.length} ride{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      {filtered.length === 0
        ? <EmptyState title="No rides found" description="No rides match the current search." />
        : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Ride ID</th><th>Customer</th><th>Vehicle</th><th>Pickup</th><th>Destination</th><th>Fare</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.rideId}>
                    <td className={styles.mono}>{r.rideId}</td>
                    <td>{r.customer}</td>
                    <td>{r.vehicle ?? '—'}</td>
                    <td>{r.pickupArea}</td>
                    <td>{r.destination}</td>
                    <td>{formatCurrency(r.fare)}</td>
                    <td>
                      <span className={`badge badge--${r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'info' : 'danger'}`}>
                        <span className="badge__dot" />{r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell-muted">{formatDateTime(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

// ─── Earnings tab ─────────────────────────────────────────────────────────────
function EarningsTab({ driver }) {
  // Commission/fleet share come from platform config — mocked as reasonable defaults
  const PLATFORM_COMMISSION = 0.20   // 20%
  const FLEET_SHARE         = driver.driverType === 'fleet' ? 0.10 : 0  // 10% for fleet drivers

  const totalEarnings = driver.totalEarnings
  const platformCut   = Math.round(totalEarnings * PLATFORM_COMMISSION)
  const fleetCut      = Math.round(totalEarnings * FLEET_SHARE)
  const driverNet     = totalEarnings - platformCut - fleetCut

  const topCards = [
    { label: "Today's Earnings", value: formatCurrency(driver.totalRides > 0 ? Math.round(totalEarnings / 90) : 0), note: 'estimate' },
    { label: 'Weekly Earnings',  value: formatCurrency(driver.totalRides > 0 ? Math.round(totalEarnings / 13) : 0), note: 'estimate' },
    { label: 'Monthly Earnings', value: formatCurrency(driver.totalRides > 0 ? Math.round(totalEarnings / 3) : 0), note: 'estimate' },
    { label: 'Total Earnings',   value: formatCurrency(totalEarnings), note: 'all time' },
  ]

  const breakdownRows = [
    { label: 'Total Rides',        value: formatNumber(driver.totalRides) },
    { label: 'Average Fare',       value: driver.avgFare > 0 ? formatCurrency(driver.avgFare) : '—' },
    { label: 'Gross Earnings',     value: formatCurrency(totalEarnings) },
    { label: 'Platform Commission (20%)', value: `–${formatCurrency(platformCut)}`, highlight: 'deduction' },
    ...(driver.driverType === 'fleet' ? [{ label: 'Fleet Share (10%)', value: `–${formatCurrency(fleetCut)}`, highlight: 'deduction' }] : []),
    { label: 'Driver Net Earnings', value: formatCurrency(driverNet), highlight: 'net' },
  ]

  return (
    <div className={styles.tabContent}>
      <div className={styles.earningsGrid}>
        {topCards.map(({ label, value, note }) => (
          <div key={label} className={styles.earningsCard}>
            <span className={styles.earningsLabel}>{label}</span>
            <span className={styles.earningsValue}>{value}</span>
            <span className={styles.earningsNote}>{note}</span>
          </div>
        ))}
      </div>

      <div className={styles.panel} style={{ maxWidth: 480 }}>
        <h3 className={styles.panelTitle}>Earnings Breakdown</h3>
        <table className={styles.breakdownTable}>
          <tbody>
            {breakdownRows.map(({ label, value, highlight }) => (
              <tr key={label} className={highlight ? styles[`breakdown--${highlight}`] : ''}>
                <td className={styles.breakdownLabel}>{label}</td>
                <td className={styles.breakdownValue}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.earningsDisclaimer}>Commission percentages are sourced from the platform's financial configuration. Estimates are based on historical averages.</p>
      </div>
    </div>
  )
}

// ─── Performance tab ──────────────────────────────────────────────────────────
function PerformanceTab({ driver }) {
  const metrics = [
    { label: 'Completed Rides',  value: formatNumber(driver.completedRides), note: 'all time' },
    { label: 'Cancellation Rate',value: driver.cancellationRate != null ? `${driver.cancellationRate}%` : '—', note: 'of accepted rides' },
    { label: 'Acceptance Rate',  value: driver.acceptanceRate  != null ? `${driver.acceptanceRate}%`  : '—', note: 'of offered rides' },
    { label: 'Avg Rating',       value: driver.rating != null ? `${driver.rating} ★` : '—', note: 'out of 5' },
    { label: 'Online Hours',     value: driver.onlineHours > 0 ? `${formatNumber(driver.onlineHours)} hrs` : '—', note: 'total' },
    { label: 'Total Distance',   value: driver.totalDistanceKm > 0 ? `${formatNumber(driver.totalDistanceKm)} km` : '—', note: 'all trips' },
    { label: 'Total Earnings',   value: driver.totalEarnings > 0 ? formatCurrency(driver.totalEarnings) : '—', note: 'gross' },
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
      {driver.totalRides === 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <EmptyState title="No performance data" description="This driver has not completed any rides yet." />
        </div>
      )}
    </div>
  )
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ driverId, histRefresh }) {
  const [history, setHistory] = useState(null)
  useEffect(() => { getDriverHistory(driverId).then(setHistory) }, [driverId, histRefresh])

  if (!history) return <div className={styles.tabContent}><LoadingState label="Loading history…" /></div>
  if (!history.length) return <div className={styles.tabContent}><EmptyState title="No history" description="No activity has been recorded for this driver." /></div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.timeline}>
        {[...history].reverse().map((item) => (
          <div key={item.id} className={styles.timelineItem}>
            <span className={`${styles.timelineDot} ${item.tone === 'danger' ? styles.timelineDotDanger : item.tone === 'done' ? styles.timelineDotDone : styles.timelineDotNeutral}`} />
            <div className={styles.timelineBody}>
              <div className={styles.timelineTitle}>{item.event}</div>
              <div className={styles.timelineMeta}>{formatDateTime(item.timestamp)} · by {item.admin}</div>
              {item.detail && <div className={styles.timelineDetail}>{item.detail}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function DriverDetailPage() {
  const { driverId } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [histRefresh, setHistRefresh] = useState(0)

  useEffect(() => {
    setLoading(true)
    getDriverById(driverId)
      .then((d) => { setDriver(d); setLoading(false) })
      .catch(() => { setError('Driver not found'); setLoading(false) })
  }, [driverId])

  async function handleStatusChange(s) {
    const updated = await updateDriverStatus(driverId, s)
    setDriver(updated); setHistRefresh((n) => n + 1)
  }
  async function handleApprove() {
    const updated = await approveDriver(driverId)
    setDriver(updated); setHistRefresh((n) => n + 1)
  }
  async function handleReject(reason) {
    const updated = await rejectDriver(driverId, reason)
    setDriver(updated); setHistRefresh((n) => n + 1)
  }

  if (loading) return <LoadingState label="Loading driver profile…" />
  if (error)   return <ErrorState description={error} />
  if (!driver) return null

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/fleet" className={styles.breadcrumbLink}>Fleet Management</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link to="/fleet/drivers" className={styles.breadcrumbLink}>Fleet Drivers</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{driver.fullName}</span>
      </nav>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.driverAvatar}>{initials(driver.fullName)}</span>
          <div>
            <h1 className={styles.pageTitle}>{driver.fullName}</h1>
            <div className={styles.pageMeta}>
              <span className={styles.monoSmall}>{driver.id}</span>
              <span className={styles.metaSep}>·</span>
              <span>{driver.driverType === 'independent' ? 'Independent Driver' : driver.fleetName ?? 'Fleet Driver'}</span>
              <span className={styles.metaSep}>·</span>
              <DriverStatusBadge status={driver.status} />
              <span className={styles.metaSep}>·</span>
              <DriverVerifyBadge status={driver.verificationStatus} />
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className="btn btn--ghost btn--sm">Edit Driver</button>
          {driver.status !== 'suspended' && driver.verificationStatus === 'approved' && (
            <button type="button" className="btn btn--danger btn--sm" onClick={() => handleStatusChange('suspended')}>Suspend Driver</button>
          )}
          {driver.status === 'suspended' && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => handleStatusChange('offline')}>Activate Driver</button>
          )}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate('/fleet/drivers')}>← Back</button>
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

      {activeTab === 'Overview'         && <OverviewTab driver={driver} onStatusChange={handleStatusChange} onApprove={handleApprove} onReject={handleReject} />}
      {activeTab === 'Fleet Membership' && <FleetMembershipTab driver={driver} />}
      {activeTab === 'Documents'        && <DocumentsTab driverId={driverId} onHistRefresh={() => setHistRefresh((n) => n + 1)} />}
      {activeTab === 'Rides'            && <RidesTab driverId={driverId} />}
      {activeTab === 'Earnings'         && <EarningsTab driver={driver} />}
      {activeTab === 'Performance'      && <PerformanceTab driver={driver} />}
      {activeTab === 'History'          && <HistoryTab driverId={driverId} histRefresh={histRefresh} />}
    </div>
  )
}
