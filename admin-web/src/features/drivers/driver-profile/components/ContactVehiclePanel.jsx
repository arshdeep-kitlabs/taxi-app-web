import { useState } from 'react'
import { FormField, TextInput } from '../../../../components/ui/FormField'
import styles from './ContactVehiclePanel.module.css'

function Field({ label, value }) {
  return (
    <div>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value}</div>
    </div>
  )
}

const EMPTY_FORM = { email: '', phone: '', make: '', model: '', year: '', licencePlate: '' }

/*
  A driver has no vehicle until they fill that screen in, so every read here
  goes through a default rather than assuming one. The keys are the config's
  own — licencePlate, not plate — because that is what a PATCH stores.
*/
function formFromDriver(driver) {
  const vehicle = driver.vehicle ?? {}
  return {
    email: driver.email ?? '',
    phone: driver.phone ?? '',
    make: vehicle.make ?? '',
    model: vehicle.model ?? '',
    year: vehicle.year ?? '',
    licencePlate: vehicle.licencePlate ?? '',
  }
}

/**
 * Contact & vehicle details — the fields an admin is permitted to edit.
 * Identity (name, driver ID) and system-calculated fields (rating,
 * earnings, ride counts) are read-only and shown elsewhere on the profile.
 */
export function ContactVehiclePanel({ driver, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function startEditing() {
    setForm(formFromDriver(driver))
    setIsEditing(true)
  }

  function handleSave() {
    onSave({
      email: form.email,
      // Vehicle values are stored as text; the API merges what is sent and
      // leaves the rest alone, so only these four travel.
      vehicle: {
        make: form.make,
        model: form.model,
        year: String(form.year ?? ''),
        licencePlate: form.licencePlate,
      },
    })
    setIsEditing(false)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Contact & Vehicle</span>
          <div className="panel-header__subtitle">Editable information only</div>
        </div>
        {!isEditing && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={startEditing}>
            Edit
          </button>
        )}
      </div>

      <div className={styles.body}>
        {!isEditing ? (
          <>
            <div className={styles.grid}>
              <Field label="Email" value={driver.email} />
              <Field label="Phone" value={driver.phone} />
            </div>
            <div className={styles.divider} />
            <span className={styles.sectionLabel}>Vehicle</span>
            <div className={styles.grid}>
              <Field
                label="Make & model"
                value={[driver.vehicle?.make, driver.vehicle?.model].filter(Boolean).join(' ')}
              />
              <Field label="Year" value={driver.vehicle?.year} />
              <Field label="Plate number" value={driver.vehicle?.licencePlate} />
            </div>
          </>
        ) : (
          <>
            <div className={styles.grid}>
              <FormField label="Email">
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </FormField>
              <FormField label="Phone">
                <TextInput
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </FormField>
            </div>
            <div className={styles.divider} />
            <span className={styles.sectionLabel}>Vehicle</span>
            <div className={styles.grid}>
              <FormField label="Make">
                <TextInput value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} />
              </FormField>
              <FormField label="Model">
                <TextInput
                  value={form.model}
                  onChange={(event) => setForm({ ...form, model: event.target.value })}
                />
              </FormField>
              <FormField label="Year">
                <TextInput
                  type="number"
                  value={form.year}
                  onChange={(event) => setForm({ ...form, year: event.target.value })}
                />
              </FormField>
              <FormField label="Plate number">
                <TextInput
                  value={form.licencePlate}
                  onChange={(event) => setForm({ ...form, licencePlate: event.target.value })}
                />
              </FormField>
            </div>
            <div className={styles.editActions}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
