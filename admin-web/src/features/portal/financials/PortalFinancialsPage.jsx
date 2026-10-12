import { useEffect, useState } from 'react'
import { usePortal } from '../context/PortalContext'
import {
  getFinancialOverview, getTransactions,
  getRevenueTimeSeries,
} from '../../../services/api/fleetFinancialsService'
import { NOMAD_COMMISSION_RATE, FLEET_SHARE_RATE } from '../../../config/financials'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatCurrency } from '../../../utils/formatters'
import styles from './PortalFinancialsPage.module.css'

// ── Inline SVG bar chart ──────────────────────────────────────────────────────
function BarChart({ data, color = '#5fa77c' }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 460, H = 100, BAR_W = 28, GAP = (W - data.length * BAR_W) / (data.length + 1)
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%' }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * H)
        const x = GAP + i * (BAR_W + GAP)
        return (
          <g key={d.label}>
            <rect x={x} y={H - h} width={BAR_W} height={h} rx={4} fill={color} opacity={0.85} />
            <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="#6b7280">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Pay badge ─────────────────────────────────────────────────────────────────
const PAY_CFG = {
  paid:     { variant: 'success', label: 'Paid' },
  pending:  { variant: 'warning', label: 'Pending' },
  failed:   { variant: 'danger',  label: 'Failed' },
  refunded: { variant: 'info',    label: 'Refunded' },
}
function PayBadge({ status }) {
  const cfg = PAY_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

const PAY_STATUS_OPTS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'paid',     label: 'Paid' },
  { value: 'pending',  label: 'Pending' },
  { value: 'failed',   label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

const PAGE_SIZE = 15

export function PortalFinancialsPage() {
  const { fleetId } = usePortal()
  const [ov,      setOv]      = useState(null)
  const [ts,      setTs]      = useState([])
  const [txns,    setTxns]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [filterPay, setFilterPay] = useState('all')
  const [page, setPage]       = useState(1)

  function load() {
    setLoading(true); setError(null)
    Promise.all([
      getFinancialOverview(fleetId),
      getRevenueTimeSeries(fleetId),
      getTransactions({ fleetId, paymentStatus: filterPay, search }),
    ])
      .then(([o, t, tx]) => { setOv(o); setTs(t); setTxns(tx) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId, filterPay, search])  // eslint-disable-line

  const total = txns.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePg = Math.min(page, pages)
  const slice = txns.slice((safePg - 1) * PAGE_SIZE, safePg * PAGE_SIZE)

  const chartData = ts.map((d) => ({ label: d.label, value: d.fleet }))

  if (loading) return <LoadingState message="Loading financials…" />
  if (error)   return <ErrorState message={error} onRetry={load} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Financials</h1>
          <p className={styles.subtitle}>
            Fleet share: {(FLEET_SHARE_RATE * 100).toFixed(0)}% · Nomad commission: {(NOMAD_COMMISSION_RATE * 100).toFixed(0)}% · Driver net: {((1 - NOMAD_COMMISSION_RATE - FLEET_SHARE_RATE) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Overview cards */}
      {ov && (
        <div className={styles.ovGrid}>
          <div className={`${styles.ovCard} ${styles.ovAccent}`}>
            <div className={styles.ovLabel}>Total Revenue</div>
            <div className={styles.ovValue}>{formatCurrency(ov.totalRevenue)}</div>
            <div className={styles.ovSub}>{ov.paidCount} paid transactions</div>
          </div>
          <div className={styles.ovCard}>
            <div className={styles.ovLabel}>Fleet Earnings</div>
            <div className={styles.ovValue}>{formatCurrency(ov.fleetEarnings)}</div>
            <div className={styles.ovSub}>{(FLEET_SHARE_RATE * 100).toFixed(0)}% of revenue</div>
          </div>
          <div className={styles.ovCard}>
            <div className={styles.ovLabel}>Driver Earnings</div>
            <div className={styles.ovValue}>{formatCurrency(ov.driverEarnings)}</div>
            <div className={styles.ovSub}>Paid to drivers</div>
          </div>
          <div className={styles.ovCard}>
            <div className={styles.ovLabel}>Nomad Commission</div>
            <div className={styles.ovValue}>{formatCurrency(ov.nomadEarnings)}</div>
            <div className={styles.ovSub}>{(NOMAD_COMMISSION_RATE * 100).toFixed(0)}% platform fee</div>
          </div>
          <div className={styles.ovCard}>
            <div className={styles.ovLabel}>Pending</div>
            <div className={styles.ovValue}>{formatCurrency(ov.pendingAmount)}</div>
            <div className={styles.ovSub}>{ov.pendingCount} transactions</div>
          </div>
          <div className={styles.ovCard}>
            <div className={styles.ovLabel}>Failed</div>
            <div className={styles.ovValue}>{formatCurrency(ov.failedAmount)}</div>
            <div className={styles.ovSub}>{ov.failedCount} transactions</div>
          </div>
          <div className={styles.ovCard}>
            <div className={styles.ovLabel}>Refunded</div>
            <div className={styles.ovValue}>{formatCurrency(ov.refundedAmount)}</div>
            <div className={styles.ovSub}>{ov.refundedCount} transactions</div>
          </div>
        </div>
      )}

      {/* Fleet earnings chart */}
      {ts.length > 0 && (
        <div className={styles.chartCard}>
          <div className={styles.chartLabel}>Fleet Earnings — Last 6 Months</div>
          <BarChart data={chartData} color="#5fa77c" />
        </div>
      )}

      {/* Transactions */}
      <div className={styles.tableSection}>
        <div className={styles.tableHead}>
          <span className={styles.tableTitle}>Transactions</span>
        </div>
        <div className={styles.tableTop}>
          <Toolbar>
            <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search ride ID, driver…" />
            <FilterSelect label="Status" value={filterPay} onChange={(v) => { setFilterPay(v); setPage(1) }} options={PAY_STATUS_OPTS} />
            <ResultCount count={total} label="transaction" />
          </Toolbar>
        </div>

        {slice.length === 0 ? <EmptyState title="No transactions found" /> : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ride ID</th>
                    <th>Driver</th>
                    <th>Fare</th>
                    <th>Fleet Share</th>
                    <th>Driver Net</th>
                    <th>Nomad Commission</th>
                    <th>Payment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((t) => (
                    <tr key={t.txnId}>
                      <td>
                        <span className={styles.rideId}>{t.rideId}</span>
                        <div className="table-cell-muted" style={{ fontSize: 10.5, fontFamily: 'monospace' }}>{t.txnId}</div>
                      </td>
                      <td className="table-cell-muted">{t.driverName}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(t.fare)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--nomad-sage)' }}>{formatCurrency(t.fleetCut)}</td>
                      <td className="table-cell-muted">{formatCurrency(t.driverNet)}</td>
                      <td className="table-cell-muted">{formatCurrency(t.nomadCut)}</td>
                      <td><PayBadge status={t.paymentStatus} /></td>
                      <td className="table-cell-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className={styles.pagination}>
                <button className="btn btn--secondary" disabled={safePg === 1}     onClick={() => setPage(safePg - 1)}>← Prev</button>
                <span className={styles.pageInfo}>Page {safePg} of {pages}</span>
                <button className="btn btn--secondary" disabled={safePg === pages} onClick={() => setPage(safePg + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
