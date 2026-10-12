import { DOCUMENT_TYPES } from '../../utils/documentTypes'

/*
  Canonical mock fixtures for driver applications — the full detail
  (personal info + documents) that both the Dashboard summary panel and
  the Application Review screen read from. This is the file to swap for
  real API calls when a backend exists.
*/

const now = Date.now()
const minutesAgo = (mins) => new Date(now - mins * 60_000).toISOString()
const hoursAgo = (hrs) => new Date(now - hrs * 3_600_000).toISOString()
const daysAgo = (days) => new Date(now - days * 86_400_000).toISOString()

let documentSequence = 1

function nextDocumentId() {
  documentSequence += 1
  return `DOC-${documentSequence}`
}

function makeDocument({ type, mandatory, status = 'submitted', uploadedAt, reviewNote }) {
  const label = DOCUMENT_TYPES.find((doc) => doc.key === type)?.label ?? 'Document'
  return {
    id: nextDocumentId(),
    type,
    label,
    mandatory,
    fileName: `${type}_${Math.random().toString(36).slice(2, 8)}.jpg`,
    uploadedAt: uploadedAt ?? minutesAgo(Math.floor(Math.random() * 500)),
    status, // submitted | approved | rejected | reupload_requested
    reviewNote: reviewNote ?? null,
  }
}

/** Builds the full mandatory document set (all "submitted", untouched). */
function fullDocumentSet(submittedAt, overrides = {}) {
  return DOCUMENT_TYPES.filter((doc) => doc.mandatory).map((doc) =>
    makeDocument({
      type: doc.key,
      mandatory: true,
      uploadedAt: submittedAt,
      ...(overrides[doc.key] ?? {}),
    }),
  )
}

function personalInfoFor(fullName, city) {
  const [first, last] = fullName.split(' ')
  const handle = `${first}.${last}`.toLowerCase()
  return {
    fullName,
    email: `${handle}@mailbox.com`,
    phone: `+1 (555) ${100 + Math.floor(Math.random() * 800)}-${1000 + Math.floor(Math.random() * 8999)}`,
    dateOfBirth: '1994-06-12',
    address: `${20 + Math.floor(Math.random() * 900)} Maple Street`,
    city,
    vehicle: {
      make: 'Toyota',
      model: 'Camry',
      year: 2021,
      plate: `NM-${1000 + Math.floor(Math.random() * 8999)}`,
    },
  }
}

export const initialApplications = [
  {
    id: 'DA-10487',
    driverName: 'Amara Chen',
    submittedAt: minutesAgo(8),
    status: 'pending_review',
    personal: personalInfoFor('Amara Chen', 'Downtown Metro'),
    documents: fullDocumentSet(minutesAgo(8)),
  },
  {
    id: 'DA-10486',
    driverName: 'Diego Alvarez',
    submittedAt: minutesAgo(52),
    status: 'pending_review',
    personal: personalInfoFor('Diego Alvarez', 'Riverside'),
    documents: DOCUMENT_TYPES.filter((doc) => doc.mandatory)
      .slice(0, 5)
      .map((doc) => makeDocument({ type: doc.key, mandatory: true, uploadedAt: minutesAgo(52) })),
  },
  {
    id: 'DA-10484',
    driverName: 'Noor Haddad',
    submittedAt: hoursAgo(3),
    status: 'in_review',
    personal: personalInfoFor('Noor Haddad', 'Airport Zone'),
    documents: fullDocumentSet(hoursAgo(3), {
      identity_proof: { status: 'approved' },
      driving_license: { status: 'approved' },
    }),
  },
  {
    id: 'DA-10481',
    driverName: 'Theo Rossi',
    submittedAt: hoursAgo(6),
    status: 'changes_requested',
    personal: personalInfoFor('Theo Rossi', 'Northgate'),
    documents: [
      ...DOCUMENT_TYPES.filter((doc) => doc.mandatory && doc.key !== 'insurance').map((doc) =>
        makeDocument({ type: doc.key, mandatory: true, uploadedAt: hoursAgo(6), status: 'approved' }),
      ),
      makeDocument({
        type: 'insurance',
        mandatory: true,
        uploadedAt: hoursAgo(6),
        status: 'rejected',
        reviewNote: 'Policy document has expired. Please upload a current insurance certificate.',
      }),
    ],
  },
  {
    id: 'DA-10478',
    driverName: 'Keiko Kimura',
    submittedAt: hoursAgo(9),
    status: 'pending_review',
    personal: personalInfoFor('Keiko Kimura', 'Old Town'),
    documents: [
      ...fullDocumentSet(hoursAgo(9)),
      makeDocument({ type: 'other', mandatory: false, uploadedAt: hoursAgo(9), status: 'submitted' }),
    ],
  },
  {
    id: 'DA-10462',
    driverName: 'Farrukh Yusuf',
    submittedAt: daysAgo(2),
    status: 'approved',
    personal: personalInfoFor('Farrukh Yusuf', 'Downtown Metro'),
    documents: fullDocumentSet(daysAgo(2), {
      identity_proof: { status: 'approved' },
      driving_license: { status: 'approved' },
      address_proof: { status: 'approved' },
      vehicle_registration: { status: 'approved' },
      insurance: { status: 'approved' },
      vehicle_photos: { status: 'approved' },
    }),
  },
  {
    id: 'DA-10455',
    driverName: 'Sofia Petrova',
    submittedAt: daysAgo(4),
    status: 'rejected',
    personal: personalInfoFor('Sofia Petrova', 'Riverside'),
    documents: fullDocumentSet(daysAgo(4), {
      identity_proof: {
        status: 'rejected',
        reviewNote: 'Government ID photo is blurred and illegible.',
      },
    }),
  },
]
