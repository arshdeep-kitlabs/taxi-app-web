const now = Date.now()
const minutesAgo = (m) => new Date(now - m * 60_000).toISOString()
const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString()
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString()

export const ADMIN_USERS = ['Vipin Kumar', 'Priya Nair', 'Marcus Odom']

// status: open | in_progress | resolved
export const tickets = [
  {
    id: 'TK-3041', subject: 'Fare dispute on recent ride', status: 'open', assignedTo: null,
    requesterType: 'customer', requesterId: 'CU-3287', requesterName: 'Marcus Lin',
    createdAt: minutesAgo(20), updatedAt: minutesAgo(20),
    messages: [{ id: 'MSG-1', authorType: 'customer', author: 'Marcus Lin', body: 'I was charged $38 for a ride that should have cost $22. Please review.', timestamp: minutesAgo(20) }],
    internalNotes: [], resolution: null,
  },
  {
    id: 'TK-3040', subject: 'App payment failed twice', status: 'in_progress', assignedTo: 'Priya Nair',
    requesterType: 'customer', requesterId: 'CU-3244', requesterName: 'Diego Alvarez',
    createdAt: hoursAgo(2), updatedAt: hoursAgo(1),
    messages: [
      { id: 'MSG-1', authorType: 'customer', author: 'Diego Alvarez', body: 'My card keeps getting declined but I was still charged.', timestamp: hoursAgo(2) },
      { id: 'MSG-2', authorType: 'admin', author: 'Priya Nair', body: 'Looking into this with our payment processor now.', timestamp: hoursAgo(1) },
    ],
    internalNotes: [{ id: 'N-1', author: 'Priya Nair', body: 'Escalated to payments team, ref #PAY-8821.', timestamp: hoursAgo(1) }],
    resolution: null,
  },
  {
    id: 'TK-3038', subject: 'Driver was late and rude', status: 'open', assignedTo: null,
    requesterType: 'customer', requesterId: 'CU-3260', requesterName: 'Elena Cruz',
    createdAt: hoursAgo(5), updatedAt: hoursAgo(5),
    messages: [{ id: 'MSG-1', authorType: 'customer', author: 'Elena Cruz', body: 'Driver arrived 15 minutes late and was unpleasant.', timestamp: hoursAgo(5) }],
    internalNotes: [], resolution: null,
  },
  {
    id: 'TK-3035', subject: 'Requesting document re-verification', status: 'in_progress', assignedTo: 'Marcus Odom',
    requesterType: 'driver', requesterId: 'DR-2118', requesterName: 'Wale Mensah',
    createdAt: hoursAgo(9), updatedAt: hoursAgo(3),
    messages: [
      { id: 'MSG-1', authorType: 'driver', author: 'Wale Mensah', body: 'My insurance document was rejected but the file is valid, can you recheck?', timestamp: hoursAgo(9) },
      { id: 'MSG-2', authorType: 'admin', author: 'Marcus Odom', body: 'Please re-upload a higher resolution scan and we will review again.', timestamp: hoursAgo(3) },
    ],
    internalNotes: [], resolution: null,
  },
  {
    id: 'TK-3021', subject: 'Refund not received', status: 'resolved', assignedTo: 'Priya Nair',
    requesterType: 'customer', requesterId: 'CU-3271', requesterName: 'Priya Rao',
    createdAt: daysAgo(3), updatedAt: daysAgo(2),
    messages: [
      { id: 'MSG-1', authorType: 'customer', author: 'Priya Rao', body: 'I cancelled a ride and was told I would be refunded, but nothing yet.', timestamp: daysAgo(3) },
      { id: 'MSG-2', authorType: 'admin', author: 'Priya Nair', body: 'Confirmed and processed your refund, it should reflect within 3-5 business days.', timestamp: daysAgo(2) },
    ],
    internalNotes: [{ id: 'N-1', author: 'Priya Nair', body: 'Refund issued via PM-55190.', timestamp: daysAgo(2) }],
    resolution: { resolvedBy: 'Priya Nair', resolvedAt: daysAgo(2), summary: 'Refund of $12.00 issued to original payment method.' },
  },
  {
    id: 'TK-3012', subject: 'Account access issue', status: 'resolved', assignedTo: 'Vipin Kumar',
    requesterType: 'customer', requesterId: 'CU-3287', requesterName: 'Marcus Lin',
    createdAt: daysAgo(6), updatedAt: daysAgo(5),
    messages: [
      { id: 'MSG-1', authorType: 'customer', author: 'Marcus Lin', body: 'I cannot log into my account after changing my phone number.', timestamp: daysAgo(6) },
      { id: 'MSG-2', authorType: 'admin', author: 'Vipin Kumar', body: 'Updated your account phone number manually, please try logging in again.', timestamp: daysAgo(5) },
    ],
    internalNotes: [], resolution: { resolvedBy: 'Vipin Kumar', resolvedAt: daysAgo(5), summary: 'Manually updated phone number on account after identity verification.' },
  },
  {
    id: 'TK-3005', subject: 'Vehicle inspection question', status: 'open', assignedTo: null,
    requesterType: 'driver', requesterId: 'DR-2109', requesterName: 'Diego Alvarez',
    createdAt: daysAgo(8), updatedAt: daysAgo(8),
    messages: [{ id: 'MSG-1', authorType: 'driver', author: 'Diego Alvarez', body: 'When is my next vehicle inspection due?', timestamp: daysAgo(8) }],
    internalNotes: [], resolution: null,
  },
]
