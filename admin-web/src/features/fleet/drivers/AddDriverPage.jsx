import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDriver } from '../../../services/api/driverService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { FormField, TextInput, Select } from '../../../components/ui/FormField'
import { CheckIcon } from '../../../components/icons'
import styles from './AddDriverPage.module.css'

const DRIVER_TYPE_OPTS = [
  { value: 'independent', label: 'Independent Driver' },
  { value: 'fleet', label: 'Fleet Driver' },
]

const STATUS_OPTS = [
  { value: 'pending', label: 'Pending Verification' },
  { value: 'inactive', label: 'Inactive' },
]

const DOC_TEMPLATES = [
  { id: 'drd1', name: 'Driving License' },
  { id: 'drd2', name: 'Identity Document (Emirates ID / Passport)' },
  { id: 'drd3', name: 'Background Check' },
  { id: 'drd4', name: 'Driver Permit' },
  { id: 'drd5', name: 'Profile Photo' },
  { id: 'drd6', name: 'Other Required Documents' },
]

const EMPTY = {
  fullName: '', dateOfBirth: '', phone: '', email: '', address: '',
  licenseNumber: '', licenseExpiry: '', driverType: 'independent',
  fleetId: '', vehicleStatus: 'pending',
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

export function AddDriverPage() {
  const navigate = useNavigate()
  const [form, setForm]         = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [docs, setDocs]         = useState(Object.fromEntries(DOC_TEMPLATES.map((d) => [d.id, 'not_uploaded'])))
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(null)

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
    if (!form.fullName.trim())      e.fullName = 'Full name is required'
    if (!form.phone.trim())         e.phone    = 'Phone number is required'
    if (!form.email.trim())         e.email    = 'Email is required'
    if (!form.licenseNumber.trim()) e.licenseNumber = 'License number is required'
    if (!form.licenseExpiry)        e.licenseExpiry = 'License expiry is required'
    if (form.driverType === 'fleet' && !form.fleetId) e.fleetId = 'Fleet assignment is required for fleet drivers'
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
      const driver = await createDriver({
        ...form,
        fleetName: fleet?.name ?? null,
        saveAsDraft: asDraft,
      })
      setSuccess(driver)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}><CheckIcon size={28} /></span>
          <h2 className={styles.successTitle}>Driver created successfully</h2>
          <p className={styles.successSub}>
            <strong>{success.fullName}</strong> ({success.id}) has been registered and is pending verification.
          </p>
          <div className={styles.successActions}>
            <button type="button" className="btn btn--primary" onClick={() => navigate(`/fleet/drivers/${success.id}`)}>View Driver</button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/fleet/drivers')}>Back to Drivers</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Add New Driver</h1>
        <p className={styles.pageSub}>Register a driver to the Nomad platform, independent or fleet-assigned.</p>
      </div>

      <div className={styles.formBody}>
        {/* SECTION 1 — Personal Information */}
        <section className={styles.section}>
          <SectionHeader number="1" title="Personal Information" subtitle="Driver's personal and contact details." />
          <div className={styles.grid2}>
            <FormField label="Full Name *">
              <TextInput placeholder="e.g. John Smith" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              {errors.fullName && <span className={styles.err}>{errors.fullName}</span>}
            </FormField>
            <FormField label="Date of Birth">
              <TextInput type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </FormField>
            <FormField label="Phone Number *">
              <TextInput placeholder="e.g. +971 50 111 2222" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              {errors.phone && <span className={styles.err}>{errors.phone}</span>}
            </FormField>
            <FormField label="Email *">
              <TextInput type="email" placeholder="e.g. driver@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              {errors.email && <span className={styles.err}>{errors.email}</span>}
            </FormField>
            <FormField label="Address" style={{ gridColumn: '1 / -1' }}>
              <TextInput placeholder="e.g. Dubai, UAE" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </FormField>
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 2 — Driver Information */}
        <section className={styles.section}>
          <SectionHeader number="2" title="Driver Information" subtitle="License, driver type, and classification." />
          <div className={styles.grid2}>
            <FormField label="License Number *">
              <TextInput placeholder="e.g. DL-AE-112233" value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
              {errors.licenseNumber && <span className={styles.err}>{errors.licenseNumber}</span>}
            </FormField>
            <FormField label="License Expiry *">
              <TextInput type="date" value={form.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} />
              {errors.licenseExpiry && <span className={styles.err}>{errors.licenseExpiry}</span>}
            </FormField>
            <FormField label="Driver Type">
              <Select options={DRIVER_TYPE_OPTS} value={form.driverType} onChange={(e) => { set('driverType', e.target.value); set('fleetId', '') }} />
            </FormField>
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 3 — Fleet (conditional) */}
        <section className={styles.section}>
          <SectionHeader
            number="3"
            title="Fleet Assignment"
            subtitle={
              form.driverType === 'fleet'
                ? 'Assign this driver to an active, approved fleet. Only active fleets can accept new drivers.'
                : 'This driver is independent and does not belong to any fleet.'
            }
          />
          {form.driverType === 'fleet' ? (
            <div style={{ maxWidth: 360 }}>
              <FormField label="Fleet *">
                <Select options={fleetOpts} value={form.fleetId} onChange={(e) => set('fleetId', e.target.value)} />
                {errors.fleetId && <span className={styles.err}>{errors.fleetId}</span>}
              </FormField>
              {form.fleetId && (
                <p className={styles.fleetNote}>✓ Assigned to <strong>{activeFleets.find((f) => f.id === form.fleetId)?.name}</strong></p>
              )}
            </div>
          ) : (
            <div className={styles.independentBadge}>
              <span className="badge badge--neutral">Independent Driver — No Fleet Required</span>
            </div>
          )}
        </section>

        <div className={styles.divider} />

        {/* SECTION 4 — Documents */}
        <section className={styles.section}>
          <SectionHeader number="4" title="Driver Documents" subtitle="Upload required documents. All documents must be verified before the driver becomes operational." />
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

        {/* SECTION 5 — Account Status */}
        <section className={styles.section}>
          <SectionHeader number="5" title="Account Status" subtitle="New drivers default to Pending Verification until documents are reviewed and approved." />
          <div style={{ maxWidth: 280 }}>
            <FormField label="Initial Status">
              <Select options={STATUS_OPTS} value={form.vehicleStatus} onChange={(e) => set('vehicleStatus', e.target.value)} />
            </FormField>
          </div>
          <p className={styles.statusNote}>Pending drivers must be approved before they can operate on the Nomad platform.</p>
        </section>
      </div>

      {/* Sticky footer */}
      <div className={styles.footer}>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/fleet/drivers')} disabled={submitting}>Cancel</button>
        <div className={styles.footerRight}>
          <button type="button" className="btn btn--secondary" onClick={() => handleSubmit(true)} disabled={submitting}>Save as Draft</button>
          <button type="button" className="btn btn--primary" onClick={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Driver'}
          </button>
        </div>
      </div>
    </div>
  )
}
