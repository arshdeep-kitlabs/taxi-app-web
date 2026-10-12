/*
  Platform financial configuration.
  All commission calculations across the dashboard reference these rates —
  never hard-code percentages in UI components.
*/

export const NOMAD_COMMISSION_RATE = 0.20   // 20% of fare goes to Nomad
export const FLEET_SHARE_RATE      = 0.10   // 10% of fare goes to the fleet operator

// Derived splits
export const DRIVER_FLEET_SHARE    = 1 - NOMAD_COMMISSION_RATE - FLEET_SHARE_RATE  // 0.70 for fleet drivers
export const DRIVER_INDEP_SHARE    = 1 - NOMAD_COMMISSION_RATE                     // 0.80 for independent drivers

/** Compute the full financial breakdown for a single fare. */
export function breakdownFare(fare, isFleetDriver = true) {
  const nomadCut   = Math.round(fare * NOMAD_COMMISSION_RATE)
  const fleetCut   = isFleetDriver ? Math.round(fare * FLEET_SHARE_RATE) : 0
  const driverNet  = fare - nomadCut - fleetCut
  return { fare, nomadCut, fleetCut, driverNet }
}
