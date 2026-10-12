/*
  Portal Fleet Settings Store
  ───────────────────────────
  All write operations validate fleet ownership via assertFleetAccess()
  BEFORE touching any data. This is the enforcement layer — UI hiding is
  supplementary only.

  In production: replace the in-memory _profiles map with
  authenticated API calls (e.g. PATCH /portal/fleet/:id).
  Row-level security on the database ensures no fleet can modify another's row,
  even if the fleetId in the URL is spoofed.
*/

import { MOCK_FLEET_PROFILES } from '../mock/portalSettingsMock'
import { assertFleetAccess, assertPortalSession } from '../../features/portal/auth/portalGuard'

// Deep-clone on module load — writes never touch the original mock
let _profiles = Object.fromEntries(
  Object.entries(MOCK_FLEET_PROFILES).map(([k, v]) => [
    k,
    { ...v, serviceAreas: [...v.serviceAreas], operatingDays: [...v.operatingDays], vehicleTypesOffered: [...v.vehicleTypesOffered], specialServices: [...(v.specialServices ?? [])] },
  ])
)

// ── Get full fleet profile (ownership validated) ──────────────────────────────
export function storeGetPortalFleetProfile(fleetId) {
  assertPortalSession()
  assertFleetAccess(fleetId)
  const profile = _profiles[fleetId]
  if (!profile) throw new Error(`Fleet profile not found: ${fleetId}`)
  // Deep copy — never expose a mutable reference
  return {
    ...profile,
    serviceAreas:        [...(profile.serviceAreas ?? [])],
    operatingDays:       [...(profile.operatingDays ?? [])],
    vehicleTypesOffered: [...(profile.vehicleTypesOffered ?? [])],
    specialServices:     [...(profile.specialServices ?? [])],
  }
}

// ── Update fleet information ──────────────────────────────────────────────────
// Allowed fields: name, fleetType, city, country
// NOT allowed: status, id, createdAt (admin-controlled)
export function storeUpdateFleetInfo(fleetId, patch) {
  assertFleetAccess(fleetId)
  const profile = _profiles[fleetId]
  if (!profile) throw new Error('Fleet not found')

  const ALLOWED = ['name', 'fleetType', 'city', 'country']
  const sanitized = {}
  for (const key of ALLOWED) {
    if (patch[key] !== undefined) sanitized[key] = patch[key]
  }

  Object.assign(profile, sanitized)
  return { ...storeGetPortalFleetProfile(fleetId), audit: _audit('Fleet information updated', fleetId) }
}

// ── Update business information ───────────────────────────────────────────────
// NOT allowed: businessRegNo changes (requires admin re-verification)
export function storeUpdateBusinessInfo(fleetId, patch) {
  assertFleetAccess(fleetId)
  const profile = _profiles[fleetId]
  if (!profile) throw new Error('Fleet not found')

  const ALLOWED = ['businessName', 'taxRegistrationNo', 'vatRegistered', 'businessAddress', 'businessCity', 'businessCountry', 'businessPostalCode']
  const sanitized = {}
  for (const key of ALLOWED) {
    if (patch[key] !== undefined) sanitized[key] = patch[key]
  }

  Object.assign(profile, sanitized)
  return { ...storeGetPortalFleetProfile(fleetId), audit: _audit('Business information updated', fleetId) }
}

// ── Update contact information ────────────────────────────────────────────────
export function storeUpdateContactInfo(fleetId, patch) {
  assertFleetAccess(fleetId)
  const profile = _profiles[fleetId]
  if (!profile) throw new Error('Fleet not found')

  const ALLOWED = [
    'primaryContactName', 'primaryContactEmail', 'primaryContactPhone', 'primaryContactTitle',
    'secondaryContactName', 'secondaryContactEmail', 'secondaryContactPhone', 'secondaryContactTitle',
    'emergencyContactName', 'emergencyContactPhone',
  ]
  const sanitized = {}
  for (const key of ALLOWED) {
    if (patch[key] !== undefined) sanitized[key] = patch[key]
  }

  Object.assign(profile, sanitized)
  return { ...storeGetPortalFleetProfile(fleetId), audit: _audit('Contact information updated', fleetId) }
}

// ── Update operating information ──────────────────────────────────────────────
export function storeUpdateOperatingInfo(fleetId, patch) {
  assertFleetAccess(fleetId)
  const profile = _profiles[fleetId]
  if (!profile) throw new Error('Fleet not found')

  const ALLOWED = [
    'operatingHoursFrom', 'operatingHoursTo', 'operatingDays',
    'serviceAreas', 'vehicleTypesOffered', 'maxVehicleCapacity',
    'maxDriverCapacity', 'specialServices', 'notes',
  ]
  for (const key of ALLOWED) {
    if (patch[key] !== undefined) {
      profile[key] = Array.isArray(patch[key]) ? [...patch[key]] : patch[key]
    }
  }

  return { ...storeGetPortalFleetProfile(fleetId), audit: _audit('Operating information updated', fleetId) }
}

// ── Audit entry helper ────────────────────────────────────────────────────────
function _audit(action, fleetId) {
  return {
    action,
    fleetId,
    actor: 'Fleet Owner (Portal)',
    timestamp: new Date().toISOString(),
    note: 'Recorded in Nomad Audit Log',
  }
}
