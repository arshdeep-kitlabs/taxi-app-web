import { useEffect, useState } from 'react'
import {
  getFareStructure,
  updateFareStructure,
  getSurgeRules,
  setSurgeRuleActive,
  updateSurgeRule,
} from '../../services/api/pricingService'
import { Badge } from '../../components/ui/Badge'
import { LoadingState } from '../../components/ui/States'
import { FormField, TextInput } from '../../components/ui/FormField'
import { formatRate } from '../../utils/formatters'
import contactStyles from '../drivers/driver-profile/components/ContactVehiclePanel.module.css'
import styles from './PricingPage.module.css'

const FARE_FIELDS = [
  { key: 'baseFare', label: 'Base Fare' },
  { key: 'perMileRate', label: 'Distance Rate (per mile)' },
  { key: 'perMinuteRate', label: 'Time Rate (per minute)' },
  { key: 'minimumFare', label: 'Minimum Fare' },
  { key: 'waitingChargePerMin', label: 'Waiting Charge (per minute)' },
  { key: 'cancellationFee', label: 'Cancellation Fee' },
]

function FareStructurePanel({ fareStructure, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(null)

  function startEditing() {
    setForm({ ...fareStructure })
    setIsEditing(true)
  }

  function handleSave() {
    const patch = Object.fromEntries(FARE_FIELDS.map(({ key }) => [key, Number(form[key]) || 0]))
    onSave(patch)
    setIsEditing(false)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Fare Structure</span>
          <div className="panel-header__subtitle">Applies to all standard rides</div>
        </div>
        {!isEditing && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={startEditing}>
            Edit
          </button>
        )}
      </div>

      <div className={contactStyles.body}>
        {!isEditing ? (
          <div className={contactStyles.grid}>
            {FARE_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <div className={contactStyles.fieldLabel}>{label}</div>
                <div className={contactStyles.fieldValue}>{formatRate(fareStructure[key])}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className={contactStyles.grid}>
              {FARE_FIELDS.map(({ key, label }) => (
                <FormField label={label} key={key}>
                  <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </FormField>
              ))}
            </div>
            <div className={contactStyles.editActions}>
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

const EMPTY_DRAFT = { zone: '', condition: '', multiplier: '' }

function SurgeRulesPanel({ rules, onToggle, onUpdateRule }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function startEditing(rule) {
    setEditingId(rule.id)
    setDraft({ zone: rule.zone, condition: rule.condition, multiplier: String(rule.multiplier) })
  }

  function handleSave(rule) {
    const multiplier = Number(draft.multiplier)
    if (draft.zone.trim().length === 0 || draft.condition.trim().length === 0 || !(multiplier > 0)) return
    onUpdateRule(rule, { zone: draft.zone.trim(), condition: draft.condition.trim(), multiplier })
    setEditingId(null)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-header__title">Surge Rules</span>
          <div className="panel-header__subtitle">Zone-based fare multipliers</div>
        </div>
      </div>
      <div className="table-wrap table-wrap--flush">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Zone</th>
              <th scope="col">Condition</th>
              <th scope="col">Multiplier</th>
              <th scope="col">Status</th>
              <th scope="col" className="visually-hidden">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const isEditing = editingId === rule.id
              return (
                <tr key={rule.id}>
                  <td>
                    {isEditing ? (
                      <TextInput
                        autoFocus
                        value={draft.zone}
                        onChange={(e) => setDraft({ ...draft, zone: e.target.value })}
                        className={styles.zoneInput}
                      />
                    ) : (
                      rule.zone
                    )}
                  </td>
                  <td className="table-cell-muted">
                    {isEditing ? (
                      <TextInput
                        value={draft.condition}
                        onChange={(e) => setDraft({ ...draft, condition: e.target.value })}
                        className={styles.conditionInput}
                      />
                    ) : (
                      rule.condition
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <TextInput
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={draft.multiplier}
                        onChange={(e) => setDraft({ ...draft, multiplier: e.target.value })}
                        className={styles.multiplierInput}
                      />
                    ) : (
                      `${rule.multiplier.toFixed(1)}x`
                    )}
                  </td>
                  <td>
                    <Badge tone={rule.active ? 'success' : 'neutral'}>{rule.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td>
                    {isEditing ? (
                      <>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>{' '}
                        <button type="button" className="btn btn--primary btn--sm" onClick={() => handleSave(rule)}>
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEditing(rule)}>
                          Edit
                        </button>{' '}
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => onToggle(rule)}>
                          {rule.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PricingPage() {
  const [fareStructure, setFareStructureState] = useState(null)
  const [rules, setRules] = useState(null)
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    getFareStructure().then(setFareStructureState)
    getSurgeRules().then(setRules)
  }, [])

  function handleSaveFare(patch) {
    updateFareStructure(patch).then((updated) => {
      setFareStructureState(updated)
      setBanner('Fare structure updated.')
    })
  }

  function handleToggleRule(rule) {
    setSurgeRuleActive(rule.id, !rule.active).then(setRules)
  }

  function handleUpdateRule(rule, patch) {
    updateSurgeRule(rule.id, patch).then((updated) => {
      setRules(updated)
      setBanner(`${patch.zone} surge rule updated.`)
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pricing</h1>
        <p className={styles.subtitle}>Fare structure and surge rules applied across the platform.</p>
      </div>

      {banner && <div className={styles.banner}>{banner}</div>}

      {!fareStructure || !rules ? (
        <LoadingState label="Loading pricing…" />
      ) : (
        <>
          <FareStructurePanel fareStructure={fareStructure} onSave={handleSaveFare} />
          <SurgeRulesPanel rules={rules} onToggle={handleToggleRule} onUpdateRule={handleUpdateRule} />
        </>
      )}
    </div>
  )
}
