import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getFleetPerformance, getAllFleetSummaries } from '../../../services/api/fleetRidesService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { LoadingState, ErrorState } from '../../../components/ui/States'
import { FilterSelect } from '../../../components/ui/Toolbar'
import { formatCurrency } from '../../../utils/formatters'
import styles from './FleetPerformancePage.module.css'

// ── Simple SVG charts (no external dependencies) ──────────────────────────────

function BarChart({ data, valueKey, label, color = 'var(--nomad-sage,#5fa77c)', height = 140 }) {
  if (!data?.length) return null
  const values = data.map((d) => d[valueKey])
  const maxVal  = Math.max(...values, 1)
  const barW    = Math.floor(480 / data.length) - 6
  const padL    = 4

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLabel}>{label}</div>
      <svg viewBox={`0 0 480 ${height + 28}`} width="100%" aria-label={label}>
        {data.map((d, i) => {
          const barH = Math.round((d[valueKey] / maxVal) * height)
          const x    = padL + i * (barW + 6)
          const y    = height - barH
          return (
            <g key={d.month}>
              <rect x={x} y={y} width={barW} height={barH || 1} fill={color} rx="3" opacity="0.88" />
              <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="10" fill="var(--color-muted,#6b7280)">{d.label}</text>
              {d[valueKey] > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9.5" fill="var(--color-heading,#101112)" fontWeight="600">{d[valueKey]}</text>
              )}
            </g>
          )
        })}
        <line x1={padL} y1={height} x2={480 - padL} y2={height} stroke="var(--color-border,#e5e3dc)" strokeWidth="1" />
      </svg>
    </div>
  )
}

