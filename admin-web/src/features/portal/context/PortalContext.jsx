/*
  PortalContext — provides the fixed fleet identity for the entire portal.
  In production this comes from JWT / auth session.
  For the demo we use FLT-001 (Gulf Rides Co. / Ahmed Al-Rashid).
*/
import { createContext, useContext, useEffect, useState } from 'react'
import { getFleetById } from '../../../services/api/fleetService'

export const PORTAL_FLEET_ID = 'FLT-001'

export const PORTAL_USER = {
  id:    'FU-001',
  name:  'Ahmed Al-Rashid',
  email: 'ahmed.rashid@gulfridesCo.ae',
  role:  'fleet_owner',
  initials: 'AR',
}

const PortalContext = createContext(null)

export function PortalProvider({ children }) {
  const [fleet, setFleet] = useState(null)

  useEffect(() => {
    getFleetById(PORTAL_FLEET_ID).then(setFleet).catch(() => {})
  }, [])

  return (
    <PortalContext.Provider value={{ fleet, user: PORTAL_USER, fleetId: PORTAL_FLEET_ID }}>
      {children}
    </PortalContext.Provider>
  )
}

export function usePortal() {
  return useContext(PortalContext)
}
