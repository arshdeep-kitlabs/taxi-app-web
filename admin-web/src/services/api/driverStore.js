/*
  Driver Management — in-memory mutable store.
  Deep-cloned from mock at module load so mutations don't affect the source.
*/

import {
  MOCK_DRIVERS,
  MOCK_DRIVER_DOCUMENTS,
  MOCK_DRIVER_RIDES,
  MOCK_DRIVER_HISTORY,
} from '../mock/driverMock'

// Deep-clone on load
let drivers   = MOCK_DRIVERS.map((d) => ({ ...d }))
const docStore = Object.fromEntries(
  Object.entries(MOCK_DRIVER_DOCUMENTS).map(([k, v]) => [k, v.map((d) => ({ ...d }))])
)
const rideStore = Object.fromEntries(
  Object.entries(MOCK_DRIVER_RIDES).map(([k, v]) => [k, v.map((r) => ({ ...r }))])
)
const histStore = Object.fromEntries(
  Object.entries(MOCK_DRIVER_HISTORY).map(([k, v]) => [k, v.map((h) => ({ ...h }))])
)

// ── Helpers ──────────────────────────────────────────────────────────────────
function nextId() {
  const max = drivers.reduce((m, d) => {
    const n = parseInt(d.id.replace('DRV-', ''), 10)
    return n > m ? n : m
  }, 10010)
  return `DRV-${max + 1}`
}

function pushHistory(driverId, event, admin, detail = null, tone = 'neutral') {
  if (!histStore[driverId]) histStore[driverId] = []
  histStore[driverId].push({
    id: `dh-${driverId}-${Date.now()}`,
    event, admin,
    timestamp: new Date().toISOString(),
    detail, tone,
  })
}

// ── List & filter ────────────────────────────────────────────────────────────
export function storeGetDrivers({
  search = '', fleet = 'all', status = 'all',
  docStatus = 'all', assignment = 'all', verificationStatus = 'all',
} = {}) {
  let list = [...drivers]

  if (search) {
    const q = search.toLowerCase()
    list = list.filter((d) =>
      d.fullName.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.email.toLowerCase().includes(q) ||
      (d.fleetName ?? '').toLowerCase().includes(q) ||
      (d.vehicleDisplay ?? '').toLowerCase().includes(q)
    )
  }
  if (fleet !== 'all') list = list.filter((d) => d.fleetId === fleet)
  if (status !== 'all') list = list.filter((d) => d.status === status)
  if (docStatus !== 'all') list = list.filter((d) => d.docStatus === docStatus)
  if (assignment === 'assigned') list = list.filter((d) => !!d.vehicleId)
  if (assignment === 'unassigned') list = list.filter((d) => !d.vehicleId)
  if (verificationStatus !== 'all') list = list.filter((d) => d.verificationStatus === verificationStatus)

  return list
}

export function storeGetDriverStats() {
  return {
    total: drivers.length,
    active: drivers.filter((d) => d.verificationStatus === 'approved' && d.status !== 'suspended' && d.status !== 'inactive').length,
    online: drivers.filter((d) => d.status === 'online').length,
    offline: drivers.filter((d) => d.status === 'offline').length,
    pending: drivers.filter((d) => d.verificationStatus === 'pending').length,
    suspended: drivers.filter((d) => d.status === 'suspended').length,
    unassigned: drivers.filter((d) => !d.vehicleId && d.verificationStatus === 'approved').length,
  }
}

// ── Get by ID ────────────────────────────────────────────────────────────────
export function storeGetDriverById(id) {
  return drivers.find((d) => d.id === id) ?? null
}

