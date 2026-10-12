import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createFleet } from '../../services/api/fleetService'
import { FormField, TextInput, Select } from '../../components/ui/FormField'
import { CheckIcon } from '../../components/icons'
import styles from './AddFleetPage.module.css'

const FLEET_TYPE_OPTIONS = [
  { value: '', label: 'Select fleet type…' },
  { value: 'taxi', label: 'Taxi Company' },
  { value: 'transportation', label: 'Transportation Company' },
  { value: 'corporate', label: 'Corporate Fleet' },
  { value: 'private', label: 'Private Fleet' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

const DOC_TEMPLATES = [
  { id: 't1', name: 'Business Registration Certificate' },
  { id: 't2', name: 'Operating License' },
  { id: 't3', name: 'Fleet Insurance Certificate' },
  { id: 't4', name: 'Tax / VAT Registration Certificate' },
  { id: 't5', name: 'Other Supporting Documents' },
]

const EMPTY_FORM = {
  fleetName: '',
  fleetId: '',
  businessName: '',
  businessRegNo: '',
  fleetType: '',
  vehicles: '',
  drivers: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerAddress: '',
  city: '',
  country: 'UAE',
  fleetStatus: 'pending',
}

function SectionHeader({ number, title, subtitle }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionNum}>{number}</span>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
    </div>
  )
}

