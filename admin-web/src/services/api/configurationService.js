import {
  rideTypes as initialRideTypes,
  serviceAreas as initialServiceAreas,
  operationalLimits as initialLimits,
  notificationTemplates as initialTemplates,
} from '../mock/configurationMock'
import { recordAuditLog } from '../audit/auditLog'

const MOCK_LATENCY_MS = 300
let rideTypes = initialRideTypes
let serviceAreas = initialServiceAreas
let operationalLimits = initialLimits
let notificationTemplates = initialTemplates

function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

// Ride types
export function getRideTypes() {
  return resolveAfterDelay(rideTypes)
}
export function saveRideType(data) {
  const isNew = !data.id
  if (!isNew) {
    rideTypes = rideTypes.map((r) => (r.id === data.id ? { ...r, ...data } : r))
  } else {
    rideTypes = [...rideTypes, { ...data, id: `RT-${rideTypes.length + 1}-${Date.now()}`, active: true }]
  }
  recordAuditLog({ action: isNew ? 'Added ride type' : 'Updated ride type', entityType: 'Configuration', entityLabel: data.name })
  return resolveAfterDelay(rideTypes)
}
export function setRideTypeActive(id, active) {
  const item = rideTypes.find((r) => r.id === id)
  rideTypes = rideTypes.map((r) => (r.id === id ? { ...r, active } : r))
  if (item) {
    recordAuditLog({ action: `${active ? 'Activated' : 'Deactivated'} ride type`, entityType: 'Configuration', entityLabel: item.name, before: item.active, after: active })
  }
  return resolveAfterDelay(rideTypes)
}

// Service areas
export function getServiceAreas() {
  return resolveAfterDelay(serviceAreas)
}
export function saveServiceArea(data) {
  serviceAreas = [...serviceAreas, { ...data, id: `SA-${serviceAreas.length + 1}-${Date.now()}`, status: 'active' }]
  recordAuditLog({ action: 'Added service area', entityType: 'Configuration', entityLabel: data.name })
  return resolveAfterDelay(serviceAreas)
}
export function setServiceAreaStatus(id, status) {
  const area = serviceAreas.find((a) => a.id === id)
  serviceAreas = serviceAreas.map((a) => (a.id === id ? { ...a, status } : a))
  if (area) {
    recordAuditLog({ action: `Set service area ${status}`, entityType: 'Configuration', entityLabel: area.name, before: area.status, after: status })
  }
  return resolveAfterDelay(serviceAreas)
}

// Operational limits
export function getOperationalLimits() {
  return resolveAfterDelay(operationalLimits)
}
export function updateOperationalLimits(patch) {
  const before = operationalLimits
  operationalLimits = { ...operationalLimits, ...patch }
  recordAuditLog({
    action: 'Updated operational limits',
    entityType: 'Configuration',
    entityLabel: 'Operational Limits',
    before: JSON.stringify(before),
    after: JSON.stringify(operationalLimits),
  })
  return resolveAfterDelay(operationalLimits)
}

// Notification templates
export function getNotificationTemplates() {
  return resolveAfterDelay(notificationTemplates)
}
export function saveNotificationTemplate(data) {
  const isNew = !data.id
  if (!isNew) {
    notificationTemplates = notificationTemplates.map((t) => (t.id === data.id ? { ...t, ...data } : t))
  } else {
    notificationTemplates = [...notificationTemplates, { ...data, id: `NT-${notificationTemplates.length + 1}-${Date.now()}`, active: true }]
  }
  recordAuditLog({ action: isNew ? 'Added notification template' : 'Updated notification template', entityType: 'Configuration', entityLabel: data.event })
  return resolveAfterDelay(notificationTemplates)
}
export function setNotificationTemplateActive(id, active) {
  const item = notificationTemplates.find((t) => t.id === id)
  notificationTemplates = notificationTemplates.map((t) => (t.id === id ? { ...t, active } : t))
  if (item) {
    recordAuditLog({ action: `${active ? 'Activated' : 'Deactivated'} notification template`, entityType: 'Configuration', entityLabel: item.event, before: item.active, after: active })
  }
  return resolveAfterDelay(notificationTemplates)
}

