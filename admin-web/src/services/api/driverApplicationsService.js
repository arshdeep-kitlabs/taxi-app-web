import { apiClient } from './client'
import { recordAuditLog } from '../audit/auditLog'

/*
  Driver applications, as the review screens use them.

  The API answers with the document ids and labels straight from config, so
  nothing here keeps its own list of what a driver has to provide — a new
  document type appears on these screens without an admin release.
*/

/**
 * Per-document decisions a reviewer has taken but not yet sent.
 *
 * The backend has no per-document review: approve_document and reject_document
 * are stubs that write nothing. So a decision lives here, keyed by driver,
 * until "Request changes" sends the rejected ones together as one body — which
 * is the call that does persist. Cleared once that goes in.
 *
 * It is deliberately not in React state: the realtime context replaces the
 * whole application object on every call, and these marks have to outlive that.
 */
const draftReviews = new Map()

const draftFor = (driverId) => draftReviews.get(driverId) ?? {}

/** The last segment of an uploaded url, which is as close to a file name as we have. */
function fileNameOf(url) {
  if (!url) return null
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? url)
  } catch {
    return url.split('/').pop() ?? url
  }
}

export function summarizeDocuments(application) {
  const documents = application.documents ?? []

  // A list row carries its own counts and no documents; a detail carries the
  // documents and no counts. Both render the same "3/7" cell.
  if (!documents.length) {
    return {
      documentsSubmitted: application.documentsSubmitted ?? 0,
      documentsRequired: application.documentsRequired ?? 0,
    }
  }

  return {
    documentsSubmitted: documents.filter((doc) => doc.status !== 'missing').length,
    documentsRequired: documents.filter((doc) => doc.mandatory).length,
  }
}

/**
 * Whether Approve should be offered.
 *
 * Not "every document approved" — there is no per-document approval stored, so
 * that could never become true. What matters is that the application is still
 * open, every mandatory document is in, and the reviewer has not just marked
 * something as needing redoing.
 */
export function canApproveApplication(application) {
  const documents = application.documents ?? []
  if (!documents.length) return false
  if (['approved', 'rejected'].includes(application.status)) return false
  if (documents.some((doc) => doc.status === 'rejected' || doc.status === 'reupload_requested')) {
    return false
  }
  return documents.every((doc) => !doc.mandatory || doc.status !== 'missing')
}

/** The documents a reviewer has marked, in the shape request_changes takes. */
export function documentsToResubmit(application) {
  const draft = draftFor(application.id)
  return (application.documents ?? [])
    .filter((doc) => REFUSED.includes(draft[doc.id]?.status))
    .map((doc) => ({
      id: doc.id,
      reason: draft[doc.id].reviewNote || 'Please upload this document again.',
    }))
}

/** The two marks that mean a document was not accepted. */
const REFUSED = ['rejected', 'reupload_requested']

export async function getApplications() {
  const res = await apiClient.get('/admin/applications')
  return res.data.rows.map(normalizeApplication)
}

export async function getApplicationById(driverId) {
  const res = await apiClient.get(`/admin/applications/${driverId}`)
  return normalizeApplicationDetail(res.data)
}

/**
 * Marks one document. Held locally until the application decision is sent —
 * see draftReviews above.
 */
export async function updateDocumentStatus(driverId, documentId, { status, reviewNote = null }) {
  const draft = { ...draftFor(driverId) }

  // Every decision is kept, approvals included. Only the refusals are sent
  // with the application decision, but a reviewer working down a long list
  // needs to see which ones they have already cleared.
  draft[documentId] = { status, reviewNote }
  draftReviews.set(driverId, draft)

  recordAuditLog({
    action: `Marked document ${status}`,
    entityType: 'Application',
    entityLabel: `${driverId} · ${documentId}`,
    before: null,
    after: status,
  })

  const res = await apiClient.get(`/admin/applications/${driverId}`)
  return normalizeApplicationDetail(res.data)
}

export async function updateApplicationStatus(driverId, status, { reason = null } = {}) {
  let body

  if (status === 'approved') {
    body = { action: 'approve_application' }
  } else if (status === 'rejected') {
    // A rejection is final, so nothing reopens — but any document the reviewer
    // marked still travels, or the driver is refused with no explanation of
    // which part was the problem.
    const documents = documentsToResubmit({ id: driverId, documents: await documentsOf(driverId) })
    body = {
      action: 'reject_application',
      reason: reason ?? '',
      ...(documents.length ? { documents } : {}),
    }
  } else {
    // Sending it back names the documents to redo, each with its own reason.
    const documents = documentsToResubmit({ id: driverId, documents: await documentsOf(driverId) })
    if (!documents.length) {
      throw new Error('Mark at least one document for re-upload before requesting changes.')
    }
    body = { action: 'request_changes', message: reason ?? '', documents }
  }

  // The call answers with the application as it now stands, so there is
  // nothing to fetch back.
  const res = await apiClient.patch(`/admin/applications/${driverId}`, body)

  // The decision is in, so the marks behind it have been spent.
  draftReviews.delete(driverId)

  recordAuditLog({
    action: `Application ${status.replace('_', ' ')}`,
    entityType: 'Application',
    entityLabel: driverId,
    before: null,
    after: status,
  })

  return normalizeApplicationDetail(res.data)
}

async function documentsOf(driverId) {
  const res = await apiClient.get(`/admin/applications/${driverId}`)
  return normalizeApplicationDetail(res.data).documents
}

// ─── Normalizers ─────────────────────────────────────────────────────────────
// Map the API's shape onto the one the screens render, so no page component
// has to know how the backend words things.

function normalizeApplication(row) {
  return {
    id: row.driverId,
    driverName: row.driverName ?? 'Unknown',
    applicationId: row.applicationId,
    submittedAt: row.submittedAt,
    documentsSubmitted: row.documentsUploaded,
    documentsRequired: row.documentsRequired,
    status: row.status,
    rejectedDocuments: row.rejectedDocuments ?? [],
    documents: [],
  }
}

function normalizeApplicationDetail(data) {
  const draft = draftFor(data.driverId)

  return {
    id: data.driverId,
    driverName: data.driverName ?? 'Unknown',
    applicationId: data.applicationId,
    submittedAt: data.submittedAt,
    reviewedAt: data.reviewedAt,
    status: data.status,
    rejection: data.rejection ?? null,
    driver: data.driver,
    vehicle: data.vehicle,
    documents: (data.documents ?? []).map((doc) => normalizeDocument(doc, draft[doc.id])),
  }
}

/**
 * One document row.
 *
 * `status` is worked out rather than stored: an unsent mark from this session
 * wins, then whether an admin has already sent it back, then whether the
 * driver has uploaded everything it asks for.
 */
function normalizeDocument(doc, mark) {
  const slots = Object.entries(doc.images ?? {})
  const first = slots[0]?.[1] ?? null

  return {
    id: doc.id,
    type: doc.id,
    label: doc.label,
    mandatory: doc.isMandatory,
    typeLabel: doc.typeLabel,
    status:
      mark?.status ??
      (doc.isRejected ? 'rejected' : slots.length === 0 ? 'missing' : 'submitted'),
    reviewNote: mark?.reviewNote ?? doc.rejectionReason ?? null,
    images: doc.images ?? {},
    expectedImages: doc.expectedImages ?? [],
    fields: doc.fields ?? [],
    fileName: fileNameOf(first?.url),
    uploadedAt: first?.uploadedAt ?? null,
    isComplete: doc.isComplete === 1,
  }
}
