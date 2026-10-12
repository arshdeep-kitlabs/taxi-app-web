/*
  Static mock fixtures for the dashboard overview.
  This is the only file that should need to change when wiring up a real
  backend — the shapes here define the contract `services/api` promises to
  return.
*/

const now = Date.now()
const minutesAgo = (mins) => new Date(now - mins * 60_000).toISOString()
const hoursAgo = (hrs) => new Date(now - hrs * 3_600_000).toISOString()

export const dashboardStats = {
  activeRides: { value: 182, deltaLabel: '+12 vs. last hour', trend: 'up' },
  availableDrivers: { value: 964, deltaLabel: '+3.1% vs. yesterday', trend: 'up' },
  completedRidesToday: { value: 5482, deltaLabel: '+8.4% vs. yesterday', trend: 'up' },
  cancelledRidesToday: { value: 214, deltaLabel: '-1.2% vs. yesterday', trend: 'down' },
  revenueToday: { value: 68420, deltaLabel: '+5.6% vs. yesterday', trend: 'up' },
}

export const operationalAlerts = [
  {
    id: 'ALT-1',
    severity: 'critical',
    title: 'Driver supply shortage',
    message: 'Downtown Metro zone has fallen below the minimum available-driver threshold.',
    timestamp: minutesAgo(6),
  },
  {
    id: 'ALT-2',
    severity: 'warning',
    title: 'Elevated cancellation rate',
    message: 'Riverside zone cancellations are 18% above the 7-day average.',
    timestamp: minutesAgo(24),
  },
  {
    id: 'ALT-3',
    severity: 'warning',
    title: 'Payment gateway latency',
    message: 'Card processor response times are degraded; monitoring for failed charges.',
    timestamp: hoursAgo(1),
  },
  {
    id: 'ALT-4',
    severity: 'info',
    title: 'Surge pricing active',
    message: 'Surge multiplier of 1.6x is currently active in the Airport zone.',
    timestamp: hoursAgo(2),
  },
]

export const recentActivity = [
  {
    id: 'ACT-1',
    actor: 'System',
    action: 'flagged a ride for fare dispute',
    entityLabel: 'Ride #RD-88213',
    timestamp: minutesAgo(3),
  },
  {
    id: 'ACT-2',
    actor: 'Priya Nair',
    action: 'approved a driver application',
    entityLabel: 'Application DA-10432',
    timestamp: minutesAgo(19),
  },
  {
    id: 'ACT-3',
    actor: 'System',
    action: 'processed a refund',
    entityLabel: 'Payment #PM-55210',
    timestamp: minutesAgo(31),
  },
  {
    id: 'ACT-4',
    actor: 'Marcus Odom',
    action: 'suspended a driver account',
    entityLabel: 'Driver Elena Cruz',
    timestamp: hoursAgo(1),
  },
  {
    id: 'ACT-5',
    actor: 'Priya Nair',
    action: 'resolved a support ticket',
    entityLabel: 'Ticket #TK-3021',
    timestamp: hoursAgo(2),
  },
  {
    id: 'ACT-6',
    actor: 'System',
    action: 'created a new promo code',
    entityLabel: 'Promo WELCOME25',
    timestamp: hoursAgo(4),
  },
]