function LineChart({ data, valueKey, label, color = 'var(--nomad-sage,#5fa77c)', height = 140 }) {
  if (!data?.length) return null
  const values = data.map((d) => d[valueKey])
  const maxVal  = Math.max(...values, 1)
  const w       = 480
  const padL    = 8
  const usableW = w - padL * 2
  const step    = usableW / Math.max(data.length - 1, 1)

  const pts = data.map((d, i) => ({
    x: padL + i * step,
    y: height - Math.round((d[valueKey] / maxVal) * height),
    val: d[valueKey],
    label: d.label,
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLabel}>{label}</div>
      <svg viewBox={`0 0 ${w} ${height + 28}`} width="100%" aria-label={label}>
        <defs>
          <linearGradient id={`grad-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${valueKey})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} />
            <text x={p.x} y={height + 14} textAnchor="middle" fontSize="10" fill="var(--color-muted,#6b7280)">{p.label}</text>
            {p.val > 0 && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9.5" fill="var(--color-heading,#101112)" fontWeight="600">{p.val}</text>
            )}
          </g>
        ))}
        <line x1={padL} y1={height} x2={w - padL} y2={height} stroke="var(--color-border,#e5e3dc)" strokeWidth="1" />
      </svg>
    </div>
  )
}

function StackedBarChart({ data, height = 140 }) {
  if (!data?.length) return null
  const maxVal = Math.max(...data.map((d) => (d.completed || 0) + (d.cancelled || 0)), 1)
  const barW   = Math.floor(480 / data.length) - 8
  const padL   = 4

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLabel}>Completed vs Cancelled</div>
      <div className={styles.chartLegend}>
        <span className={styles.legendDot} style={{ background: 'var(--nomad-sage,#5fa77c)' }} /><span>Completed</span>
        <span className={styles.legendDot} style={{ background: '#e53935' }} /><span>Cancelled</span>
      </div>
      <svg viewBox={`0 0 480 ${height + 28}`} width="100%" aria-label="Completed vs Cancelled">
        {data.map((d, i) => {
          const total  = (d.completed || 0) + (d.cancelled || 0)
          const compH  = Math.round(((d.completed || 0) / maxVal) * height)
          const cancH  = Math.round(((d.cancelled || 0) / maxVal) * height)
          const x      = padL + i * (barW + 8)
          return (
            <g key={d.month}>
              <rect x={x} y={height - compH - cancH} width={barW} height={compH || 0} fill="var(--nomad-sage,#5fa77c)" rx="3" opacity="0.88" />
              <rect x={x} y={height - cancH}         width={barW} height={cancH || 0} fill="#e53935"                   rx="3" opacity="0.78" />
              <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="10" fill="var(--color-muted,#6b7280)">{d.label}</text>
              {total > 0 && (
                <text x={x + barW / 2} y={height - compH - cancH - 4} textAnchor="middle" fontSize="9" fill="var(--color-heading,#101112)">{total}</text>
              )}
            </g>
          )
        })}
        <line x1={padL} y1={height} x2={480 - padL} y2={height} stroke="var(--color-border,#e5e3dc)" strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent }) {
  return (
    <div className={`${styles.metricCard} ${accent ? styles.metricAccent : ''}`}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      {sub && <span className={styles.metricSub}>{sub}</span>}
    </div>
  )
}

// ── Fleet summaries table ─────────────────────────────────────────────────────
function FleetSummaryRow({ s }) {
  return (
    <tr>
      <td><Link to={`/fleet/${s.fleetId}`} className={styles.fleetLink}>{s.fleetName}</Link></td>
      <td>{s.total}</td>
      <td className={styles.green}>{s.completed}</td>
      <td className={styles.red}>{s.cancelled}</td>
      <td className={styles.green}>{formatCurrency(s.totalRevenue)}</td>
      <td>{formatCurrency(s.avgFare)}</td>
      <td>{s.avgRating ? `★ ${s.avgRating}` : '—'}</td>
      <td>{s.driverUtilization}%</td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function FleetPerformancePage() {
  const [searchParams] = useSearchParams()
  const [fleet, setFleet]   = useState(() => searchParams.get('fleet') ?? 'all')
  const [perf, setPerf]     = useState(null)
  const [summaries, setSummaries] = useState(null)
  const [error, setError]   = useState(null)

  const allFleets = storeGetFleets()
  const fleetOpts = [
    { value: 'all', label: 'All fleets — Platform Overview' },
    ...allFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getFleetPerformance(fleet === 'all' ? undefined : fleet),
      fleet === 'all' ? getAllFleetSummaries() : Promise.resolve(null),
    ])
      .then(([p, s]) => { if (!cancelled) { setPerf(p); setSummaries(s); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load performance data.') })
    return () => { cancelled = true }
  }, [fleet])

  const selectedFleetName = fleet === 'all' ? 'All Fleets' : allFleets.find((f) => f.id === fleet)?.name ?? fleet

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet Performance</h1>
          <p className={styles.subtitle}>
            Aggregated metrics and trends for {selectedFleetName}.
            All calculations are derived from historical ride data.
          </p>
        </div>
        <Link to="/fleet/rides" className="btn btn--secondary">View All Rides</Link>
      </div>

      {/* Fleet selector */}
      <div className={styles.fleetSelector}>
        <FilterSelect value={fleet} onChange={setFleet} options={fleetOpts} ariaLabel="Select fleet" />
      </div>

      {!perf && !error && <LoadingState label="Calculating performance…" />}
      {error && <ErrorState description={error} />}

      {perf && (
        <>
          {/* Key metrics grid */}
          <div className={styles.metricsGrid}>
            <MetricCard label="Total Rides"       value={perf.total}                  accent />
            <MetricCard label="Completed Rides"   value={perf.completed}              sub={`${perf.total ? Math.round((perf.completed / perf.total) * 100) : 0}% completion rate`} accent />
            <MetricCard label="Cancelled Rides"   value={perf.cancelled}              sub={`${perf.cancelRate}% cancel rate`} />
            <MetricCard label="Active Rides"      value={perf.active}                 sub="Right now" />
            <MetricCard label="Total Revenue"     value={formatCurrency(perf.totalRevenue)} accent />
            <MetricCard label="Average Fare"      value={formatCurrency(perf.avgFare)} />
            <MetricCard label="Average Rating"    value={perf.avgRating ? `★ ${perf.avgRating}` : '—'} sub="Based on completed rides" />
            <MetricCard label="Driver Utilisation" value={`${perf.driverUtilization}%`} sub="Drivers with ride activity" />
            <MetricCard label="Vehicle Utilisation" value={`${perf.vehicleUtilization}%`} sub="Vehicles with ride activity" />
          </div>

          {/* Charts */}
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard}>
              <BarChart data={perf.timeSeries} valueKey="rides" label="Rides per Month" />
            </div>
            <div className={styles.chartCard}>
              <LineChart data={perf.timeSeries} valueKey="revenue" label="Revenue per Month (AED)" color="#5fa77c" />
            </div>
            <div className={styles.chartCard}>
              <StackedBarChart data={perf.timeSeries} />
            </div>
          </div>

          {/* All-fleet breakdown table */}
          {fleet === 'all' && summaries && summaries.length > 0 && (
            <div className={styles.summarySection}>
              <h2 className={styles.sectionTitle}>Fleet Breakdown</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fleet</th>
                      <th>Total Rides</th>
                      <th>Completed</th>
                      <th>Cancelled</th>
                      <th>Revenue</th>
                      <th>Avg Fare</th>
                      <th>Avg Rating</th>
                      <th>Driver Util.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s) => <FleetSummaryRow key={s.fleetId} s={s} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Single-fleet performance notice */}
          {fleet !== 'all' && (
            <div className={styles.note}>
              <span>📊</span>
              <span>Performance data is calculated from historical ride records for {selectedFleetName}. Figures update in real time as rides complete.</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
