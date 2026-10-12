import { promotions as initialPromotions } from '../mock/promotionsMock'
import { recordAuditLog } from '../audit/auditLog'

const MOCK_LATENCY_MS = 350
let promotions = initialPromotions
let sequence = promotions.length

function resolveAfterDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS))
}

/** Derives the display status from the stored `active` flag and validity dates. */
export function getPromoStatus(promo) {
  const now = Date.now()
  if (!promo.active) return 'disabled'
  if (now < new Date(promo.validFrom).getTime()) return 'scheduled'
  if (now > new Date(promo.validUntil).getTime()) return 'expired'
  if (promo.usageCount >= promo.usageLimit) return 'exhausted'
  return 'active'
}

export function getPromotions({ search = '', status = 'all' } = {}) {
  const query = search.trim().toLowerCase()
  const filtered = promotions
    .filter((p) => status === 'all' || getPromoStatus(p) === status)
    .filter((p) => query.length === 0 || p.code.toLowerCase().includes(query))
  return resolveAfterDelay(filtered)
}

export function createPromotion(data) {
  sequence += 1
  const promo = { id: `PROMO-${sequence}`, usageCount: 0, active: true, ...data }
  promotions = [promo, ...promotions]
  recordAuditLog({
    action: 'Created promo code',
    entityType: 'Promotion',
    entityLabel: promo.code,
    before: null,
    after: promo.discountType === 'percentage' ? `${promo.discountValue}%` : `$${promo.discountValue}`,
  })
  return resolveAfterDelay(promo)
}

export function updatePromotion(id, patch) {
  const before = promotions.find((p) => p.id === id)
  promotions = promotions.map((p) => (p.id === id ? { ...p, ...patch } : p))
  if (before) {
    recordAuditLog({
      action: 'Updated promo code',
      entityType: 'Promotion',
      entityLabel: before.code,
      before: 'Previous settings',
      after: 'Updated',
    })
  }
  return resolveAfterDelay(promotions.find((p) => p.id === id))
}

export function setPromotionActive(id, active) {
  const before = promotions.find((p) => p.id === id)
  promotions = promotions.map((p) => (p.id === id ? { ...p, active } : p))
  if (before) {
    recordAuditLog({
      action: `${active ? 'Enabled' : 'Disabled'} promo code`,
      entityType: 'Promotion',
      entityLabel: before.code,
      before: before.active,
      after: active,
    })
  }
  return resolveAfterDelay(promotions.find((p) => p.id === id))
}
