import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRideById } from '../../services/api/ridesService'
import { RideLifecycleBadge, PaymentStatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { Timeline } from '../../components/ui/Timeline'
import { formatCurrency, formatDateTime } from '../../utils/formatters'
import styles from './RideDetailPage.module.css'

function Field({ label, value }) {
  return (
    <div>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value}</div>
    </div>
  )
}

export function RideDetailPage() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const [ride, setRide] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getRideById(rideId)
      .then((data) => {
        if (cancelled) return
        if (!data) return setError(`No ride matches ${rideId}.`)
        setRide(data)
      })
      .catch(() => !cancelled && setError('Unable to load this ride.'))
    return () => {
      cancelled = true
    }
  }, [rideId])

  if (error) {
    return <ErrorState title="Ride not found" description={error} onRetry={() => navigate('/rides')} />
  }
  if (!ride) return <LoadingState label="Loading ride…" />

  const isCancelled = ride.status === 'cancelled'
  const steps = [
    { label: 'Ride Requested', timestamp: ride.requestedAt },
    { label: 'Driver Assigned', timestamp: ride.acceptedAt },
    { label: 'Trip Started (Pickup)', timestamp: ride.pickedUpAt },
    isCancelled
      ? { label: 'Ride Cancelled', timestamp: ride.cancelledAt, tone: 'cancelled' }
      : { label: 'Ride Completed', timestamp: ride.completedAt },
  ]

  return (
    <div className={styles.page}>
      <Link to="/rides" className={styles.backLink}>
        ← Back to Rides
      </Link>

      <div className={styles.headerRow}>
        <div>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{ride.id}</h1>
            <RideLifecycleBadge status={ride.status} />
          </div>
          <div className={styles.subtitle}>
            {ride.city} · Requested {formatDateTime(ride.requestedAt)}
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.stack}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-header__title">Customer & Driver</span>
              </div>
            </div>
            <div className={styles.grid}>
              <Field label="Customer" value={ride.customerName} />
              <Field label="Driver" value={ride.driverName ?? 'Unassigned'} />
              <Field label="Pickup" value={ride.pickup} />
              <Field label="Drop-off" value={ride.dropoff} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-header__title">Fare & Payment</span>
              </div>
            </div>
            <div className={styles.grid}>
              <Field label="Fare" value={ride.fare ? formatCurrency(ride.fare) : '—'} />
              <Field label="Payment method" value={ride.paymentMethod ?? '—'} />
              <div>
                <div className={styles.fieldLabel}>Payment status</div>
                <PaymentStatusBadge status={ride.paymentStatus} />
              </div>
            </div>
          </div>

          {isCancelled && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-header__title">Cancellation Details</span>
                </div>
              </div>
              <div className={styles.cancellationBox}>
                Cancelled by {ride.cancelledBy} · {formatDateTime(ride.cancelledAt)}
                <br />
                {ride.cancellationReason}
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-header__title">Ride Timeline</span>
            </div>
          </div>
          <Timeline steps={steps} />
        </div>
      </div>
    </div>
  )
}
