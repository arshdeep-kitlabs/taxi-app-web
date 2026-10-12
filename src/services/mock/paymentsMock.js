const now = Date.now()
const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString()

// type: charge | refund | adjustment
// status: succeeded | failed | pending
export const transactions = [
  { id: 'PM-55231', rideId: 'RD-92030', customerName: 'Elena Cruz', type: 'charge', amount: 42.0, method: 'Mastercard •• 2091', status: 'succeeded', reconciled: true, date: hoursAgo(1) },
  { id: 'PM-55230', rideId: 'RD-92024', customerName: 'Wale Mensah', type: 'charge', amount: 16.75, method: 'Visa •• 7783', status: 'failed', reconciled: false, date: hoursAgo(3) },
  { id: 'PM-55229', rideId: 'RD-91998', customerName: 'Marcus Lin', type: 'refund', amount: -38.9, method: 'Visa •• 5521', status: 'succeeded', reconciled: true, date: hoursAgo(4) },
  { id: 'PM-55228', rideId: 'RD-92011', customerName: 'Ana Silva', type: 'charge', amount: 21.3, method: 'Cash', status: 'succeeded', reconciled: true, date: hoursAgo(8) },
  { id: 'PM-55227', rideId: 'RD-91975', customerName: 'Priya Rao', type: 'charge', amount: 14.2, method: 'Mastercard •• 2091', status: 'succeeded', reconciled: false, date: hoursAgo(25) },
  { id: 'PM-55226', rideId: 'RD-91940', customerName: 'Jonah Webb', type: 'adjustment', amount: 5.0, method: 'System', status: 'succeeded', reconciled: true, date: hoursAgo(30) },
  { id: 'PM-55225', rideId: 'RD-91922', customerName: 'Diego Alvarez', type: 'charge', amount: 27.6, method: 'Visa •• 4471', status: 'failed', reconciled: false, date: hoursAgo(33) },
  { id: 'PM-55224', rideId: 'RD-91905', customerName: 'Farrukh Yusuf', type: 'refund', amount: -12.0, method: 'Cash', status: 'pending', reconciled: false, date: hoursAgo(40) },
  { id: 'PM-55223', rideId: 'RD-91888', customerName: 'Priya Rao', type: 'charge', amount: 19.9, method: 'Visa •• 7783', status: 'succeeded', reconciled: true, date: hoursAgo(48) },
  { id: 'PM-55222', rideId: 'RD-91870', customerName: 'Elena Cruz', type: 'adjustment', amount: -3.5, method: 'System', status: 'succeeded', reconciled: false, date: hoursAgo(52) },
  { id: 'PM-55221', rideId: 'RD-91850', customerName: 'Wale Mensah', type: 'charge', amount: 33.4, method: 'Mastercard •• 2091', status: 'succeeded', reconciled: true, date: hoursAgo(60) },
  { id: 'PM-55220', rideId: 'RD-91832', customerName: 'Marcus Lin', type: 'charge', amount: 22.1, method: 'Visa •• 5521', status: 'pending', reconciled: false, date: hoursAgo(65) },
]
