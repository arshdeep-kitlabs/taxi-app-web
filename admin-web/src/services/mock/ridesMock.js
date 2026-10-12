const now = Date.now()
const minutesAgo = (m) => new Date(now - m * 60_000).toISOString()
const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString()

// status: requested | ongoing | completed | cancelled
// paymentStatus: paid | pending | failed | refunded
export const rides = [
  {
    id: 'RD-92041', status: 'ongoing', customerId: 'CU-3301', customerName: 'Jonah Webb', driverId: 'DR-2198', driverName: 'Marcus Odom',
    pickup: '5th Ave & Main St', dropoff: 'Central Station', city: 'Downtown Metro', fare: 18.5,
    paymentStatus: 'pending', paymentMethod: 'Visa •• 4471',
    requestedAt: minutesAgo(14), acceptedAt: minutesAgo(13), pickedUpAt: minutesAgo(9), completedAt: null, cancelledAt: null,
  },
  {
    id: 'RD-92038', status: 'requested', customerId: 'CU-3271', customerName: 'Priya Rao', driverId: null, driverName: null,
    pickup: 'Riverside Mall', dropoff: 'Old Town Square', city: 'Riverside', fare: null,
    paymentStatus: 'pending', paymentMethod: null,
    requestedAt: minutesAgo(2), acceptedAt: null, pickedUpAt: null, completedAt: null, cancelledAt: null,
  },
  {
    id: 'RD-92030', status: 'completed', customerId: 'CU-3260', customerName: 'Elena Cruz', driverId: 'DR-2129', driverName: 'Ana Silva',
    pickup: 'Airport Terminal 2', dropoff: 'Northgate Hotel', city: 'Airport Zone', fare: 42.0,
    paymentStatus: 'paid', paymentMethod: 'Mastercard •• 2091',
    requestedAt: hoursAgo(2), acceptedAt: hoursAgo(2), pickedUpAt: hoursAgo(2), completedAt: hoursAgo(1), cancelledAt: null,
  },
  {
    id: 'RD-92024', status: 'completed', customerId: 'CU-3231', customerName: 'Wale Mensah', driverId: 'DR-2154', driverName: 'Priya Nair',
    pickup: 'Downtown Metro Plaza', dropoff: 'Riverside Park', city: 'Downtown Metro', fare: 16.75,
    paymentStatus: 'failed', paymentMethod: 'Visa •• 7783',
    requestedAt: hoursAgo(4), acceptedAt: hoursAgo(4), pickedUpAt: hoursAgo(4), completedAt: hoursAgo(3), cancelledAt: null,
  },
  {
    id: 'RD-92019', status: 'cancelled', customerId: 'CU-3244', customerName: 'Diego Alvarez', driverId: 'DR-2109', driverName: 'Diego Alvarez',
    pickup: 'Northgate Station', dropoff: 'Airport Zone Terminal 1', city: 'Northgate', fare: null,
    paymentStatus: 'pending', paymentMethod: null,
    requestedAt: hoursAgo(6), acceptedAt: hoursAgo(6), pickedUpAt: null, completedAt: null, cancelledAt: hoursAgo(6),
    cancelledBy: 'customer', cancellationReason: 'Found alternate transport.',
  },
  {
    id: 'RD-92011', status: 'completed', customerId: 'CU-3298', customerName: 'Ana Silva', driverId: 'DR-2118', driverName: 'Wale Mensah',
    pickup: 'Old Town Market', dropoff: 'Downtown Metro Plaza', city: 'Old Town', fare: 21.3,
    paymentStatus: 'paid', paymentMethod: 'Cash',
    requestedAt: hoursAgo(9), acceptedAt: hoursAgo(9), pickedUpAt: hoursAgo(9), completedAt: hoursAgo(8), cancelledAt: null,
  },
  {
    id: 'RD-92005', status: 'cancelled', customerId: 'CU-3219', customerName: 'Farrukh Yusuf', driverId: null, driverName: null,
    pickup: 'Riverside Bridge', dropoff: 'Riverside Mall', city: 'Riverside', fare: null,
    paymentStatus: 'pending', paymentMethod: null,
    requestedAt: hoursAgo(11), acceptedAt: null, pickedUpAt: null, completedAt: null, cancelledAt: hoursAgo(11),
    cancelledBy: 'system', cancellationReason: 'No driver available within service area.',
  },
  {
    id: 'RD-91998', status: 'completed', customerId: 'CU-3287', customerName: 'Marcus Lin', driverId: 'DR-2187', driverName: 'Farrukh Yusuf',
    pickup: 'Downtown Metro Plaza', dropoff: 'Airport Zone Terminal 1', city: 'Downtown Metro', fare: 38.9,
    paymentStatus: 'refunded', paymentMethod: 'Visa •• 5521',
    requestedAt: hoursAgo(15), acceptedAt: hoursAgo(15), pickedUpAt: hoursAgo(15), completedAt: hoursAgo(14), cancelledAt: null,
  },
  {
    id: 'RD-91982', status: 'cancelled', customerId: 'CU-3260', customerName: 'Elena Cruz', driverId: 'DR-2201', driverName: 'Elena Cruz',
    pickup: 'Northgate Hotel', dropoff: 'Old Town Square', city: 'Northgate', fare: null,
    paymentStatus: 'pending', paymentMethod: null,
    requestedAt: hoursAgo(20), acceptedAt: hoursAgo(20), pickedUpAt: null, completedAt: null, cancelledAt: hoursAgo(20),
    cancelledBy: 'driver', cancellationReason: 'Vehicle issue before pickup.',
  },
  {
    id: 'RD-91975', status: 'completed', customerId: 'CU-3271', customerName: 'Priya Rao', driverId: 'DR-2198', driverName: 'Marcus Odom',
    pickup: 'Riverside Park', dropoff: 'Downtown Metro Plaza', city: 'Riverside', fare: 14.2,
    paymentStatus: 'paid', paymentMethod: 'Mastercard •• 2091',
    requestedAt: hoursAgo(26), acceptedAt: hoursAgo(26), pickedUpAt: hoursAgo(26), completedAt: hoursAgo(25), cancelledAt: null,
  },
]
