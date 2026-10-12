import {
  storeGetAssignments, storeGetAssignmentStats, storeGetAssignmentById,
  storeCreateAssignment, storeChangeVehicle, storeRemoveAssignment,
  storeGetAssignmentHistory,
  storeGetActiveAssignmentForDriver, storeGetActiveAssignmentForVehicle,
} from './assignmentStore'

const D = 300
const delay = (ms = D) => new Promise((r) => setTimeout(r, ms))

export const getAssignments    = async (opts) => { await delay(); return storeGetAssignments(opts) }
export const getAssignmentStats= async ()     => { await delay(); return storeGetAssignmentStats() }
export const getAssignmentById = async (id)   => { await delay(); return storeGetAssignmentById(id) }
export const createAssignment  = async (data) => { await delay(400); return storeCreateAssignment(data) }
export const changeVehicle     = async (id, vehicleId, display, reg) => { await delay(350); return storeChangeVehicle(id, vehicleId, display, reg) }
export const removeAssignment  = async (id, reason) => { await delay(350); return storeRemoveAssignment(id, reason) }
export const getAssignmentHistory = async (id) => { await delay(); return storeGetAssignmentHistory(id) }

export const getActiveAssignmentForDriver  = async (driverId)  => { await delay(150); return storeGetActiveAssignmentForDriver(driverId) }
export const getActiveAssignmentForVehicle = async (vehicleId) => { await delay(150); return storeGetActiveAssignmentForVehicle(vehicleId) }
