/*
  Assignment Management — mock data.
  An assignment binds one driver to one vehicle within one fleet.
  Historical assignments are preserved even after removal.
*/

export const MOCK_ASSIGNMENTS = [
  {
    id: 'ASN-001',
    driverId: 'DRV-10001', driverName: 'Ahmed Al-Mansoori', driverPhone: '+971 50 111 2222',
    vehicleId: 'VEH-001',  vehicleDisplay: 'Toyota Camry 2023', vehicleReg: 'DXB A 12345',
    fleetId: 'FLT-001', fleetName: 'ABC Transport',
    status: 'active',
    assignedDate: '2024-03-12',
    assignedBy: 'Super Admin',
    notes: null,
  },
  {
    id: 'ASN-002',
    driverId: 'DRV-10002', driverName: 'Ravi Kumar', driverPhone: '+971 55 333 4444',
    vehicleId: 'VEH-002',  vehicleDisplay: 'Honda Accord 2022', vehicleReg: 'DXB B 23456',
    fleetId: 'FLT-001', fleetName: 'ABC Transport',
    status: 'active',
    assignedDate: '2024-03-15',
    assignedBy: 'Super Admin',
    notes: null,
  },
  {
    id: 'ASN-003',
    driverId: 'DRV-10003', driverName: 'James Okonkwo', driverPhone: '+971 50 555 6666',
    vehicleId: 'VEH-009',  vehicleDisplay: 'Mercedes-Benz C-Class 2024', vehicleReg: 'SHJ A 55555',
    fleetId: 'FLT-001', fleetName: 'ABC Transport',
    status: 'active',
    assignedDate: '2024-01-10',
    assignedBy: 'Super Admin',
    notes: null,
  },
  {
    id: 'ASN-004',
    driverId: 'DRV-10004', driverName: 'Carlos Mendez', driverPhone: '+971 50 222 3333',
    vehicleId: 'VEH-004',  vehicleDisplay: 'Kia Sportage 2024', vehicleReg: 'AUH A 11111',
    fleetId: 'FLT-002', fleetName: 'City Cabs',
    status: 'active',
    assignedDate: '2024-01-20',
    assignedBy: 'Super Admin',
    notes: null,
  },
  {
    id: 'ASN-005',
    driverId: 'DRV-10005', driverName: 'Li Wei', driverPhone: '+971 55 444 5555',
    vehicleId: 'VEH-005',  vehicleDisplay: 'Toyota Corolla 2023', vehicleReg: 'AUH B 22222',
    fleetId: 'FLT-002', fleetName: 'City Cabs',
    status: 'active',
    assignedDate: '2024-01-22',
    assignedBy: 'Super Admin',
    notes: null,
  },
  // Historical (removed) assignment
  {
    id: 'ASN-006',
    driverId: 'DRV-10009', driverName: 'Mohammed Al-Sayed', driverPhone: '+971 50 303 4040',
    vehicleId: 'VEH-008',  vehicleDisplay: 'Nissan Altima 2022', vehicleReg: 'AJM A 88888',
    fleetId: 'FLT-004', fleetName: 'Express Cars',
    status: 'removed',
    assignedDate: '2024-07-01',
    removedDate: '2024-08-15',
    removedBy: 'Super Admin',
    assignedBy: 'Super Admin',
    notes: 'Driver became inactive.',
  },
]

export const MOCK_ASSIGNMENT_HISTORY = {
  'ASN-001': [
    { id: 'ah-1-1', event: 'Assignment created', admin: 'Super Admin', timestamp: '2024-03-12T09:00:00Z', detail: 'Ahmed Al-Mansoori assigned to Toyota Camry (DXB A 12345) in ABC Transport.', tone: 'done' },
  ],
  'ASN-004': [
    { id: 'ah-4-1', event: 'Assignment created', admin: 'Super Admin', timestamp: '2024-01-20T10:00:00Z', detail: 'Carlos Mendez assigned to Kia Sportage (AUH A 11111) in City Cabs.', tone: 'done' },
  ],
  'ASN-006': [
    { id: 'ah-6-1', event: 'Assignment created', admin: 'Super Admin', timestamp: '2024-07-01T08:00:00Z', detail: 'Mohammed Al-Sayed assigned to Nissan Altima (AJM A 88888) in Express Cars.', tone: 'done' },
    { id: 'ah-6-2', event: 'Assignment removed', admin: 'Super Admin', timestamp: '2024-08-15T14:30:00Z', detail: 'Driver became inactive. Historical ride data preserved.', tone: 'danger' },
  ],
}
