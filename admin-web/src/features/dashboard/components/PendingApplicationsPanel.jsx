import { useNavigate } from 'react-router-dom'
import { useRealtime } from '../../../context/RealtimeContext'
import { ApplicationsTable } from '../../../components/ui/ApplicationsTable'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'

const VISIBLE_STATUSES = new Set(['pending_review', 'in_review', 'changes_requested'])
const MAX_ROWS = 6

export function PendingApplicationsPanel() {
  const navigate = useNavigate()
  const { applications, pendingCount, isLoading, error } = useRealtime()

  const rows = applications
    .filter((application) => VISIBLE_STATUSES.has(application.status))
    .slice(0, MAX_ROWS)

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Pending Driver Applications</span>
          <div className="panel-header__subtitle">Awaiting review, sorted by most recent</div>
        </div>
        <span className="badge badge--warning">{pendingCount} pending</span>
      </div>

      {isLoading && <LoadingState label="Loading applications…" />}
      {!isLoading && error && <ErrorState description={error} />}
      {!isLoading && !error && rows.length === 0 && (
        <EmptyState
          title="No applications awaiting review"
          description="Submitted driver applications will show up here for review."
        />
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="table-wrap table-wrap--flush">
          <ApplicationsTable applications={rows} />
        </div>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="panel-footer">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/drivers/applications')}>
            View all applications
          </button>
        </div>
      )}
    </div>
  )
}
