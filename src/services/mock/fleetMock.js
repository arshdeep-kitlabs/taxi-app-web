/*
  Fleet Management — mock data
  Structured so each fleet is a fully self-contained organisation.
  Fleet data is never mixed across organisations.
*/

export const MOCK_FLEETS = [
  {
    id: 'FLT-001',
    name: 'ABC Transport',
    businessName: 'ABC Transport LLC',
    businessRegNo: 'DED-2021-00341',
    fleetType: 'taxi',
    owner: { name: 'John Smith', email: 'john.smith@abctransport.com', phone: '+971 50 123 4567', address: '12 Business Bay, Dubai', city: 'Dubai', country: 'UAE' },
    vehicles: 25,
    drivers: 20,
    activeRides: 8,
    status: 'active',
    city: 'Dubai',
    revenue: 284500,
    createdAt: '2024-03-12T08:00:00Z',
    submittedAt: '2024-03-10T10:30:00Z',
  },
  {
    id: 'FLT-002',
    name: 'City Cabs',
    businessName: 'City Cabs International',
    businessRegNo: 'ADCCI-2020-88712',
    fleetType: 'taxi',
    owner: { name: 'David Lee', email: 'david.lee@citycabs.ae', phone: '+971 55 987 6543', address: '5 Corniche Road, Abu Dhabi', city: 'Abu Dhabi', country: 'UAE' },
    vehicles: 40,
    drivers: 37,
    activeRides: 14,
    status: 'active',
    city: 'Abu Dhabi',
    revenue: 512000,
    createdAt: '2024-01-20T09:30:00Z',
    submittedAt: '2024-01-18T08:00:00Z',
  },
  {
    id: 'FLT-003',
    name: 'Metro Taxi',
    businessName: 'Metro Taxi Services Co.',
    businessRegNo: 'SCT-2024-10045',
    fleetType: 'taxi',
    owner: { name: 'Sarah Khan', email: 'sarah.khan@metrotaxi.ae', phone: '+971 52 456 7890', address: '88 Al Wahda Street, Sharjah', city: 'Sharjah', country: 'UAE' },
    vehicles: 15,
    drivers: 13,
    activeRides: 0,
    status: 'pending',
    city: 'Sharjah',
    revenue: 0,
    createdAt: '2024-08-01T11:00:00Z',
    submittedAt: '2024-08-01T11:00:00Z',
  },
  {
    id: 'FLT-004',
    name: 'Express Cars',
    businessName: 'Express Cars & Transport LLC',
    businessRegNo: 'DED-2019-77420',
    fleetType: 'transportation',
    owner: { name: 'Mike Wilson', email: 'mike.wilson@expresscars.ae', phone: '+971 54 321 0987', address: '20 Sheikh Zayed Road, Dubai', city: 'Dubai', country: 'UAE' },
    vehicles: 60,
    drivers: 54,
    activeRides: 21,
    status: 'suspended',
    city: 'Dubai',
    revenue: 923400,
    createdAt: '2023-11-05T07:00:00Z',
    submittedAt: '2023-11-03T09:00:00Z',
  },
  {
    id: 'FLT-005',
    name: 'Gulf Rides',
    businessName: 'Gulf Rides FZE',
    businessRegNo: 'AFZA-2024-03391',
    fleetType: 'private',
    owner: { name: 'Fatima Al-Rashid', email: 'fatima@gulrides.ae', phone: '+971 50 654 3210', address: '3 Industrial Area, Ajman', city: 'Ajman', country: 'UAE' },
    vehicles: 18,
    drivers: 16,
    activeRides: 3,
    status: 'active',
    city: 'Ajman',
    revenue: 148700,
    createdAt: '2024-05-17T10:00:00Z',
    submittedAt: '2024-05-15T12:00:00Z',
  },
  {
    id: 'FLT-006',
    name: 'Desert Drive',
    businessName: 'Desert Drive Transport',
    businessRegNo: 'FCCT-2024-00512',
    fleetType: 'corporate',
    owner: { name: 'Omar Hassan', email: 'omar@desertdrive.ae', phone: '+971 56 789 0123', address: '7 Al Gurfa Road, Fujairah', city: 'Fujairah', country: 'UAE' },
    vehicles: 8,
    drivers: 6,
    activeRides: 0,
    status: 'inactive',
    city: 'Fujairah',
    revenue: 32100,
    createdAt: '2024-02-28T14:00:00Z',
    submittedAt: '2024-02-26T11:00:00Z',
  },
]

export const MOCK_FLEET_STATS = {
  totalFleets: 6,
  activeFleets: 3,
  pendingFleets: 1,
  suspendedFleets: 1,
  totalVehicles: 166,
  activeVehicles: 129,
  totalFleetDrivers: 146,
}

/* --- Application documents per fleet --- */

