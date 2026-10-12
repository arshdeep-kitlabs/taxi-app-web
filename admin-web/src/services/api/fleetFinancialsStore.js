/*
  Fleet Financials in-memory store.
  Derives transactions from the existing fleet rides data, augmented with
  deterministic payment statuses. Commission rates come from the platform
  financial config — never hard-coded here.
*/

import { MOCK_FLEET_RIDES } from '../mock/fleetRidesMock'
import { breakdownFare } from '../../config/financials'

// ── Assign deterministic payment statuses to rides ────────────────────────────
// completed rides → mostly paid, some pending; cancelled → refunded or nil;
// ongoing/requested → pending
function assignPaymentStatus(ride, idx) {
  if (ride.status === 'ongoing' || ride.status === 'requested') return 'pending'
  if (ride.status === 'cancelled') {
    // ~30 % of cancellations get a small refund (pre-auth), rest are nil
    return idx % 3 === 0 ? 'refunded' : null   // null = no charge
  }
  // completed: spread across paid/pending/failed
  const cycle = idx % 10
  if (cycle < 7) return 'paid'       // 70 % paid
  if (cycle < 9) return 'pending'    // 20 % pending
  return 'failed'                    // 10 % failed
}

// Build enriched transactions once on module load
const _txns = MOCK_FLEET_RIDES
  .map((ride, idx) => {
    const paymentStatus = assignPaymentStatus(ride, idx)
    if (paymentStatus === null) return null   // cancelled with no charge — skip

    const bd = breakdownFare(ride.fare, true) // all fleet rides treated as fleet-driver
    return {
      txnId:         `TXN-${String(idx + 1000).padStart(5, '0')}`,
      rideId:        ride.id,
      fleetId:       ride.fleetId,
      fleetName:     ride.fleetName,
      driverId:      ride.driverId,
      driverName:    ride.driverName,
      customerId:    ride.customerId,
      customerName:  ride.customerName,
      paymentMethod: ride.paymentMethod,
      fare:          ride.fare,
      nomadCut:      bd.nomadCut,
      fleetCut:      bd.fleetCut,
      driverNet:     bd.driverNet,
      rideStatus:    ride.status,
      paymentStatus,
      date:          ride.completedAt ?? ride.startedAt,
    }
  })
  .filter(Boolean)

// Allow in-session payment status updates (e.g. mark failed → paid)
let _txnsMutable = _txns.map((t) => ({ ...t }))

// ── Helpers ───────────────────────────────────────────────────────────────────
function monthLabel(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── List transactions ─────────────────────────────────────────────────────────
export function storeGetTransactions({
  fleetId       = 'all',
  paymentStatus = 'all',
  dateFrom      = null,
  dateTo        = null,
  search        = '',
} = {}) {
  let list = [..._txnsMutable]
  if (fleetId       !== 'all') list = list.filter((t) => t.fleetId       === fleetId)
  if (paymentStatus !== 'all') list = list.filter((t) => t.paymentStatus === paymentStatus)
  if (dateFrom) list = list.filter((t) => new Date(t.date) >= new Date(dateFrom))
  if (dateTo)   list = list.filter((t) => new Date(t.date) <= new Date(dateTo + 'T23:59:59Z'))
  if (search) {
    const q = search.toLowerCase()
    list = list.filter((t) =>
      t.rideId.toLowerCase().includes(q) ||
      t.txnId.toLowerCase().includes(q) ||
      t.fleetName.toLowerCase().includes(q) ||
      (t.driverName ?? '').toLowerCase().includes(q) ||
      (t.customerName ?? '').toLowerCase().includes(q)
    )
  }
  return list.sort((a, b) => new Date(b.date) - new Date(a.date))
}

// ── Financial overview (aggregated totals) ────────────────────────────────────
export function storeGetFinancialOverview(fleetId = 'all') {
  const txns = fleetId === 'all'
    ? [..._txnsMutable]
    : _txnsMutable.filter((t) => t.fleetId === fleetId)

  const paid      = txns.filter((t) => t.paymentStatus === 'paid')
  const pending   = txns.filter((t) => t.paymentStatus === 'pending')
  const failed    = txns.filter((t) => t.paymentStatus === 'failed')
  const refunded  = txns.filter((t) => t.paymentStatus === 'refunded')

  const totalRevenue    = paid.reduce((s, t) => s + t.fare, 0)
  const nomadEarnings   = paid.reduce((s, t) => s + t.nomadCut, 0)
  const fleetEarnings   = paid.reduce((s, t) => s + t.fleetCut, 0)
  const driverEarnings  = paid.reduce((s, t) => s + t.driverNet, 0)
  const pendingAmount   = pending.reduce((s, t) => s + t.fare, 0)
  const failedAmount    = failed.reduce((s, t) => s + t.fare, 0)
  const refundedAmount  = refunded.reduce((s, t) => s + t.fare, 0)

  return {
    totalRevenue,
    nomadEarnings,
    fleetEarnings,
    driverEarnings,
    paidCount:    paid.length,
    pendingAmount,
    pendingCount: pending.length,
    failedAmount,
    failedCount:  failed.length,
    refundedAmount,
    refundedCount: refunded.length,
    totalTxns:    txns.length,
  }
}

// ── Time-series (last 6 months) ───────────────────────────────────────────────
export function storeGetRevenueTimeSeries(fleetId = 'all') {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const txns = fleetId === 'all'
    ? _txnsMutable.filter((t) => t.paymentStatus === 'paid')
    : _txnsMutable.filter((t) => t.fleetId === fleetId && t.paymentStatus === 'paid')

  const revenue  = Object.fromEntries(months.map((m) => [m, 0]))
  const nomad    = Object.fromEntries(months.map((m) => [m, 0]))
  const fleet    = Object.fromEntries(months.map((m) => [m, 0]))
  const driver   = Object.fromEntries(months.map((m) => [m, 0]))

  for (const t of txns) {
    const m = monthLabel(t.date)
    if (!(m in revenue)) continue
    revenue[m] += t.fare
    nomad[m]   += t.nomadCut
    fleet[m]   += t.fleetCut
    driver[m]  += t.driverNet
  }

  return months.map((m) => ({
    month:   m,
    label:   new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
    revenue: revenue[m],
    nomad:   nomad[m],
    fleet:   fleet[m],
    driver:  driver[m],
  }))
}

// ── Fleet breakdown for all-fleet view ───────────────────────────────────────
export function storeGetFleetFinancialBreakdown() {
  const fleetIds = [...new Set(_txnsMutable.map((t) => t.fleetId))]
  return fleetIds.map((fid) => {
    const ov = storeGetFinancialOverview(fid)
    const name = _txnsMutable.find((t) => t.fleetId === fid)?.fleetName ?? fid
    return { fleetId: fid, fleetName: name, ...ov }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ── Mark a transaction's payment status (audit action) ───────────────────────
export function storeMarkTransactionStatus(txnId, newStatus, admin = 'Admin Vipin') {
  const t = _txnsMutable.find((t) => t.txnId === txnId)
  if (!t) throw new Error('Transaction not found')
  const prev = t.paymentStatus
  t.paymentStatus = newStatus
  // Return an audit entry the UI can display
  return {
    ...t,
    audit: {
      action: `Payment status changed: ${prev} → ${newStatus}`,
      admin,
      timestamp: new Date().toISOString(),
    },
  }
}
