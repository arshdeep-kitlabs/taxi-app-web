import { fareStructure as initialFareStructure, surgeRules as initialSurgeRules } from '../mock/pricingMock'
import { recordAuditLog } from '../audit/auditLog'

const MOCK_LATENCY_MS = 350
let fareStructure = initialFareStructure
let surgeRules = initialSurgeRules

function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

export function getFareStructure() {
  return resolveAfterDelay(fareStructure)
}

export function updateFareStructure(patch) {
  const before = fareStructure
  fareStructure = { ...fareStructure, ...patch }
  recordAuditLog({
    action: 'Updated fare structure',
    entityType: 'Pricing',
    entityLabel: 'Fare Structure',
    before: `Base fare $${before.baseFare.toFixed(2)}`,
    after: `Base fare $${fareStructure.baseFare.toFixed(2)}`,
  })
  return resolveAfterDelay(fareStructure)
}

export function getSurgeRules() {
  return resolveAfterDelay(surgeRules)
}

function describeSurgeRule(rule) {
  return `${rule.zone} · ${rule.condition} · ${rule.multiplier.toFixed(1)}x`
}

export function updateSurgeRule(ruleId, patch) {
  const before = surgeRules.find((r) => r.id === ruleId)
  surgeRules = surgeRules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r))
  const after = surgeRules.find((r) => r.id === ruleId)
  if (before) {
    recordAuditLog({
      action: 'Updated surge rule',
      entityType: 'Pricing',
      entityLabel: `${before.zone} surge rule`,
      before: describeSurgeRule(before),
      after: describeSurgeRule(after),
    })
  }
  return resolveAfterDelay(surgeRules)
}

export function setSurgeRuleActive(ruleId, active) {
  const rule = surgeRules.find((r) => r.id === ruleId)
  surgeRules = surgeRules.map((r) => (r.id === ruleId ? { ...r, active } : r))
  if (rule) {
    recordAuditLog({
      action: `${active ? 'Activated' : 'Deactivated'} surge rule`,
      entityType: 'Pricing',
      entityLabel: `${rule.zone} surge rule`,
      before: rule.active,
      after: active,
    })
  }
  return resolveAfterDelay(surgeRules)
}
