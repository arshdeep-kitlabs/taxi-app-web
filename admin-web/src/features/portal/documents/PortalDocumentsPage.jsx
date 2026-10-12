import { useEffect, useState } from 'react'
import { usePortal } from '../context/PortalContext'
import { getFleetDocuments } from '../../../services/api/fleetService'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import styles from './PortalDocumentsPage.module.css'

const STATUS_OPTS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending',  label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired',  label: 'Expired' },
]

const STATUS_CFG = {
  verified: { variant: 'success', label: 'Verified' },
  pending:  { variant: 'warning', label: 'Pending' },
  rejected: { variant: 'danger',  label: 'Rejected' },
  expired:  { variant: 'neutral', label: 'Expired' },
}

function DocBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

function expiryTag(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0)   return { label: 'Expired',               cls: 'danger' }
  if (diff <= 30) return { label: `Expires in ${Math.ceil(diff)}d`, cls: 'warning' }
  return null
}

export function PortalDocumentsPage() {
  const { fleetId } = usePortal()
  const [all,     setAll]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  function load() {
    setLoading(true); setError(null)
    getFleetDocuments(fleetId)
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId])  // eslint-disable-line

  const filtered = all.filter((d) => {
    const q = search.toLowerCase()
    const matchQ = !q || d.type?.toLowerCase().includes(q) || d.number?.toLowerCase().includes(q)
    const matchS = filterStatus === 'all' || d.status === filterStatus
    return matchQ && matchS
  })

  const expiring = all.filter((d) => {
    if (!d.expiryDate) return false
    const diff = (new Date(d.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  }).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Documents</h1>
          <p className={styles.subtitle}>{all.length} documents · {expiring > 0 ? `${expiring} expiring soon` : 'no expiry warnings'}</p>
        </div>
      </div>

      {expiring > 0 && (
        <div className={styles.expiryAlert}>
          ⚠️ <strong>{expiring} document{expiring > 1 ? 's' : ''}</strong> {expiring > 1 ? 'are' : 'is'} expiring within 30 days. Contact your Nomad account manager to renew.
        </div>
      )}

      <div className={styles.tableSection}>
        <div className={styles.tableTop}>
          <Toolbar>
            <SearchField value={search} onChange={setSearch} placeholder="Search type, number…" />
            <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTS} />
            <ResultCount count={filtered.length} label="document" />
          </Toolbar>
        </div>

        {loading ? <LoadingState message="Loading documents…" /> :
         error   ? <ErrorState message={error} onRetry={load} /> :
         filtered.length === 0 ? <EmptyState title="No documents found" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Number</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const tag = expiryTag(d.expiryDate)
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, fontSize: 13.5 }}>{d.type}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{d.number ?? '—'}</td>
                      <td className="table-cell-muted">{d.issueDate ?? '—'}</td>
                      <td>
                        <span className="table-cell-muted" style={{ fontSize: 13 }}>{d.expiryDate ?? '—'}</span>
                        {tag && (
                          <span className={`badge badge--${tag.cls}`} style={{ marginLeft: 6, fontSize: 10.5 }}>
                            <span className="badge__dot" />{tag.label}
                          </span>
                        )}
                      </td>
                      <td><DocBadge status={d.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.note}>
        To upload new documents or request re-verification, contact your Nomad fleet manager.
      </div>
    </div>
  )
}
