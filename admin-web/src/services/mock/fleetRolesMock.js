/*
  Mock fleet-level users and role/permission definitions.
  Fleet users belong to exactly one fleet and can only see that fleet's data.
*/

// ── All available permissions ─────────────────────────────────────────────────
export const ALL_PERMISSIONS = [
  { key: 'view_drivers',        label: 'View Drivers' },
  { key: 'manage_drivers',      label: 'Manage Drivers' },
  { key: 'view_vehicles',       label: 'View Vehicles' },
  { key: 'manage_vehicles',     label: 'Manage Vehicles' },
  { key: 'manage_assignments',  label: 'Manage Assignments' },
  { key: 'view_rides',          label: 'View Rides' },
  { key: 'view_financials',     label: 'View Financials' },
  { key: 'manage_documents',    label: 'Manage Documents' },
  { key: 'view_reports',        label: 'View Reports' },
]

// ── Role definitions ──────────────────────────────────────────────────────────
// Business rules:
//   Fleet Owner       → full fleet-level access (all permissions)
//   Fleet Manager     → operational access; no financials
//   Dispatcher        → routing only; no financials, no document management
//   Finance Manager   → financial & document access; no driver/vehicle management
export const ROLE_DEFINITIONS = [
  {
    key: 'fleet_owner',
    label: 'Fleet Owner',
    description: 'Full access to all fleet operations and settings.',
    color: '#5fa77c',   // nomad-sage
    defaultPermissions: [
      'view_drivers', 'manage_drivers',
      'view_vehicles', 'manage_vehicles',
      'manage_assignments', 'view_rides',
      'view_financials', 'manage_documents', 'view_reports',
    ],
  },
  {
    key: 'fleet_manager',
    label: 'Fleet Manager',
    description: 'Operational management of drivers, vehicles, assignments and documents.',
    color: '#3b82f6',   // blue
    defaultPermissions: [
      'view_drivers', 'manage_drivers',
      'view_vehicles', 'manage_vehicles',
      'manage_assignments', 'view_rides',
      'manage_documents', 'view_reports',
    ],
  },
  {
    key: 'dispatcher',
    label: 'Dispatcher',
    description: 'Manages ride assignments and monitors drivers and vehicles.',
    color: '#f59e0b',   // amber
    defaultPermissions: [
      'view_drivers', 'view_vehicles',
      'manage_assignments', 'view_rides',
    ],
  },
  {
    key: 'finance_manager',
    label: 'Finance Manager',
    description: 'Access to financial data, documents and reports only.',
    color: '#8b5cf6',   // violet
    defaultPermissions: [
      'view_rides', 'view_financials',
      'manage_documents', 'view_reports',
    ],
  },
]

// ── Fleet seed data ────────────────────────────────────────────────────────────
const FLEETS = [
  { id: 'FLT-001', name: 'Gulf Rides Co.' },
  { id: 'FLT-002', name: 'Desert Express' },
  { id: 'FLT-003', name: 'Metro Mobility' },
  { id: 'FLT-004', name: 'Coast Cabs Ltd.' },
  { id: 'FLT-005', name: 'Urban Shuttle' },
]