// ── Create driver ────────────────────────────────────────────────────────────
export function storeCreateDriver(form) {
  const id = nextId()
  const now = new Date().toISOString().split('T')[0]
  const driver = {
    id,
    fullName: form.fullName ?? '',
    phone: form.phone ?? '',
    email: form.email ?? '',
    address: form.address ?? '',
    dateOfBirth: form.dateOfBirth ?? '',
    profilePhoto: null,
    licenseNumber: form.licenseNumber ?? '',
    licenseExpiry: form.licenseExpiry ?? '',
    driverType: form.driverType ?? 'independent',
    fleetId: form.driverType === 'fleet' ? (form.fleetId ?? null) : null,
    fleetName: form.driverType === 'fleet' ? (form.fleetName ?? null) : null,
    vehicleId: null, vehicleDisplay: null,
    status: form.saveAsDraft ? 'inactive' : 'pending',
    docStatus: 'pending',
    verificationStatus: form.saveAsDraft ? 'pending' : 'pending',
    rating: null,
    totalRides: 0, completedRides: 0, cancelledRides: 0,
    totalEarnings: 0, avgFare: 0, onlineHours: 0, totalDistanceKm: 0,
    acceptanceRate: null, cancellationRate: null,
    joinedDate: now,
    membershipStatus: form.driverType === 'fleet' ? 'pending' : null,
    fleetJoinedDate: form.driverType === 'fleet' ? now : null,
    fleetContact: null,
  }
  drivers.push(driver)
  pushHistory(id, 'Driver created', 'Admin', `Driver profile created. Type: ${driver.driverType}.`, 'neutral')
  return driver
}

// ── Status update ────────────────────────────────────────────────────────────
export function storeUpdateDriverStatus(id, status) {
  const d = drivers.find((x) => x.id === id)
  if (!d) throw new Error('Driver not found')
  d.status = status
  pushHistory(id, 'Driver status changed', 'Admin', `Status changed to ${status}.`, status === 'suspended' ? 'danger' : 'done')
  return { ...d }
}

// ── Approve / Reject driver ──────────────────────────────────────────────────
export function storeApproveDriver(id) {
  const d = drivers.find((x) => x.id === id)
  if (!d) throw new Error('Driver not found')
  d.verificationStatus = 'approved'
  d.status = 'offline'
  pushHistory(id, 'Driver approved', 'Admin', 'Driver approved and eligible to operate on Nomad.', 'done')
  return { ...d }
}

export function storeRejectDriver(id, reason) {
  const d = drivers.find((x) => x.id === id)
  if (!d) throw new Error('Driver not found')
  d.verificationStatus = 'rejected'
  d.status = 'inactive'
  pushHistory(id, 'Driver rejected', 'Admin', reason, 'danger')
  return { ...d }
}

// ── Documents ────────────────────────────────────────────────────────────────
export function storeGetDriverDocs(driverId) {
  return (docStore[driverId] ?? []).map((d) => ({ ...d }))
}

export function storeApproveDriverDoc(driverId, docId) {
  const docs = docStore[driverId]
  if (!docs) return
  const doc = docs.find((d) => d.id === docId)
  if (doc) {
    doc.status = 'verified'
    doc.rejectionReason = null
  }
  pushHistory(driverId, `Document approved: ${doc?.name}`, 'Admin', null, 'done')
  // Recompute driver docStatus
  const driver = drivers.find((d) => d.id === driverId)
  if (driver) {
    const statuses = docs.map((d) => d.status)
    if (statuses.every((s) => s === 'verified')) driver.docStatus = 'verified'
    else if (statuses.some((s) => s === 'expired')) driver.docStatus = 'expired'
    else if (statuses.some((s) => s === 'rejected')) driver.docStatus = 'rejected'
    else driver.docStatus = 'pending'
  }
}

export function storeRejectDriverDoc(driverId, docId, reason) {
  const docs = docStore[driverId]
  if (!docs) return
  const doc = docs.find((d) => d.id === docId)
  if (doc) {
    doc.status = 'rejected'
    doc.rejectionReason = reason
  }
  pushHistory(driverId, `Document rejected: ${doc?.name}`, 'Admin', reason, 'danger')
  const driver = drivers.find((d) => d.id === driverId)
  if (driver) driver.docStatus = 'rejected'
}

// ── Rides ────────────────────────────────────────────────────────────────────
export function storeGetDriverRides(driverId) {
  return (rideStore[driverId] ?? []).map((r) => ({ ...r }))
}

// ── History ──────────────────────────────────────────────────────────────────
export function storeGetDriverHistory(driverId) {
  return (histStore[driverId] ?? []).map((h) => ({ ...h }))
}
