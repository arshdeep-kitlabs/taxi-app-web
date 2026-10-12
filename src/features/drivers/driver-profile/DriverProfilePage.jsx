import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getDriverById,
  getDriverRides,
  updateDriverStatus,
  updateDriverProfile,
} from '../../../services/api/driversService'
import { DriverStatusBadge } from '../../../components/ui/StatusBadge'
import { StatCard } from '../../../components/ui/StatCard'
import { LoadingState, ErrorState } from '../../../components/ui/States'
import { ReasonModal } from '../../../components/ui/ReasonModal'
import { Modal } from '../../../components/ui/Modal'
import { RidesIcon, CheckIcon, CloseIcon, PaymentsIcon, PromotionsIcon } from '../../../components/icons'
import { getInitials, formatNumber, formatCurrency, formatDateTime } from '../../../utils/formatters'
import { ContactVehiclePanel } from './components/ContactVehiclePanel'
import { DriverDocumentsPanel } from './components/DriverDocumentsPanel'
import { RidesTable } from '../../../components/ui/RidesTable'
import styles from './DriverProfilePage.module.css'

export function DriverProfilePage() {
  const { driverId } = useParams()
  const navigate = useNavigate()

  const [driver, setDriver] = useState(null)
  const [rides, setRides] = useState(null)
  const [error, setError] = useState(null)
  const [statusAction, setStatusAction] = useState(null) // 'suspend' | 'block' | 'activate'
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    let cancelled = false

    getDriverById(driverId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setError(`No driver matches ${driverId}.`)
          return
        }
        setDriver(data)
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load this driver.')
      })

    getDriverRides(driverId).then((data) => {
      if (!cancelled) setRides(data)
    })

    return () => {
      cancelled = true
    }
  }, [driverId])

  if (error) {
    return <ErrorState title="Driver not found" description={error} onRetry={() => navigate('/drivers')} />
  }

  if (!driver) {
    return <LoadingState label="Loading driver…" />
  }

  function handleSaveProfile(patch) {
    updateDriverProfile(driver.id, patch).then((updated) => {
      setDriver(updated)
      setBanner('Profile updated.')
    })
  }

  function handleConfirmStatusChange(reason) {
    const nextStatus = statusAction === 'activate' ? 'active' : statusAction === 'suspend' ? 'suspended' : 'blocked'
    updateDriverStatus(driver.id, nextStatus).then((updated) => {
      setDriver(updated)
      setBanner(
        `${driver.name} is now ${nextStatus}.${reason ? ` Reason: ${reason}` : ''}`,
      )
    })
    setStatusAction(null)
  }

  return (
    <div className={styles.page}>
      <Link to="/drivers" className={styles.backLink}>
        ← Back to Drivers
      </Link>

      {banner && <div className={styles.banner}>{banner}</div>}

      <div className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.avatar}>{getInitials(driver.name)}</span>
          <div>
            <div className={styles.nameRow}>
              <span className={styles.name}>{driver.name}</span>
              <DriverStatusBadge status={driver.status} />
            </div>
            <div className={styles.subline}>
              {driver.code ?? driver.id}
              {driver.city ? ` · ${driver.city}` : ''} · Joined{' '}
              {formatDateTime(driver.joinedAt)}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          {driver.status !== 'active' && (
            <button type="button" className="btn btn--secondary" onClick={() => setStatusAction('activate')}>
              Activate
            </button>
          )}
          {driver.status !== 'suspended' && (
            <button type="button" className="btn btn--secondary" onClick={() => setStatusAction('suspend')}>
              Suspend
            </button>
          )}
          {driver.status !== 'blocked' && (
            <button type="button" className="btn btn--danger" onClick={() => setStatusAction('block')}>
              Block
            </button>
          )}
        </div>
      </div>

      <div className={styles.statsRow}>
        <StatCard label="Total Rides" value={formatNumber(driver.totalRides)} icon={RidesIcon} />
        <StatCard label="Completed" value={formatNumber(driver.completedRides)} icon={CheckIcon} />
        <StatCard label="Cancelled" value={formatNumber(driver.cancelledRides)} icon={CloseIcon} />
        <StatCard label="Total Earnings" value={formatCurrency(driver.earnings)} icon={PaymentsIcon} />
        <StatCard label="Rating" value={driver.rating != null ? driver.rating.toFixed(2) : '—'} icon={PromotionsIcon} />
      </div>

      <div className={styles.mainGrid}>
        <ContactVehiclePanel driver={driver} onSave={handleSaveProfile} />
        <DriverDocumentsPanel driver={driver} />
      </div>

      <RidesTable rides={rides} counterpartLabel="Customer" subtitle="Most recent trips for this driver" />

      {(statusAction === 'suspend' || statusAction === 'block') && (
        <ReasonModal
          title={statusAction === 'suspend' ? 'Suspend driver' : 'Block driver'}
          description={`${driver.name} will${statusAction === 'suspend' ? ' temporarily' : ''} lose access to the platform. This is recorded in the audit log.`}
          fieldLabel="Reason"
          confirmLabel={statusAction === 'suspend' ? 'Suspend Driver' : 'Block Driver'}
          confirmTone="danger"
          onCancel={() => setStatusAction(null)}
          onConfirm={handleConfirmStatusChange}
        />
      )}

      {statusAction === 'activate' && (
        <Modal
          title="Activate driver"
          onClose={() => setStatusAction(null)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setStatusAction(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" onClick={() => handleConfirmStatusChange(null)}>
                Activate Driver
              </button>
            </>
          }
        >
          <p className="panel-header__subtitle">
            {driver.name} will regain full access to accept rides on the platform.
          </p>
        </Modal>
      )}
    </div>
  )
}