// ── Mock fleet users ──────────────────────────────────────────────────────────
export const MOCK_FLEET_USERS = [
  // FLT-001 — Gulf Rides Co.
  {
    id: 'FU-001', fleetId: 'FLT-001', fleetName: 'Gulf Rides Co.',
    name: 'Ahmed Al-Rashid', email: 'ahmed.rashid@gulfridesCo.ae',
    role: 'fleet_owner',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_owner').defaultPermissions],
    status: 'active', joinedAt: '2025-01-10T08:00:00Z', lastActiveAt: '2026-08-30T14:22:00Z',
  },
  {
    id: 'FU-002', fleetId: 'FLT-001', fleetName: 'Gulf Rides Co.',
    name: 'Sara Hassan', email: 'sara.hassan@gulfridesCo.ae',
    role: 'fleet_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_manager').defaultPermissions],
    status: 'active', joinedAt: '2025-03-15T10:00:00Z', lastActiveAt: '2026-08-29T09:10:00Z',
  },
  {
    id: 'FU-003', fleetId: 'FLT-001', fleetName: 'Gulf Rides Co.',
    name: 'Khalid Nasser', email: 'khalid.n@gulfridesCo.ae',
    role: 'dispatcher',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'dispatcher').defaultPermissions],
    status: 'active', joinedAt: '2025-04-20T11:30:00Z', lastActiveAt: '2026-08-31T07:45:00Z',
  },
  {
    id: 'FU-004', fleetId: 'FLT-001', fleetName: 'Gulf Rides Co.',
    name: 'Lina Khalaf', email: 'lina.k@gulfridesCo.ae',
    role: 'finance_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'finance_manager').defaultPermissions],
    status: 'active', joinedAt: '2025-05-01T09:00:00Z', lastActiveAt: '2026-08-28T16:05:00Z',
  },
  {
    id: 'FU-005', fleetId: 'FLT-001', fleetName: 'Gulf Rides Co.',
    name: 'Omar Jaber', email: 'omar.j@gulfridesCo.ae',
    role: 'dispatcher',
    permissions: ['view_drivers', 'view_vehicles', 'manage_assignments', 'view_rides'],
    status: 'invited', joinedAt: '2026-08-20T12:00:00Z', lastActiveAt: null,
  },

  // FLT-002 — Desert Express
  {
    id: 'FU-006', fleetId: 'FLT-002', fleetName: 'Desert Express',
    name: 'Fatima Al-Marzooqi', email: 'fatima@desertexpress.ae',
    role: 'fleet_owner',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_owner').defaultPermissions],
    status: 'active', joinedAt: '2025-02-01T09:00:00Z', lastActiveAt: '2026-08-30T11:00:00Z',
  },
  {
    id: 'FU-007', fleetId: 'FLT-002', fleetName: 'Desert Express',
    name: 'Rami Shahin', email: 'rami.s@desertexpress.ae',
    role: 'fleet_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_manager').defaultPermissions],
    status: 'active', joinedAt: '2025-06-10T08:30:00Z', lastActiveAt: '2026-08-31T08:00:00Z',
  },
  {
    id: 'FU-008', fleetId: 'FLT-002', fleetName: 'Desert Express',
    name: 'Nadia Aziz', email: 'nadia.aziz@desertexpress.ae',
    role: 'dispatcher',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'dispatcher').defaultPermissions],
    status: 'active', joinedAt: '2025-07-22T10:15:00Z', lastActiveAt: '2026-08-29T15:30:00Z',
  },
  {
    id: 'FU-009', fleetId: 'FLT-002', fleetName: 'Desert Express',
    name: 'Hassan Yousif', email: 'hassan.y@desertexpress.ae',
    role: 'finance_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'finance_manager').defaultPermissions],
    status: 'invited', joinedAt: '2026-08-10T14:00:00Z', lastActiveAt: null,
  },

  // FLT-003 — Metro Mobility
  {
    id: 'FU-010', fleetId: 'FLT-003', fleetName: 'Metro Mobility',
    name: 'Tariq Al-Sayed', email: 'tariq@metromo.ae',
    role: 'fleet_owner',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_owner').defaultPermissions],
    status: 'active', joinedAt: '2025-03-05T07:00:00Z', lastActiveAt: '2026-08-31T06:55:00Z',
  },
  {
    id: 'FU-011', fleetId: 'FLT-003', fleetName: 'Metro Mobility',
    name: 'Dina Samir', email: 'dina.samir@metromo.ae',
    role: 'fleet_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_manager').defaultPermissions],
    status: 'active', joinedAt: '2025-05-18T09:45:00Z', lastActiveAt: '2026-08-28T10:20:00Z',
  },
  {
    id: 'FU-012', fleetId: 'FLT-003', fleetName: 'Metro Mobility',
    name: 'Faris Osman', email: 'faris.o@metromo.ae',
    role: 'dispatcher',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'dispatcher').defaultPermissions],
    status: 'active', joinedAt: '2025-08-02T11:00:00Z', lastActiveAt: '2026-08-30T17:10:00Z',
  },
  {
    id: 'FU-013', fleetId: 'FLT-003', fleetName: 'Metro Mobility',
    name: 'Rima Badawi', email: 'rima.b@metromo.ae',
    role: 'finance_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'finance_manager').defaultPermissions],
    status: 'suspended', joinedAt: '2025-09-14T08:00:00Z', lastActiveAt: '2026-07-15T12:00:00Z',
  },
  {
    id: 'FU-014', fleetId: 'FLT-003', fleetName: 'Metro Mobility',
    name: 'Ziad Haddad', email: 'ziad.h@metromo.ae',
    role: 'dispatcher',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'dispatcher').defaultPermissions],
    status: 'invited', joinedAt: '2026-08-25T10:00:00Z', lastActiveAt: null,
  },

  // FLT-004 — Coast Cabs Ltd.
  {
    id: 'FU-015', fleetId: 'FLT-004', fleetName: 'Coast Cabs Ltd.',
    name: 'Mona Al-Farsi', email: 'mona@coastcabs.ae',
    role: 'fleet_owner',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_owner').defaultPermissions],
    status: 'active', joinedAt: '2025-04-01T08:00:00Z', lastActiveAt: '2026-08-31T09:30:00Z',
  },
  {
    id: 'FU-016', fleetId: 'FLT-004', fleetName: 'Coast Cabs Ltd.',
    name: 'Sami Nour', email: 'sami.nour@coastcabs.ae',
    role: 'dispatcher',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'dispatcher').defaultPermissions],
    status: 'active', joinedAt: '2025-10-12T09:00:00Z', lastActiveAt: '2026-08-30T14:55:00Z',
  },
  {
    id: 'FU-017', fleetId: 'FLT-004', fleetName: 'Coast Cabs Ltd.',
    name: 'Layla Karimi', email: 'layla.k@coastcabs.ae',
    role: 'finance_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'finance_manager').defaultPermissions],
    status: 'active', joinedAt: '2025-11-05T10:30:00Z', lastActiveAt: '2026-08-29T11:40:00Z',
  },
  {
    id: 'FU-018', fleetId: 'FLT-004', fleetName: 'Coast Cabs Ltd.',
    name: 'Mazen Saleh', email: 'mazen.s@coastcabs.ae',
    role: 'fleet_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_manager').defaultPermissions],
    status: 'invited', joinedAt: '2026-08-18T14:00:00Z', lastActiveAt: null,
  },

  // FLT-005 — Urban Shuttle
  {
    id: 'FU-019', fleetId: 'FLT-005', fleetName: 'Urban Shuttle',
    name: 'Jad Mansour', email: 'jad@urbanshuttle.ae',
    role: 'fleet_owner',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_owner').defaultPermissions],
    status: 'active', joinedAt: '2025-05-20T08:00:00Z', lastActiveAt: '2026-08-31T10:15:00Z',
  },
  {
    id: 'FU-020', fleetId: 'FLT-005', fleetName: 'Urban Shuttle',
    name: 'Hana Qasem', email: 'hana.q@urbanshuttle.ae',
    role: 'fleet_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'fleet_manager').defaultPermissions],
    status: 'active', joinedAt: '2025-07-08T09:00:00Z', lastActiveAt: '2026-08-30T13:20:00Z',
  },
  {
    id: 'FU-021', fleetId: 'FLT-005', fleetName: 'Urban Shuttle',
    name: 'Nour El-Deeb', email: 'nour.d@urbanshuttle.ae',
    role: 'dispatcher',
    permissions: ['view_drivers', 'view_vehicles', 'manage_assignments', 'view_rides', 'view_reports'],
    status: 'active', joinedAt: '2025-09-01T11:00:00Z', lastActiveAt: '2026-08-31T07:30:00Z',
  },
  {
    id: 'FU-022', fleetId: 'FLT-005', fleetName: 'Urban Shuttle',
    name: 'Wael Barakat', email: 'wael.b@urbanshuttle.ae',
    role: 'finance_manager',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'finance_manager').defaultPermissions],
    status: 'active', joinedAt: '2025-10-20T10:00:00Z', lastActiveAt: '2026-08-28T15:00:00Z',
  },
  {
    id: 'FU-023', fleetId: 'FLT-005', fleetName: 'Urban Shuttle',
    name: 'Aya Salman', email: 'aya.s@urbanshuttle.ae',
    role: 'dispatcher',
    permissions: [...ROLE_DEFINITIONS.find(r => r.key === 'dispatcher').defaultPermissions],
    status: 'invited', joinedAt: '2026-08-28T09:00:00Z', lastActiveAt: null,
  },
]
