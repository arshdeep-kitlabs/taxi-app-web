import {
  storeGetRolesStats,
  storeGetRoleSummaries,
  storeGetFleetUsers,
  storeGetFleetUser,
  storeUpdateUserPermissions,
  storeChangeUserRole,
  storeChangeUserStatus,
  storeInviteFleetUser,
  storeRemoveFleetUser,
  ROLE_DEFINITIONS,
  ALL_PERMISSIONS,
} from './fleetRolesStore'

export { ROLE_DEFINITIONS, ALL_PERMISSIONS }

const DELAY = 280
const delay = (ms = DELAY) => new Promise((r) => setTimeout(r, ms))

export const getRolesStats           = async ()                       => { await delay();       return storeGetRolesStats() }
export const getRoleSummaries        = async ()                       => { await delay();       return storeGetRoleSummaries() }
export const getFleetUsers           = async (opts)                   => { await delay();       return storeGetFleetUsers(opts) }
export const getFleetUser            = async (userId)                 => { await delay();       return storeGetFleetUser(userId) }
export const updateUserPermissions   = async (userId, perms)          => { await delay(350);   return storeUpdateUserPermissions(userId, perms) }
export const changeUserRole          = async (userId, role)           => { await delay(350);   return storeChangeUserRole(userId, role) }
export const changeUserStatus        = async (userId, status)         => { await delay(350);   return storeChangeUserStatus(userId, status) }
export const inviteFleetUser         = async (payload)                => { await delay(400);   return storeInviteFleetUser(payload) }
export const removeFleetUser         = async (userId)                 => { await delay(350);   return storeRemoveFleetUser(userId) }
