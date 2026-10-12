/*
  Vehicle Management — mock data.
  Each vehicle belongs to exactly one fleet.
  Vehicle data is never mixed across fleets.
*/

export const MOCK_VEHICLES = [
  {
    id: 'VEH-001',
    make: 'Toyota', model: 'Camry', year: 2023, color: 'White',
    type: 'Sedan', rideType: 'Premium',
    regNo: 'DXB A 12345', vin: 'JT2BF28K1X0123456',
    fleetId: 'FLT-001', fleetName: 'ABC Transport',
    driverId: 'DRV-101', driverName: 'Ahmed Al-Mansoori', driverPhone: '+971 50 111 2222', driverRating: 4.8,
    status: 'active', docStatus: 'verified',
    totalRides: 312, completedRides: 298, cancelledRides: 14,
    revenue: 18640, avgFare: 59.7, avgRating: 4.8, totalDistanceKm: 12400,
    utilization: 82,
    lastActive: '2024-08-31T09:12:00Z', createdAt: '2024-03-12T08:00:00Z',
    maintenanceStatus: 'operational', lastServiceDate: '2024-07-10', nextServiceDate: '2024-10-10',
  },
  {
    id: 'VEH-002',
    make: 'Honda', model: 'Accord', year: 2022, color: 'Silver',
    type: 'Sedan', rideType: 'Standard',
    regNo: 'DXB B 23456', vin: 'JHMCB9657WC000000',
    fleetId: 'FLT-001', fleetName: 'ABC Transport',
    driverId: 'DRV-102', driverName: 'Ravi Kumar', driverPhone: '+971 55 333 4444', driverRating: 4.6,
    status: 'active', docStatus: 'verified',
    totalRides: 198, completedRides: 187, cancelledRides: 11,
    revenue: 9100, avgFare: 45.9, avgRating: 4.6, totalDistanceKm: 7800,
    utilization: 68,
    lastActive: '2024-08-31T08:45:00Z', createdAt: '2024-03-12T08:10:00Z',
    maintenanceStatus: 'operational', lastServiceDate: '2024-06-20', nextServiceDate: '2024-09-20',
  },
  {
    id: 'VEH-003',
    make: 'Hyundai', model: 'Tucson', year: 2023, color: 'Grey',
    type: 'SUV', rideType: 'XL',
    regNo: 'DXB C 34567', vin: '5NMSG3AB4DH000001',
    fleetId: 'FLT-001', fleetName: 'ABC Transport',
    driverId: null, driverName: null, driverPhone: null, driverRating: null,
    status: 'maintenance', docStatus: 'verified',
    totalRides: 87, completedRides: 81, cancelledRides: 6,
    revenue: 6200, avgFare: 71.2, avgRating: 4.5, totalDistanceKm: 5100,
    utilization: 41,
    lastActive: '2024-08-20T14:00:00Z', createdAt: '2024-03-15T09:00:00Z',
    maintenanceStatus: 'under_maintenance', lastServiceDate: '2024-08-28', nextServiceDate: '2024-09-15',
  },
  {
    id: 'VEH-004',
    make: 'Kia', model: 'Sportage', year: 2024, color: 'Black',
    type: 'SUV', rideType: 'XL',
    regNo: 'AUH A 11111', vin: 'KNDJ23AU0F7000000',
    fleetId: 'FLT-002', fleetName: 'City Cabs',
    driverId: 'DRV-201', driverName: 'Carlos Mendez', driverPhone: '+971 50 222 3333', driverRating: 4.7,
    status: 'active', docStatus: 'verified',
    totalRides: 541, completedRides: 519, cancelledRides: 22,
    revenue: 38500, avgFare: 71.1, avgRating: 4.7, totalDistanceKm: 22100,
    utilization: 90,
    lastActive: '2024-08-31T10:00:00Z', createdAt: '2024-01-20T09:30:00Z',
    maintenanceStatus: 'operational', lastServiceDate: '2024-08-01', nextServiceDate: '2024-11-01',
  },
  {
    id: 'VEH-005',
    make: 'Toyota', model: 'Corolla', year: 2023, color: 'White',
    type: 'Sedan', rideType: 'Standard',
    regNo: 'AUH B 22222', vin: '1NXBR32E26Z100000',
    fleetId: 'FLT-002', fleetName: 'City Cabs',
    driverId: 'DRV-202', driverName: 'Li Wei', driverPhone: '+971 55 444 5555', driverRating: 4.5,
    status: 'active', docStatus: 'verified',
    totalRides: 270, completedRides: 260, cancelledRides: 10,
    revenue: 12000, avgFare: 44.4, avgRating: 4.5, totalDistanceKm: 9600,
    utilization: 72,
    lastActive: '2024-08-31T09:30:00Z', createdAt: '2024-01-20T09:45:00Z',
    maintenanceStatus: 'operational', lastServiceDate: '2024-07-15', nextServiceDate: '2024-10-15',
  },
  {
    id: 'VEH-006',
    make: 'Toyota', model: 'Innova', year: 2023, color: 'Pearl White',
    type: 'MPV', rideType: 'XL',
    regNo: 'AUH C 33333', vin: 'MHF11BJ3V00000001',
    fleetId: 'FLT-002', fleetName: 'City Cabs',
    driverId: null, driverName: null, driverPhone: null, driverRating: null,
    status: 'available', docStatus: 'verified',
    totalRides: 134, completedRides: 130, cancelledRides: 4,
    revenue: 9500, avgFare: 70.9, avgRating: 4.6, totalDistanceKm: 6200,
    utilization: 55,
    lastActive: '2024-08-30T16:00:00Z', createdAt: '2024-01-25T10:00:00Z',
    maintenanceStatus: 'operational', lastServiceDate: '2024-08-05', nextServiceDate: '2024-11-05',
  },
  {
    id: 'VEH-007',
    make: 'Hyundai', model: 'Verna', year: 2023, color: 'Blue',
    type: 'Sedan', rideType: 'Standard',
    regNo: 'SHJ A 55555', vin: 'KMHCN41AAPP000001',
    fleetId: 'FLT-003', fleetName: 'Metro Taxi',
    driverId: null, driverName: null, driverPhone: null, driverRating: null,
    status: 'pending', docStatus: 'pending',
    totalRides: 0, completedRides: 0, cancelledRides: 0,
    revenue: 0, avgFare: 0, avgRating: 0, totalDistanceKm: 0,
    utilization: 0,
    lastActive: null, createdAt: '2024-08-01T12:00:00Z',
    maintenanceStatus: 'operational', lastServiceDate: null, nextServiceDate: null,
  },
  {
    id: 'VEH-008',
    make: 'Nissan', model: 'Altima', year: 2022, color: 'Beige',
    type: 'Sedan', rideType: 'Standard',
    regNo: 'DXB D 44444', vin: '1N4AL3APXEC000001',
    fleetId: 'FLT-004', fleetName: 'Express Cars',
    driverId: null, driverName: null, driverPhone: null, driverRating: null,
    status: 'suspended', docStatus: 'verified',
    totalRides: 420, completedRides: 400, cancelledRides: 20,
    revenue: 18900, avgFare: 45.0, avgRating: 4.2, totalDistanceKm: 16100,
    utilization: 60,
    lastActive: '2024-08-15T11:00:00Z', createdAt: '2023-11-05T07:30:00Z',
    maintenanceStatus: 'operational', lastServiceDate: '2024-07-01', nextServiceDate: '2024-10-01',
  },
  {
    id: 'VEH-009',
    make: 'Mercedes-Benz', model: 'C-Class', year: 2024, color: 'Midnight Blue',
    type: 'Sedan', rideType: 'Premium',
    regNo: 'DXB E 98765', vin: 'WDB2030422F000001',
    fleetId: 'FLT-001', fleetName: 'ABC Transport',
    driverId: 'DRV-103', driverName: 'James Okonkwo', driverPhone: '+971 52 555 6666', driverRating: 4.9,
    status: 'active', docStatus: 'verified',
    totalRides: 425, completedRides: 415, cancelledRides: 10,
    revenue: 42500, avgFare: 100.0, avgRating: 4.9, totalDistanceKm: 19800,
    utilization: 88,
    lastActive: '2024-08-31T10:05:00Z', createdAt: '2024-03-12T08:30:00Z',
    maintenanceStatus: 'operational', lastServiceDate: '2024-08-10', nextServiceDate: '2024-11-10',
  },
  {
    id: 'VEH-010',
    make: 'Hyundai', model: 'Tucson', year: 2022, color: 'Red',
    type: 'SUV', rideType: 'XL',
    regNo: 'AJM A 77777', vin: '5NMSG3AB4DH000099',
    fleetId: 'FLT-005', fleetName: 'Gulf Rides',
    driverId: null, driverName: null, driverPhone: null, driverRating: null,
    status: 'available', docStatus: 'verified',
    totalRides: 95, completedRides: 91, cancelledRides: 4,
    revenue: 6700, avgFare: 70.5, avgRating: 4.4, totalDistanceKm: 4200,
    utilization: 50,
    lastActive: '2024-08-29T13:00:00Z', createdAt: '2024-05-17T10:30:00Z',
    maintenanceStatus: 'maintenance_required', lastServiceDate: '2024-05-17', nextServiceDate: '2024-09-01',
  },
]

