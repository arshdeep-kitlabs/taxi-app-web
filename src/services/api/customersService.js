import {
  customers as initialCustomers,
  getRidesForCustomer,
  getSupportTicketsForCustomer,
} from '../mock/customersMock'
import { recordAuditLog } from '../audit/auditLog'

/* Mock customer directory service — same async, mutable-store shape as driversService. */

const MOCK_LATENCY_MS = 350
let customers = initialCustomers

function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

export function getCustomers({ search = '', status = 'all' } = {}) {
  const query = search.trim().toLowerCase()
  const filtered = customers.filter((c) => {
    const matchesStatus = status === 'all' || c.status === status
    const matchesQuery =
      query.length === 0 ||
      c.name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.includes(query)
    return matchesStatus && matchesQuery
  })
  return resolveAfterDelay(filtered)
}

export function getCustomerById(customerId) {
  return resolveAfterDelay(customers.find((c) => c.id === customerId) ?? null)
}

export function getCustomerRides(customerId) {
  return resolveAfterDelay(getRidesForCustomer(customerId))
}

export function getCustomerSupportTickets(customerId) {
  return resolveAfterDelay(getSupportTicketsForCustomer(customerId))
}

export function updateCustomerStatus(customerId, status) {
  const before = customers.find((c) => c.id === customerId)
  customers = customers.map((c) => (c.id === customerId ? { ...c, status } : c))
  if (before && before.status !== status) {
    recordAuditLog({
      action: `Changed customer status to ${status}`,
      entityType: 'Customer',
      entityLabel: before.name,
      before: before.status,
      after: status,
    })
  }
  return resolveAfterDelay(customers.find((c) => c.id === customerId))
}

export function updateCustomerProfile(customerId, patch) {
  const before = customers.find((c) => c.id === customerId)
  customers = customers.map((c) => (c.id === customerId ? { ...c, ...patch } : c))
  if (before) {
    recordAuditLog({
      action: 'Updated customer profile',
      entityType: 'Customer',
      entityLabel: before.name,
      before: 'Contact info',
      after: 'Updated',
    })
  }
  return resolveAfterDelay(customers.find((c) => c.id === customerId))
}
