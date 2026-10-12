import styles from './ApplicationActionsBar.module.css'

const FINAL_STATUSES = new Set(['approved', 'rejected'])

/**
 * Application-level decision controls. Approve is intentionally the only
 * button gated on document state — final approval must not be possible
 * until every mandatory document has been approved.
 */
export function ApplicationActionsBar({ application, canApprove, onApprove, onReject, onRequestChanges }) {
  const isFinal = FINAL_STATUSES.has(application.status)

  if (isFinal) {
    return (
      <div className={styles.bar}>
        <span className={styles.decisionNote}>
          This application has been {application.status === 'approved' ? 'approved' : 'rejected'} and is
          no longer editable.
        </span>
      </div>
    )
  }

  return (
    <div className={styles.bar}>
      <div className={styles.buttons}>
        <button type="button" className="btn btn--ghost" onClick={onRequestChanges}>
          Request Changes
        </button>
        <button type="button" className="btn btn--danger" onClick={onReject}>
          Reject Application
        </button>
        <button type="button" className="btn btn--primary" disabled={!canApprove} onClick={onApprove}>
          Approve Application
        </button>
      </div>
      {!canApprove && (
        <span className={styles.hint}>
          All mandatory documents must be submitted and approved before this application can be approved.
        </span>
      )}
    </div>
  )
}
