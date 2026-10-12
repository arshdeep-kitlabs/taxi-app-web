/*
  In-memory audit trail. Every sensitive mutation across the app (driver/
  customer status changes, application decisions, pricing/promotion edits,
  ticket resolution, configuration changes) calls `recordAuditLog` from
  right where the mutation happens, so the log reflects real actions taken
  during the session — not decorative seed data alone.
*/

const now = Date.now()
const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString()
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString()

let seq = 6
let entries = [
  {
    id: 'AL-6', timestamp: hoursAgo(1), actor: 'Priya Nair', action: 'Resolved support ticket',
    entityType: 'Support Ticket', entityLabel: 'TK-3021', before: 'open', after: 'resolved',
  },
  {
    id: 'AL-5', timestamp: hoursAgo(4), actor: 'Marcus Odom', action: 'Suspended driver account',
    entityType: 'Driver', entityLabel: 'Elena Cruz', before: 'active', after: 'suspended',
  },
  {
    id: 'AL-4', timestamp: hoursAgo(9), actor: 'Vipin Kumar', action: 'Updated fare structure',
    entityType: 'Pricing', entityLabel: 'Fare Structure', before: 'Base fare $3.25', after: 'Base fare $3.50',
  },
  {
    id: 'AL-3', timestamp: daysAgo(1), actor: 'Priya Nair', action: 'Approved driver application',
    entityType: 'Application', entityLabel: 'DA-10432', before: 'pending_review', after: 'approved',
  },
  {
    id: 'AL-2', timestamp: daysAgo(2), actor: 'Vipin Kumar', action: 'Created promo code',
    entityType: 'Promotion', entityLabel: 'WELCOME25', before: null, after: '25% for new customers',
  },
  {
    id: 'AL-1', timestamp: daysAgo(3), actor: 'Marcus Odom', action: 'Blocked customer account',
    entityType: 'Customer', entityLabel: 'Diego Alvarez', before: 'active', after: 'blocked',
  },
]

export function recordAuditLog({ actor = 'Vipin Kumar', action, entityType, entityLabel, before = null, after = null }) {
  seq += 1
  entries = [
    { id: `AL-${seq}`, timestamp: new Date().toISOString(), actor, action, entityType, entityLabel, before, after },
    ...entries,
  ]
}

export function getAuditLogEntries() {
  return entries
}
