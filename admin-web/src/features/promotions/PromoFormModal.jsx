import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { FormField, TextInput, Select } from '../../components/ui/FormField'
import contactStyles from '../drivers/driver-profile/components/ContactVehiclePanel.module.css'

const EMPTY = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  usageLimit: '',
  perUserLimit: '1',
  eligibility: 'all',
  city: '',
}

/** Shared create/edit modal for promo codes. */
export function PromoFormModal({ promo, onCancel, onSave }) {
  const [form, setForm] = useState(() =>
    promo
      ? {
          ...EMPTY,
          ...promo,
          validFrom: promo.validFrom.slice(0, 10),
          validUntil: promo.validUntil.slice(0, 10),
        }
      : EMPTY,
  )

  const isValid = form.code.trim().length > 0 && Number(form.discountValue) > 0 && Number(form.usageLimit) > 0

  function handleSave() {
    onSave({
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      validFrom: new Date(`${form.validFrom}T00:00:00`).toISOString(),
      validUntil: new Date(`${form.validUntil}T23:59:59`).toISOString(),
      usageLimit: Number(form.usageLimit),
      perUserLimit: Number(form.perUserLimit) || 1,
      eligibility: form.eligibility,
      city: form.eligibility === 'city' ? form.city : undefined,
    })
  }

  return (
    <Modal
      title={promo ? 'Edit promo code' : 'Create promo code'}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" disabled={!isValid} onClick={handleSave}>
            {promo ? 'Save Changes' : 'Create Promo'}
          </button>
        </>
      }
    >
      <div className={contactStyles.grid}>
        <FormField label="Promo code">
          <TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAVE10" />
        </FormField>
        <FormField label="Discount type">
          <Select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            options={[
              { value: 'percentage', label: 'Percentage' },
              { value: 'flat', label: 'Flat amount' },
            ]}
          />
        </FormField>
        <FormField label={form.discountType === 'percentage' ? 'Discount (%)' : 'Discount ($)'}>
          <TextInput
            type="number"
            min="0"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
          />
        </FormField>
        <FormField label="Eligibility">
          <Select
            value={form.eligibility}
            onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
            options={[
              { value: 'all', label: 'All customers' },
              { value: 'new_customers', label: 'New customers only' },
              { value: 'city', label: 'Specific city' },
            ]}
          />
        </FormField>
        {form.eligibility === 'city' && (
          <FormField label="City">
            <TextInput value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </FormField>
        )}
        <FormField label="Valid from">
          <TextInput type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
        </FormField>
        <FormField label="Valid until">
          <TextInput type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
        </FormField>
        <FormField label="Total usage limit">
          <TextInput
            type="number"
            min="1"
            value={form.usageLimit}
            onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
          />
        </FormField>
        <FormField label="Per-customer limit">
          <TextInput
            type="number"
            min="1"
            value={form.perUserLimit}
            onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
          />
        </FormField>
      </div>
    </Modal>
  )
}
