import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  getAllDocuments, getDocumentStats,
  approveDocument, rejectDocument, requestDocumentReupload,
} from '../../../services/api/fleetService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatDateTime } from '../../../utils/formatters'
import styles from './FleetDocumentsPage.module.css'

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  verified: { variant: 'success', label: 'Verified' },
  pending:  { variant: 'warning', label: 'Pending' },
  rejected: { variant: 'danger',  label: 'Rejected' },
  expired:  { variant: 'danger',  label: 'Expired' },
  missing:  { variant: 'neutral', label: 'Missing' },
}
function DocStatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

// ── Expiry warning ────────────────────────────────────────────────────────────
function expiryWarning(expiryDate) {
  if (!expiryDate) return null
  const diff = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0)  return { label: 'Expired',              cls: 'danger' }
  if (diff <= 7) return { label: `Expires in ${Math.ceil(diff)}d`, cls: 'danger' }
  if (diff <= 30)return { label: `Expires in ${Math.ceil(diff)}d`, cls: 'warning' }
  return null
}

// ── Filter options ────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending',  label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired',  label: 'Expired' },
  { value: 'missing',  label: 'Missing' },
]

const EXPIRY_OPTS = [
  { value: 'all',         label: 'All expiry' },
  { value: 'expiring_30', label: 'Expiring in 30 days' },
  { value: 'expired',     label: 'Already expired' },
]

const SORT_OPTS = [
  { value: 'default',    label: 'Default sort' },
  { value: 'fleet_asc',  label: 'Fleet A–Z' },
  { value: 'expiry_asc', label: 'Expiry soonest' },
  { value: 'status',     label: 'By status' },
]

function applySort(list, key) {
  const copy = [...list]
  if (key === 'fleet_asc')  return copy.sort((a, b) => a.fleetName.localeCompare(b.fleetName))
  if (key === 'expiry_asc') return copy.sort((a, b) => {
    if (!a.expiryDate) return 1; if (!b.expiryDate) return -1
    return new Date(a.expiryDate) - new Date(b.expiryDate)
  })
  if (key === 'status') {
    const order = { rejected: 0, expired: 1, missing: 2, pending: 3, verified: 4 }
    return copy.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
  }
  return copy
}

const PAGE_SIZE = 15

