/*
  Vehicle Management — in-memory store.
  Simulates a backend for the duration of the session.
*/

import {
  MOCK_VEHICLES,
  MOCK_VEHICLE_DOCUMENTS,
  MOCK_VEHICLE_MAINTENANCE,
  MOCK_VEHICLE_RIDES,
  MOCK_VEHICLE_HISTORY,
} from '../mock/vehicleMock'

let _vehicles = MOCK_VEHICLES.map((v) => ({ ...v }))
let _docs = Object.fromEntries(
  Object.entries(MOCK_VEHICLE_DOCUMENTS).map(([k, v]) => [k, v.map((d) => ({ ...d }))]),
)
let _maintenance = Object.fromEntries(
  Object.entries(MOCK_VEHICLE_MAINTENANCE).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
)
let _rides = Object.fromEntries(
  Object.entries(MOCK_VEHICLE_RIDES).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
)
let _history = Object.fromEntries(
  Object.entries(MOCK_VEHICLE_HISTORY).map(([k, v]) => [k, v.map((e) => ({ ...e }))]),
)

let _nextVehNum = _vehicles.length + 1
let _nextDocNum = 8000
let _nextMntNum = 8000
let _nextEvtNum = 8000

function ts() { return new Date().toISOString() }

function newVehId() { return `VEH-${String(_nextVehNum++).padStart(3, '0')}` }

function pushHistory(vehicleId, event, admin = 'Admin Vipin', tone = 'done') {
  if (!_history[vehicleId]) _history[vehicleId] = []
  _history[vehicleId].push({ id: `VH-${_nextEvtNum++}`, event, admin, timestamp: ts(), tone })
}

/* ---- vehicles ---- */

export function storeGetVehicles({ search = '', fleet = 'all', type = 'all', rideType = 'all', status = 'all', docStatus = 'all' } = {}) {
  let list = [..._vehicles]

  if (fleet !== 'all')      list = list.filter((v) => v.fleetId === fleet)
  if (type !== 'all')       list = list.filter((v) => v.type.toLowerCase() === type.toLowerCase())
  if (rideType !== 'all')   list = list.filter((v) => v.rideType.toLowerCase() === rideType.toLowerCase())
  if (status !== 'all')     list = list.filter((v) => v.status === status)
  if (docStatus !== 'all')  list = list.filter((v) => v.docStatus === docStatus)

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (v) =>
        `${v.make} ${v.model}`.toLowerCase().includes(q) ||
        v.regNo.toLowerCase().includes(q) ||
        v.fleetName.toLowerCase().includes(q) ||
        (v.driverName ?? '').toLowerCase().includes(q),
    )
  }

  return list
}

export function storeGetVehicleStats() {
  return {
    total: _vehicles.length,
    active: _vehicles.filter((v) => v.status === 'active').length,
    available: _vehicles.filter((v) => v.status === 'available').length,
    assigned: _vehicles.filter((v) => v.driverId).length,
    maintenance: _vehicles.filter((v) => v.status === 'maintenance').length,
    pendingVerification: _vehicles.filter((v) => v.status === 'pending' || v.docStatus === 'pending').length,
    expiringDocs: 2, // mocked — in production compute from doc expiry dates
  }
}

export function storeGetVehicleById(id) {
  const v = _vehicles.find((v) => v.id === id)
  if (!v) throw new Error('Vehicle not found')
  return { ...v }
}

export function storeCreateVehicle(form) {
  const id = newVehId()
  const now = ts()
  const vehicle = {
    id,
    make: form.make, model: form.model, year: Number(form.year) || 0,
    color: form.color, type: form.type, rideType: form.rideType,
    regNo: form.regNo, vin: form.vin,
    fleetId: form.fleetId, fleetName: form.fleetName,
    driverId: null, driverName: null, driverPhone: null, driverRating: null,
    status: form.saveAsDraft ? 'inactive' : 'pending',
    docStatus: 'pending',
    totalRides: 0, completedRides: 0, cancelledRides: 0,
    revenue: 0, avgFare: 0, avgRating: 0, totalDistanceKm: 0, utilization: 0,
    lastActive: null, createdAt: now,
    maintenanceStatus: 'operational', lastServiceDate: null, nextServiceDate: null,
  }
  _vehicles.push(vehicle)
  _docs[id] = []
  _history[id] = []
  pushHistory(id, 'Vehicle registered and added to platform')
  if (form.fleetName) pushHistory(id, `Assigned to fleet: ${form.fleetName}`)
  return { ...vehicle }
}

export function storeUpdateVehicleStatus(id, status) {
  const v = _vehicles.find((v) => v.id === id)
  if (!v) throw new Error('Vehicle not found')
  v.status = status
  pushHistory(id, `Vehicle status changed to ${status}`)
  return { ...v }
}

/* ---- documents ---- */

export function storeGetVehicleDocs(vehicleId) {
  return (_docs[vehicleId] ?? []).map((d) => ({ ...d }))
}

export function storeApproveVehicleDoc(vehicleId, docId) {
  const doc = (_docs[vehicleId] ?? []).find((d) => d.id === docId)
  if (!doc) throw new Error('Document not found')
  doc.status = 'verified'
  doc.rejectionReason = null
  pushHistory(vehicleId, `${doc.name} verified`)
  return { ...doc }
}

