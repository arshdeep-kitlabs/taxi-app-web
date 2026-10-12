import { Modal } from './Modal'
import { DocumentStatusBadge } from './StatusBadge'
import { FileTextIcon } from '../icons'
import { formatDateTime } from '../../utils/formatters'
import styles from './DocumentPreviewModal.module.css'

export function DocumentPreviewModal({ document, onClose }) {
  const images = Object.entries(document.images ?? {})

  return (
    <Modal
      title={document.label}
      size="wide"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {images.length === 0 ? (
        <div className={styles.preview}>
          <FileTextIcon size={32} />
          <span>No image uploaded yet</span>
        </div>
      ) : (
          // A document is a set of photos, not one file — a passport has two
          // sides, a profile photo three angles. All of them, so a reviewer
          // never has to guess which one they are looking at.
          <div className={styles.images}>
            {images.map(([slot, image]) => (
              <figure key={slot} className={styles.image}>
                {/*
                  Opens the file itself in a new tab. However large this modal
                  is, a reviewer checking an expiry date or a licence number
                  eventually wants the browser's own zoom on the original.
                */}
                <a
                  className={styles.imageLink}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open the full-size image in a new tab"
                >
                  <img src={image.url} alt={`${document.label} — ${slot}`} loading="lazy" />
                </a>
                <figcaption className={styles.imageCaption}>
                  <span>{slot}</span>
                  <span className={styles.openHint}>Open full size ↗</span>
                </figcaption>
              </figure>
          ))}
        </div>
      )}

      <div className={styles.meta}>
        <div>
          <div className={styles.metaLabel}>Images</div>
          <div className={styles.metaValue}>
            {images.length ? images.map(([slot]) => slot).join(', ') : 'None uploaded'}
          </div>
        </div>
        <div>
          <div className={styles.metaLabel}>Uploaded</div>
          <div className={styles.metaValue}>{formatDateTime(document.uploadedAt)}</div>
        </div>
        <div>
          <div className={styles.metaLabel}>Category</div>
          <div className={styles.metaValue}>
            {document.mandatory ? 'Mandatory' : 'Optional'} document
          </div>
        </div>
        <div>
          <div className={styles.metaLabel}>Status</div>
          <div>
            <DocumentStatusBadge status={document.status} />
          </div>
        </div>
      </div>

      {(document.fields ?? []).some((field) => field.value) && (
        <div className={styles.meta}>
          {document.fields
            .filter((field) => field.value)
            .map((field) => (
              <div key={field.name}>
                <div className={styles.metaLabel}>{field.label}</div>
                <div className={styles.metaValue}>{field.value}</div>
              </div>
            ))}
        </div>
      )}

      {document.reviewNote && <div className={styles.reviewNote}>{document.reviewNote}</div>}
    </Modal>
  )
}
