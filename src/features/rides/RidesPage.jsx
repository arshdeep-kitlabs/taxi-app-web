import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRides } from '../../services/api/ridesService'
import { RideLifecycleBadge, PaymentStatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../components/ui/Toolbar'
import { formatCurrency, formatRelativeTime } from '../../utils/formatters'
import styles from './RidesPage.module.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All payments' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]

export function RidesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [rides, setRides] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getRides({ search, status, paymentStatus })
      .then((data) => {
        if (cancelled) return
        setRides(data)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load rides.')
      })
    return () => {
      cancelled = true
    }
  }, [search, status, paymentStatus])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rides</h1>
        <p className={styles.subtitle}>Search and monitor rides across the platform.</p>
      </div>

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by ride ID, customer or driver"
          ariaLabel="Search rides"
        />
        <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Filter by status" />
        <FilterSelect
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={PAYMENT_OPTIONS}
          ariaLabel="Filter by payment status"
        />
        {rides && <ResultCount count={rides.length} noun="ride" />}
      </Toolbar>

      {!rides && !error && <LoadingState label="Loading rides…" />}
      {error && <ErrorState description={error} />}

      {rides && rides.length === 0 && (
        <EmptyState title="No rides match your search" description="Try a different search term or clear the filters." />
      )}

      {rides && rides.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ride ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Driver</th>
                <th scope="col">Requested</th>
                <th scope="col">Fare</th>
                <th scope="col">Payment</th>
                <th scope="col">Status</th>
                <th scope="col" className="visually-hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.id}>
                  <td className="table-cell-muted">{ride.id}</td>
                  <td>{ride.customerName}</td>
                  <td className="table-cell-muted">{ride.driverName ?? 'Unassigned'}</td>
                  <td className="table-cell-muted">{formatRelativeTime(ride.requestedAt)}</td>
                  <td>{ride.fare ? formatCurrency(ride.fare) : '—'}</td>
                  <td>
                    <PaymentStatusBadge status={ride.paymentStatus} />
                  </td>
                  <td>
                    <RideLifecycleBadge status={ride.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => navigate(`/rides/${ride.id}`)}
                    >
                      View
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
