/*
  Fleet Roles & Permissions in-memory store.
  Fleet users can access only their own fleet's data.
  Permission changes are recorded in the audit log.
*/

import { MOCK_FLEET_USERS, ROLE_DEFINITIONS, ALL_PERMISSIONS } from '../mock/fleetRolesMock'

// Deep clone on module load so mutations don't touch the original mock
let _users = MOCK_FLEET_USERS.map((u) => ({ ...u, permissions: [...u.permissions] }))
let _nextId = 24   // next FU-### counter

// ── Re-exports for page use ───────────────────────────────────────────────────
export { ROLE_DEFINITIONS, ALL_PERMISSIONS }

// ── Stats ─────────────────────────────────────────────────────────────────────
export function storeGetRolesStats() {
  const total     = _users.length
  const active    = _users.filter((u) => u.status === 'active').length
  const invited   = _users.filter((u) => u.status === 'invited').length
  const suspended = _users.filter((u) => u.status === 'suspended').length

  // role breakdown
  const roleCount = {}
  for (const r of ROLE_DEFINITIONS) roleCount[r.key] = 0
  for (const u of _users) { if (u.status !== 'suspended') roleCount[u.role] = (roleCount[u.role] ?? 0) + 1 }

  return { total, active, invited, suspended, roleCount }
}

// ── Role summary cards (user count per role) ──────────────────────────────────
export function storeGetRoleSummaries() {
  return ROLE_DEFINITIONS.map((rd) => ({
    ...rd,
    userCount: _users.filter((u) => u.role === rd.key && u.status !== 'suspended').length,
  }))
}

// ── List users ────────────────────────────────────────────────────────────────
export function storeGetFleetUsers({
  fleetId = 'all',
  role    = 'all',
  status  = 'all',
  search  = '',
} = {}) {
  let list = [..._users]
  if (fleetId !== 'all') list = list.filter((u) => u.fleetId === fleetId)
  if (role    !== 'all') list = list.filter((u) => u.role    === role)
  if (status  !== 'all') list = list.filter((u) => u.status  === status)
  if (search) {
    const q = search.toLowerCase()
    list = list.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.fleetName.toLowerCase().includes(q)
    )
  }
  return list.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
}

// ── Get single user ───────────────────────────────────────────────────────────
export function storeGetFleetUser(userId) {
  return _users.find((u) => u.id === userId) ?? null
}

// ── Update user permissions ───────────────────────────────────────────────────
export function storeUpdateUserPermissions(userId, permissions, admin = 'Admin') {
  const u = _users.find((u) => u.id === userId)
  if (!u) throw new Error('User not found')
  const prev = [...u.permissions]
  u.permissions = [...permissions]
  return {
    ...u,
    audit: {
      action: `Permissions updated for ${u.name} (${u.email})`,
      details: { prev, next: permissions },
      admin,
      timestamp: new Date().toISOString(),
    },
  }
}

// ── Change user role ──────────────────────────────────────────────────────────
export function storeChangeUserRole(userId, newRole, admin = 'Admin') {
  const u   = _users.find((u) => u.id === userId)
  if (!u) throw new Error('User not found')
  const rd  = ROLE_DEFINITIONS.find((r) => r.key === newRole)
  if (!rd)  throw new Error('Role not found')
  const prevRole = u.role
  u.role        = newRole
  u.permissions = [...rd.defaultPermissions]  // reset to role defaults
  return {
    ...u,
    audit: {
      action: `Role changed for ${u.name}: ${prevRole} → ${newRole}`,
      admin,
      timestamp: new Date().toISOString(),
    },
  }
}

// ── Change user status ────────────────────────────────────────────────────────
export function storeChangeUserStatus(userId, newStatus, admin = 'Admin') {
  const u = _users.find((u) => u.id === userId)
  if (!u) throw new Error('User not found')
  const prev = u.status
  u.status   = newStatus
  return {
    ...u,
    audit: {
      action: `User status changed for ${u.name}: ${prev} → ${newStatus}`,
      admin,
      timestamp: new Date().toISOString(),
    },
  }
}

// ── Invite new fleet user ─────────────────────────────────────────────────────
export function storeInviteFleetUser({ fleetId, fleetName, name, email, role, permissions }, admin = 'Admin') {
  const id = `FU-${String(_nextId++).padStart(3, '0')}`
  const rd = ROLE_DEFINITIONS.find((r) => r.key === role)
  const user = {
    id,
    fleetId,
    fleetName,
    name,
    email,
    role,
    permissions: permissions ?? [...(rd?.defaultPermissions ?? [])],
    status: 'invited',
    joinedAt: new Date().toISOString(),
    lastActiveAt: null,
  }
  _users.unshift(user)
  return {
    ...user,
    audit: {
      action: `Fleet user invited: ${name} (${email}) as ${rd?.label ?? role} to ${fleetName}`,
      admin,
      timestamp: new Date().toISOString(),
    },
  }
}

// ── Remove fleet user ─────────────────────────────────────────────────────────
export function storeRemoveFleetUser(userId, admin = 'Admin') {
  const u = _users.find((u) => u.id === userId)
  if (!u) throw new Error('User not found')
  _users = _users.filter((u) => u.id !== userId)
  return {
    audit: {
      action: `Fleet user removed: ${u.name} (${u.email}) from ${u.fleetName}`,
      admin,
      timestamp: new Date().toISOString(),
    },
  }
}
