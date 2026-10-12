import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useRealtime } from '../../../context/RealtimeContext'
import { canApproveApplication } from '../../../services/api/driverApplicationsService'
import { ApplicationStatusBadge } from '../../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../../components/ui/States'
import { Modal } from '../../../components/ui/Modal'
import { ReasonModal } from '../../../components/ui/ReasonModal'
import { DocumentPreviewModal } from '../../../components/ui/DocumentPreviewModal'
import { ArrowRightIcon } from '../../../components/icons'
import { formatRelativeTime } from '../../../utils/formatters'
import { ApplicantSummary } from './components/ApplicantSummary'
import { DocumentsPanel } from './components/DocumentsPanel'
import { ApplicationActionsBar } from './components/ApplicationActionsBar'
import styles from './ApplicationReviewPage.module.css'

const FINAL_STATUSES = new Set(['approved', 'rejected'])

export function ApplicationReviewPage() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const { applications, error, loadApplication, updateDocumentStatus, updateApplicationStatus } =
    useRealtime()

  const [previewDocument, setPreviewDocument] = useState(null)
  const [docAction, setDocAction] = useState(null) // { document, action: 'reject' | 'reupload' }
  const [appAction, setAppAction] = useState(null) // 'reject' | 'request_changes' | 'approve'
  const [banner, setBanner] = useState(null) // { tone, message }

  /*
    How the detail call went, tagged with the id it went for.
    
    Tagging rather than resetting on change: the id in the url can change
    before the previous fetch settles, and a stale answer must not mark the
    new one ready. Anything not matching the current id reads as still
    loading, so the not-found state below is only ever shown for an id the
    API actually refused.
  */
  const [detail, setDetail] = useState({ id: null, state: 'loading' })
  const detailState = detail.id === applicationId ? detail.state : 'loading'

  const application = applications.find((entry) => entry.id === applicationId)

  /*
    The list this came from carries a row per application and no documents in
    it, so the one being reviewed is fetched in full on open. Keyed on the id
    alone, so a decision replacing the object does not re-fetch.
  */
  useEffect(() => {
    let cancelled = false

    loadApplication(applicationId)
      .then(() => !cancelled && setDetail({ id: applicationId, state: 'ready' }))
      .catch(() => !cancelled && setDetail({ id: applicationId, state: 'missing' }))

    return () => {
      cancelled = true
    }
  }, [applicationId, loadApplication])

  if (detailState === 'loading' && !application) {
    return <LoadingState label="Loading application…" />
  }
  if (detailState === 'missing' && !application) {
    return (
      <ErrorState
        title="Application not found"
        description={`No application matches ${applicationId}.`}
        onRetry={() => navigate('/drivers/applications')}
      />
    )
  }
  if (!application) return <ErrorState description={error ?? 'Unable to load this application.'} />

  const canApprove = canApproveApplication(application)
  // What a "Request changes" would send, so the modal can name them.
  const markedForRedo = (application.documents ?? []).filter((doc) =>
    ['rejected', 'reupload_requested'].includes(doc.status),
  )
  const isFinal = FINAL_STATUSES.has(application.status)

  function handleApproveDocument(document) {
    updateDocumentStatus(application.id, document.id, { status: 'approved', reviewNote: null })
      .then(() => setBanner({ tone: 'success', message: `${document.label} marked as approved.` }))
      .catch((failure) => setBanner({ tone: 'danger', message: failure.message }))
  }

  function handleConfirmDocAction(reason) {
    const { document, action } = docAction
    updateDocumentStatus(application.id, document.id, {
      status: action === 'reject' ? 'rejected' : 'reupload_requested',
      reviewNote: reason,
    })
      .then(() =>
        setBanner({
          tone: 'danger',
          message: `${document.label} marked for re-upload. Send the decision to tell the driver.`,
        }),
      )
      .catch((failure) => setBanner({ tone: 'danger', message: failure.message }))
    setDocAction(null)
  }

  function handleConfirmAppAction(reason) {
    const status = appAction === 'reject' ? 'rejected' : 'changes_requested'
    updateApplicationStatus(application.id, status, { reason })
      .then(() => {
        setBanner({
          tone: status === 'rejected' ? 'danger' : 'success',
          message:
            status === 'rejected'
              ? 'Application rejected.'
              : 'Changes requested — the driver will be notified to resubmit.',
        })
      })
      // Requesting changes has to name the documents to redo, so it is refused
      // when nothing has been marked. Say so rather than failing quietly.
      .catch((failure) => setBanner({ tone: 'danger', message: failure.message }))
    setAppAction(null)
  }

  function handleConfirmApprove() {
    updateApplicationStatus(application.id, 'approved')
      .then(() => {
        setBanner({ tone: 'success', message: 'Application approved. The driver is now active.' })
      })
      .catch((failure) => setBanner({ tone: 'danger', message: failure.message }))
    setAppAction(null)
  }

  return (
    <div className={styles.page}>
      <Link to="/drivers/applications" className={styles.backLink}>
        ← Back to Applications
      </Link>

      {banner && <div className={`${styles.banner} ${styles[`banner--${banner.tone}`]}`}>{banner.message}</div>}

      <div className={styles.headerRow}>
        <div>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{application.driverName}</h1>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <div className={styles.subtitle}>
            {application.id} · Submitted {formatRelativeTime(application.submittedAt)}
          </div>
        </div>

        <ApplicationActionsBar
          application={application}
          canApprove={canApprove}
          onApprove={() => setAppAction('approve')}
          onReject={() => setAppAction('reject')}
          onRequestChanges={() => setAppAction('request_changes')}
        />
      </div>

      <div className={styles.mainGrid}>
        <ApplicantSummary application={application} />
        <DocumentsPanel
          application={application}
          readOnly={isFinal}
          onView={setPreviewDocument}
          onApprove={handleApproveDocument}
          onReject={(document) => setDocAction({ document, action: 'reject' })}
          onRequestReupload={(document) => setDocAction({ document, action: 'reupload' })}
        />
      </div>

      {previewDocument && (
        <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
      )}

      {docAction && (
        <ReasonModal
          title={docAction.action === 'reject' ? 'Reject document' : 'Request re-upload'}
          description={`${docAction.document.label} — this reason is shared with the driver.`}
          fieldLabel="Reason"
          confirmLabel={docAction.action === 'reject' ? 'Reject Document' : 'Request Re-upload'}
          confirmTone={docAction.action === 'reject' ? 'danger' : 'primary'}
          onCancel={() => setDocAction(null)}
          onConfirm={handleConfirmDocAction}
        />
      )}

      {appAction === 'reject' && (
        <ReasonModal
          title="Reject application"
          description={`The driver will be told their application was rejected${markedForRedo.length ? ` and why ${markedForRedo.length} document(s) failed: ` + markedForRedo.map((doc) => doc.label).join(", ") : ""}. This is final — nothing reopens for them to fix.`}
          fieldLabel="Rejection reason"
          confirmLabel="Reject Application"
          confirmTone="danger"
          onCancel={() => setAppAction(null)}
          onConfirm={handleConfirmAppAction}
        />
      )}

      {appAction === 'request_changes' && (
        <ReasonModal
          title="Request changes"
          description={`The driver will be asked to redo ${markedForRedo.length} document(s)${markedForRedo.length ? ": " + markedForRedo.map((doc) => doc.label).join(", ") : ""}. This note sits above that list on their screen.`}
          fieldLabel="What needs to change"
          confirmLabel="Request Changes"
          confirmTone="primary"
          onCancel={() => setAppAction(null)}
          onConfirm={handleConfirmAppAction}
        />
      )}

      {appAction === 'approve' && (
        <Modal
          title="Approve application"
          onClose={() => setAppAction(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setAppAction(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={handleConfirmApprove}>
                <ArrowRightIcon size={16} />
                Approve Application
              </button>
            </>
          }
        >
          <p className="panel-header__subtitle">
            {application.driverName} will be approved as a driver and gain full platform access. This
            action can be reversed later by suspending or blocking their account.
          </p>
        </Modal>
      )}
    </div>
  )
}
