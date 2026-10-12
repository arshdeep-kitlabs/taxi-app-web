import { getRides } from './ridesService'
import { getDrivers } from './driversService'
import { getCustomers } from './customersService'
import { getTransactions, getPaymentSummary } from './paymentsService'
import { getTickets } from './supportService'

/*
  Reports are read-only aggregations over data already served by the other
  modules — no separate mock/store needed, just group-by math on top of the
  existing services.
*/

function groupBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

export async function getRidesReport() {
  const rides = await getRides({})
  const byCity = [...groupBy(rides, (r) => r.city).entries()].map(([city, group]) => ({
    city,
    total: group.length,
    completed: group.filter((r) => r.status === 'completed').length,
    cancelled: group.filter((r) => r.status === 'cancelled').length,
  }))
  return {
    total: rides.length,
    completed: rides.filter((r) => r.status === 'completed').length,
    ongoing: rides.filter((r) => r.status === 'ongoing' || r.status === 'requested').length,
    cancelled: rides.filter((r) => r.status === 'cancelled').length,
    byCity,
  }
}

export async function getRevenueReport() {
  const rides = await getRides({})
  const completed = rides.filter((r) => r.status === 'completed' && r.fare)
  const totalRevenue = completed.reduce((sum, r) => sum + r.fare, 0)
  const byCity = [...groupBy(completed, (r) => r.city).entries()].map(([city, group]) => ({
    city,
    rides: group.length,
    revenue: group.reduce((sum, r) => sum + r.fare, 0),
  }))
  return {
    totalRevenue,
    completedRides: completed.length,
    averageFare: completed.length ? totalRevenue / completed.length : 0,
    byCity,
  }
}

export async function getCancellationsReport() {
  const rides = await getRides({})
  const cancelled = rides.filter((r) => r.status === 'cancelled')
  const byActor = [...groupBy(cancelled, (r) => r.cancelledBy ?? 'unknown').entries()].map(([actor, group]) => ({
    actor,
    count: group.length,
  }))
  return {
    total: cancelled.length,
    rate: rides.length ? cancelled.length / rides.length : 0,
    byActor,
    rides: cancelled,
  }
}

export async function getDriverPerformanceReport() {
  const drivers = await getDrivers({})
  return [...drivers].sort((a, b) => b.completedRides - a.completedRides)
}

export async function getCustomerActivityReport() {
  const customers = await getCustomers({})
  return [...customers].sort((a, b) => b.totalRides - a.totalRides)
}

export async function getSupportReport() {
  const tickets = await getTickets({})
  const resolved = tickets.filter((t) => t.status === 'resolved' && t.resolution)
  const avgResolutionHours = resolved.length
    ? resolved.reduce((sum, t) => sum + (new Date(t.resolution.resolvedAt) - new Date(t.createdAt)), 0) /
      resolved.length /
      3_600_000
    : 0

  const byAssignee = [...groupBy(tickets, (t) => t.assignedTo ?? 'Unassigned').entries()].map(([assignee, group]) => ({
    assignee,
    total: group.length,
    open: group.filter((t) => t.status === 'open').length,
    inProgress: group.filter((t) => t.status === 'in_progress').length,
    resolved: group.filter((t) => t.status === 'resolved').length,
  }))

  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: resolved.length,
    avgResolutionHours,
    byAssignee,
  }
}

export async function getPaymentSummaryReport() {
  const [summary, transactions] = await Promise.all([getPaymentSummary(), getTransactions({})])
  const byType = [...groupBy(transactions, (t) => t.type).entries()].map(([type, group]) => ({
    type,
    count: group.length,
    total: group.reduce((sum, t) => sum + t.amount, 0),
  }))
  return { summary, byType }
}
