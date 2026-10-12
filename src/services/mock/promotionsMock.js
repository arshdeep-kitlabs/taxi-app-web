const now = Date.now()
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString()
const daysFromNow = (d) => new Date(now + d * 86_400_000).toISOString()

// discountType: percentage | flat · eligibility: all | new_customers | city
export const promotions = [
  { id: 'PROMO-1', code: 'WELCOME25', discountType: 'percentage', discountValue: 25, validFrom: daysAgo(20), validUntil: daysFromNow(10), usageLimit: 1000, usageCount: 612, perUserLimit: 1, eligibility: 'new_customers', active: true },
  { id: 'PROMO-2', code: 'SAVE5', discountType: 'flat', discountValue: 5, validFrom: daysAgo(30), validUntil: daysFromNow(30), usageLimit: 5000, usageCount: 3980, perUserLimit: 3, eligibility: 'all', active: true },
  { id: 'PROMO-3', code: 'RIVERSIDE10', discountType: 'percentage', discountValue: 10, validFrom: daysAgo(5), validUntil: daysFromNow(25), usageLimit: 500, usageCount: 44, perUserLimit: 2, eligibility: 'city', city: 'Riverside', active: true },
  { id: 'PROMO-4', code: 'WEEKEND15', discountType: 'percentage', discountValue: 15, validFrom: daysFromNow(3), validUntil: daysFromNow(10), usageLimit: 800, usageCount: 0, perUserLimit: 1, eligibility: 'all', active: true },
  { id: 'PROMO-5', code: 'SUMMER20', discountType: 'percentage', discountValue: 20, validFrom: daysAgo(60), validUntil: daysAgo(5), usageLimit: 2000, usageCount: 1874, perUserLimit: 1, eligibility: 'all', active: true },
  { id: 'PROMO-6', code: 'LAUNCH50', discountType: 'flat', discountValue: 10, validFrom: daysAgo(90), validUntil: daysFromNow(90), usageLimit: 200, usageCount: 200, perUserLimit: 1, eligibility: 'new_customers', active: false },
]
