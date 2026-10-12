/*
  In-memory fleet store — simulates a backend for the duration of the session.
  Pages import from here (via fleetService) so mutations (add / approve / reject)
  are visible across all routes without a real API.
*/

import {
  MOCK_FLEETS,
  MOCK_FLEET_STATS,
  MOCK_FLEET_DOCUMENTS,
  MOCK_FLEET_HISTORY,
} from '../mock/fleetMock'

// Deep-clone initial data so mutations don't affect the frozen mock constants
let _fleets = MOCK_FLEETS.map((f) => ({ ...f }))
let _docs = Object.fromEntries(
  Object.entries(MOCK_FLEET_DOCUMENTS).map(([k, v]) => [k, v.map((d) => ({ ...d }))]),
)
let _history = Object.fromEntries(
  Object.entries(MOCK_FLEET_HISTORY).map(([k, v]) => [k, v.map((e) => ({ ...e }))]),
)

let _nextFleetNum = _fleets.length + 1
let _nextDocNum = 9000
let _nextEvtNum = 9000

/* --- helpers --- */

function ts() {
  return new Date().toISOString()
}

function newFleetId() {
  return `FLT-${String(_nextFleetNum++).padStart(3, '0')}`
}

function pushHistory(fleetId, event, admin = 'Admin Vipin', tone = 'done') {
  if (!_history[fleetId]) _history[fleetId] = []
  _history[fleetId].push({
    id: `EVT-${_nextEvtNum++}`,
    event,
    admin,
    timestamp: ts(),
    tone,
  })
}

/* --- fleet CRUD --- */

export function storeGetFleets({ search = '', status = 'all' } = {}) {
  let list = [..._fleets]
  if (status !== 'all') list = list.filter((f) => f.status === status)
  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.owner.name.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q),
    )
  }
  return list
}

export function storeGetPendingFleets() {
  return _fleets.filter((f) => f.status === 'pending')
}

export function storeGetFleetById(id) {
  const f = _fleets.find((f) => f.id === id)
  if (!f) throw new Error('Fleet not found')
  return { ...f }
}

export function storeGetFleetStats() {
  const totals = {
    totalFleets: _fleets.length,
    activeFleets: _fleets.filter((f) => f.status === 'active').length,
    pendingFleets: _fleets.filter((f) => f.status === 'pending').length,
    suspendedFleets: _fleets.filter((f) => f.status === 'suspended').length,
    totalVehicles: _fleets.reduce((s, f) => s + (f.vehicles || 0), 0),
    activeVehicles: _fleets
      .filter((f) => f.status === 'active')
      .reduce((s, f) => s + (f.vehicles || 0), 0),
    totalFleetDrivers: _fleets.reduce((s, f) => s + (f.drivers || 0), 0),
  }
  return totals
}

export function storeCreateFleet(formData) {
  const id = newFleetId()
  const now = ts()
  const fleet = {
    id,
    name: formData.fleetName,
    businessName: formData.businessName,
    businessRegNo: formData.businessRegNo,
    fleetType: formData.fleetType,
    owner: {
      name: formData.ownerName,
      email: formData.ownerEmail,
      phone: formData.ownerPhone,
      address: formData.ownerAddress,
      city: formData.city,
      country: formData.country,
    },
    vehicles: Number(formData.vehicles) || 0,
    drivers: Number(formData.drivers) || 0,
    activeRides: 0,
    status: formData.saveAsDraft ? 'inactive' : 'pending',
    city: formData.city,
    revenue: 0,
    createdAt: now,
    submittedAt: now,
  }
  _fleets.push(fleet)

  // Seed an empty doc list and initial history event
  _docs[id] = []
  _history[id] = []
  pushHistory(id, `Fleet application created by Admin Vipin`, 'Admin Vipin')

  return { ...fleet }
}

export function storeApproveFleet(id) {
  const fleet = _fleets.find((f) => f.id === id)
  if (!fleet) throw new Error('Fleet not found')
  fleet.status = 'active'
  pushHistory(id, 'Fleet application approved by Admin Vipin', 'Admin Vipin', 'done')
  return { ...fleet }
}

