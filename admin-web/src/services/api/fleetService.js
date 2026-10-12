import {
  storeGetFleets,
  storeGetPendingFleets,
  storeGetFleetById,
  storeGetFleetStats,
  storeCreateFleet,
  storeApproveFleet,
  storeRejectFleet,
  storeGetDocuments,
  storeApproveDocument,
  storeRejectDocument,
  storeRequestDocumentReupload,
  storeGetAllDocuments,
  storeGetDocumentStats,
  storeGetHistory,
} from './fleetStore'
import {
  MOCK_FLEET_DRIVERS,
  MOCK_FLEET_VEHICLES,
  MOCK_FLEET_ASSIGNMENTS,
  MOCK_FLEET_RECENT_RIDES,
} from '../mock/fleetMock'

const DELAY = 280

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getFleetStats() {
  await delay(DELAY)
  return storeGetFleetStats()
}

export async function getFleets(opts) {
  await delay(DELAY)
  return storeGetFleets(opts)
}

export async function getPendingFleets() {
  await delay(DELAY)
  return storeGetPendingFleets()
}

export async function getFleetById(id) {
  await delay(DELAY)
  return storeGetFleetById(id)
}

export async function createFleet(formData) {
  await delay(400)
  return storeCreateFleet(formData)
}

export async function approveFleet(id) {
  await delay(400)
  return storeApproveFleet(id)
}

export async function rejectFleet(id, reason) {
  await delay(400)
  return storeRejectFleet(id, reason)
}

export async function getFleetDocuments(fleetId) {
  await delay(DELAY)
  return storeGetDocuments(fleetId)
}

export async function approveDocument(fleetId, docId) {
  await delay(350)
  return storeApproveDocument(fleetId, docId)
}

export async function rejectDocument(fleetId, docId, reason) {
  await delay(350)
  return storeRejectDocument(fleetId, docId, reason)
}

export async function requestDocumentReupload(fleetId, docId) {
  await delay(300)
  return storeRequestDocumentReupload(fleetId, docId)
}

export async function getAllDocuments(opts) {
  await delay(DELAY)
  return storeGetAllDocuments(opts)
}

export async function getDocumentStats() {
  await delay(DELAY)
  return storeGetDocumentStats()
}

export async function getApplicationHistory(fleetId) {
  await delay(DELAY)
  return storeGetHistory(fleetId)
}

export async function getFleetDrivers(fleetId) {
  await delay(DELAY)
  return MOCK_FLEET_DRIVERS[fleetId] ?? []
}

export async function getFleetVehicles(fleetId) {
  await delay(DELAY)
  return MOCK_FLEET_VEHICLES[fleetId] ?? []
}

export async function getFleetAssignments(fleetId) {
  await delay(DELAY)
  return MOCK_FLEET_ASSIGNMENTS[fleetId] ?? []
}

export async function getFleetRecentRides(fleetId) {
  await delay(DELAY)
  return MOCK_FLEET_RECENT_RIDES[fleetId] ?? []
}
