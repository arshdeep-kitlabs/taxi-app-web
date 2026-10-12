/*
  Fleet Rides & Performance in-memory store.
  All data is derived from MOCK_FLEET_RIDES; no separate mutations needed for this read-heavy module.
*/

import { MOCK_FLEET_RIDES } from '../mock/fleetRidesMock'

// Deep-clone on load
let _rides = MOCK_FLEET_RIDES.map((r) => ({ ...r }))

// ── Helpers ───────────────────────────────────────────────────────────────────
function monthLabel(isoDate) {
  const d = new Date(isoDate)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function weekLabel(isoDate) {
  const d = new Date(isoDate)
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  const week = Math.ceil(dayOfYear / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

// ── List rides (with filters) ─────────────────────────────────────────────────
export function storeGetFleetRides({
  fleetId = 'all',
  status  = 'all',
  search  = '',
  dateFrom = null,
  dateTo   = null,
} = {}) {
  let list = [..._rides]

  if (fleetId !== 'all') list = list.filter((r) => r.fleetId === fleetId)
  if (status  !== 'all') list = list.filter((r) => r.status  === status)

  if (search) {
    const q = search.toLowerCase()
    list = list.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.driverName.toLowerCase().includes(q) ||
      r.vehicleReg.toLowerCase().includes(q) ||
      r.pickup.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      r.fleetName.toLowerCase().includes(q)
    )
  }

  if (dateFrom) list = list.filter((r) => new Date(r.startedAt) >= new Date(dateFrom))
  if (dateTo)   list = list.filter((r) => new Date(r.startedAt) <= new Date(dateTo + 'T23:59:59Z'))

  // Sort newest first
  return list.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
}

// ── Performance metrics ───────────────────────────────────────────────────────
export function storeGetFleetPerformance(fleetId = 'all') {
  const rides = fleetId === 'all' ? [..._rides] : _rides.filter((r) => r.fleetId === fleetId)

  const completed = rides.filter((r) => r.status === 'completed')
  const cancelled = rides.filter((r) => r.status === 'cancelled')
  const active    = rides.filter((r) => r.status === 'ongoing' || r.status === 'requested')

  const totalRevenue = completed.reduce((s, r) => s + r.fare, 0)
  const avgFare      = completed.length ? Math.round(totalRevenue / completed.length) : 0
  const ratings      = completed.filter((r) => r.rating != null).map((r) => r.rating)
  const avgRating    = ratings.length ? Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) / 10 : 0

  // Utilization: simplistic — unique drivers/vehicles active vs total
  const activeDriverIds  = new Set(active.concat(completed).map((r) => r.driverId))
  const totalDriverIds   = new Set(rides.map((r) => r.driverId))
  const activeVehicleIds = new Set(active.concat(completed).map((r) => r.vehicleReg))
  const totalVehicleIds  = new Set(rides.map((r) => r.vehicleReg))

  const driverUtil  = totalDriverIds.size  ? Math.round((activeDriverIds.size  / totalDriverIds.size)  * 100) : 0
  const vehicleUtil = totalVehicleIds.size ? Math.round((activeVehicleIds.size / totalVehicleIds.size) * 100) : 0

  // Cancel rate
  const cancelRate = rides.length ? Math.round((cancelled.length / rides.length) * 100) : 0

  // ── Time-series: last 6 months by month ────────────────────────────────────
  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(now.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  // Build ordered month labels for the last 6 months
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const ridesPerMonth   = Object.fromEntries(months.map((m) => [m, 0]))
  const revenuePerMonth = Object.fromEntries(months.map((m) => [m, 0]))
  const completedPerMonth = Object.fromEntries(months.map((m) => [m, 0]))
  const cancelledPerMonth = Object.fromEntries(months.map((m) => [m, 0]))

  for (const r of rides) {
    const m = monthLabel(r.startedAt)
    if (!(m in ridesPerMonth)) continue
    ridesPerMonth[m]++
    if (r.status === 'completed') { revenuePerMonth[m] += r.fare; completedPerMonth[m]++ }
    if (r.status === 'cancelled') cancelledPerMonth[m]++
  }

  const timeSeries = months.map((m) => ({
    month: m,
    label: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
    rides: ridesPerMonth[m],
    revenue: revenuePerMonth[m],
    completed: completedPerMonth[m],
    cancelled: cancelledPerMonth[m],
  }))

  return {
    total: rides.length,
    completed: completed.length,
    cancelled: cancelled.length,
    active: active.length,
    totalRevenue,
    avgFare,
    avgRating,
    driverUtilization: driverUtil,
    vehicleUtilization: vehicleUtil,
    cancelRate,
    timeSeries,
  }
}

// ── All fleet performance summaries (for the "all fleets" view) ───────────────
export function storeGetAllFleetSummaries() {
  const fleetIds = [...new Set(_rides.map((r) => r.fleetId))]
  return fleetIds.map((fid) => {
    const perf = storeGetFleetPerformance(fid)
    const fleetName = _rides.find((r) => r.fleetId === fid)?.fleetName ?? fid
    return { fleetId: fid, fleetName, ...perf }
  })
}

// ── Ride stats (for header cards on rides page) ───────────────────────────────
export function storeGetRideStats(fleetId = 'all') {
  const rides = fleetId === 'all' ? [..._rides] : _rides.filter((r) => r.fleetId === fleetId)
  return {
    total:     rides.length,
    completed: rides.filter((r) => r.status === 'completed').length,
    cancelled: rides.filter((r) => r.status === 'cancelled').length,
    active:    rides.filter((r) => r.status === 'ongoing' || r.status === 'requested').length,
  }
}