export const MOCK_FLEET_DOCUMENTS = {
  'FLT-001': [
    { id: 'DOC-1001', name: 'Business Registration Certificate', docNumber: 'DED-2021-00341',       uploadedAt: '2024-03-10T10:00:00Z', issueDate: '2021-03-10', expiryDate: '2026-03-10', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-1002', name: 'Operating License',                  docNumber: 'RTA-OL-2021-4451',     uploadedAt: '2024-03-10T10:05:00Z', issueDate: '2021-03-10', expiryDate: '2025-12-31', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-1003', name: 'Fleet Insurance Certificate',        docNumber: 'INS-2024-NN-1104',     uploadedAt: '2024-03-10T10:08:00Z', issueDate: '2024-03-10', expiryDate: '2025-03-10', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-1004', name: 'Tax Registration Certificate',       docNumber: 'TRN-100123456700003',  uploadedAt: '2024-03-10T10:10:00Z', issueDate: '2021-01-01', expiryDate: null,          status: 'verified',  rejectionReason: null, reuploadRequested: false },
  ],
  'FLT-002': [
    { id: 'DOC-2001', name: 'Business Registration Certificate', docNumber: 'ADDED-2022-00812',     uploadedAt: '2024-01-18T09:00:00Z', issueDate: '2022-01-18', expiryDate: '2027-01-18', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-2002', name: 'Operating License',                  docNumber: 'RTA-OL-2022-9910',     uploadedAt: '2024-01-18T09:05:00Z', issueDate: '2022-01-18', expiryDate: '2024-10-01', status: 'expired',   rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-2003', name: 'Fleet Insurance Certificate',        docNumber: 'INS-2024-AXA-0099',   uploadedAt: '2024-01-18T09:08:00Z', issueDate: '2024-01-18', expiryDate: '2025-01-18', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-2004', name: 'Tax Registration Certificate',       docNumber: 'TRN-200456789100001',  uploadedAt: '2024-01-18T09:10:00Z', issueDate: '2022-05-01', expiryDate: null,          status: 'verified',  rejectionReason: null, reuploadRequested: false },
  ],
  'FLT-003': [
    { id: 'DOC-3001', name: 'Business Registration Certificate', docNumber: 'SCT-2024-10045',       uploadedAt: '2024-08-01T11:05:00Z', issueDate: '2024-07-01', expiryDate: '2026-08-01', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-3002', name: 'Operating License',                  docNumber: 'RTA-OL-2024-7712',     uploadedAt: '2024-08-01T11:08:00Z', issueDate: '2024-07-15', expiryDate: '2025-08-01', status: 'pending',   rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-3003', name: 'Fleet Insurance Certificate',        docNumber: 'INS-2024-AXA-0032',   uploadedAt: '2024-08-01T11:10:00Z', issueDate: '2024-07-20', expiryDate: '2025-03-31', status: 'pending',   rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-3004', name: 'Tax Registration Certificate',       docNumber: null,                   uploadedAt: null,                   issueDate: null,          expiryDate: null,          status: 'missing',   rejectionReason: null, reuploadRequested: false },
  ],
  'FLT-004': [
    { id: 'DOC-4001', name: 'Business Registration Certificate', docNumber: 'DED-2023-05510',       uploadedAt: '2024-04-10T08:00:00Z', issueDate: '2023-04-10', expiryDate: '2026-04-10', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-4002', name: 'Operating License',                  docNumber: 'RTA-OL-2023-1122',     uploadedAt: '2024-04-10T08:05:00Z', issueDate: '2023-04-10', expiryDate: '2026-04-10', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-4003', name: 'Fleet Insurance Certificate',        docNumber: 'INS-2023-GL-0055',    uploadedAt: '2024-04-10T08:08:00Z', issueDate: '2023-04-10', expiryDate: '2024-09-15', status: 'expired',   rejectionReason: null, reuploadRequested: true },
    { id: 'DOC-4004', name: 'Tax Registration Certificate',       docNumber: null,                   uploadedAt: null,                   issueDate: null,          expiryDate: null,          status: 'missing',   rejectionReason: null, reuploadRequested: false },
  ],
  'FLT-005': [
    { id: 'DOC-5001', name: 'Business Registration Certificate', docNumber: 'GRV-2024-88001',       uploadedAt: '2024-06-12T10:00:00Z', issueDate: '2024-06-01', expiryDate: '2027-06-01', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-5002', name: 'Operating License',                  docNumber: 'RTA-OL-2024-5533',     uploadedAt: '2024-06-12T10:05:00Z', issueDate: '2024-06-01', expiryDate: '2026-06-01', status: 'verified',  rejectionReason: null, reuploadRequested: false },
    { id: 'DOC-5003', name: 'Fleet Insurance Certificate',        docNumber: 'INS-2024-RSA-0041',   uploadedAt: '2024-06-12T10:08:00Z', issueDate: '2024-06-01', expiryDate: '2025-06-01', status: 'rejected',  rejectionReason: 'Insurance certificate appears to be invalid. Please re-upload a valid certificate.', reuploadRequested: true },
    { id: 'DOC-5004', name: 'Tax Registration Certificate',       docNumber: 'TRN-500345678900002',  uploadedAt: '2024-06-12T10:10:00Z', issueDate: '2024-01-01', expiryDate: null,          status: 'verified',  rejectionReason: null, reuploadRequested: false },
  ],
}

/* --- Application history per fleet --- */

export const MOCK_FLEET_HISTORY = {
  'FLT-003': [
    { id: 'EVT-3001', event: 'Application submitted by fleet owner', admin: null, timestamp: '2024-08-01T11:00:00Z', tone: 'done' },
    { id: 'EVT-3002', event: 'Business Registration Certificate uploaded', admin: null, timestamp: '2024-08-01T11:05:00Z', tone: 'done' },
    { id: 'EVT-3003', event: 'Operating License uploaded', admin: null, timestamp: '2024-08-01T11:08:00Z', tone: 'done' },
    { id: 'EVT-3004', event: 'Fleet Insurance Certificate uploaded', admin: null, timestamp: '2024-08-01T11:10:00Z', tone: 'done' },
    { id: 'EVT-3005', event: 'Business Registration Certificate verified by Admin Vipin', admin: 'Admin Vipin', timestamp: '2024-08-05T09:30:00Z', tone: 'done' },
  ],
  'FLT-001': [
    { id: 'EVT-1001', event: 'Application submitted', admin: null, timestamp: '2024-03-10T10:30:00Z', tone: 'done' },
    { id: 'EVT-1002', event: 'All documents uploaded', admin: null, timestamp: '2024-03-10T10:30:00Z', tone: 'done' },
    { id: 'EVT-1003', event: 'All documents verified by Admin Sarah', admin: 'Admin Sarah', timestamp: '2024-03-11T14:00:00Z', tone: 'done' },
    { id: 'EVT-1004', event: 'Fleet approved by Admin Sarah', admin: 'Admin Sarah', timestamp: '2024-03-12T08:00:00Z', tone: 'done' },
  ],
}

/* --- Fleet detail mock data --- */

export const MOCK_FLEET_DRIVERS = {
  'FLT-001': [
    { id: 'DRV-101', name: 'Ahmed Al-Mansoori', phone: '+971 50 111 2222', rating: 4.8, rides: 312, status: 'active' },
    { id: 'DRV-102', name: 'Ravi Kumar', phone: '+971 55 333 4444', rating: 4.6, rides: 198, status: 'active' },
    { id: 'DRV-103', name: 'James Okonkwo', phone: '+971 52 555 6666', rating: 4.9, rides: 425, status: 'active' },
    { id: 'DRV-104', name: 'Priya Nair', phone: '+971 54 777 8888', rating: 4.3, rides: 87, status: 'suspended' },
  ],
  'FLT-002': [
    { id: 'DRV-201', name: 'Carlos Mendez', phone: '+971 50 222 3333', rating: 4.7, rides: 541, status: 'active' },
    { id: 'DRV-202', name: 'Li Wei', phone: '+971 55 444 5555', rating: 4.5, rides: 270, status: 'active' },
  ],
}

export const MOCK_FLEET_VEHICLES = {
  'FLT-001': [
    { id: 'VEH-101', plate: 'DXB A 12345', make: 'Toyota', model: 'Camry', year: 2023, type: 'Sedan', status: 'active' },
    { id: 'VEH-102', plate: 'DXB B 23456', make: 'Honda', model: 'Accord', year: 2022, type: 'Sedan', status: 'active' },
    { id: 'VEH-103', plate: 'DXB C 34567', make: 'Hyundai', model: 'Tucson', year: 2023, type: 'SUV', status: 'maintenance' },
  ],
  'FLT-002': [
    { id: 'VEH-201', plate: 'AUH A 11111', make: 'Kia', model: 'Sportage', year: 2024, type: 'SUV', status: 'active' },
    { id: 'VEH-202', plate: 'AUH B 22222', make: 'Toyota', model: 'Corolla', year: 2023, type: 'Sedan', status: 'active' },
  ],
}

export const MOCK_FLEET_ASSIGNMENTS = {
  'FLT-001': [
    { id: 'ASN-101', driver: 'Ahmed Al-Mansoori', vehicle: 'Toyota Camry — DXB A 12345', assignedAt: '2024-06-01T08:00:00Z', status: 'active' },
    { id: 'ASN-102', driver: 'Ravi Kumar', vehicle: 'Honda Accord — DXB B 23456', assignedAt: '2024-06-15T09:00:00Z', status: 'active' },
  ],
}

export const MOCK_FLEET_RECENT_RIDES = {
  'FLT-001': [
    { id: 'RID-5001', driver: 'Ahmed Al-Mansoori', pickup: 'Dubai Mall', dropoff: 'Dubai Airport T3', fare: 85, status: 'completed', at: '2024-08-31T09:12:00Z' },
    { id: 'RID-5002', driver: 'James Okonkwo', pickup: 'JBR', dropoff: 'Downtown Dubai', fare: 42, status: 'completed', at: '2024-08-31T08:45:00Z' },
    { id: 'RID-5003', driver: 'Ravi Kumar', pickup: 'Marina Mall', dropoff: 'DIFC', fare: 55, status: 'active', at: '2024-08-31T10:05:00Z' },
  ],
}
