import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  getTransactions, getFinancialOverview,
  getRevenueTimeSeries, getFleetFinancialBreakdown,
  markTransactionStatus,
} from '../../../services/api/fleetFinancialsService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { NOMAD_COMMISSION_RATE, FLEET_SHARE_RATE, DRIVER_FLEET_SHARE } from '../../../config/financials'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatCurrency, formatDateTime } from '../../../utils/formatters'
import styles from './FleetFinancialsPage.module.css'

// ── Payment status badge ──────────────────────────────────────────────────────
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

// ── Filter options ────────────────────────────────────────────────────────────
const PAY_STATUS_OPTS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'paid',     label: 'Paid' },
  { value: 'pending',  label: 'Pending' },
  { value: 'failed',   label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

const DATE_OPTS = [
  { value: 'all',  label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d',   label: 'Last 7 days' },
  { value: '30d',  label: 'Last 30 days' },
  { value: '90d',  label: 'Last 90 days' },
]

function dateRange(key) {
  const now = new Date()
  const fmt = (d) => d.toISOString().slice(0, 10)
  if (key === 'today') return { dateFrom: fmt(now), dateTo: fmt(now) }
  if (key === '7d')  { const d = new Date(now); d.setDate(d.getDate() - 7);  return { dateFrom: fmt(d), dateTo: fmt(now) } }
  if (key === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return { dateFrom: fmt(d), dateTo: fmt(now) } }
  if (key === '90d') { const d = new Date(now); d.setDate(d.getDate() - 90); return { dateFrom: fmt(d), dateTo: fmt(now) } }
  return { dateFrom: null, dateTo: null }
}

// ── Inline SVG charts ─────────────────────────────────────────────────────────
function LineChart({ data, keys, colors, label, height = 130 }) {
  if (!data?.length) return null
  const W = 480, padL = 8, usableW = W - padL * 2
  const step = usableW / Math.max(data.length - 1, 1)
  const allVals = data.flatMap((d) => keys.map((k) => d[k] || 0))
  const maxVal  = Math.max(...allVals, 1)

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLabel}>{label}</div>
      <svg viewBox={`0 0 ${W} ${height + 28}`} width="100%" aria-label={label}>
        <defs>
          {keys.map((k, ki) => (
            <linearGradient key={k} id={`fg-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[ki]} stopOpacity="0.22" />
              <stop offset="100%" stopColor={colors[ki]} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {keys.map((k, ki) => {
          const pts = data.map((d, i) => ({
            x: padL + i * step,
            y: height - Math.round(((d[k] || 0) / maxVal) * height),
          }))
          const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
          const areaD = `${pathD} L ${pts[pts.length-1].x} ${height} L ${pts[0].x} ${height} Z`
          return (
            <g key={k}>
              <path d={areaD} fill={`url(#fg-${k})`} />
              <path d={pathD} fill="none" stroke={colors[ki]} strokeWidth="2" strokeLinejoin="round" />
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={colors[ki]} />)}
            </g>
          )
        })}
        {data.map((d, i) => (
          <text key={i} x={padL + i * step} y={height + 14} textAnchor="middle" fontSize="10" fill="var(--color-muted,#6b7280)">{d.label}</text>
        ))}
        <line x1={padL} y1={height} x2={W - padL} y2={height} stroke="var(--color-border,#e5e3dc)" strokeWidth="1" />
      </svg>
    </div>
  )
}

