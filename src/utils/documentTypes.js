/*
  Canonical document categories for a driver application, shared between
  the Application Review screen and a driver's Documents panel on their
  profile, so the two never drift out of sync.
*/
export const DOCUMENT_TYPES = [
  { key: 'identity_proof', label: 'Identity Proof', mandatory: true },
  { key: 'driving_license', label: 'Driving License', mandatory: true },
  { key: 'address_proof', label: 'Address Proof', mandatory: true },
  { key: 'vehicle_registration', label: 'Vehicle Registration', mandatory: true },
  { key: 'insurance', label: 'Insurance', mandatory: true },
  { key: 'vehicle_photos', label: 'Vehicle Photos', mandatory: true },
  { key: 'other', label: 'Other Document', mandatory: false },
]

export const MANDATORY_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((doc) => doc.mandatory)

export function getDocumentLabel(type) {
  return DOCUMENT_TYPES.find((doc) => doc.key === type)?.label ?? type
}