/* ---- Documents per vehicle ---- */

export const MOCK_VEHICLE_DOCUMENTS = {
  'VEH-001': [
    { id: 'VD-1001', name: 'Registration Certificate', docNumber: 'REG-DXB-12345-2023', issueDate: '2023-02-01', expiryDate: '2025-02-01', status: 'verified', rejectionReason: null },
    { id: 'VD-1002', name: 'Insurance Certificate', docNumber: 'INS-AXA-2024-ABC01', issueDate: '2024-01-15', expiryDate: '2025-01-15', status: 'verified', rejectionReason: null },
    { id: 'VD-1003', name: 'Vehicle Inspection', docNumber: 'INSP-RTA-2024-0123', issueDate: '2024-03-01', expiryDate: '2025-03-01', status: 'verified', rejectionReason: null },
    { id: 'VD-1004', name: 'Operating Permit', docNumber: 'PERM-RTA-2024-0441', issueDate: '2024-03-12', expiryDate: '2024-09-07', status: 'verified', rejectionReason: null },
  ],
  'VEH-003': [
    { id: 'VD-3001', name: 'Registration Certificate', docNumber: 'REG-DXB-34567-2023', issueDate: '2023-04-01', expiryDate: '2025-04-01', status: 'verified', rejectionReason: null },
    { id: 'VD-3002', name: 'Insurance Certificate', docNumber: 'INS-AXA-2024-ABC03', issueDate: '2024-01-15', expiryDate: '2025-01-15', status: 'verified', rejectionReason: null },
    { id: 'VD-3003', name: 'Vehicle Inspection', docNumber: null, issueDate: null, expiryDate: null, status: 'pending', rejectionReason: null },
  ],
  'VEH-007': [
    { id: 'VD-7001', name: 'Registration Certificate', docNumber: 'REG-SHJ-55555-2023', issueDate: '2023-08-01', expiryDate: '2025-08-01', status: 'pending', rejectionReason: null },
    { id: 'VD-7002', name: 'Insurance Certificate', docNumber: null, issueDate: null, expiryDate: null, status: 'missing', rejectionReason: null },
    { id: 'VD-7003', name: 'Vehicle Inspection', docNumber: null, issueDate: null, expiryDate: null, status: 'missing', rejectionReason: null },
  ],
}

