import { useNavigate } from 'react-router-dom'
import { ApplicationStatusBadge } from './StatusBadge'
import { summarizeDocuments } from '../../services/api/driverApplicationsService'
import { formatRelativeTime } from '../../utils/formatters'
import styles from './ApplicationsTable.module.css'

/**
 * Shared applications table — used by the Dashboard's summary panel and the
 * full Drivers > Applications list, so both stay in lockstep on columns and
 * behaviour.
 */
export function ApplicationsTable({ applications }) {
  const navigate = useNavigate()

  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Driver</th>
          <th scope="col">Application ID</th>
          <th scope="col">Submitted</th>
          <th scope="col">Documents</th>
          <th scope="col">Status</th>
          <th scope="col" className="visually-hidden">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {applications.map((application) => {
          const { documentsSubmitted, documentsRequired } = summarizeDocuments(application)
          const isComplete = documentsSubmitted >= documentsRequired
          return (
            <tr key={application.id}>
              <td>{application.driverName}</td>
              <td className="table-cell-muted">{application.applicationId ?? '—'}</td>
              <td className="table-cell-muted">{formatRelativeTime(application.submittedAt)}</td>
              <td>
                <span className={`${styles.docCount} ${!isComplete ? styles['docCount--incomplete'] : ''}`}>
                  {documentsSubmitted}/{documentsRequired}
                </span>
              </td>
              <td>
                <ApplicationStatusBadge status={application.status} />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => navigate(`/drivers/applications/${application.id}`)}
                >
                  Review
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
