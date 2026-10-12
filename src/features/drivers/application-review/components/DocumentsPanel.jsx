import { DocumentStatusBadge } from '../../../../components/ui/StatusBadge'
import { FileTextIcon } from '../../../../components/icons'
import { formatRelativeTime } from '../../../../utils/formatters'
import styles from './DocumentsPanel.module.css'

function DocumentRow({ document, readOnly, onView, onApprove, onReject, onRequestReupload }) {
  if (!document) return null
  const isMissing = document.status === 'missing'

  return (
    <div className={`${styles.row} ${isMissing ? styles['row--missing'] : ''}`}>
      <span className={styles.iconWrap}>
        <FileTextIcon size={18} />
      </span>

      <div className={styles.info}>
        <div className={styles.labelRow}>
          <span className={styles.label}>{document.label}</span>
          <span className={styles.mandatoryTag}>{document.mandatory ? 'Mandatory' : 'Optional'}</span>
        </div>
        <span className={styles.meta}>
          {isMissing
            ? 'Not yet submitted by driver'
            : `${Object.keys(document.images ?? {}).length} image(s)` +
              (document.typeLabel ? ` · ${document.typeLabel}` : '') +
              (document.uploadedAt ? ` · ${formatRelativeTime(document.uploadedAt)}` : '')}
        </span>
        {document.reviewNote && <span className={styles.reviewNote}>{document.reviewNote}</span>}
      </div>

      <span className={styles.status}>
        <DocumentStatusBadge status={document.status} />
      </span>

      {!isMissing && (
        <div className={styles.actions}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onView(document)}>
            View
          </button>
          {!readOnly && (
            <>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={document.status === 'approved'}
                onClick={() => onApprove(document)}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                disabled={document.status === 'rejected'}
                onClick={() => onReject(document)}
              >
                Reject
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={document.status === 'reupload_requested'}
                onClick={() => onRequestReupload(document)}
              >
                Request Re-upload
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * All documents submitted by the driver — mandatory categories always show
 * a row (a "Missing" placeholder if not yet submitted), followed by any
 * optional/other documents. `readOnly` disables per-document actions once
 * the application has reached a final decision.
 */
export function DocumentsPanel({ application, readOnly, onView, onApprove, onReject, onRequestReupload }) {
  // The API lists every document the checklist asks for, uploaded or not, and
  // says which are mandatory — so the order is simply mandatory first.
  const rows = [...(application.documents ?? [])].sort(
    (a, b) => Number(b.mandatory) - Number(a.mandatory),
  )

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Submitted Documents</span>
          <div className="panel-header__subtitle">
            Identity proof, driving license, address proof, vehicle registration, insurance and vehicle photos
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {rows.map((document) => (
          <DocumentRow
            key={document.id ?? document.type}
            document={document}
            readOnly={readOnly}
            onView={onView}
            onApprove={onApprove}
            onReject={onReject}
            onRequestReupload={onRequestReupload}
          />
        ))}
      </div>
    </div>
  )
}
