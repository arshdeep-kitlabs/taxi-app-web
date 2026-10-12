import { dashboardStats, operationalAlerts, recentActivity } from '../mock/dashboardMock'

// Simulated network latency so loading states are exercised during
// development. Remove once these call through `apiClient` to a real backend.
const MOCK_LATENCY_MS = 450

function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

/** @returns {Promise<typeof dashboardStats>} */
export function getDashboardStats() {
  return resolveAfterDelay(dashboardStats)
}

/** @returns {Promise<typeof operationalAlerts>} */
export function getOperationalAlerts() {
  return resolveAfterDelay(operationalAlerts)
}

/** @returns {Promise<typeof recentActivity>} */
export function getRecentActivity() {
  return resolveAfterDelay(recentActivity)
}
