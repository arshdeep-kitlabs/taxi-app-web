import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortal } from '../context/PortalContext'
import { getFleetDrivers, getFleetRecentRides } from '../../../services/api/fleetService'
import { getVehicles } from '../../../services/api/vehicleService'
import { getFleetRides, getFleetPerformance } from '../../../services/api/fleetRidesService'
import { getFinancialOverview } from '../../../services/api/fleetFinancialsService'
import { getFleetMaintenance } from '../../../services/api/vehicleService'
import { LoadingState, ErrorState } from '../../../components/ui/States'
import { formatCurrency } from '../../../utils/formatters'
import styles from './PortalDashboardPage.module.css'

function StatCard({ label, value, sub, accent, to, color }) {
  const inner = (
    <div className={`${styles.statCard} ${accent ? styles.statAccent : ''}`}
      style={color ? { borderLeftColor: color } : undefined}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value ?? '—'}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
  return to ? <Link to={to} className={styles.statLink}>{inner}</Link> : inner
}

function AvailBar({ label, avail, total, color }) {
  const pct = total > 0 ? Math.round((avail / total) * 100) : 0
  return (
    <div className={styles.availRow}>
      <div className={styles.availMeta}>
        <span className={styles.availLabel}>{label}</span>
        <span className={styles.availFrac}>{avail} / {total}</span>
      </div>
      <div className={styles.availTrack}>
        <div className={styles.availFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.availPct}>{pct}%</span>
    </div>
  )
}

const STATUS_CFG = {
  completed: { variant: 'success', label: 'Completed' },
  ongoing:   { variant: 'info',    label: 'Ongoing' },
  cancelled: { variant: 'danger',  label: 'Cancelled' },
  requested: { variant: 'warning', label: 'Requested' },
}

function RideBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