/* ---- Maintenance records per vehicle ---- */

export const MOCK_VEHICLE_MAINTENANCE = {
  'VEH-001': [
    { id: 'MNT-1001', serviceDate: '2024-07-10', serviceType: 'Oil Change & Filter', mileage: 45000, description: 'Regular oil change, air filter replaced.', cost: 350, notes: 'Next service at 60,000 km.', technician: 'Quick Lube Dubai' },
    { id: 'MNT-1002', serviceDate: '2024-01-05', serviceType: 'Full Service', mileage: 30000, description: 'Full inspection, brake pads replaced, tire rotation.', cost: 1200, notes: 'All clear.', technician: 'Toyota Service Center' },
  ],
  'VEH-003': [
    { id: 'MNT-3001', serviceDate: '2024-08-28', serviceType: 'Engine Repair', mileage: 38000, description: 'Coolant leak detected. Radiator replaced.', cost: 2800, notes: 'Vehicle out of service until Sep 15.', technician: 'Hyundai Service Center' },
  ],
  'VEH-010': [
    { id: 'MNT-1001', serviceDate: '2024-05-17', serviceType: 'Delivery Inspection', mileage: 12000, description: 'Pre-delivery inspection completed.', cost: 0, notes: '', technician: 'Hyundai Ajman' },
  ],
}

