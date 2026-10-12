import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getCustomerById,
  getCustomerRides,
  getCustomerSupportTickets,
  updateCustomerStatus,
  updateCustomerProfile,
} from '../../services/api/customersService'
import { CustomerStatusBadge, TicketStatusBadge } from '../../components/ui/StatusBadge'
import { StatCard } from '../../components/ui/StatCard'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { ReasonModal } from '../../components/ui/ReasonModal'
import { Modal } from '../../components/ui/Modal'
import { RidesTable } from '../../components/ui/RidesTable'
import { FormField, TextInput } from '../../components/ui/FormField'
import { RidesIcon, CheckIcon, CloseIcon, PaymentsIcon } from '../../components/icons'
import { getInitials, formatNumber, formatCurrency, formatDateTime } from '../../utils/formatters'
import profileStyles from '../drivers/driver-profile/DriverProfilePage.module.css'
import contactStyles from '../drivers/driver-profile/components/ContactVehiclePanel.module.css'

function ContactPanel({ customer, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(null)

  function startEditing() {
    setForm({ email: customer.email, phone: customer.phone, address: customer.address })
    setIsEditing(true)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Contact Information</span>
          <div className="panel-header__subtitle">Editable information only</div>
        </div>
        {!isEditing && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={startEditing}>
            Edit
          </button>
        )}
      </div>

      <div className={contactStyles.body}>
        {!isEditing ? (
          <div className={contactStyles.grid}>
            <div>
              <div className={contactStyles.fieldLabel}>Email</div>
              <div className={contactStyles.fieldValue}>{customer.email}</div>
            </div>
            <div>
              <div className={contactStyles.fieldLabel}>Phone</div>
              <div className={contactStyles.fieldValue}>{customer.phone}</div>
            </div>
            <div>
              <div className={contactStyles.fieldLabel}>Address</div>
              <div className={contactStyles.fieldValue}>
                {customer.address}, {customer.city}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={contactStyles.grid}>
              <FormField label="Email">
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </FormField>
              <FormField label="Phone">
                <TextInput
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Address">
                <TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </FormField>
            </div>
            <div className={contactStyles.editActions}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  onSave(form)
                  setIsEditing(false)
                }}
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SupportHistoryPanel({ tickets }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Support History</span>
          <div className="panel-header__subtitle">Past tickets raised by this customer</div>
        </div>
      </div>
      {!tickets && <LoadingState label="Loading tickets…" />}
      {tickets && tickets.length === 0 && <EmptyState title="No support tickets" />}
      {tickets && tickets.length > 0 && (
        <div className="table-wrap table-wrap--flush">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ticket ID</th>
                <th scope="col">Subject</th>
                <th scope="col">Created</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="table-cell-muted">{ticket.id}</td>
                  <td>{ticket.subject}</td>
                  <td className="table-cell-muted">{formatDateTime(ticket.createdAt)}</td>
                  <td>
                    <TicketStatusBadge status={ticket.status} />
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

export function CustomerProfilePage() {
  const { customerId } = useParams()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(null)
  const [rides, setRides] = useState(null)
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)
  const [statusAction, setStatusAction] = useState(null)
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCustomerById(customerId)
      .then((data) => {
        if (cancelled) return
        if (!data) return setError(`No customer matches ${customerId}.`)
        setCustomer(data)
      })
      .catch(() => !cancelled && setError('Unable to load this customer.'))
    getCustomerRides(customerId).then((data) => !cancelled && setRides(data))
    getCustomerSupportTickets(customerId).then((data) => !cancelled && setTickets(data))
    return () => {
      cancelled = true
    }
  }, [customerId])

  if (error) {
    return <ErrorState title="Customer not found" description={error} onRetry={() => navigate('/customers')} />
  }
  if (!customer) return <LoadingState label="Loading customer…" />

  function handleSave(patch) {
    updateCustomerProfile(customer.id, patch).then((updated) => {
      setCustomer(updated)
      setBanner('Profile updated.')
    })
  }

  function handleConfirmStatusChange(reason) {
    const nextStatus = statusAction === 'activate' ? 'active' : statusAction === 'suspend' ? 'suspended' : 'blocked'
    updateCustomerStatus(customer.id, nextStatus).then((updated) => {
      setCustomer(updated)
      setBanner(`${customer.name} is now ${nextStatus}.${reason ? ` Reason: ${reason}` : ''}`)
    })
    setStatusAction(null)
  }

  return (
    <div className={profileStyles.page}>
      <Link to="/customers" className={profileStyles.backLink}>
        ← Back to Customers
      </Link>

      {banner && <div className={profileStyles.banner}>{banner}</div>}

      <div className={profileStyles.header}>
        <div className={profileStyles.identity}>
          <span className={profileStyles.avatar}>{getInitials(customer.name)}</span>
          <div>
            <div className={profileStyles.nameRow}>
              <span className={profileStyles.name}>{customer.name}</span>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <div className={profileStyles.subline}>
              {customer.id} · {customer.city} · Joined {formatDateTime(customer.joinedAt)}
            </div>
          </div>
        </div>

        <div className={profileStyles.actions}>
          {customer.status !== 'active' && (
            <button type="button" className="btn btn--secondary" onClick={() => setStatusAction('activate')}>
              Activate
            </button>
          )}
          {customer.status !== 'suspended' && (
            <button type="button" className="btn btn--secondary" onClick={() => setStatusAction('suspend')}>
              Suspend
            </button>
          )}
          {customer.status !== 'blocked' && (
            <button type="button" className="btn btn--danger" onClick={() => setStatusAction('block')}>
              Block
            </button>
          )}
        </div>
      </div>

      <div className={profileStyles.statsRow}>
        <StatCard label="Total Rides" value={formatNumber(customer.totalRides)} icon={RidesIcon} />
        <StatCard label="Completed" value={formatNumber(customer.completedRides)} icon={CheckIcon} />
        <StatCard label="Cancelled" value={formatNumber(customer.cancelledRides)} icon={CloseIcon} />
        <StatCard label="Total Spend" value={formatCurrency(customer.totalSpend)} icon={PaymentsIcon} />
      </div>

      <ContactPanel customer={customer} onSave={handleSave} />

      <RidesTable rides={rides} counterpartLabel="Driver" subtitle="Most recent trips for this customer" />

      <SupportHistoryPanel tickets={tickets} />

      {(statusAction === 'suspend' || statusAction === 'block') && (
        <ReasonModal
          title={statusAction === 'suspend' ? 'Suspend customer' : 'Block customer'}
          description={`${customer.name} will lose access to the platform. This is recorded in the audit log.`}
          fieldLabel="Reason"
          confirmLabel={statusAction === 'suspend' ? 'Suspend Customer' : 'Block Customer'}
          confirmTone="danger"
          onCancel={() => setStatusAction(null)}
          onConfirm={handleConfirmStatusChange}
        />
      )}

      {statusAction === 'activate' && (
        <Modal
          title="Activate customer"
          onClose={() => setStatusAction(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setStatusAction(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={() => handleConfirmStatusChange(null)}>
                Activate Customer
              </button>
            </>
          }
        >
          <p className="panel-header__subtitle">{customer.name} will regain full access to the platform.</p>
        </Modal>
      )}
    </div>
  )
}
