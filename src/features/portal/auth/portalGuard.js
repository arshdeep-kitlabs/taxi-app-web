/*
  Portal Authorization Guard
  ──────────────────────────
  Enforces data isolation at the SERVICE layer — not just in the UI.
  Every portal data operation calls assertFleetAccess() before touching any store.

  In production:
    - Replace PORTAL_FLEET_ID constant with the JWT claim (e.g. jwt.fleetId).
    - assertFleetAccess() would decode the session token and compare against
      the requested resource's fleetId — the UI never has a way to bypass this.
    - All portal service exports are the ONLY data surface fleet owners can reach;
      they never call admin store functions directly.

  What this guard blocks:
    ✗  Viewing other fleets' data
    ✗  Viewing Nomad customers
    ✗  Viewing other fleet drivers / independent drivers
    ✗  Viewing other fleet rides
    ✗  Viewing Nomad platform revenue
    ✗  Changing Nomad global pricing or platform configuration
    ✗  Managing Nomad admins
    ✗  Viewing global / cross-fleet reports
    ✗  Accessing Nomad Audit Logs
    ✗  Accessing Nomad internal settings
*/

import { PORTAL_FLEET_ID } from '../context/PortalContext'

export class FleetAccessDenied extends Error {
  constructor(msg = 'Access denied: you can only access your own fleet data.') {
    super(msg)
    this.name  = 'FleetAccessDenied'
    this.code  = 'FLEET_ACCESS_DENIED'
    this.status = 403
  }
}

/**
 * Asserts that the requesting fleet may access the target fleet's resource.
 * Throws FleetAccessDenied if fleetId doesn't match the portal session.
 *
 * @param {string} targetFleetId  — the fleetId of the resource being accessed
 * @param {string} [requestingFleetId] — defaults to the portal session's fleet
 */
export function assertFleetAccess(targetFleetId, requestingFleetId = PORTAL_FLEET_ID) {
  if (!targetFleetId) throw new FleetAccessDenied('Target fleet not specified.')
  if (targetFleetId !== requestingFleetId) {
    // In production: log this attempt to the security audit trail
    throw new FleetAccessDenied(
      `Access denied: fleet "${requestingFleetId}" cannot access data belonging to fleet "${targetFleetId}".`
    )
  }
}

/**
 * Asserts the portal session itself. Throws if session is invalid (no fleetId).
 * In production this would verify the JWT signature + expiry.
 */
export function assertPortalSession() {
  if (!PORTAL_FLEET_ID) {
    throw new FleetAccessDenied('No active portal session. Please sign in.')
  }
}

/**
 * Wraps a store function with ownership enforcement.
 * The wrapped fn receives the validated fleetId as its first argument.
 */
export function withFleetGuard(fn) {
  return function guardedFn(fleetId, ...args) {
    assertPortalSession()
    assertFleetAccess(fleetId)
    return fn(fleetId, ...args)
  }
}
