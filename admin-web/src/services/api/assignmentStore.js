/*
  Assignment Management — in-memory mutable store.
  Cross-references driverStore and vehicleStore to enforce business rules.
*/

import { MOCK_ASSIGNMENTS, MOCK_ASSIGNMENT_HISTORY } from '../mock/assignmentMock'

// Deep-clone on load
let assignments = MOCK_ASSIGNMENTS.map((a) => ({ ...a }))
const histStore = Object.fromEntries(
  Object.entries(MOCK_ASSIGNMENT_HISTORY).map(([k, v]) => [k, v.map((h) => ({ ...h }))]),
)

// ── Helpers ──────────────────────────────────────────────────────────────────
function nextId() {
  const nums = assignments.map((a) => parseInt(a.id.replace('ASN-', ''), 10))
  return `ASN-${String(Math.max(...nums, 0) + 1).padStart(3, '0')}`
}

function pushHistory(assignmentId, event, admin, detail = null, tone = 'neutral') {
  if (!histStore[assignmentId]) histStore[assignmentId] = []
  histStore[assignmentId].push({
    id: `ah-${assignmentId}-${Date.now()}`,
    event, admin,
    timestamp: new Date().toISOString(),
    detail, tone,
  })
}

// ── Stats ────────────────────────────────────────────────────────────────────
export function storeGetAssignmentStats() {
  const active = assignments.filter((a) => a.status === 'active')
  return {
    total: assignments.length,
    active: active.length,
    // unassigned counts derived from driver/vehicle stores would require imports
    // — keep simple: return raw active count; UI will augment from other stores
  }
}

// ── List ─────────────────────────────────────────────────────────────────────
export function storeGetAssignments({ fleet = 'all', status = 'all', search = '' } = {}) {
  let list = [...assignments]
  if (fleet !== 'all') list = list.filter((a) => a.fleetId === fleet)
  if (status !== 'all') list = list.filter((a) => a.status === status)
  if (search) {
    const q = search.toLowerCase()
    list = list.filter((a) =>
      a.driverName.toLowerCase().includes(q) ||
      a.driverId.toLowerCase().includes(q) ||
      a.vehicleDisplay.toLowerCase().includes(q) ||
      a.vehicleReg.toLowerCase().includes(q) ||
      a.fleetName.toLowerCase().includes(q)
    )
  }
  return list
}

// ── Get by ID ────────────────────────────────────────────────────────────────
export function storeGetAssignmentById(id) {
  return assignments.find((a) => a.id === id) ?? null
}

// ── Active assignment for a driver ───────────────────────────────────────────
export function storeGetActiveAssignmentForDriver(driverId) {
  return assignments.find((a) => a.driverId === driverId && a.status === 'active') ?? null
}

// ── Active assignment for a vehicle ──────────────────────────────────────────
export function storeGetActiveAssignmentForVehicle(vehicleId) {
  return assignments.find((a) => a.vehicleId === vehicleId && a.status === 'active') ?? null
}

// ── Create assignment ─────────────────────────────────────────────────────────
export function storeCreateAssignment({ driverId, driverName, driverPhone, vehicleId, vehicleDisplay, vehicleReg, fleetId, fleetName, notes }) {
  // Enforce: driver has no active assignment
  if (storeGetActiveAssignmentForDriver(driverId)) {
    throw new Error('Driver already has an active assignment.')
  }
  // Enforce: vehicle has no active assignment
  if (storeGetActiveAssignmentForVehicle(vehicleId)) {
    throw new Error('Vehicle already has an active assignment.')
  }

  const id = nextId()
  const now = new Date().toISOString().split('T')[0]
  const assignment = {
    id, driverId, driverName, driverPhone,
    vehicleId, vehicleDisplay, vehicleReg,
    fleetId, fleetName,
    status: 'active',
    assignedDate: now,
    assignedBy: 'Admin',
    notes: notes ?? null,
  }
  assignments.push(assignment)
  pushHistory(id, 'Assignment created', 'Admin',
    `${driverName} assigned to ${vehicleDisplay} (${vehicleReg}) in ${fleetName}.`, 'done')

  return assignment
}

// ── Change vehicle on an assignment ──────────────────────────────────────────
export function storeChangeVehicle(assignmentId, vehicleId, vehicleDisplay, vehicleReg) {
  const a = assignments.find((x) => x.id === assignmentId)
  if (!a) throw new Error('Assignment not found')
  if (storeGetActiveAssignmentForVehicle(vehicleId)) {
    throw new Error('Vehicle already has an active assignment.')
  }
  const prev = a.vehicleDisplay
  a.vehicleId = vehicleId
  a.vehicleDisplay = vehicleDisplay
  a.vehicleReg = vehicleReg
  pushHistory(assignmentId, 'Vehicle changed', 'Admin',
    `Vehicle changed from ${prev} to ${vehicleDisplay} (${vehicleReg}).`, 'done')
  return { ...a }
}

// ── Remove assignment ─────────────────────────────────────────────────────────
export function storeRemoveAssignment(assignmentId, reason = '') {
  const a = assignments.find((x) => x.id === assignmentId)
  if (!a) throw new Error('Assignment not found')
  a.status = 'removed'
  a.removedDate = new Date().toISOString().split('T')[0]
  a.removedBy = 'Admin'
  if (reason) a.notes = reason
  pushHistory(assignmentId, 'Assignment removed', 'Admin',
    reason || 'Assignment removed. Historical ride data preserved.', 'danger')
  return { ...a }
}

// ── History ───────────────────────────────────────────────────────────────────
export function storeGetAssignmentHistory(assignmentId) {
  return (histStore[assignmentId] ?? []).map((h) => ({ ...h }))
}
