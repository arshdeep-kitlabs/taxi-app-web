import { rides } from '../mock/ridesMock'

/* Mock rides service — read-only monitoring, same async shape as other services. */

const MOCK_LATENCY_MS = 350
function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

export function getRides({ search = '', status = 'all', paymentStatus = 'all' } = {}) {
  const query = search.trim().toLowerCase()
  const filtered = rides
    .filter((r) => status === 'all' || r.status === status)
    .filter((r) => paymentStatus === 'all' || r.paymentStatus === paymentStatus)
    .filter(
      (r) =>
        query.length === 0 ||
        r.id.toLowerCase().includes(query) ||
        r.customerName.toLowerCase().includes(query) ||
        (r.driverName ?? '').toLowerCase().includes(query),
    )
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
  return resolveAfterDelay(filtered)
}

export function getRideById(rideId) {
  return resolveAfterDelay(rides.find((r) => r.id === rideId) ?? null)
}
