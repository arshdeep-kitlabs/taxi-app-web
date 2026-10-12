const now = Date.now()
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString()
const monthsAgo = (m) => new Date(now - m * 30 * 86_400_000).toISOString()

export const customers = [
  { id: 'CU-3301', name: 'Jonah Webb', email: 'jonah.webb@mailbox.com', phone: '+1 (555) 774-1120', address: '12 Birch Ave', city: 'Old Town', status: 'active', joinedAt: monthsAgo(20), totalRides: 214, completedRides: 198, cancelledRides: 16, totalSpend: 4120 },
  { id: 'CU-3298', name: 'Ana Silva', email: 'ana.silva@mailbox.com', phone: '+1 (555) 441-9032', address: '88 Cedar St', city: 'Northgate', status: 'active', joinedAt: monthsAgo(11), totalRides: 96, completedRides: 90, cancelledRides: 6, totalSpend: 1780 },
  { id: 'CU-3287', name: 'Marcus Lin', email: 'marcus.lin@mailbox.com', phone: '+1 (555) 220-3391', address: '4 Court Rd', city: 'Downtown Metro', status: 'suspended', joinedAt: monthsAgo(15), totalRides: 340, completedRides: 289, cancelledRides: 51, totalSpend: 6210 },
  { id: 'CU-3271', name: 'Priya Rao', email: 'priya.rao@mailbox.com', phone: '+1 (555) 662-8810', address: '19 Lake View', city: 'Riverside', status: 'active', joinedAt: monthsAgo(6), totalRides: 58, completedRides: 55, cancelledRides: 3, totalSpend: 990 },
  { id: 'CU-3260', name: 'Elena Cruz', email: 'elena.cruz.cust@mailbox.com', phone: '+1 (555) 903-7742', address: '210 Palm Dr', city: 'Airport Zone', status: 'active', joinedAt: monthsAgo(28), totalRides: 512, completedRides: 470, cancelledRides: 42, totalSpend: 9430 },
  { id: 'CU-3244', name: 'Diego Alvarez', email: 'diego.alvarez.cust@mailbox.com', phone: '+1 (555) 331-2209', address: '77 Hilltop Ln', city: 'Riverside', status: 'blocked', joinedAt: monthsAgo(9), totalRides: 41, completedRides: 24, cancelledRides: 17, totalSpend: 615 },
  { id: 'CU-3231', name: 'Wale Mensah', email: 'wale.mensah.cust@mailbox.com', phone: '+1 (555) 118-4432', address: '5 Sunset Blvd', city: 'Downtown Metro', status: 'active', joinedAt: monthsAgo(3), totalRides: 12, completedRides: 12, cancelledRides: 0, totalSpend: 240 },
  { id: 'CU-3219', name: 'Farrukh Yusuf', email: 'farrukh.yusuf.cust@mailbox.com', phone: '+1 (555) 774-9021', address: '63 Maple St', city: 'Old Town', status: 'active', joinedAt: monthsAgo(17), totalRides: 176, completedRides: 160, cancelledRides: 16, totalSpend: 3110 },
]

export function getRidesForCustomer(customerId) {
  const seed = Number(customerId.replace(/\D/g, '')) % 11 || 1
  const drivers = ['Marcus Odom', 'Ana Silva', 'Priya Nair', 'Wale Mensah', 'Diego Alvarez']
  const statuses = ['completed', 'completed', 'completed', 'cancelled']
  return Array.from({ length: 5 }, (_, i) => ({
    id: `RD-${89000 + seed * 7 + i}`,
    date: daysAgo(i + seed),
    counterpart: drivers[(seed + i) % drivers.length],
    fare: 10 + ((seed + i * 4) % 28),
    status: statuses[(seed + i) % statuses.length],
  }))
}

export function getSupportTicketsForCustomer(customerId) {
  const seed = Number(customerId.replace(/\D/g, '')) % 7 || 1
  const subjects = ['Fare dispute on recent ride', 'App payment failed', 'Driver was late', 'Requested refund', 'Account access issue']
  const statuses = ['resolved', 'resolved', 'open']
  return Array.from({ length: (seed % 3) + 1 }, (_, i) => ({
    id: `TK-${3000 + seed * 3 + i}`,
    subject: subjects[(seed + i) % subjects.length],
    status: statuses[(seed + i) % statuses.length],
    createdAt: daysAgo(i * 6 + seed),
  }))
}
