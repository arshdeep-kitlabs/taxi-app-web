import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTickets } from '../../services/api/supportService'
import { TicketStatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { formatRelativeTime } from '../../utils/formatters'
import styles from './SupportPage.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
]

export function SupportPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getTickets({ search, status })
      .then((data) => {
        if (cancelled) return
        setTickets(data)
        setError(null)
      })
      .catch(() => !cancelled && setError('Unable to load tickets.'))
    return () => {
      cancelled = true
    }
  }, [search, status])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Support</h1>
        <p className={styles.subtitle}>Ticket queue for customer and driver issues.</p>
      </div>

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by ticket ID, subject or requester"
          ariaLabel="Search tickets"
        />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        {tickets && <ResultCount count={tickets.length} noun="ticket" />}
      </Toolbar>

      {!tickets && !error && <LoadingState label="Loading tickets…" />}
      {error && <ErrorState description={error} />}
      {tickets && tickets.length === 0 && (
        <EmptyState title="No tickets match your search" description="Try a different search term or clear the filters." />
      )}

      {tickets && tickets.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ticket ID</th>
                <th scope="col">Subject</th>
                <th scope="col">Requester</th>
                <th scope="col">Assigned To</th>
                <th scope="col">Updated</th>
                <th scope="col">Status</th>
                <th scope="col" className="visually-hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="table-cell-muted">{ticket.id}</td>
                  <td>{ticket.subject}</td>
                  <td>
                    {ticket.requesterName}
                    <br />
                    <span className={styles.requesterType}>{ticket.requesterType}</span>
                  </td>
                  <td className="table-cell-muted">{ticket.assignedTo ?? 'Unassigned'}</td>
                  <td className="table-cell-muted">{formatRelativeTime(ticket.updatedAt)}</td>
                  <td>
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => navigate(`/support/${ticket.id}`)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
