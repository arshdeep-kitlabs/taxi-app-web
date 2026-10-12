import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getTicketById,
  setTicketAssignee,
  addTicketMessage,
  addInternalNote,
  resolveTicket,
  ADMIN_USERS,
} from '../../services/api/supportService'
import { TicketStatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Select, TextArea } from '../../components/ui/FormField'
import { formatDateTime, formatRelativeTime } from '../../utils/formatters'
import styles from './TicketDetailPage.module.css'

const ASSIGNEE_OPTIONS = [{ value: '', label: 'Unassigned' }, ...ADMIN_USERS.map((name) => ({ value: name, label: name }))]

function Composer({ placeholder, buttonLabel, onSubmit }) {
  const [text, setText] = useState('')
  return (
    <div className={styles.composer}>
      <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      <div className={styles.composerActions}>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={text.trim().length === 0}
          onClick={() => {
            onSubmit(text.trim())
            setText('')
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

function MessageList({ items, emptyLabel }) {
  if (items.length === 0) return <EmptyState title={emptyLabel} />
  return (
    <div className={styles.messageList}>
      {items.map((item) => (
        <div className={styles.message} key={item.id}>
          <div className={styles.messageTop}>
            <span className={`${styles.author} ${item.authorType === 'admin' ? styles['author--admin'] : ''}`}>
              {item.author}
            </span>
            <span className={styles.time}>{formatRelativeTime(item.timestamp)}</span>
          </div>
          <span className={styles.body}>{item.body}</span>
        </div>
      ))}
    </div>
  )
}

export function TicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)
  const [resolutionText, setResolutionText] = useState('')

  function refresh() {
    getTicketById(ticketId).then((data) => {
      if (!data) return setError(`No ticket matches ${ticketId}.`)
      setTicket(data)
    })
  }

  useEffect(refresh, [ticketId])

  if (error) return <ErrorState title="Ticket not found" description={error} onRetry={() => navigate('/support')} />
  if (!ticket) return <LoadingState label="Loading ticket…" />

  const profileLink = ticket.requesterType === 'driver' ? `/drivers/${ticket.requesterId}` : `/customers/${ticket.requesterId}`

  return (
    <div className={styles.page}>
      <Link to="/support" className={styles.backLink}>
        ← Back to Support
      </Link>

      <div className={styles.headerRow}>
        <div>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{ticket.subject}</h1>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <div className={styles.subtitle}>
            {ticket.id} · Opened {formatRelativeTime(ticket.createdAt)}
          </div>
        </div>

        {ticket.status !== 'resolved' && (
          <div className={styles.controls}>
            <Select
              value={ticket.assignedTo ?? ''}
              onChange={(e) => setTicketAssignee(ticket.id, e.target.value).then(refresh)}
              options={ASSIGNEE_OPTIONS}
              aria-label="Assigned to"
            />
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-header__title">Requester</span>
        </div>
        <div className={styles.grid}>
          <div>
            <div className={styles.fieldLabel}>Name</div>
            <div className={styles.fieldValue}>
              <Link to={profileLink}>{ticket.requesterName}</Link>
            </div>
          </div>
          <div>
            <div className={styles.fieldLabel}>Type</div>
            <div className={`${styles.fieldValue} ${styles.capitalize}`}>{ticket.requesterType}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-header__title">Conversation</span>
            <div className="panel-header__subtitle">Visible to the requester</div>
          </div>
        </div>
        <MessageList items={ticket.messages} emptyLabel="No messages yet" />
        {ticket.status !== 'resolved' && (
          <Composer placeholder="Reply to the requester…" buttonLabel="Send Reply" onSubmit={(text) => addTicketMessage(ticket.id, text).then(refresh)} />
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-header__title">Internal Notes</span>
            <div className="panel-header__subtitle">Only visible to admins</div>
          </div>
        </div>
        <MessageList items={ticket.internalNotes} emptyLabel="No internal notes yet" />
        {ticket.status !== 'resolved' && (
          <Composer placeholder="Add an internal note…" buttonLabel="Add Note" onSubmit={(text) => addInternalNote(ticket.id, text).then(refresh)} />
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-header__title">Resolution</span>
        </div>
        {ticket.resolution ? (
          <div className={styles.resolutionBox}>
            Resolved by {ticket.resolution.resolvedBy} · {formatDateTime(ticket.resolution.resolvedAt)}
            <br />
            {ticket.resolution.summary}
          </div>
        ) : (
          <div className={`${styles.composer} ${styles['composer--flush']}`}>
            <TextArea
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Summarize how this issue was resolved…"
            />
            <div className={styles.composerActions}>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={resolutionText.trim().length === 0}
                onClick={() => resolveTicket(ticket.id, resolutionText.trim()).then(refresh)}
              >
                Mark Resolved
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
