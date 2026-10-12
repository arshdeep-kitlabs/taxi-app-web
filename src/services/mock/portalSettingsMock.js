/*
  Extended fleet profile data for the Fleet Owner Portal.
  This supplements the core fleet mock with full business, contact,
  and operating information — the kind a fleet owner can edit themselves.

  In production this lives in a `fleet_profiles` table, separate from
  the Nomad admin `fleets` table, with row-level security tied to fleet_id.
*/

export const MOCK_FLEET_PROFILES = {
  'FLT-001': {
    fleetId: 'FLT-001',

    /* Fleet Information ─────────────────────────────────────────────── */
    name:      'Gulf Rides Co.',
    fleetType: 'taxi',           // taxi | private_hire | transportation | courier
    city:      'Dubai',
    country:   'UAE',
    status:    'active',
    createdAt: '2025-01-10T08:00:00Z',

    /* Business Information ───────────────────────────────────────────── */
    businessName:      'Gulf Rides LLC',
    businessRegNo:     'DED-2024-08812',
    taxRegistrationNo: 'TRN-100456789000001',
    vatRegistered:     true,
    businessAddress:   '14 Business Bay Tower, Sheikh Zayed Road',
    businessCity:      'Dubai',
    businessCountry:   'UAE',
    businessPostalCode:'P.O.Box 12456',

    /* Contact Information ────────────────────────────────────────────── */
    primaryContactName:    'Ahmed Al-Rashid',
    primaryContactEmail:   'ahmed.rashid@gulfridesCo.ae',
    primaryContactPhone:   '+971 50 123 7890',
    primaryContactTitle:   'Fleet Owner',
    secondaryContactName:  'Sara Hassan',
    secondaryContactEmail: 'sara.hassan@gulfridesCo.ae',
    secondaryContactPhone: '+971 55 234 5678',
    secondaryContactTitle: 'Fleet Manager',
    emergencyContactName:  'Gulf Rides Operations',
    emergencyContactPhone: '+971 4 789 0123',

    /* Operating Information ─────────────────────────────────────────── */
    operatingHoursFrom: '05:00',
    operatingHoursTo:   '23:59',
    operatingDays:      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    serviceAreas:       ['Dubai', 'Sharjah', 'Ajman'],
    vehicleTypesOffered:['Sedan', 'SUV', 'Minivan'],
    maxVehicleCapacity: 50,
    maxDriverCapacity:  50,
    specialServices:    ['Airport Transfers', 'Corporate Accounts', 'Long Distance'],
    notes:              'Primary operations in downtown Dubai and airport corridors.',
  },

  'FLT-002': {
    fleetId: 'FLT-002',
    name: 'Desert Express', fleetType: 'taxi', city: 'Abu Dhabi', country: 'UAE', status: 'active',
    createdAt: '2025-02-01T09:00:00Z',
    businessName: 'Desert Express Transport LLC', businessRegNo: 'ADCCI-2024-55123',
    taxRegistrationNo: 'TRN-200789012000002', vatRegistered: true,
    businessAddress: '7 Corniche Road', businessCity: 'Abu Dhabi', businessCountry: 'UAE', businessPostalCode: 'P.O.Box 99301',
    primaryContactName: 'Fatima Al-Marzooqi', primaryContactEmail: 'fatima@desertexpress.ae', primaryContactPhone: '+971 50 987 6543',
    primaryContactTitle: 'Fleet Owner',
    secondaryContactName: 'Rami Shahin', secondaryContactEmail: 'rami.s@desertexpress.ae', secondaryContactPhone: '+971 55 876 5432',
    secondaryContactTitle: 'Fleet Manager',
    emergencyContactName: 'Desert Express Ops', emergencyContactPhone: '+971 2 456 7890',
    operatingHoursFrom: '06:00', operatingHoursTo: '23:00',
    operatingDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    serviceAreas: ['Abu Dhabi', 'Al Ain', 'Dubai'], vehicleTypesOffered: ['Sedan', 'SUV'],
    maxVehicleCapacity: 60, maxDriverCapacity: 60, specialServices: ['Airport Transfers'], notes: '',
  },
}
