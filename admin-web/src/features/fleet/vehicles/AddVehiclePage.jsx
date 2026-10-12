import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createVehicle } from '../../../services/api/vehicleService'
import { FormField, TextInput, Select } from '../../../components/ui/FormField'
import { CheckIcon } from '../../../components/icons'
import { storeGetFleets } from '../../../services/api/fleetStore'
import styles from './AddVehiclePage.module.css'

const TYPE_OPTS = [
  { value: '', label: 'Select vehicle type…' },
  { value: 'Sedan', label: 'Sedan' }, { value: 'SUV', label: 'SUV' },
  { value: 'MPV', label: 'MPV' }, { value: 'Hatchback', label: 'Hatchback' },
  { value: 'Van', label: 'Van' }, { value: 'Other', label: 'Other' },
]

const RIDE_OPTS = [
  { value: '', label: 'Select ride type…' },
  { value: 'Standard', label: 'Standard' }, { value: 'XL', label: 'XL' },
  { value: 'Premium', label: 'Premium' }, { value: 'Pool', label: 'Pool' },
]

const STATUS_OPTS = [
  { value: 'pending', label: 'Pending Verification' },
  { value: 'active', label: 'Active' }, { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'suspended', label: 'Suspended' }, { value: 'inactive', label: 'Inactive' },
]

const DOC_TEMPLATES = [
  { id: 'vd1', name: 'Registration Certificate' },
  { id: 'vd2', name: 'Insurance Certificate' },
  { id: 'vd3', name: 'Vehicle Inspection Report' },
  { id: 'vd4', name: 'Operating Permit' },
  { id: 'vd5', name: 'Other Required Documents' },
]

const PHOTOS = [
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
  { id: 'side', label: 'Side' },
  { id: 'interior', label: 'Interior' },
]

const EMPTY = {
  make: '', model: '', year: '', color: '', type: '', rideType: '', regNo: '', vin: '',
  fleetId: '', fleetName: '', vehicleStatus: 'pending',
}

function SectionHeader({ number, title, subtitle }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionNum}>{number}</span>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSub}>{subtitle}</p>}
      </div>
    </div>
  )
}

