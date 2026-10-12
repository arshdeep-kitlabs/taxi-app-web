import { useEffect, useState } from 'react'
import { usePortal } from '../context/PortalContext'
import { getFleetPerformance } from '../../../services/api/fleetRidesService'
import { LoadingState, ErrorState } from '../../../components/ui/States'
import { formatCurrency } from '../../../utils/formatters'
import styles from './PortalReportsPage.module.css'

// ── Inline SVG bar chart ──────────────────────────────────────────────────────
function BarChart({ data, color = '#5fa77c', label }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 480, H = 100, BAR_W = 32, GAP = (W - data.length * BAR_W) / (data.length + 1)
  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLabel}>{label}</div>
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
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent }) {
  return (
    <div className={`${styles.metCard} ${accent ? styles.metAccent : ''}`}>
      <div className={styles.metLabel}>{label}</div>
      <div className={styles.metValue}>{value ?? '—'}</div>
      {sub && <div className={styles.metSub}>{sub}</div>}
    </div>
  )
}

export function PortalReportsPage() {
  const { fleetId } = usePortal()
  const [perf,    setPerf]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  function load() {
    setLoading(true); setError(null)
    getFleetPerformance(fleetId)
      .then(setPerf)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (fleetId) load() }, [fleetId])  // eslint-disable-line

  if (loading) return <LoadingState message="Loading reports…" />
  if (error)   return <ErrorState message={error} onRetry={load} />
  if (!perf)   return null

  const ridesData   = (perf.timeSeries ?? []).map((d) => ({ label: d.label, value: d.rides }))
  const revenueData = (perf.timeSeries ?? []).map((d) => ({ label: d.label, value: d.revenue }))

  const cancelRate = perf.totalRides > 0
    ? ((perf.cancelledRides / perf.totalRides) * 100).toFixed(1)
    : '0.0'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Performance Reports</h1>
          <p className={styles.subtitle}>Fleet-level performance metrics and ride trends</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className={styles.metGrid}>
        <MetricCard label="Total Rides"       value={perf.totalRides}                    accent />
        <MetricCard label="Completed"          value={perf.completedRides}               sub={`${perf.totalRides > 0 ? ((perf.completedRides / perf.totalRides) * 100).toFixed(0) : 0}% completion rate`} />
        <MetricCard label="Cancelled"          value={perf.cancelledRides}               sub={`${cancelRate}% cancellation rate`} />
        <MetricCard label="Active Rides"       value={perf.activeRides}                  sub="right now" />
        <MetricCard label="Total Revenue"      value={formatCurrency(perf.totalRevenue)} accent />
        <MetricCard label="Avg Fare"           value={formatCurrency(perf.avgFare)} />
        <MetricCard label="Avg Rating"         value={`${perf.avgRating?.toFixed(2)} ★`} />
        <MetricCard label="Driver Utilisation"  value={`${perf.driverUtilisation}%`} />
        <MetricCard label="Vehicle Utilisation" value={`${perf.vehicleUtilisation}%`} />
      </div>

      {/* Charts */}
      {ridesData.length > 0 && (
        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <BarChart data={ridesData}   color="#5fa77c" label="Rides per Month" />
          </div>
          <div className={styles.chartCard}>
            <BarChart data={revenueData} color="#3b82f6" label="Revenue per Month (AED)" />
          </div>
        </div>
      )}

      {/* Stacked bar: completed vs cancelled */}
      {ridesData.length > 0 && (
        <div className={styles.chartCard}>
          <div className={styles.chartLabel}>Completed vs Cancelled — Last 6 Months</div>
          {(() => {
            const ts = perf.timeSeries ?? []
            const maxVal = Math.max(...ts.map((d) => d.rides), 1)
            const W = 680, H = 110, BAR_W = 40
            const GAP = (W - ts.length * BAR_W) / (ts.length + 1)
            return (
              <svg viewBox={`0 0 ${W} ${H + 40}`} style={{ width: '100%' }}>
                <defs>
                  <pattern id="hatch" patternUnits="userSpaceOnUse" width={6} height={6}>
                    <path d="M0,6 L6,0" stroke="#e53935" strokeWidth={1.2} opacity={0.6} />
                  </pattern>
                </defs>
                {ts.map((d, i) => {
                  const x = GAP + i * (BAR_W + GAP)
                  const totalH = Math.max(4, (d.rides / maxVal) * H)
                  const cxH    = d.rides > 0 ? (d.completed / d.rides) * totalH : 0
                  const caH    = totalH - cxH
                  return (
                    <g key={d.label}>
                      <rect x={x} y={H - cxH}        width={BAR_W} height={cxH} rx={0}      fill="#5fa77c" opacity={0.85} />
                      <rect x={x} y={H - totalH}     width={BAR_W} height={caH} rx={0}      fill="url(#hatch)" />
                      <rect x={x} y={H - totalH}     width={BAR_W} height={4}   rx={4}      fill="#5fa77c" opacity={0.3} />
                      <text x={x + BAR_W / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="#6b7280">{d.label}</text>
                      <text x={x + BAR_W / 2} y={H - totalH - 5} textAnchor="middle" fontSize={8} fill="#6b7280">{d.rides}</text>
                    </g>
                  )
                })}
                {/* Legend */}
                <g transform={`translate(${W - 180}, ${H + 26})`}>
                  <rect x={0} y={0}  width={10} height={10} rx={2} fill="#5fa77c" opacity={0.85} />
                  <text x={14} y={9} fontSize={9} fill="#6b7280">Completed</text>
                  <rect x={72} y={0} width={10} height={10} rx={2} fill="url(#hatch)" />
                  <text x={86} y={9} fontSize={9} fill="#6b7280">Cancelled</text>
                </g>
              </svg>
            )
          })()}
        </div>
      )}
    </div>
  )
}
