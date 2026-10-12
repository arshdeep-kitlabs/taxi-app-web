export const rideTypes = [
  { id: 'RT-1', name: 'Standard', description: 'Everyday rides, up to 4 passengers', capacity: 4, fareMultiplier: 1.0, active: true },
  { id: 'RT-2', name: 'XL', description: 'Larger vehicles, up to 6 passengers', capacity: 6, fareMultiplier: 1.4, active: true },
  { id: 'RT-3', name: 'Premium', description: 'High-end vehicles with top-rated drivers', capacity: 4, fareMultiplier: 1.8, active: true },
  { id: 'RT-4', name: 'Pool', description: 'Shared rides with other passengers', capacity: 2, fareMultiplier: 0.7, active: false },
]

export const serviceAreas = [
  { id: 'SA-1', name: 'Downtown Metro', status: 'active' },
  { id: 'SA-2', name: 'Riverside', status: 'active' },
  { id: 'SA-3', name: 'Airport Zone', status: 'active' },
  { id: 'SA-4', name: 'Northgate', status: 'active' },
  { id: 'SA-5', name: 'Old Town', status: 'inactive' },
]

export const operationalLimits = {
  maxRideDistanceMiles: 60,
  maxDriverWaitMinutes: 8,
  minDriverRating: 4.0,
  maxDailyCancellationsPerDriver: 5,
  adminSessionTimeoutMinutes: 30,
}

export const notificationTemplates = [
  { id: 'NT-1', event: 'Ride Requested', channel: 'push', subject: 'Finding your driver…', active: true },
  { id: 'NT-2', event: 'Driver Arrived', channel: 'push', subject: 'Your driver has arrived', active: true },
  { id: 'NT-3', event: 'Ride Completed', channel: 'email', subject: 'Your trip receipt', active: true },
  { id: 'NT-4', event: 'Payment Failed', channel: 'sms', subject: 'Payment issue on your last ride', active: true },
  { id: 'NT-5', event: 'Application Approved', channel: 'email', subject: "You're approved to drive with Nomad", active: false },
]