export function storeRejectFleet(id, reason) {
  const fleet = _fleets.find((f) => f.id === id)
  if (!fleet) throw new Error('Fleet not found')
  fleet.status = 'rejected'
  fleet.rejectionReason = reason
  pushHistory(
    id,
    `Fleet application rejected by Admin Vipin — Reason: ${reason}`,
    'Admin Vipin',
    'cancelled',
  )
  return { ...fleet }
}

/* --- documents --- */

export function storeGetDocuments(fleetId) {
  return (_docs[fleetId] ?? []).map((d) => ({ ...d }))
}

export function storeApproveDocument(fleetId, docId) {
  const doc = (_docs[fleetId] ?? []).find((d) => d.id === docId)
  if (!doc) throw new Error('Document not found')
  doc.status = 'verified'
  doc.rejectionReason = null
  pushHistory(fleetId, `${doc.name} verified by Admin Vipin`, 'Admin Vipin', 'done')
  return { ...doc }
}

export function storeRejectDocument(fleetId, docId, reason) {
  const doc = (_docs[fleetId] ?? []).find((d) => d.id === docId)
  if (!doc) throw new Error('Document not found')
  doc.status = 'rejected'
  doc.rejectionReason = reason
  pushHistory(
    fleetId,
    `${doc.name} rejected by Admin Vipin — Reason: ${reason}`,
    'Admin Vipin',
    'cancelled',
  )
  return { ...doc }
}

export function storeRequestDocumentReupload(fleetId, docId) {
  const doc = (_docs[fleetId] ?? []).find((d) => d.id === docId)
  if (!doc) throw new Error('Document not found')
  doc.reuploadRequested = true
  pushHistory(fleetId, `Re-upload requested for ${doc.name}`, 'Admin Vipin', 'done')
  return { ...doc }
}

/* --- cross-fleet document list --- */
export function storeGetAllDocuments({ fleetId = 'all', status = 'all', search = '', expiry = 'all' } = {}) {
  const allDocs = []
  for (const [fid, docs] of Object.entries(_docs)) {
    const fleet = _fleets.find((f) => f.id === fid)
    for (const doc of docs) {
      allDocs.push({ ...doc, fleetId: fid, fleetName: fleet?.name ?? fid })
    }
  }
  let list = allDocs
  if (fleetId !== 'all') list = list.filter((d) => d.fleetId === fleetId)
  if (status !== 'all')  list = list.filter((d) => d.status === status)
  if (search) {
    const q = search.toLowerCase()
    list = list.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      (d.docNumber ?? '').toLowerCase().includes(q) ||
      d.fleetName.toLowerCase().includes(q) ||
      d.fleetId.toLowerCase().includes(q)
    )
  }
  if (expiry === 'expired') {
    list = list.filter((d) => d.expiryDate && new Date(d.expiryDate) < new Date())
  } else if (expiry === 'expiring_30') {
    const now = new Date()
    list = list.filter((d) => {
      if (!d.expiryDate) return false
      const diff = (new Date(d.expiryDate) - now) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 30
    })
  }
  return list
}

export function storeGetDocumentStats() {
  const all = []
  for (const docs of Object.values(_docs)) all.push(...docs)
  const now = new Date()
  return {
    total: all.length,
    verified: all.filter((d) => d.status === 'verified').length,
    pending: all.filter((d) => d.status === 'pending').length,
    rejected: all.filter((d) => d.status === 'rejected').length,
    expired: all.filter((d) => d.status === 'expired' || (d.expiryDate && new Date(d.expiryDate) < now)).length,
    expiringSoon: all.filter((d) => {
      if (!d.expiryDate) return false
      const diff = (new Date(d.expiryDate) - now) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 30
    }).length,
    missing: all.filter((d) => d.status === 'missing').length,
  }
}

/* --- history --- */

export function storeGetHistory(fleetId) {
  return (_history[fleetId] ?? []).map((e) => ({ ...e }))
}