export function FleetDocumentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch]   = useState('')
  const [fleet, setFleet]     = useState(() => searchParams.get('fleet') ?? 'all')
  const [status, setStatus]   = useState('all')
  const [expiry, setExpiry]   = useState('all')
  const [sort, setSort]       = useState('default')
  const [page, setPage]       = useState(1)
  const [docs, setDocs]       = useState(null)
  const [stats, setStats]     = useState(null)
  const [error, setError]     = useState(null)
  // Modal
  const [modal, setModal]     = useState(null) // { doc, action: 'approve'|'reject'|'reupload'|'view' }
  const [reason, setReason]   = useState('')
  const [busy, setBusy]       = useState(false)
  const [toast, setToast]     = useState(null)

  const allFleets = storeGetFleets()
  const fleetOpts = [
    { value: 'all', label: 'All fleets' },
    ...allFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200)
  }

  async function reload() {
    const [d, s] = await Promise.all([getAllDocuments({ fleetId: fleet, status, search, expiry }), getDocumentStats()])
    setDocs(d); setStats(s); setError(null)
  }

  useEffect(() => {
    let cancelled = false
    setPage(1)
    Promise.all([getAllDocuments({ fleetId: fleet, status, search, expiry }), getDocumentStats()])
      .then(([d, s]) => { if (!cancelled) { setDocs(d); setStats(s) } })
      .catch(() => { if (!cancelled) setError('Unable to load documents.') })
    return () => { cancelled = true }
  }, [search, fleet, status, expiry])

  function resetFilters() {
    setSearch(''); setFleet('all'); setStatus('all'); setExpiry('all'); setSort('default'); setPage(1)
  }

  async function handleConfirm() {
    if (modal.action === 'reject' && !reason.trim()) return
    setBusy(true)
    try {
      if (modal.action === 'approve') {
        await approveDocument(modal.doc.fleetId, modal.doc.id)
        showToast(`"${modal.doc.name}" approved`)
      } else if (modal.action === 'reject') {
        await rejectDocument(modal.doc.fleetId, modal.doc.id, reason)
        showToast(`"${modal.doc.name}" rejected`, 'danger')
      } else if (modal.action === 'reupload') {
        await requestDocumentReupload(modal.doc.fleetId, modal.doc.id)
        showToast(`Re-upload requested for "${modal.doc.name}"`, 'warning')
      }
      await reload()
      setModal(null); setReason('')
    } finally { setBusy(false) }
  }

  const sorted     = applySort(docs ?? [], sort)
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet Documents</h1>
          <p className={styles.subtitle}>
            Review and manage compliance documents across all fleets. Only fleets with all required
            documents verified can operate on the Nomad platform.
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span className={styles.statLabel}>Total Documents</span><span className={styles.statValue}>{stats.total}</span></div>
          <div className={`${styles.statCard} ${styles.statAccent}`}><span className={styles.statLabel}>Verified</span><span className={styles.statValue}>{stats.verified}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Pending Review</span><span className={styles.statValue}>{stats.pending}</span></div>
          <div className={`${styles.statCard} ${styles.statDanger}`}><span className={styles.statLabel}>Rejected</span><span className={styles.statValue}>{stats.rejected}</span></div>
          <div className={`${styles.statCard} ${styles.statDanger}`}><span className={styles.statLabel}>Expired</span><span className={styles.statValue}>{stats.expired}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Expiring Soon</span><span className={styles.statValue}>{stats.expiringSoon}</span></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Missing</span><span className={styles.statValue}>{stats.missing}</span></div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableSection}>
        <Toolbar>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search document, number, fleet…" ariaLabel="Search documents" />
          <FilterSelect value={fleet}  onChange={(v) => { setFleet(v);  setPage(1) }} options={fleetOpts}   ariaLabel="Filter by fleet" />
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUS_OPTS} ariaLabel="Filter by status" />
          <FilterSelect value={expiry} onChange={(v) => { setExpiry(v); setPage(1) }} options={EXPIRY_OPTS} ariaLabel="Filter by expiry" />
          <FilterSelect value={sort}   onChange={(v) => { setSort(v);   setPage(1) }} options={SORT_OPTS}   ariaLabel="Sort" />
          {docs && <ResultCount count={sorted.length} noun="document" />}
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>Reset</button>
        </Toolbar>

        {!docs && !error && <LoadingState label="Loading documents…" />}
        {error && <ErrorState description={error} />}
        {docs && sorted.length === 0 && (
          <EmptyState title="No documents found" description="Try a different search or reset the filters." />
        )}

        {docs && sorted.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fleet</th>
                    <th>Document Type</th>
                    <th>Document Number</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((doc) => {
                    const warn = expiryWarning(doc.expiryDate)
                    return (
                      <tr key={doc.id} className={doc.status === 'expired' || doc.status === 'rejected' ? styles.rowAlert : ''}>
                        <td>
                          <Link to={`/fleet/${doc.fleetId}`} className={styles.fleetLink}>{doc.fleetName}</Link>
                          <div className={styles.fleetId}>{doc.fleetId}</div>
                        </td>
                        <td>
                          <span className={styles.docName}>{doc.name}</span>
                          {doc.reuploadRequested && <span className={styles.reuploadPill}>Re-upload requested</span>}
                        </td>
                        <td>
                          {doc.docNumber
                            ? <span className={styles.mono}>{doc.docNumber}</span>
                            : <span className="table-cell-muted">—</span>}
                        </td>
                        <td className="table-cell-muted">{doc.issueDate ?? '—'}</td>
                        <td>
                          {doc.expiryDate
                            ? <div className={styles.expiryCell}>
                                <span>{doc.expiryDate}</span>
                                {warn && <span className={`${styles.expiryTag} ${styles[`expiry--${warn.cls}`]}`}>{warn.label}</span>}
                              </div>
                            : <span className="table-cell-muted">No expiry</span>}
                        </td>
                        <td><DocStatusBadge status={doc.status} /></td>
                        <td>
                          <div className={styles.actions}>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal({ doc, action: 'view' })}>View</button>
                            {doc.status !== 'verified' && doc.status !== 'missing' && (
                              <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setModal({ doc, action: 'approve' }); setReason('') }}>Approve</button>
                            )}
                            {(doc.status === 'pending' || doc.status === 'verified') && (
                              <button type="button" className="btn btn--danger btn--sm" onClick={() => { setModal({ doc, action: 'reject' }); setReason('') }}>Reject</button>
                            )}
                            {(doc.status === 'rejected' || doc.status === 'expired' || doc.status === 'missing') && (
                              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setModal({ doc, action: 'reupload' })}>Request Re-upload</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* View modal */}
      {modal?.action === 'view' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{modal.doc.name}</h3>
              <DocStatusBadge status={modal.doc.status} />
            </div>

            <div className={styles.docPreview}>
              <div className={styles.docPreviewPlaceholder}>
                <span className={styles.docPreviewIcon}>📄</span>
                <span className={styles.docPreviewLabel}>Document Preview</span>
                <span className={styles.docPreviewSub}>Uploaded document would display here</span>
              </div>
            </div>

            <dl className={styles.docDetailGrid}>
              <dt>Fleet</dt><dd>{modal.doc.fleetName} ({modal.doc.fleetId})</dd>
              <dt>Document Number</dt><dd><span className={styles.mono}>{modal.doc.docNumber ?? '—'}</span></dd>
              <dt>Issue Date</dt><dd>{modal.doc.issueDate ?? '—'}</dd>
              <dt>Expiry Date</dt>
              <dd>
                {modal.doc.expiryDate ?? '—'}
                {expiryWarning(modal.doc.expiryDate) && (
                  <span className={`${styles.expiryTag} ${styles[`expiry--${expiryWarning(modal.doc.expiryDate).cls}`]}`} style={{ marginLeft: 8 }}>
                    {expiryWarning(modal.doc.expiryDate).label}
                  </span>
                )}
              </dd>
              <dt>Uploaded</dt><dd>{modal.doc.uploadedAt ? formatDateTime(modal.doc.uploadedAt) : '—'}</dd>
              {modal.doc.rejectionReason && (
                <><dt>Rejection Reason</dt><dd className={styles.rejectReasonText}>{modal.doc.rejectionReason}</dd></>
              )}
            </dl>

            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Close</button>
              {modal.doc.status !== 'verified' && modal.doc.status !== 'missing' && (
                <button type="button" className="btn btn--primary" onClick={() => { setModal({ ...modal, action: 'approve' }); setReason('') }}>Approve</button>
              )}
              {(modal.doc.status === 'pending' || modal.doc.status === 'verified') && (
                <button type="button" className="btn btn--danger" onClick={() => { setModal({ ...modal, action: 'reject' }); setReason('') }}>Reject</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve modal */}
      {modal?.action === 'approve' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Approve Document</h3>
            <p className={styles.modalDesc}><strong>{modal.doc.name}</strong> for <strong>{modal.doc.fleetName}</strong></p>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleConfirm} disabled={busy}>{busy ? 'Approving…' : 'Approve Document'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {modal?.action === 'reject' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Reject Document</h3>
            <p className={styles.modalDesc}><strong>{modal.doc.name}</strong> for <strong>{modal.doc.fleetName}</strong></p>
            <div className={styles.reasonField}>
              <label className={styles.reasonLabel}>Rejection reason *</label>
              <textarea className={styles.reasonTextarea} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Document has expired, information is unreadable, invalid certificate…" />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--danger" onClick={handleConfirm} disabled={busy || !reason.trim()}>{busy ? 'Rejecting…' : 'Reject Document'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Request re-upload modal */}
      {modal?.action === 'reupload' && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Request Re-upload</h3>
            <p className={styles.modalDesc}>
              Request a new upload for <strong>{modal.doc.name}</strong> from <strong>{modal.doc.fleetName}</strong>.
              The fleet owner will be notified to upload an updated document.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={handleConfirm} disabled={busy}>{busy ? 'Requesting…' : 'Request Re-upload'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