export function storeRejectVehicleDoc(vehicleId, docId, reason) {
  const doc = (_docs[vehicleId] ?? []).find((d) => d.id === docId)
  if (!doc) throw new Error('Document not found')
  doc.status = 'rejected'
  doc.rejectionReason = reason
  pushHistory(vehicleId, `${doc.name} rejected — Reason: ${reason}`, 'Admin Vipin', 'cancelled')
  return { ...doc }
}

/* ---- maintenance ---- */

export function storeGetMaintenance(vehicleId) {
  return (_maintenance[vehicleId] ?? []).map((r) => ({ ...r }))
}

export function storeAddMaintenanceRecord(vehicleId, record) {
  if (!_maintenance[vehicleId]) _maintenance[vehicleId] = []
  const newRecord = { id: `MNT-${_nextMntNum++}`, ...record }
  _maintenance[vehicleId].unshift(newRecord)
  // Update vehicle's lastServiceDate / nextServiceDate / mileage if provided
  const v = _vehicles.find((v) => v.id === vehicleId)
  if (v) {
    if (record.serviceDate) v.lastServiceDate = record.serviceDate
    if (record.nextServiceDate) v.nextServiceDate = record.nextServiceDate
    if (record.mileage) v.currentMileage = Number(record.mileage)
    // If record marks a status transition
    if (record.maintenanceStatus) {
      v.maintenanceStatus = record.maintenanceStatus
      if (record.maintenanceStatus === 'under_maintenance') {
        v.status = 'maintenance'
      } else if (record.maintenanceStatus === 'operational' && v.status === 'maintenance') {
        v.status = 'available'
      }
    }
  }
  pushHistory(vehicleId, `Maintenance record added: ${record.serviceType}`, 'Admin Vipin', 'done')
  return { ...newRecord }
}

export function storeUpdateMaintenanceStatus(vehicleId, maintenanceStatus) {
  const v = _vehicles.find((v) => v.id === vehicleId)
  if (!v) throw new Error('Vehicle not found')
  const prev = v.maintenanceStatus
  v.maintenanceStatus = maintenanceStatus
  // Sync vehicle operational status
  if (maintenanceStatus === 'under_maintenance') {
    v.status = 'maintenance'
  } else if (maintenanceStatus === 'suspended') {
    v.status = 'suspended'
  } else if (maintenanceStatus === 'operational' && (prev === 'under_maintenance' || prev === 'maintenance_required')) {
    v.status = v.driverId ? 'active' : 'available'
  }
  pushHistory(vehicleId, `Maintenance status changed: ${prev} → ${maintenanceStatus}`, 'Admin Vipin', maintenanceStatus === 'operational' ? 'done' : 'danger')
  return { ...v }
}

// Cross-vehicle fleet maintenance overview
export function storeGetFleetMaintenance({ fleetId = 'all', maintenanceStatus = 'all', search = '' } = {}) {
  let list = [..._vehicles]
  if (fleetId !== 'all') list = list.filter((v) => v.fleetId === fleetId)
  if (maintenanceStatus !== 'all') list = list.filter((v) => v.maintenanceStatus === maintenanceStatus)
  if (search) {
    const q = search.toLowerCase()
    list = list.filter((v) =>
      v.id.toLowerCase().includes(q) ||
      `${v.make} ${v.model}`.toLowerCase().includes(q) ||
      (v.regNo ?? '').toLowerCase().includes(q) ||
      (v.fleetName ?? '').toLowerCase().includes(q) ||
      (v.driverName ?? '').toLowerCase().includes(q)
    )
  }
  return list.map((v) => ({
    vehicleId: v.id,
    vehicleDisplay: `${v.make} ${v.model} (${v.year})`,
    regNo: v.regNo,
    fleetId: v.fleetId,
    fleetName: v.fleetName,
    driverId: v.driverId,
    driverName: v.driverName,
    status: v.status,
    maintenanceStatus: v.maintenanceStatus ?? 'operational',
    lastServiceDate: v.lastServiceDate ?? null,
    nextServiceDate: v.nextServiceDate ?? null,
    currentMileage: v.currentMileage ?? null,
    lastRecord: (_maintenance[v.id] ?? [])[0] ?? null,
  }))
}

export function storeGetMaintenanceStats() {
  return {
    total: _vehicles.length,
    operational: _vehicles.filter((v) => (v.maintenanceStatus ?? 'operational') === 'operational').length,
    maintenanceRequired: _vehicles.filter((v) => v.maintenanceStatus === 'maintenance_required').length,
    underMaintenance: _vehicles.filter((v) => v.maintenanceStatus === 'under_maintenance').length,
    suspended: _vehicles.filter((v) => v.maintenanceStatus === 'suspended').length,
  }
}

/* ---- rides ---- */

export function storeGetVehicleRides(vehicleId) {
  return (_rides[vehicleId] ?? []).map((r) => ({ ...r }))
}

/* ---- history ---- */

export function storeGetVehicleHistory(vehicleId) {
  return (_history[vehicleId] ?? []).map((e) => ({ ...e }))
}
