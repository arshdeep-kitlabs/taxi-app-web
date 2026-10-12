export const fareStructure = {
  baseFare: 3.5,
  perMileRate: 1.75,
  perMinuteRate: 0.35,
  minimumFare: 6.0,
  waitingChargePerMin: 0.4,
  cancellationFee: 5.0,
}

export const surgeRules = [
  { id: 'SR-1', zone: 'Downtown Metro', condition: 'High demand (rush hour)', multiplier: 1.8, active: true },
  { id: 'SR-2', zone: 'Airport Zone', condition: 'Flight arrival peaks', multiplier: 1.6, active: true },
  { id: 'SR-3', zone: 'Riverside', condition: 'Weekend nights', multiplier: 1.4, active: true },
  { id: 'SR-4', zone: 'Northgate', condition: 'Severe weather', multiplier: 2.0, active: false },
  { id: 'SR-5', zone: 'Old Town', condition: 'Local events', multiplier: 1.5, active: false },
]