export function PortalDashboardPage() {
  const { fleetId, fleet } = usePortal()

  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(null)

  const [drivers,  setDrivers]  = useState([])
  const [vehicles, setVehicles] = useState([])
  const [perf,     setPerf]     = useState(null)
  const [ov,       setOv]       = useState(null)
  const [maint,    setMaint]    = useState([])
  const [recent,   setRecent]   = useState([])

  function load() {
    setLoading(true); setError(null)
    Promise.all([
      getFleetDrivers(fleetId),
      getVehicles({ fleet: fleetId }),
      getFleetPerformance(fleetId),
      getFinancialOverview(fleetId),
      getFleetMaintenance({ fleetId }),
      getFleetRecentRides(fleetId),
    ])
      .then(([dr, ve, pf, ov, ma, rr]) => {
        setDrivers(dr); setVehicles(ve); setPerf(pf); setOv(ov); setMaint(ma); setRecent(rr)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (fleetId) load() }, [fleetId])  // eslint-disable-line

  if (loading) return <LoadingState message="Loading dashboard…" />
  if (error)   return <ErrorState message={error} onRetry={load} />

  // Derived availability
  const activeDrivers    = drivers.filter((d) => d.status === 'active').length
  const availableVehicles = vehicles.filter((v) => v.status === 'available').length
  const activeVehicles   = vehicles.filter((v) => v.status === 'active').length

  // Today string for revenue (paid txns from today — simplified from overview)
  const todayRevenue = ov ? ov.totalRevenue : 0

  // Maintenance warnings
  const needService = maint.filter((v) =>
    v.maintenanceStatus === 'maintenance_required' || v.maintenanceStatus === 'under_maintenance'
  ).length

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <div>
          <h1 className={styles.greetTitle}>Good morning 👋</h1>
          <p className={styles.greetSub}>{today} · {fleet?.name}</p>
        </div>
        <Link to="/portal/rides" className="btn btn--primary">View All Rides</Link>
      </div>

      {/* Primary stat cards */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Vehicles"      value={vehicles.length}     sub={`${activeVehicles} active`}       accent  to="/portal/vehicles" />
        <StatCard label="Total Drivers"       value={drivers.length}      sub={`${activeDrivers} active`}                to="/portal/drivers" />
        <StatCard label="Active Rides"        value={perf?.activeRides ?? 0}  sub="right now"                    color="#3b82f6" />
        <StatCard label="Total Revenue"       value={formatCurrency(todayRevenue)}  sub="paid transactions"      color="#5fa77c" />
        <StatCard label="Completed Rides"     value={perf?.completedRides ?? 0}    sub={`of ${perf?.totalRides ?? 0} total`} to="/portal/rides" />
        <StatCard label="Avg Rating"          value={perf ? perf.avgRating.toFixed(2) + ' ★' : '—'}  sub="driver average" color="#f59e0b" />
      </div>

      {/* Availability + Maintenance alerts row */}
      <div className={styles.midRow}>
        {/* Availability panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Fleet Availability</span>
            <Link to="/portal/vehicles" className={styles.panelLink}>View vehicles →</Link>
          </div>
          <div className={styles.availList}>
            <AvailBar label="Drivers Available"   avail={activeDrivers}     total={drivers.length}  color="#5fa77c" />
            <AvailBar label="Vehicles Available"  avail={availableVehicles} total={vehicles.length} color="#3b82f6" />
            <AvailBar label="Vehicles Active"     avail={activeVehicles}    total={vehicles.length} color="#f59e0b" />
          </div>
        </div>

        {/* Maintenance alerts panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Maintenance Alerts</span>
            <Link to="/portal/maintenance" className={styles.panelLink}>View all →</Link>
          </div>
          {needService === 0 ? (
            <div className={styles.allGood}>
              <span>✅</span>
              <span>All vehicles are operational</span>
            </div>
          ) : (
            <div className={styles.alertList}>
              {maint
                .filter((v) => v.maintenanceStatus === 'maintenance_required' || v.maintenanceStatus === 'under_maintenance')
                .slice(0, 4)
                .map((v) => (
                  <div key={v.vehicleId} className={styles.alertRow}>
                    <div className={styles.alertVehicle}>
                      <span className={styles.alertReg}>{v.plate}</span>
                      <span className={styles.alertVehicleName}>{v.vehicleDisplay}</span>
                    </div>
                    <span className={`badge badge--${v.maintenanceStatus === 'under_maintenance' ? 'danger' : 'warning'}`} style={{ fontSize: 11 }}>
                      <span className="badge__dot" />
                      {v.maintenanceStatus === 'under_maintenance' ? 'Under Maintenance' : 'Service Required'}
                    </span>
                  </div>
                ))}
              {needService > 4 && (
                <div className={styles.alertMore}>+{needService - 4} more vehicles need attention</div>
              )}
            </div>
          )}
        </div>

        {/* Performance snapshot */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Performance</span>
            <Link to="/portal/reports" className={styles.panelLink}>Full report →</Link>
          </div>
          {perf && (
            <div className={styles.perfList}>
              <div className={styles.perfRow}>
                <span className={styles.perfKey}>Avg Fare</span>
                <span className={styles.perfVal}>{formatCurrency(perf.avgFare)}</span>
              </div>
              <div className={styles.perfRow}>
                <span className={styles.perfKey}>Cancellation Rate</span>
                <span className={styles.perfVal}>
                  {perf.totalRides > 0 ? ((perf.cancelledRides / perf.totalRides) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className={styles.perfRow}>
                <span className={styles.perfKey}>Driver Utilisation</span>
                <span className={styles.perfVal}>{perf.driverUtilisation}%</span>
              </div>
              <div className={styles.perfRow}>
                <span className={styles.perfKey}>Vehicle Utilisation</span>
                <span className={styles.perfVal}>{perf.vehicleUtilisation}%</span>
              </div>
              <div className={styles.perfRow}>
                <span className={styles.perfKey}>Total Revenue</span>
                <span className={`${styles.perfVal} ${styles.perfGreen}`}>{formatCurrency(perf.totalRevenue)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent rides */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHead}>
          <span className={styles.panelTitle}>Recent Rides</span>
          <Link to="/portal/rides" className={styles.panelLink}>View all →</Link>
        </div>
        {recent.length === 0 ? (
          <div className={styles.emptyTable}>No recent rides</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ride ID</th>
                  <th>Customer</th>
                  <th>Driver</th>
                  <th>Pickup → Destination</th>
                  <th>Fare</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className={styles.rideId}>{r.id}</span>
                    </td>
                    <td>{r.customerName ?? r.customer ?? '—'}</td>
                    <td className="table-cell-muted">{r.driverName ?? r.driver ?? '—'}</td>
                    <td className="table-cell-muted" style={{ maxWidth: 220 }}>
                      <span title={r.pickup}>{(r.pickup ?? '').slice(0, 22)}{r.pickup?.length > 22 ? '…' : ''}</span>
                      <span style={{ margin: '0 4px', color: 'var(--color-muted)' }}>→</span>
                      <span title={r.destination ?? r.dropoff}>{((r.destination ?? r.dropoff) ?? '').slice(0, 22)}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.fare ? formatCurrency(r.fare) : '—'}</td>
                    <td><RideBadge status={r.status} /></td>
                    <td className="table-cell-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.startedAt ? new Date(r.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
