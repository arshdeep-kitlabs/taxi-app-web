import { apiClient } from './client'
import { recordAuditLog } from '../audit/auditLog'

export async function getDrivers({ search = '', status = 'all' } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status !== 'all') params.set('status', status)
  const query = params.toString()
  const res = await apiClient.get(`/admin/drivers${query ? `?${query}` : ''}`)
  return res.data.rows
}

export async function getDriverById(driverId) {
  const res = await apiClient.get(`/admin/drivers/${driverId}`)
  return res.data
}

export async function getDriverRides(driverId) {
  const res = await apiClient.get(`/admin/drivers/${driverId}`)
  return res.data.rides ?? []
}

export async function updateDriverStatus(driverId, status) {
  const res = await apiClient.patch(`/admin/drivers/${driverId}`, { status })
  recordAuditLog({
    action: `Changed driver status to ${status}`,
    entityType: 'Driver',
    entityLabel: driverId,
    before: null,
    after: status,
  })
  return res.data
}

export async function updateDriverProfile(driverId, patch) {
  const res = await apiClient.patch(`/admin/drivers/${driverId}`, patch)
  recordAuditLog({
    action: 'Updated driver profile',
    entityType: 'Driver',
    entityLabel: driverId,
    before: 'Contact/vehicle info',
    after: 'Updated',
  })
  return res.data
}