function StackedBarChart({ data, height = 130 }) {
  if (!data?.length) return null
  const W = 480, padL = 4
  const barW = Math.floor((W - padL * 2) / data.length) - 6
  const maxVal = Math.max(...data.map((d) => (d.nomad || 0) + (d.fleet || 0) + (d.driver || 0)), 1)

  const COLORS = {
    nomad:  'var(--nomad-sage,#5fa77c)',
    fleet:  '#60a5fa',
    driver: '#f59e0b',
  }

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLabel}>Earnings Split by Month</div>
      <div className={styles.chartLegend}>
        {Object.entries(COLORS).map(([k, c]) => (
          <span key={k} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: c }} />
            {k === 'nomad' ? 'Nomad' : k === 'fleet' ? 'Fleet' : 'Driver'}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${height + 28}`} width="100%" aria-label="Earnings split">
        {data.map((d, i) => {
          const nomadH  = Math.round(((d.nomad  || 0) / maxVal) * height)
          const fleetH  = Math.round(((d.fleet  || 0) / maxVal) * height)
          const driverH = Math.round(((d.driver || 0) / maxVal) * height)
          const total   = nomadH + fleetH + driverH
          const x       = padL + i * (barW + 6)
          let y = height
          return (
            <g key={d.month}>
              {[['driver', driverH, COLORS.driver], ['fleet', fleetH, COLORS.fleet], ['nomad', nomadH, COLORS.nomad]].map(([seg, h, c]) => {
                y -= h
                return h > 0 ? <rect key={seg} x={x} y={y} width={barW} height={h} fill={c} opacity="0.88" /> : null
              })}
              <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="10" fill="var(--color-muted,#6b7280)">{d.label}</text>
            </g>
          )
        })}
        <line x1={padL} y1={height} x2={W - padL} y2={height} stroke="var(--color-border,#e5e3dc)" strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── Overview card ─────────────────────────────────────────────────────────────
function OvCard({ label, value, sub, accent, dim }) {
  return (
    <div className={`${styles.ovCard} ${accent ? styles.ovAccent : ''} ${dim ? styles.ovDim : ''}`}>
      <span className={styles.ovLabel}>{label}</span>
      <span className={styles.ovValue}>{value}</span>
      {sub && <span className={styles.ovSub}>{sub}</span>}
    </div>
  )
}

// ── Txn action menu ───────────────────────────────────────────────────────────
function TxnActions({ txn, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const opts = Object.keys(PAY_CFG).filter((s) => s !== txn.paymentStatus)
  return (
    <div className={styles.actionMenu} onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen((o) => !o)} aria-haspopup="true">
        ···
      </button>
      {open && (
        <div className={styles.actionDropdown}>
          {opts.map((s) => (
            <button key={s} type="button" className={styles.actionItem}
              onClick={() => { onStatusChange(txn.txnId, s); setOpen(false) }}>
              Mark as {PAY_CFG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export function FleetFinancialsPage() {
  const [searchParams]    = useSearchParams()
  const [fleet, setFleet] = useState(() => searchParams.get('fleet') ?? 'all')
  const [payStatus, setPayStatus] = useState('all')
  const [dateKey,   setDateKey]   = useState('all')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)

  const [overview,    setOverview]    = useState(null)
  const [txns,        setTxns]        = useState(null)
  const [timeSeries,  setTimeSeries]  = useState(null)
  const [breakdown,   setBreakdown]   = useState(null)
  const [error,       setError]       = useState(null)
  const [toast,       setToast]       = useState(null)

  const allFleets = storeGetFleets()
  const fleetOpts = [
    { value: 'all', label: 'All fleets' },
    ...allFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  const { dateFrom, dateTo } = dateRange(dateKey)

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  async function loadAll() {
    const fid = fleet === 'all' ? undefined : fleet
    const [ov, t, ts, bd] = await Promise.all([
      getFinancialOverview(fid),
      getTransactions({ fleetId: fleet, paymentStatus: payStatus, dateFrom, dateTo, search }),
      getRevenueTimeSeries(fid),
      fleet === 'all' ? getFleetFinancialBreakdown() : Promise.resolve(null),
    ])
    setOverview(ov); setTxns(t); setTimeSeries(ts); setBreakdown(bd); setError(null)
  }

  useEffect(() => {
    let cancelled = false
    setPage(1)
    const fid = fleet === 'all' ? undefined : fleet
    Promise.all([
      getFinancialOverview(fid),
      getTransactions({ fleetId: fleet, paymentStatus: payStatus, dateFrom, dateTo, search }),
      getRevenueTimeSeries(fid),
      fleet === 'all' ? getFleetFinancialBreakdown() : Promise.resolve(null),
    ])
      .then(([ov, t, ts, bd]) => {
        if (!cancelled) { setOverview(ov); setTxns(t); setTimeSeries(ts); setBreakdown(bd); setError(null) }
      })
      .catch(() => { if (!cancelled) setError('Unable to load financial data.') })
    return () => { cancelled = true }
  }, [fleet, payStatus, dateKey, search])

  async function handleStatusChange(txnId, newStatus) {
    try {
      await markTransactionStatus(txnId, newStatus)
      showToast(`Transaction marked as ${PAY_CFG[newStatus]?.label ?? newStatus}`)
      await loadAll()
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  function reset() { setFleet('all'); setPayStatus('all'); setDateKey('all'); setSearch(''); setPage(1) }

  const totalPages = txns ? Math.max(1, Math.ceil(txns.length / PAGE_SIZE)) : 1
  const paged      = txns ? txns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []
  const selectedFleetName = fleet === 'all' ? 'All Fleets' : allFleets.find((f) => f.id === fleet)?.name ?? fleet

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet Financials</h1>
          <p className={styles.subtitle}>
            Revenue, commissions and driver earnings across {selectedFleetName}.
            Rates: Nomad {Math.round(NOMAD_COMMISSION_RATE * 100)}% · Fleet {Math.round(FLEET_SHARE_RATE * 100)}% · Driver {Math.round(DRIVER_FLEET_SHARE * 100)}%.
          </p>
        </div>
        <div className={styles.headerFleetPicker}>
          <FilterSelect value={fleet} onChange={(v) => { setFleet(v); setPage(1) }} options={fleetOpts} ariaLabel="Select fleet" />
        </div>
      </div>

      {/* Overview cards */}
      {overview ? (
        <div className={styles.ovGrid}>
          <OvCard label="Total Revenue"    value={formatCurrency(overview.totalRevenue)}   accent sub={`${overview.paidCount} paid rides`} />
          <OvCard label="Nomad Commission" value={formatCurrency(overview.nomadEarnings)}  accent sub={`${Math.round(NOMAD_COMMISSION_RATE * 100)}% of fare`} />
          <OvCard label="Fleet Earnings"   value={formatCurrency(overview.fleetEarnings)}  sub={`${Math.round(FLEET_SHARE_RATE * 100)}% of fare`} />
          <OvCard label="Driver Earnings"  value={formatCurrency(overview.driverEarnings)} sub={`${Math.round(DRIVER_FLEET_SHARE * 100)}% of fare`} />
          <OvCard label="Completed Payments" value={overview.paidCount}                   sub={formatCurrency(overview.totalRevenue)} accent />
          <OvCard label="Pending Payments"   value={overview.pendingCount}                sub={formatCurrency(overview.pendingAmount)} />
          <OvCard label="Failed"             value={overview.failedCount}                 sub={formatCurrency(overview.failedAmount)}  dim />
          <OvCard label="Refunded"           value={overview.refundedCount}               sub={formatCurrency(overview.refundedAmount)} />
        </div>
      ) : !error && <div style={{ height: 100 }}><LoadingState label="Loading overview…" /></div>}

      {error && <ErrorState description={error} />}

      {/* Charts */}
      {timeSeries && (
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <LineChart
              data={timeSeries}
              keys={['revenue']}
              colors={['var(--nomad-sage,#5fa77c)']}
              label="Revenue over Time (AED)"
            />
          </div>
          <div className={styles.chartCard}>
            <StackedBarChart data={timeSeries} />
          </div>
        </div>
      )}

      {/* Fleet breakdown table (all-fleet view only) */}
      {fleet === 'all' && breakdown && breakdown.length > 0 && (
        <div className={styles.breakdownSection}>
          <h2 className={styles.sectionTitle}>Revenue by Fleet</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fleet</th>
                  <th>Total Revenue</th>
                  <th>Nomad Commission</th>
                  <th>Fleet Earnings</th>
                  <th>Driver Earnings</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Refunded</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b) => (
                  <tr key={b.fleetId}>
                    <td>
                      <Link to={`/fleet/${b.fleetId}`} className={styles.fleetLink}>{b.fleetName}</Link>
                      <div className={styles.sub}>{b.fleetId}</div>
                    </td>
                    <td className={styles.boldCell}>{formatCurrency(b.totalRevenue)}</td>
                    <td className={styles.sageCell}>{formatCurrency(b.nomadEarnings)}</td>
                    <td>{formatCurrency(b.fleetEarnings)}</td>
                    <td>{formatCurrency(b.driverEarnings)}</td>
                    <td>{b.paidCount}</td>
                    <td className={b.pendingCount > 0 ? styles.warnCell : ''}>{b.pendingCount}</td>
                    <td>{b.refundedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2 className={styles.sectionTitle}>Transactions</h2>
        </div>
        <Toolbar>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Ride ID, fleet, driver…" ariaLabel="Search" />
          <FilterSelect value={payStatus} onChange={(v) => { setPayStatus(v); setPage(1) }} options={PAY_STATUS_OPTS} ariaLabel="Payment status" />
          <FilterSelect value={dateKey}   onChange={(v) => { setDateKey(v);   setPage(1) }} options={DATE_OPTS}       ariaLabel="Date range" />
          {txns && <ResultCount count={txns.length} noun="transaction" />}
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>Reset</button>
        </Toolbar>

        {!txns && !error && <LoadingState label="Loading transactions…" />}
        {txns && txns.length === 0 && <EmptyState title="No transactions found" description="Try a different filter or date range." />}

        {txns && txns.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ride ID</th>
                    <th>Fleet</th>
                    <th>Driver</th>
                    <th>Fare</th>
                    <th>Nomad Commission</th>
                    <th>Fleet Share</th>
                    <th>Driver Earnings</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t) => (
                    <tr key={t.txnId}
                      className={t.paymentStatus === 'failed' ? styles.rowFailed : t.paymentStatus === 'refunded' ? styles.rowRefunded : ''}>
                      <td>
                        <Link to={`/rides/${t.rideId}`} className={styles.rideIdLink}>{t.rideId}</Link>
                        <div className={styles.sub}>{t.txnId}</div>
                      </td>
                      <td>
                        <Link to={`/fleet/${t.fleetId}`} className={styles.fleetLink}>{t.fleetName}</Link>
                      </td>
                      <td>
                        <span className={styles.name}>{t.driverName ?? '—'}</span>
                      </td>
                      <td className={styles.boldCell}>{formatCurrency(t.fare)}</td>
                      <td className={styles.sageCell}>{formatCurrency(t.nomadCut)}</td>
                      <td>{formatCurrency(t.fleetCut)}</td>
                      <td>{formatCurrency(t.driverNet)}</td>
                      <td><PayBadge status={t.paymentStatus} /></td>
                      <td className={styles.dateCell}>{formatDateTime(t.date)}</td>
                      <td>
                        <TxnActions txn={t} onStatusChange={handleStatusChange} />
                      </td>
                    </tr>
                  ))}
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

      {/* Commission note */}
      <div className={styles.configNote}>
        <span>ℹ</span>
        <span>
          Commission rates are sourced from platform financial configuration —
          Nomad {Math.round(NOMAD_COMMISSION_RATE * 100)}%, Fleet {Math.round(FLEET_SHARE_RATE * 100)}%,
          Driver {Math.round(DRIVER_FLEET_SHARE * 100)}%. Changes to rates take effect on new transactions only.
          All financial actions are recorded in audit logs.
        </span>
      </div>
    </div>
  )
}