/* ---- Rides per vehicle ---- */

export const MOCK_VEHICLE_RIDES = {
  'VEH-001': [
    { id: 'RID-5001', customer: 'Ali Hassan', driver: 'Ahmed Al-Mansoori', pickup: 'Dubai Mall', destination: 'Dubai Airport T3', fare: 85, status: 'completed', date: '2024-08-31T09:12:00Z' },
    { id: 'RID-5012', customer: 'Sara Ahmed', driver: 'Ahmed Al-Mansoori', pickup: 'JBR Beach', destination: 'DIFC', fare: 62, status: 'completed', date: '2024-08-30T17:40:00Z' },
    { id: 'RID-5023', customer: 'Raj Patel', driver: 'Ahmed Al-Mansoori', pickup: 'Marina Mall', destination: 'Business Bay', fare: 48, status: 'completed', date: '2024-08-30T14:15:00Z' },
  ],
  'VEH-004': [
    { id: 'RID-6001', customer: 'Fatima Noor', driver: 'Carlos Mendez', pickup: 'Yas Island', destination: 'Abu Dhabi Airport', fare: 95, status: 'completed', date: '2024-08-31T10:00:00Z' },
    { id: 'RID-6012', customer: 'Omar Saeed', driver: 'Carlos Mendez', pickup: 'Corniche', destination: 'Masdar City', fare: 78, status: 'completed', date: '2024-08-30T09:20:00Z' },
  ],
}

/* ---- History per vehicle ---- */

export const MOCK_VEHICLE_HISTORY = {
  'VEH-001': [
    { id: 'VH-1001', event: 'Vehicle registered and added to fleet', admin: 'Admin Vipin', timestamp: '2024-03-12T08:00:00Z', tone: 'done' },
    { id: 'VH-1002', event: 'Assigned to fleet: ABC Transport', admin: 'Admin Vipin', timestamp: '2024-03-12T08:05:00Z', tone: 'done' },
    { id: 'VH-1003', event: 'Registration Certificate verified', admin: 'Admin Sarah', timestamp: '2024-03-13T10:00:00Z', tone: 'done' },
    { id: 'VH-1004', event: 'Driver assigned: Ahmed Al-Mansoori', admin: 'Admin Vipin', timestamp: '2024-03-14T09:00:00Z', tone: 'done' },
    { id: 'VH-1005', event: 'Vehicle status changed to Active', admin: 'Admin Vipin', timestamp: '2024-03-14T09:05:00Z', tone: 'done' },
  ],
  'VEH-003': [
    { id: 'VH-3001', event: 'Vehicle registered and added to fleet', admin: 'Admin Vipin', timestamp: '2024-03-15T09:00:00Z', tone: 'done' },
    { id: 'VH-3002', event: 'Sent for maintenance — Engine repair required', admin: 'Admin Vipin', timestamp: '2024-08-28T08:00:00Z', tone: 'cancelled' },
    { id: 'VH-3003', event: 'Status changed to Under Maintenance', admin: 'Admin Vipin', timestamp: '2024-08-28T08:05:00Z', tone: 'cancelled' },
  ],
  'VEH-007': [
    { id: 'VH-7001', event: 'Vehicle registered — pending verification', admin: 'Admin Vipin', timestamp: '2024-08-01T12:00:00Z', tone: 'done' },
    { id: 'VH-7002', event: 'Assigned to fleet: Metro Taxi', admin: 'Admin Vipin', timestamp: '2024-08-01T12:05:00Z', tone: 'done' },
  ],
}
