import {
  storeGetVehicles, storeGetVehicleStats, storeGetVehicleById,
  storeCreateVehicle, storeUpdateVehicleStatus,
  storeGetVehicleDocs, storeApproveVehicleDoc, storeRejectVehicleDoc,
  storeGetMaintenance, storeAddMaintenanceRecord, storeUpdateMaintenanceStatus,
  storeGetFleetMaintenance, storeGetMaintenanceStats,
  storeGetVehicleRides, storeGetVehicleHistory,
} from './vehicleStore'

const D = 300
const delay = (ms = D) => new Promise((r) => setTimeout(r, ms))

export const getVehicles     = async (opts)        => { await delay(); return storeGetVehicles(opts) }
export const getVehicleStats = async ()            => { await delay(); return storeGetVehicleStats() }
export const getVehicleById  = async (id)          => { await delay(); return storeGetVehicleById(id) }
export const createVehicle   = async (form)        => { await delay(400); return storeCreateVehicle(form) }
export const updateVehicleStatus = async (id, s)   => { await delay(350); return storeUpdateVehicleStatus(id, s) }

export const getVehicleDocs      = async (vid)         => { await delay(); return storeGetVehicleDocs(vid) }
export const approveVehicleDoc   = async (vid, did)    => { await delay(350); return storeApproveVehicleDoc(vid, did) }
export const rejectVehicleDoc    = async (vid, did, r) => { await delay(350); return storeRejectVehicleDoc(vid, did, r) }

export const getMaintenance             = async (vid)        => { await delay(); return storeGetMaintenance(vid) }
export const addMaintenanceRecord       = async (vid, r)     => { await delay(400); return storeAddMaintenanceRecord(vid, r) }
export const updateMaintenanceStatus    = async (vid, s)     => { await delay(350); return storeUpdateMaintenanceStatus(vid, s) }
export const getFleetMaintenance        = async (opts)       => { await delay(); return storeGetFleetMaintenance(opts) }
export const getMaintenanceStats        = async ()           => { await delay(); return storeGetMaintenanceStats() }

export const getVehicleRides   = async (vid) => { await delay(); return storeGetVehicleRides(vid) }
export const getVehicleHistory = async (vid) => { await delay(); return storeGetVehicleHistory(vid) }