export function AddVehiclePage() {
  const navigate = useNavigate()
  const [form, setForm]           = useState(EMPTY)
  const [errors, setErrors]       = useState({})
  const [docs, setDocs]           = useState(Object.fromEntries(DOC_TEMPLATES.map((d) => [d.id, 'not_uploaded'])))
  const [photos, setPhotos]       = useState(Object.fromEntries(PHOTOS.map((p) => [p.id, false])))
  const [submitting, setSubmitting]= useState(false)
  const [success, setSuccess]     = useState(null)

  // Only active fleets available for vehicle assignment
  const activeFleets = storeGetFleets({ status: 'active' })
  const fleetOpts = [
    { value: '', label: 'Select fleet…' },
    ...activeFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const e = {}
    if (!form.make.trim())  e.make  = 'Vehicle make is required'
    if (!form.model.trim()) e.model = 'Vehicle model is required'
    if (!form.year.trim())  e.year  = 'Year is required'
    if (!form.regNo.trim()) e.regNo = 'Registration number is required'
    if (!form.type)         e.type  = 'Vehicle type is required'
    if (!form.rideType)     e.rideType = 'Ride type is required'
    if (!form.fleetId)      e.fleetId = 'Fleet assignment is required'
    return e
  }

  async function handleSubmit(asDraft = false) {
    if (!asDraft) {
      const errs = validate()
      if (Object.keys(errs).length) { setErrors(errs); return }
    }
    setSubmitting(true)
    try {
      const fleet = activeFleets.find((f) => f.id === form.fleetId)
      const v = await createVehicle({ ...form, fleetName: fleet?.name ?? '', saveAsDraft: asDraft })
      setSuccess(v)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}><CheckIcon size={28} /></span>
          <h2 className={styles.successTitle}>Vehicle added successfully</h2>
          <p className={styles.successSub}>
            <strong>{success.make} {success.model}</strong> ({success.regNo}) has been registered and is pending verification.
          </p>
          <div className={styles.successActions}>
            <button type="button" className="btn btn--primary" onClick={() => navigate(`/fleet/vehicles/${success.id}`)}>View Vehicle</button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/fleet/vehicles')}>Back to Vehicles</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Add New Vehicle</h1>
        <p className={styles.pageSub}>Add and register a vehicle to a Nomad fleet.</p>
      </div>

      <div className={styles.formBody}>
        {/* SECTION 1 — Vehicle Information */}
        <section className={styles.section}>
          <SectionHeader number="1" title="Vehicle Information" subtitle="Basic details about the vehicle." />
          <div className={styles.grid2}>
            <FormField label="Vehicle Make *">
              <TextInput placeholder="e.g. Toyota" value={form.make} onChange={(e) => set('make', e.target.value)} />
              {errors.make && <span className={styles.err}>{errors.make}</span>}
            </FormField>
            <FormField label="Vehicle Model *">
              <TextInput placeholder="e.g. Camry" value={form.model} onChange={(e) => set('model', e.target.value)} />
              {errors.model && <span className={styles.err}>{errors.model}</span>}
            </FormField>
            <FormField label="Year *">
              <TextInput type="number" placeholder="e.g. 2024" value={form.year} onChange={(e) => set('year', e.target.value)} />
              {errors.year && <span className={styles.err}>{errors.year}</span>}
            </FormField>
            <FormField label="Color">
              <TextInput placeholder="e.g. White" value={form.color} onChange={(e) => set('color', e.target.value)} />
            </FormField>
            <FormField label="Vehicle Type *">
              <Select options={TYPE_OPTS} value={form.type} onChange={(e) => set('type', e.target.value)} />
              {errors.type && <span className={styles.err}>{errors.type}</span>}
            </FormField>
            <FormField label="Ride Type *">
              <Select options={RIDE_OPTS} value={form.rideType} onChange={(e) => set('rideType', e.target.value)} />
              {errors.rideType && <span className={styles.err}>{errors.rideType}</span>}
            </FormField>
            <FormField label="Registration Number *">
              <TextInput placeholder="e.g. DXB A 12345" value={form.regNo} onChange={(e) => set('regNo', e.target.value)} />
              {errors.regNo && <span className={styles.err}>{errors.regNo}</span>}
            </FormField>
            <FormField label="VIN / Chassis Number">
              <TextInput placeholder="17-character VIN" value={form.vin} onChange={(e) => set('vin', e.target.value)} />
            </FormField>
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 2 — Fleet Assignment */}
        <section className={styles.section}>
          <SectionHeader number="2" title="Fleet Assignment" subtitle="Assign this vehicle to an active, approved fleet. Suspended fleets are excluded." />
          <div style={{ maxWidth: 340 }}>
            <FormField label="Fleet *">
              <Select options={fleetOpts} value={form.fleetId} onChange={(e) => set('fleetId', e.target.value)} />
              {errors.fleetId && <span className={styles.err}>{errors.fleetId}</span>}
            </FormField>
          </div>
          {form.fleetId && (
            <p className={styles.fleetNote}>
              ✓ Assigned to <strong>{activeFleets.find((f) => f.id === form.fleetId)?.name}</strong>
            </p>
          )}
        </section>

        <div className={styles.divider} />

        {/* SECTION 3 — Documents */}
        <section className={styles.section}>
          <SectionHeader number="3" title="Vehicle Documents" subtitle="Upload required vehicle documents. All documents must be verified before the vehicle becomes operational." />
          <div className={styles.docList}>
            {DOC_TEMPLATES.map((doc) => {
              const st = docs[doc.id]
              return (
                <div key={doc.id} className={styles.docRow}>
                  <div className={styles.docInfo}>
                    <span className={styles.docName}>{doc.name}</span>
                    <span className={`${styles.docSt} ${st !== 'not_uploaded' ? styles.docStUploaded : ''}`}>
                      {st === 'not_uploaded' ? 'Not uploaded' : 'Uploaded'}
                    </span>
                  </div>
                  <div className={styles.docActions}>
                    {st === 'not_uploaded' ? (
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDocs((d) => ({ ...d, [doc.id]: 'uploaded' }))}>Upload</button>
                    ) : (
                      <>
                        <span className={styles.docDate}>Just now</span>
                        <button type="button" className="btn btn--ghost btn--sm">View</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDocs((d) => ({ ...d, [doc.id]: 'not_uploaded' }))}>Replace</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 4 — Photos */}
        <section className={styles.section}>
          <SectionHeader number="4" title="Vehicle Photos" subtitle="Upload photos of the vehicle. At least one photo is recommended." />
          <div className={styles.photoGrid}>
            {PHOTOS.map((photo) => (
              <div key={photo.id} className={`${styles.photoSlot} ${photos[photo.id] ? styles.photoSlotFilled : ''}`}
                onClick={() => setPhotos((p) => ({ ...p, [photo.id]: !p[photo.id] }))}>
                {photos[photo.id] ? (
                  <div className={styles.photoPreview}>
                    <span className={styles.photoCheck}><CheckIcon size={16} /></span>
                    <span className={styles.photoLabel}>{photo.label}</span>
                    <span className={styles.photoReplace}>Click to remove</span>
                  </div>
                ) : (
                  <div className={styles.photoEmpty}>
                    <span className={styles.photoPlus}>+</span>
                    <span className={styles.photoLabel}>{photo.label}</span>
                    <span className={styles.photoHint}>Click to upload</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 5 — Status */}
        <section className={styles.section}>
          <SectionHeader number="5" title="Vehicle Status" subtitle="New vehicles default to Pending Verification until documents are reviewed." />
          <div style={{ maxWidth: 280 }}>
            <FormField label="Initial Status">
              <Select options={STATUS_OPTS} value={form.vehicleStatus} onChange={(e) => set('vehicleStatus', e.target.value)} />
            </FormField>
          </div>
          <p className={styles.statusNote}>Vehicles pending verification cannot receive ride assignments.</p>
        </section>
      </div>

      {/* Sticky footer */}
      <div className={styles.footer}>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/fleet/vehicles')} disabled={submitting}>Cancel</button>
        <div className={styles.footerRight}>
          <button type="button" className="btn btn--secondary" onClick={() => handleSubmit(true)} disabled={submitting}>Save as Draft</button>
          <button type="button" className="btn btn--primary" onClick={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Vehicle'}
          </button>
        </div>
      </div>
    </div>
  )
}
