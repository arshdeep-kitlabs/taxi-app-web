import {
  storeGetFleetRides,
  storeGetFleetPerformance,
  storeGetAllFleetSummaries,
  storeGetRideStats,
} from './fleetRidesStore'

const DELAY = 280
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export async function getFleetRides(opts) {
  await delay(DELAY)
  return storeGetFleetRides(opts)
}

export async function getFleetPerformance(fleetId) {
  await delay(DELAY)
  return storeGetFleetPerformance(fleetId)
}

export async function getAllFleetSummaries() {
  await delay(DELAY)
  return storeGetAllFleetSummaries()
}

export async function getRideStats(fleetId) {
  await delay(DELAY)
  return storeGetRideStats(fleetId)
}
