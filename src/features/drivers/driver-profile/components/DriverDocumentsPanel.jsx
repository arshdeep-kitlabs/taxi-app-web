import { useState } from 'react'
import { DocumentStatusBadge } from '../../../../components/ui/StatusBadge'
import { DocumentPreviewModal } from '../../../../components/ui/DocumentPreviewModal'
import { FileTextIcon } from '../../../../components/icons'
import styles from './DriverDocumentsPanel.module.css'

/**
 * On-file document verification status for an active driver. The
 * originating files were reviewed during their application — this panel
 * lets an admin re-open any of them without leaving the driver's profile.
 */
export function DriverDocumentsPanel({ driver }) {
  const [previewDocument, setPreviewDocument] = useState(null)

  // Straight from GET /admin/drivers/:driverId, which lists every document
  // with the images behind it. It used to invent this list, file names and all.
  const documents = (driver.documents ?? []).map((doc) => {
    const first = Object.values(doc.images ?? {})[0] ?? null
    return {
      id: doc.id,
      type: doc.id,
      label: doc.label,
      mandatory: doc.isMandatory,
      images: doc.images ?? {},
      fields: doc.fields ?? [],
      fileName: first?.url ?? null,
      uploadedAt: first?.uploadedAt ?? null,
      reviewNote: doc.rejectionReason,
      status: doc.isRejected
        ? 'rejected'
        : Object.keys(doc.images ?? {}).length === 0
          ? 'missing'
          : 'submitted',
    }
  })

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Documents</span>
          <div className="panel-header__subtitle">Verified at application time</div>
        </div>
      </div>

      <div className={styles.list}>
        {documents.map((document) => (
          <div className={styles.row} key={document.id}>
            <span className={styles.iconWrap}>
              <FileTextIcon size={16} />
            </span>
            <span className={styles.label}>{document.label}</span>
            <DocumentStatusBadge status={document.status} />
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPreviewDocument(document)}
            >
              View
            </button>
          </div>
        ))}
      </div>

      {previewDocument && (
        <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
      )}
    </div>
  )
}
