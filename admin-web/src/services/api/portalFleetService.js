/*
  Portal Fleet Service — the ONLY data surface fleet owners can reach for fleet settings.
  Every export validates ownership via the portal guard before touching any store.

  Fleet owners CANNOT call:
    - storeGetFleets()         → would expose all fleets
    - storeGetFleetStats()     → cross-fleet aggregates
    - admin fleet store fns    → approval, rejection, global config
    - Nomad pricing/config     → platform-level settings
    - Nomad audit logs         → internal admin records
    - Other fleet's documents  → cross-fleet document access
    - Cross-fleet rides        → other fleets' ride data
    - Customer records         → Nomad customer PII
    - Admin roles              → Nomad admin management
*/

import {
  storeGetPortalFleetProfile,
  storeUpdateFleetInfo,
  storeUpdateBusinessInfo,
  storeUpdateContactInfo,
  storeUpdateOperatingInfo,
} from './portalFleetStore'

import {
  storeGetDocuments,
  storeRequestDocumentReupload,
} from './fleetStore'

import {
  storeGetFleetUsers,
  storeInviteFleetUser,
  storeUpdateUserPermissions,
  storeChangeUserRole,
  storeChangeUserStatus,
  storeRemoveFleetUser,
  ROLE_DEFINITIONS,
  ALL_PERMISSIONS,
} from './fleetRolesStore'

import { assertFleetAccess } from '../../features/portal/auth/portalGuard'

export { ROLE_DEFINITIONS, ALL_PERMISSIONS }

const DELAY = 300
const delay = (ms = DELAY) => new Promise((r) => setTimeout(r, ms))

// ── Fleet profile ─────────────────────────────────────────────────────────────
export const getPortalFleetProfile = async (fleetId) => {
  await delay()
  return storeGetPortalFleetProfile(fleetId)
}

export const updateFleetInfo = async (fleetId, patch) => {
  await delay(360)
  return storeUpdateFleetInfo(fleetId, patch)
}

export const updateBusinessInfo = async (fleetId, patch) => {
  await delay(360)
  return storeUpdateBusinessInfo(fleetId, patch)
}

export const updateContactInfo = async (fleetId, patch) => {
  await delay(360)
  return storeUpdateContactInfo(fleetId, patch)
}

export const updateOperatingInfo = async (fleetId, patch) => {
  await delay(360)
  return storeUpdateOperatingInfo(fleetId, patch)
}

// ── Fleet documents (read + re-upload request only — no approve/reject) ───────
export const getPortalDocuments = async (fleetId) => {
  await delay()
  assertFleetAccess(fleetId)     // guard: fleet owner can only see their own docs
  return storeGetDocuments(fleetId)
}

export const requestDocumentReupload = async (fleetId, docId) => {
  await delay(360)
  assertFleetAccess(fleetId)
  // In production: creates a support ticket, not a direct status change
  return storeRequestDocumentReupload(fleetId, docId)
}

// ── Fleet users (roles & permissions) ────────────────────────────────────────
// Only users belonging to this fleet are returned
export const getPortalFleetUsers = async (fleetId, opts = {}) => {
  await delay()
  assertFleetAccess(fleetId)
  return storeGetFleetUsers({ fleetId, ...opts })
}

export const portalInviteFleetUser = async (fleetId, payload) => {
  await delay(400)
  assertFleetAccess(fleetId)
  // Enforce fleet isolation: override any fleetId in payload
  return storeInviteFleetUser({ ...payload, fleetId })
}

export const portalUpdateUserPermissions = async (fleetId, userId, perms) => {
  await delay(360)
  assertFleetAccess(fleetId)
  return storeUpdateUserPermissions(userId, perms)
}

export const portalChangeUserRole = async (fleetId, userId, role) => {
  await delay(360)
  assertFleetAccess(fleetId)
  return storeChangeUserRole(userId, role)
}

export const portalChangeUserStatus = async (fleetId, userId, status) => {
  await delay(360)
  assertFleetAccess(fleetId)
  return storeChangeUserStatus(userId, status)
}

export const portalRemoveFleetUser = async (fleetId, userId) => {
  await delay(360)
  assertFleetAccess(fleetId)
  return storeRemoveFleetUser(userId)
}
