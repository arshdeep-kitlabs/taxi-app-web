import { getAuditLogEntries } from '../audit/auditLog'

const MOCK_LATENCY_MS = 300
function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

export function getAuditLogs({ search = '', entityType = 'all', actor = 'all' } = {}) {
  const query = search.trim().toLowerCase()
  const filtered = getAuditLogEntries()
    .filter((e) => entityType === 'all' || e.entityType === entityType)
    .filter((e) => actor === 'all' || e.actor === actor)
    .filter(
      (e) =>
        query.length === 0 ||
        e.action.toLowerCase().includes(query) ||
        e.entityLabel.toLowerCase().includes(query) ||
        e.actor.toLowerCase().includes(query),
    )
  return resolveAfterDelay(filtered)
}

export function getAuditLogFilterOptions() {
  const entries = getAuditLogEntries()
  return resolveAfterDelay({
    entityTypes: [...new Set(entries.map((e) => e.entityType))].sort(),
    actors: [...new Set(entries.map((e) => e.actor))].sort(),
  })
}