export function AddFleetPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [docStatuses, setDocStatuses] = useState(
    Object.fromEntries(DOC_TEMPLATES.map((d) => [d.id, 'not_uploaded'])),
  )
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const errs = {}
    if (!form.fleetName.trim()) errs.fleetName = 'Fleet name is required'
    if (!form.businessName.trim()) errs.businessName = 'Business name is required'
    if (!form.fleetType) errs.fleetType = 'Fleet type is required'
    if (!form.ownerName.trim()) errs.ownerName = 'Owner name is required'
    if (!form.ownerEmail.trim()) errs.ownerEmail = 'Email is required'
    if (!form.city.trim()) errs.city = 'City is required'
    return errs
  }

  async function handleSubmit(asDraft = false) {
    if (!asDraft) {
      const errs = validate()
      if (Object.keys(errs).length) { setErrors(errs); return }
    }
    setSubmitting(true)
    try {
      await createFleet({ ...form, saveAsDraft: asDraft })
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}><CheckIcon size={28} /></span>
          <h2 className={styles.successTitle}>Fleet created successfully</h2>
          <p className={styles.successSubtitle}>
            <strong>{form.fleetName}</strong> has been registered and is now in the Pending Fleets queue awaiting review.
          </p>
          <div className={styles.successActions}>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/fleet/pending')}>
              View Pending Fleets
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/fleet')}>
              Back to Fleet Management
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Add New Fleet</h1>
          <p className={styles.pageSubtitle}>Create and register a new fleet operator on the Nomad platform.</p>
        </div>
      </div>

      <div className={styles.formBody}>
        {/* SECTION 1 — Fleet Information */}
        <section className={styles.section}>
          <SectionHeader
            number="1"
            title="Fleet Information"
            subtitle="Basic details about the fleet and the operating company."
          />
          <div className={styles.grid2}>
            <FormField label="Fleet Name *" >
              <TextInput
                placeholder="e.g. ABC Transport"
                value={form.fleetName}
                onChange={(e) => set('fleetName', e.target.value)}
              />
              {errors.fleetName && <span className={styles.fieldError}>{errors.fleetName}</span>}
            </FormField>
            <FormField label="Fleet ID" >
              <TextInput
                placeholder="Auto-generated if left empty"
                value={form.fleetId}
                onChange={(e) => set('fleetId', e.target.value)}
              />
            </FormField>
            <FormField label="Business / Company Name *">
              <TextInput
                placeholder="Legal business name"
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
              />
              {errors.businessName && <span className={styles.fieldError}>{errors.businessName}</span>}
            </FormField>
            <FormField label="Business Registration Number">
              <TextInput
                placeholder="e.g. DED-2024-00123"
                value={form.businessRegNo}
                onChange={(e) => set('businessRegNo', e.target.value)}
              />
            </FormField>
            <FormField label="Fleet Type *">
              <Select
                options={FLEET_TYPE_OPTIONS}
                value={form.fleetType}
                onChange={(e) => set('fleetType', e.target.value)}
              />
              {errors.fleetType && <span className={styles.fieldError}>{errors.fleetType}</span>}
            </FormField>
            <div className={styles.inlineGroup}>
              <FormField label="Number of Vehicles">
                <TextInput
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.vehicles}
                  onChange={(e) => set('vehicles', e.target.value)}
                />
              </FormField>
              <FormField label="Number of Drivers">
                <TextInput
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.drivers}
                  onChange={(e) => set('drivers', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 2 — Fleet Owner Information */}
        <section className={styles.section}>
          <SectionHeader
            number="2"
            title="Fleet Owner Information"
            subtitle="Contact details of the fleet owner or primary operator."
          />
          <div className={styles.grid2}>
            <FormField label="Owner Full Name *">
              <TextInput
                placeholder="Full legal name"
                value={form.ownerName}
                onChange={(e) => set('ownerName', e.target.value)}
              />
              {errors.ownerName && <span className={styles.fieldError}>{errors.ownerName}</span>}
            </FormField>
            <FormField label="Email Address *">
              <TextInput
                type="email"
                placeholder="owner@company.ae"
                value={form.ownerEmail}
                onChange={(e) => set('ownerEmail', e.target.value)}
              />
              {errors.ownerEmail && <span className={styles.fieldError}>{errors.ownerEmail}</span>}
            </FormField>
            <FormField label="Phone Number">
              <TextInput
                type="tel"
                placeholder="+971 50 000 0000"
                value={form.ownerPhone}
                onChange={(e) => set('ownerPhone', e.target.value)}
              />
            </FormField>
            <FormField label="City *">
              <TextInput
                placeholder="e.g. Dubai"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
              />
              {errors.city && <span className={styles.fieldError}>{errors.city}</span>}
            </FormField>
            <FormField label="Address">
              <TextInput
                placeholder="Street address"
                value={form.ownerAddress}
                onChange={(e) => set('ownerAddress', e.target.value)}
              />
            </FormField>
            <FormField label="Country">
              <TextInput
                placeholder="UAE"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
              />
            </FormField>
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 3 — Documents */}
        <section className={styles.section}>
          <SectionHeader
            number="3"
            title="Documents"
            subtitle="Upload required fleet documents. All documents must be verified before the fleet can be activated."
          />
          <div className={styles.docList}>
            {DOC_TEMPLATES.map((doc) => {
              const st = docStatuses[doc.id]
              return (
                <div key={doc.id} className={styles.docRow}>
                  <div className={styles.docInfo}>
                    <span className={styles.docName}>{doc.name}</span>
                    <span className={`${styles.docStatus} ${styles[`docStatus--${st}`]}`}>
                      {st === 'not_uploaded' ? 'Not uploaded' : st === 'uploaded' ? 'Uploaded' : 'Verified'}
                    </span>
                  </div>
                  <div className={styles.docActions}>
                    {st === 'not_uploaded' ? (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setDocStatuses((s) => ({ ...s, [doc.id]: 'uploaded' }))}
                      >
                        Upload
                      </button>
                    ) : (
                      <>
                        <span className={styles.docDate}>Just now</span>
                        <button type="button" className="btn btn--ghost btn--sm">View</button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setDocStatuses((s) => ({ ...s, [doc.id]: 'not_uploaded' }))}
                        >
                          Replace
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className={styles.divider} />

        {/* SECTION 4 — Fleet Status */}
        <section className={styles.section}>
          <SectionHeader
            number="4"
            title="Fleet Status"
            subtitle="New fleets default to Pending until reviewed and approved by an admin."
          />
          <div style={{ maxWidth: 280 }}>
            <FormField label="Initial Status">
              <Select
                options={STATUS_OPTIONS}
                value={form.fleetStatus}
                onChange={(e) => set('fleetStatus', e.target.value)}
              />
            </FormField>
          </div>
          <p className={styles.statusNote}>
            Pending fleets cannot receive rides until an admin approves the application.
          </p>
        </section>
      </div>

      {/* Sticky footer */}
      <div className={styles.footer}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate('/fleet')}
          disabled={submitting}
        >
          Cancel
        </button>
        <div className={styles.footerRight}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
          >
            Save as Draft
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create Fleet'}
          </button>
        </div>
      </div>
    </div>
  )
}
