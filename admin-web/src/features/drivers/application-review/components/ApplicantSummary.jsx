import { getInitials, formatDateTime } from '../../../../utils/formatters'
import styles from './ApplicantSummary.module.css'

function Field({ label, value }) {
  return (
    <div>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value || '—'}</div>
    </div>
  )
}

/**
 * Personal information and the applied vehicle.
 *
 * Read-only: identity is established when the driver applies, and an admin
 * corrects it from the driver's profile rather than from a review. Every
 * value is optional — a driver reaches this screen having filled in what the
 * checklist asked for and nothing more — so each falls back rather than
 * assuming it is there.
 */
export function ApplicantSummary({ application }) {
  const driver = application.driver ?? {}
  const vehicle = application.vehicle ?? {}

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Personal Information</span>
          <div className="panel-header__subtitle">As submitted with the application</div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.identity}>
          <span className={styles.photo}>{getInitials(application.driverName)}</span>
          <div>
            <div className={styles.name}>{application.driverName}</div>
            <div className={styles.city}>{driver.city || 'City not given'}</div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.grid}>
          <Field label="Email" value={driver.email} />
          <Field label="Phone" value={driver.phone} />
          <Field label="Date of birth" value={driver.dateOfBirth} />
          <Field label="Application ID" value={application.applicationId} />
        </div>

        <div className={styles.divider} />

        <span className={styles.sectionLabel}>Applied Vehicle</span>
        <div className={styles.grid}>
          <Field
            label="Make & model"
            value={[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
          />
          <Field label="Year" value={vehicle.year} />
          <Field label="Colour" value={vehicle.colour} />
          <Field label="Plate number" value={vehicle.licencePlate} />
          <Field label="Submitted" value={formatDateTime(application.submittedAt)} />
          <Field label="Last reviewed" value={application.reviewedAt ? formatDateTime(application.reviewedAt) : 'Not yet'} />
        </div>

        {application.rejection && (
          <>
            <div className={styles.divider} />
            <span className={styles.sectionLabel}>Last sent back</span>
            <p className={styles.fieldValue}>{application.rejection.message}</p>
            <div className={styles.fieldLabel}>
              {application.rejection.reviewer} · {application.rejection.team}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
