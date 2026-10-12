import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAssignment } from '../../../services/api/assignmentService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { storeGetDrivers } from '../../../services/api/driverStore'
import { storeGetVehicles } from '../../../services/api/vehicleStore'
import { storeGetActiveAssignmentForDriver, storeGetActiveAssignmentForVehicle } from '../../../services/api/assignmentStore'
import { CheckIcon } from '../../../components/icons'
import styles from './AssignVehiclePage.module.css'

const STEPS = ['Select Fleet', 'Select Driver', 'Select Vehicle', 'Review & Confirm']

function StepIndicator({ current }) {
  return (
    <div className={styles.stepBar}>
      {STEPS.map((label, i) => {
        const done    = i < current
        const active  = i === current
        return (
          <div key={label} className={styles.stepItem}>
            <div className={`${styles.stepCircle} ${done ? styles.stepDone : active ? styles.stepActive : ''}`}>
              {done ? <CheckIcon size={13} /> : <span>{i + 1}</span>}
            </div>
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ''}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1 — Fleet ────────────────────────────────────────────────────────────
function StepFleet({ selected, onSelect }) {
  const fleets = storeGetFleets({ status: 'active' })
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Select Fleet</h2>
      <p className={styles.stepDesc}>Choose the fleet this assignment belongs to. Only active, approved fleets are shown.</p>
      <div className={styles.optionGrid}>
        {fleets.map((f) => (
          <button key={f.id} type="button"
            className={`${styles.optionCard} ${selected?.id === f.id ? styles.optionCardSelected : ''}`}
            onClick={() => onSelect(f)}>
            <div className={styles.optionName}>{f.name}</div>
            <div className={styles.optionSub}>{f.id} · {f.vehicleCount ?? '—'} vehicles</div>
          </button>
        ))}
        {fleets.length === 0 && <p className={styles.noItems}>No active fleets available.</p>}
      </div>
    </div>
  )
}

// ── Step 2 — Driver ───────────────────────────────────────────────────────────
function StepDriver({ fleetId, selected, onSelect }) {
  const [search, setSearch] = useState('')
  // Eligible: approved, not suspended/inactive, in selected fleet, no active assignment
  const all = storeGetDrivers({ fleet: fleetId, verificationStatus: 'approved' })
    .filter((d) => d.status !== 'suspended' && d.status !== 'inactive')
    .filter((d) => !storeGetActiveAssignmentForDriver(d.id))

  const filtered = search
    ? all.filter((d) => `${d.fullName} ${d.id} ${d.phone}`.toLowerCase().includes(search.toLowerCase()))
    : all

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Select Driver</h2>
      <p className={styles.stepDesc}>Only approved, unassigned drivers from the selected fleet are shown. Suspended and inactive drivers are excluded.</p>
      <input className={styles.searchInput} placeholder="Search drivers…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className={styles.optionList}>
        {filtered.map((d) => (
          <button key={d.id} type="button"
            className={`${styles.optionRow} ${selected?.id === d.id ? styles.optionRowSelected : ''}`}
            onClick={() => onSelect(d)}>
            <span className={styles.rowAvatar}>{d.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
            <div className={styles.rowInfo}>
              <span className={styles.rowName}>{d.fullName}</span>
              <span className={styles.rowSub}>{d.id} · {d.phone}</span>
            </div>
            {selected?.id === d.id && <span className={styles.rowCheck}><CheckIcon size={15} /></span>}
          </button>
        ))}
        {filtered.length === 0 && <p className={styles.noItems}>No eligible drivers found{search ? ' for this search' : ''}.</p>}
      </div>
    </div>
  )
}

// ── Step 3 — Vehicle ──────────────────────────────────────────────────────────
function StepVehicle({ fleetId, selected, onSelect }) {
  const [search, setSearch] = useState('')
  // Eligible: active or available, verified docs, in selected fleet, no active assignment
  const all = storeGetVehicles({ fleet: fleetId })
    .filter((v) => v.status === 'active' || v.status === 'available')
    .filter((v) => v.docStatus === 'verified')
    .filter((v) => !storeGetActiveAssignmentForVehicle(v.id))

  const filtered = search
    ? all.filter((v) => `${v.make} ${v.model} ${v.regNo}`.toLowerCase().includes(search.toLowerCase()))
    : all

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Select Vehicle</h2>
      <p className={styles.stepDesc}>Only active or available vehicles with verified documents from the selected fleet are shown. Vehicles under maintenance or suspension are excluded.</p>
      <input className={styles.searchInput} placeholder="Search vehicles…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className={styles.optionList}>
        {filtered.map((v) => (
          <button key={v.id} type="button"
            className={`${styles.optionRow} ${selected?.id === v.id ? styles.optionRowSelected : ''}`}
            onClick={() => onSelect(v)}>
            <span className={styles.rowAvatar}>{v.make.slice(0,1)}{v.model.slice(0,1)}</span>
            <div className={styles.rowInfo}>
              <span className={styles.rowName}>{v.make} {v.model} {v.year}</span>
              <span className={styles.rowSub}><span className={styles.plateSmall}>{v.regNo}</span> · {v.type} · {v.rideType}</span>
            </div>
            {selected?.id === v.id && <span className={styles.rowCheck}><CheckIcon size={15} /></span>}
          </button>
        ))}
        {filtered.length === 0 && <p className={styles.noItems}>No eligible vehicles found{search ? ' for this search' : ''}.</p>}
      </div>
    </div>
  )
}

// ── Step 4 — Review ───────────────────────────────────────────────────────────
function StepReview({ fleet, driver, vehicle, notes, onNotesChange }) {
  return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Review & Confirm</h2>
      <p className={styles.stepDesc}>Review the assignment details below. Once confirmed, the driver will be assigned to the vehicle.</p>

      <div className={styles.reviewCard}>
        <div className={styles.reviewSection}>
          <span className={styles.reviewSectionLabel}>Fleet</span>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Fleet Name</span>
            <span className={styles.reviewValue}>{fleet.name}</span>
          </div>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Fleet ID</span>
            <span className={styles.reviewValue}>{fleet.id}</span>
          </div>
        </div>
        <div className={styles.reviewDivider} />
        <div className={styles.reviewSection}>
          <span className={styles.reviewSectionLabel}>Driver</span>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Full Name</span>
            <span className={styles.reviewValue}>{driver.fullName}</span>
          </div>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Driver ID</span>
            <span className={`${styles.reviewValue} ${styles.mono}`}>{driver.id}</span>
          </div>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Phone</span>
            <span className={styles.reviewValue}>{driver.phone}</span>
          </div>
        </div>
        <div className={styles.reviewDivider} />
        <div className={styles.reviewSection}>
          <span className={styles.reviewSectionLabel}>Vehicle</span>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Vehicle</span>
            <span className={styles.reviewValue}>{vehicle.make} {vehicle.model} {vehicle.year}</span>
          </div>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Registration</span>
            <span className={`${styles.reviewValue} ${styles.mono}`}>{vehicle.regNo}</span>
          </div>
          <div className={styles.reviewRow}>
            <span className={styles.reviewLabel}>Type</span>
            <span className={styles.reviewValue}>{vehicle.type} · {vehicle.rideType}</span>
          </div>
        </div>
        <div className={styles.reviewDivider} />
        <div className={styles.reviewSection}>
          <span className={styles.reviewSectionLabel}>Notes (optional)</span>
          <textarea className={styles.notesTextarea} rows={2} placeholder="Any notes about this assignment…" value={notes} onChange={(e) => onNotesChange(e.target.value)} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AssignVehiclePage() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(0)
  const [fleet, setFleet]     = useState(null)
  const [driver, setDriver]   = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [notes, setNotes]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(null)

  function handleFleetSelect(f)   { setFleet(f); setDriver(null); setVehicle(null) }
  function handleDriverSelect(d)  { setDriver(d) }
  function handleVehicleSelect(v) { setVehicle(v) }

  function canNext() {
    if (step === 0) return !!fleet
    if (step === 1) return !!driver
    if (step === 2) return !!vehicle
    return true
  }

  function next() { if (canNext()) setStep((s) => s + 1) }
  function back() { setStep((s) => Math.max(0, s - 1)); setError(null) }

  async function confirm() {
    setSubmitting(true); setError(null)
    try {
      const asgn = await createAssignment({
        driverId: driver.id, driverName: driver.fullName, driverPhone: driver.phone,
        vehicleId: vehicle.id,
        vehicleDisplay: `${vehicle.make} ${vehicle.model} ${vehicle.year}`,
        vehicleReg: vehicle.regNo,
        fleetId: fleet.id, fleetName: fleet.name,
        notes,
      })
      setSuccess(asgn)
    } catch (e) {
      setError(e.message ?? 'Assignment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}><CheckIcon size={28} /></span>
          <h2 className={styles.successTitle}>Assignment confirmed</h2>
          <p className={styles.successSub}>
            <strong>{driver.fullName}</strong> has been assigned to <strong>{vehicle.make} {vehicle.model}</strong> ({vehicle.regNo}) in <strong>{fleet.name}</strong>.
          </p>
          <div className={styles.successActions}>
            <button type="button" className="btn btn--primary" onClick={() => navigate(`/fleet/assignments/${success.id}`)}>View Assignment</button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/fleet/assignments')}>Back to Assignments</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Assign Vehicle</h1>
        <p className={styles.pageSub}>Create a new driver–vehicle assignment within a fleet.</p>
      </div>

      <StepIndicator current={step} />

      <div className={styles.stepPanel}>
        {step === 0 && <StepFleet selected={fleet} onSelect={handleFleetSelect} />}
        {step === 1 && <StepDriver fleetId={fleet?.id} selected={driver} onSelect={handleDriverSelect} />}
        {step === 2 && <StepVehicle fleetId={fleet?.id} selected={vehicle} onSelect={handleVehicleSelect} />}
        {step === 3 && <StepReview fleet={fleet} driver={driver} vehicle={vehicle} notes={notes} onNotesChange={setNotes} />}
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.footer}>
        <button type="button" className="btn btn--ghost"
          onClick={step === 0 ? () => navigate('/fleet/assignments') : back}
          disabled={submitting}>
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        <div className={styles.footerRight}>
          {step < STEPS.length - 1
            ? <button type="button" className="btn btn--primary" onClick={next} disabled={!canNext()}>Continue →</button>
            : <button type="button" className="btn btn--primary" onClick={confirm} disabled={submitting}>{submitting ? 'Confirming…' : 'Confirm Assignment'}</button>
          }
        </div>
      </div>
    </div>
  )
}
