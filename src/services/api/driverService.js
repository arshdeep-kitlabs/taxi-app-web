import {
  storeGetDrivers, storeGetDriverStats, storeGetDriverById,
  storeCreateDriver, storeUpdateDriverStatus,
  storeApproveDriver, storeRejectDriver,
  storeGetDriverDocs, storeApproveDriverDoc, storeRejectDriverDoc,
  storeGetDriverRides, storeGetDriverHistory,
} from './driverStore'

const D = 300
const delay = (ms = D) => new Promise((r) => setTimeout(r, ms))

export const getDrivers      = async (opts)      => { await delay(); return storeGetDrivers(opts) }
export const getDriverStats  = async ()          => { await delay(); return storeGetDriverStats() }
export const getDriverById   = async (id)        => { await delay(); return storeGetDriverById(id) }
export const createDriver    = async (form)      => { await delay(400); return storeCreateDriver(form) }
export const updateDriverStatus = async (id, s)  => { await delay(350); return storeUpdateDriverStatus(id, s) }
export const approveDriver   = async (id)        => { await delay(350); return storeApproveDriver(id) }
export const rejectDriver    = async (id, r)     => { await delay(350); return storeRejectDriver(id, r) }

export const getDriverDocs     = async (did)        => { await delay(); return storeGetDriverDocs(did) }
export const approveDriverDoc  = async (did, docId) => { await delay(350); return storeApproveDriverDoc(did, docId) }
export const rejectDriverDoc   = async (did, docId, reason) => { await delay(350); return storeRejectDriverDoc(did, docId, reason) }

export const getDriverRides   = async (did) => { await delay(); return storeGetDriverRides(did) }
export const getDriverHistory = async (did) => { await delay(); return storeGetDriverHistory(did) }
