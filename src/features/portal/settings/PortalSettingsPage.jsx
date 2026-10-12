import { useEffect, useState, useRef } from 'react'
import { usePortal } from '../context/PortalContext'
import {
  getPortalFleetProfile,
  updateFleetInfo, updateBusinessInfo, updateContactInfo, updateOperatingInfo,
  getPortalDocuments, requestDocumentReupload,
  getPortalFleetUsers, portalInviteFleetUser,
  portalUpdateUserPermissions, portalChangeUserRole,
  portalChangeUserStatus, portalRemoveFleetUser,
  ROLE_DEFINITIONS, ALL_PERMISSIONS,
} from '../../../services/api/portalFleetService'
import { FleetAccessDenied } from '../auth/portalGuard'
import { LoadingState, ErrorState } from '../../../components/ui/States'
import { ShieldIcon, PlusIcon, AlertTriangleIcon } from '../../../components/icons'
import styles from './PortalSettingsPage.module.css'

// ── Utility ───────────────────────────────────────────────────────────────────
function isAccessError(e) { return e instanceof FleetAccessDenied || e?.code === 'FLEET_ACCESS_DENIED' }

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, title, subtitle, icon, children, onEdit, editing, saving, onSave, onCancel, readOnly }) {
  return (
    <section className={styles.section} id={id}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionMeta}>
          {icon && <span className={styles.sectionIcon}>{icon}</span>}
          <div>
            <h2 className={styles.sectionTitle}>{title}</h2>
            {subtitle && <p className={styles.sectionSub}>{subtitle}</p>}
          </div>
        </div>
        {!readOnly && !editing && (
          <button className="btn btn--secondary" onClick={onEdit} style={{ fontSize: 13 }}>Edit</button>
        )}
        {editing && (
          <div className={styles.editActions}>
            <button className="btn btn--secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            <button className="btn btn--primary"   onClick={onSave}   disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

// ── Display row ───────────────────────────────────────────────────────────────
function DisplayRow({ label, value, mono }) {
  return (
    <div className={styles.displayRow}>
      <span className={styles.displayKey}>{label}</span>
      <span className={`${styles.displayVal} ${mono ? styles.mono : ''}`}>{value || <span className={styles.noValue}>—</span>}</span>
    </div>
  )
}

// ── Form field ────────────────────────────────────────────────────────────────
function Field({ label, children, hint, required, error }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}{required && <span className={styles.req}> *</span>}</label>
      {children}
      {hint  && <span className={styles.fieldHint}>{hint}</span>}
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', readOnly, error }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`${styles.input} ${error ? styles.inputError : ''} ${readOnly ? styles.inputReadOnly : ''}`}
    />
  )
}

function Select({ value, onChange, children }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={styles.select}>
      {children}
    </select>
  )
}

// ── Tag input (for arrays like serviceAreas) ──────────────────────────────────
function TagInput({ values = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }

  return (
    <div className={styles.tagInput}>
      <div className={styles.tagList}>
        {values.map((v) => (
          <span key={v} className={styles.tag}>
            {v}
            <button className={styles.tagRemove} onClick={() => onChange(values.filter((x) => x !== v))}>✕</button>
          </span>
        ))}
      </div>
      <div className={styles.tagAddRow}>
        <input
          className={styles.tagAddInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button className="btn btn--secondary" onClick={add} style={{ padding: '6px 12px', fontSize: 12.5 }}>Add</button>
      </div>
    </div>
  )
}

// ── Document status badge ─────────────────────────────────────────────────────
const DOC_STATUS_CFG = {
  verified: { variant: 'success', label: 'Verified' },
  pending:  { variant: 'warning', label: 'Pending Review' },
  rejected: { variant: 'danger',  label: 'Rejected' },
  expired:  { variant: 'neutral', label: 'Expired' },
}

function DocBadge({ status }) {
  const cfg = DOC_STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

function expiryTag(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / 86400000
  if (diff < 0)   return { label: 'Expired',                   cls: 'danger' }
  if (diff <= 30) return { label: `Expires in ${Math.ceil(diff)}d`, cls: 'warning' }
  return null
}

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_CFG = {
  fleet_owner:     { variant: 'success', label: 'Fleet Owner' },
  fleet_manager:   { variant: 'info',    label: 'Fleet Manager' },
  dispatcher:      { variant: 'warning', label: 'Dispatcher' },
  finance_manager: { variant: 'neutral', label: 'Finance Manager' },
}
const USER_STATUS_CFG = {
  active:    { variant: 'success', label: 'Active' },
  invited:   { variant: 'warning', label: 'Invited' },
  suspended: { variant: 'danger',  label: 'Suspended' },
}
function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] ?? { variant: 'neutral', label: role }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}
function UserStatusBadge({ status }) {
  const cfg = USER_STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

// ── Permission toggle list ────────────────────────────────────────────────────
function PermissionList({ selected, onChange, roleKey }) {
  const BLOCKED = {
    finance_manager: ['manage_drivers', 'manage_vehicles', 'manage_assignments'],
    dispatcher:      ['view_financials', 'manage_documents'],
  }
  const blocked = BLOCKED[roleKey] ?? []
  return (
    <div className={styles.permList}>
      {ALL_PERMISSIONS.map((p) => {
        const isBlocked = blocked.includes(p.key)
        const isChecked = selected.includes(p.key)
        return (
          <label key={p.key} className={`${styles.permRow} ${isBlocked ? styles.permBlocked : ''}`}>
            <input type="checkbox" className={styles.permCheck} checked={isChecked} disabled={isBlocked}
              onChange={() => {
                if (isBlocked) return
                onChange(isChecked ? selected.filter(k => k !== p.key) : [...selected, p.key])
              }}
            />
            <span className={styles.permLabel}>{p.label}</span>
            {isBlocked && <span className={styles.permBlockNote}>Role restriction</span>}
          </label>
        )
      })}
    </div>
  )
}

// ── User action menu ──────────────────────────────────────────────────────────
function UserActionMenu({ user, fleetId, onRefresh, showToast }) {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  async function handleStatus(s) {
    try {
      await portalChangeUserStatus(fleetId, user.id, s)
      showToast(`${user.name} marked as ${s}`)
      onRefresh()
    } catch (e) { showToast(e.message, 'danger') }
    setOpen(false)
  }

  async function handleRemove() {
    try {
      await portalRemoveFleetUser(fleetId, user.id)
      showToast(`${user.name} removed`)
      onRefresh()
    } catch (e) { showToast(e.message, 'danger') }
    setRemoveOpen(false)
  }

  return (
    <>
      <div className={styles.userActionMenu} ref={ref}>
        <button className="btn btn--secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => setOpen(o => !o)}>
          Actions ▾
        </button>
        {open && (
          <div className={styles.userDropdown}>
            <button className={styles.userMenuItem} onClick={() => { setEditOpen(true); setOpen(false) }}>Manage Permissions</button>
            {user.status !== 'active'    && <button className={styles.userMenuItem} onClick={() => handleStatus('active')}>Mark Active</button>}
            {user.status !== 'suspended' && <button className={styles.userMenuItem} onClick={() => handleStatus('suspended')}>Suspend Access</button>}
            {user.role   !== 'fleet_owner' && (
              <button className={`${styles.userMenuItem} ${styles.userMenuDanger}`} onClick={() => { setRemoveOpen(true); setOpen(false) }}>Remove User</button>
            )}
          </div>
        )}
      </div>

      {/* Edit permissions modal */}
      {editOpen && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Manage Permissions</h3>
                <p className={styles.modalSub}>{user.name} · {ROLE_DEFINITIONS.find(r => r.key === user.role)?.label}</p>
              </div>
              <button className={styles.modalClose} onClick={() => setEditOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <EditPermissionsInline
                user={user} fleetId={fleetId}
                onSaved={() => { setEditOpen(false); onRefresh(); showToast('Permissions updated') }}
                onClose={() => setEditOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm modal */}
      {removeOpen && (
        <div className={styles.overlay}>
          <div className={`${styles.modal} ${styles.modalSm}`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Remove User</h3>
              <button className={styles.modalClose} onClick={() => setRemoveOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.warnBanner}>
                <AlertTriangleIcon size={16} style={{ flexShrink: 0 }} />
                <span>Remove <strong>{user.name}</strong> from your fleet? They will lose all access.</span>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn--secondary" onClick={() => setRemoveOpen(false)}>Cancel</button>
              <button className={`btn ${styles.btnDanger}`} onClick={handleRemove}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EditPermissionsInline({ user, fleetId, onSaved, onClose }) {
  const [role,    setRole]    = useState(user.role)
  const [perms,   setPerms]   = useState([...user.permissions])
  const [saving,  setSaving]  = useState(false)

  function handleRoleChange(r) {
    const rd = ROLE_DEFINITIONS.find(x => x.key === r)
    setRole(r); setPerms([...(rd?.defaultPermissions ?? [])])
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (role !== user.role) await portalChangeUserRole(fleetId, user.id, role)
      await portalUpdateUserPermissions(fleetId, user.id, perms)
      onSaved()
    } catch (e) { setSaving(false) }
  }

  return (
    <div>
      <div className={styles.field} style={{ marginBottom: 14 }}>
        <label className={styles.fieldLabel}>Role</label>
        <select className={styles.select} value={role} onChange={e => handleRoleChange(e.target.value)}>
          {ROLE_DEFINITIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <span className={styles.fieldHint}>Changing role resets permissions to role defaults.</span>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Permissions</label>
        <PermissionList selected={perms} onChange={setPerms} roleKey={role} />
      </div>
      <div className={styles.modalFooter}>
        <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}

// ── Invite modal ──────────────────────────────────────────────────────────────
function InviteModal({ fleetId, fleetName, onClose, onInvited }) {
  const [form, setForm]     = useState({ name: '', email: '', role: 'fleet_manager', permissions: [...(ROLE_DEFINITIONS.find(r => r.key === 'fleet_manager')?.defaultPermissions ?? [])] })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [step, setStep]     = useState(0)

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  function handleRole(r) {
    const rd = ROLE_DEFINITIONS.find(x => x.key === r)
    setForm(f => ({ ...f, role: r, permissions: [...(rd?.defaultPermissions ?? [])] }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())                                    e.name  = 'Name is required'
    if (!form.email.trim())                                   e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSend() {
    if (!validate()) return
    setSaving(true)
    try {
      const r = await portalInviteFleetUser(fleetId, { ...form, fleetId, fleetName })
      onInvited(r)
    } catch (e) { setSaving(false) }
  }

  const rd = ROLE_DEFINITIONS.find(r => r.key === form.role)

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Invite Team Member</h3>
            <p className={styles.modalSub}>Add a user to <strong>{fleetName}</strong></p>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          {/* Step tabs */}
          <div className={styles.inviteSteps}>
            {['Details & Role', 'Permissions', 'Review'].map((s, i) => (
              <button key={s} type="button"
                className={`${styles.inviteStep} ${step === i ? styles.inviteStepActive : ''} ${i < step ? styles.inviteStepDone : ''}`}
                onClick={() => i < step && setStep(i)}>
                <span className={styles.inviteStepNum}>{i < step ? '✓' : i + 1}</span>{s}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className={styles.inviteBody}>
              <div className={styles.formGrid}>
                <Field label="Full Name" required error={errors.name}>
                  <Input value={form.name} onChange={v => setF('name', v)} placeholder="e.g. Khalid Nasser" error={errors.name} />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <Input type="email" value={form.email} onChange={v => setF('email', v)} placeholder="user@fleet.ae" error={errors.email} />
                </Field>
              </div>
              <Field label="Role">
                <div className={styles.roleGrid}>
                  {ROLE_DEFINITIONS.filter(r => r.key !== 'fleet_owner').map(r => (
                    <button key={r.key} type="button"
                      className={`${styles.rolePicker} ${form.role === r.key ? styles.rolePickerActive : ''}`}
                      style={{ '--rp': r.color }}
                      onClick={() => handleRole(r.key)}>
                      <div className={styles.rpDot} />
                      <div className={styles.rpText}>
                        <span className={styles.rpName}>{r.label}</span>
                        <span className={styles.rpDesc}>{r.description}</span>
                      </div>
                      {form.role === r.key && <span className={styles.rpCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              </Field>
              <div className={styles.inviteNav}>
                <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn--primary" onClick={() => { if (validate()) setStep(1) }}>Next: Permissions</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.inviteBody}>
              <p className={styles.inviteHint}>Default permissions for <strong>{rd?.label}</strong> are pre-selected. Adjust within role restrictions.</p>
              <PermissionList selected={form.permissions} onChange={p => setForm(f => ({ ...f, permissions: p }))} roleKey={form.role} />
              <div className={styles.inviteNav}>
                <button className="btn btn--secondary" onClick={() => setStep(0)}>Back</button>
                <button className="btn btn--primary" onClick={() => setStep(2)}>Review</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.inviteBody}>
              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}><span className={styles.reviewKey}>Name</span><span className={styles.reviewVal}>{form.name}</span></div>
                <div className={styles.reviewRow}><span className={styles.reviewKey}>Email</span><span className={`${styles.reviewVal} ${styles.mono}`}>{form.email}</span></div>
                <div className={styles.reviewRow}><span className={styles.reviewKey}>Role</span><span className={styles.reviewVal}><RoleBadge role={form.role} /></span></div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>Permissions</span>
                  <div className={styles.reviewPerms}>{form.permissions.map(pk => <span key={pk} className={styles.reviewChip}>{ALL_PERMISSIONS.find(p => p.key === pk)?.label ?? pk}</span>)}</div>
                </div>
              </div>
              <div className={styles.reviewNote}>
                <AlertTriangleIcon size={14} style={{ flexShrink: 0, color: '#92400e' }} />
                An invitation will be sent to <strong>{form.email}</strong>. They will only have access to <strong>{fleetName}</strong>.
              </div>
              <div className={styles.inviteNav}>
                <button className="btn btn--secondary" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn--primary" onClick={handleSend} disabled={saving}>{saving ? 'Sending…' : 'Send Invitation'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Main page
// ════════════════════════════════════════════════════════════════════════════
export function PortalSettingsPage() {
  const { fleetId, fleet: ctxFleet } = usePortal()

  const [profile,      setProfile]      = useState(null)
  const [docs,         setDocs]         = useState([])
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [showInvite,   setShowInvite]   = useState(false)
  const [toast,        setToast]        = useState(null)
  const [reloadFlag,   setReloadFlag]   = useState(0)

  // Which section is in edit mode
  const [editing, setEditing]   = useState({})   // { fleetInfo, businessInfo, contactInfo, operatingInfo }
  const [saving,  setSaving]    = useState({})
  const [draft,   setDraft]     = useState({})    // section-keyed draft state

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  function reload() { setReloadFlag(f => f + 1) }

  useEffect(() => {
    if (!fleetId) return
    setLoading(true); setError(null)
    Promise.all([
      getPortalFleetProfile(fleetId),
      getPortalDocuments(fleetId),
      getPortalFleetUsers(fleetId),
    ])
      .then(([p, d, u]) => { setProfile(p); setDocs(d); setUsers(u) })
      .catch((e) => {
        if (isAccessError(e)) setError('Access denied: you can only view your own fleet settings.')
        else setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [fleetId, reloadFlag])  // eslint-disable-line

  // ── Edit helpers ────────────────────────────────────────────────────────────
  function startEdit(section, initDraft) {
    setEditing(e => ({ ...e, [section]: true }))
    setDraft(d  => ({ ...d, [section]: { ...initDraft } }))
  }
  function cancelEdit(section) {
    setEditing(e => ({ ...e, [section]: false }))
    setDraft(d   => ({ ...d, [section]: undefined }))
  }
  function setDraftField(section, key, value) {
    setDraft(d => ({ ...d, [section]: { ...d[section], [key]: value } }))
  }

  async function saveSection(section, saveFn) {
    setSaving(s => ({ ...s, [section]: true }))
    try {
      const result = await saveFn(fleetId, draft[section])
      setProfile(result)
      setEditing(e => ({ ...e, [section]: false }))
      showToast('Changes saved successfully')
    } catch (e) {
      if (isAccessError(e)) showToast('Access denied: you cannot modify this data.', 'danger')
      else showToast(e.message, 'danger')
    } finally {
      setSaving(s => ({ ...s, [section]: false }))
    }
  }

  // ── Document re-upload request ───────────────────────────────────────────────
  async function handleReuploadRequest(docId, docName) {
    try {
      await requestDocumentReupload(fleetId, docId)
      showToast(`Re-upload requested for ${docName}`)
      reload()
    } catch (e) { showToast(e.message, 'danger') }
  }

  // ── Fleet type options ──────────────────────────────────────────────────────
  const FLEET_TYPES = ['taxi', 'private_hire', 'transportation', 'courier']
  const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  if (loading) return <LoadingState message="Loading fleet settings…" />
  if (error)   return <ErrorState message={error} />
  if (!profile) return null

  const p = profile   // shorthand
  const fleetName = p.name ?? ctxFleet?.name ?? fleetId

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Fleet Settings</h1>
          <p className={styles.pageSub}>{fleetName} · {fleetId}</p>
        </div>
        <div className={styles.isolation}>
          <ShieldIcon size={13} style={{ color: 'var(--nomad-sage)', flexShrink: 0 }} />
          <span>Data isolated to your fleet only</span>
        </div>
      </div>

      {/* Section nav */}
      <nav className={styles.sectionNav}>
        {['fleet-info','business-info','contact-info','documents','operating-info','users'].map((id) => (
          <a key={id} href={`#${id}`} className={styles.sectionNavLink}>
            {{ 'fleet-info': 'Fleet Info', 'business-info': 'Business', 'contact-info': 'Contact',
               documents: 'Documents', 'operating-info': 'Operations', users: 'Users & Roles' }[id]}
          </a>
        ))}
      </nav>

      {/* ── 1. Fleet Information ──────────────────────────────────────────── */}
      <Section id="fleet-info" title="Fleet Information" subtitle="Basic details about your fleet on the Nomad platform."
        icon="🚖" editing={editing.fleetInfo} saving={saving.fleetInfo}
        onEdit={() => startEdit('fleetInfo', { name: p.name, fleetType: p.fleetType, city: p.city, country: p.country })}
        onCancel={() => cancelEdit('fleetInfo')}
        onSave={() => saveSection('fleetInfo', updateFleetInfo)}>
        {!editing.fleetInfo ? (
          <div className={styles.displayGrid}>
            <DisplayRow label="Fleet Name"   value={p.name} />
            <DisplayRow label="Fleet ID"     value={p.fleetId} mono />
            <DisplayRow label="Fleet Type"   value={p.fleetType?.replace(/_/g, ' ')} />
            <DisplayRow label="City"         value={p.city} />
            <DisplayRow label="Country"      value={p.country} />
            <DisplayRow label="Status"       value={<span className={`badge badge--${p.status === 'active' ? 'success' : 'warning'}`}><span className="badge__dot" />{p.status}</span>} />
            <DisplayRow label="Member Since" value={new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
          </div>
        ) : (
          <div className={styles.formGrid}>
            <Field label="Fleet Name" required>
              <Input value={draft.fleetInfo?.name} onChange={v => setDraftField('fleetInfo', 'name', v)} placeholder="Your fleet name" />
            </Field>
            <Field label="Fleet Type">
              <Select value={draft.fleetInfo?.fleetType} onChange={v => setDraftField('fleetInfo', 'fleetType', v)}>
                {FLEET_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
            <Field label="City">
              <Input value={draft.fleetInfo?.city} onChange={v => setDraftField('fleetInfo', 'city', v)} placeholder="e.g. Dubai" />
            </Field>
            <Field label="Country">
              <Input value={draft.fleetInfo?.country} onChange={v => setDraftField('fleetInfo', 'country', v)} placeholder="e.g. UAE" />
            </Field>
            <div className={styles.readOnlyNote}>
              <ShieldIcon size={13} style={{ color: 'var(--nomad-sage)' }} />
              Fleet ID and status are managed by Nomad and cannot be changed here.
            </div>
          </div>
        )}
      </Section>

      {/* ── 2. Business Information ───────────────────────────────────────── */}
      <Section id="business-info" title="Business Information" subtitle="Your company registration and tax details."
        icon="🏢" editing={editing.businessInfo} saving={saving.businessInfo}
        onEdit={() => startEdit('businessInfo', {
          businessName: p.businessName, taxRegistrationNo: p.taxRegistrationNo,
          vatRegistered: p.vatRegistered, businessAddress: p.businessAddress,
          businessCity: p.businessCity, businessCountry: p.businessCountry, businessPostalCode: p.businessPostalCode,
        })}
        onCancel={() => cancelEdit('businessInfo')}
        onSave={() => saveSection('businessInfo', updateBusinessInfo)}>
        {!editing.businessInfo ? (
          <div className={styles.displayGrid}>
            <DisplayRow label="Business Name"       value={p.businessName} />
            <DisplayRow label="Registration No."    value={p.businessRegNo} mono />
            <DisplayRow label="Tax Reg. No."        value={p.taxRegistrationNo} mono />
            <DisplayRow label="VAT Registered"      value={p.vatRegistered ? 'Yes' : 'No'} />
            <DisplayRow label="Business Address"    value={p.businessAddress} />
            <DisplayRow label="Business City"       value={p.businessCity} />
            <DisplayRow label="Country"             value={p.businessCountry} />
            <DisplayRow label="Postal Code"         value={p.businessPostalCode} />
          </div>
        ) : (
          <div className={styles.formGrid}>
            <Field label="Business Name" required>
              <Input value={draft.businessInfo?.businessName} onChange={v => setDraftField('businessInfo', 'businessName', v)} />
            </Field>
            <Field label="Tax Registration No." hint="UAE TRN — changes require Nomad document re-verification">
              <Input value={draft.businessInfo?.taxRegistrationNo} onChange={v => setDraftField('businessInfo', 'taxRegistrationNo', v)} placeholder="TRN-100…" />
            </Field>
            <Field label="VAT Registered">
              <Select value={draft.businessInfo?.vatRegistered ? 'yes' : 'no'}
                onChange={v => setDraftField('businessInfo', 'vatRegistered', v === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </Field>
            <Field label="Business Address">
              <Input value={draft.businessInfo?.businessAddress} onChange={v => setDraftField('businessInfo', 'businessAddress', v)} placeholder="Street, building" />
            </Field>
            <Field label="Business City">
              <Input value={draft.businessInfo?.businessCity} onChange={v => setDraftField('businessInfo', 'businessCity', v)} />
            </Field>
            <Field label="Postal Code">
              <Input value={draft.businessInfo?.businessPostalCode} onChange={v => setDraftField('businessInfo', 'businessPostalCode', v)} />
            </Field>
            <div className={styles.readOnlyNote}>
              <ShieldIcon size={13} style={{ color: 'var(--nomad-sage)' }} />
              Business Registration No. is locked — changes require Nomad admin re-verification.
            </div>
          </div>
        )}
      </Section>

      {/* ── 3. Contact Information ────────────────────────────────────────── */}
      <Section id="contact-info" title="Contact Information" subtitle="Primary and emergency contacts for your fleet."
        icon="📞" editing={editing.contactInfo} saving={saving.contactInfo}
        onEdit={() => startEdit('contactInfo', {
          primaryContactName: p.primaryContactName, primaryContactEmail: p.primaryContactEmail,
          primaryContactPhone: p.primaryContactPhone, primaryContactTitle: p.primaryContactTitle,
          secondaryContactName: p.secondaryContactName, secondaryContactEmail: p.secondaryContactEmail,
          secondaryContactPhone: p.secondaryContactPhone, secondaryContactTitle: p.secondaryContactTitle,
          emergencyContactName: p.emergencyContactName, emergencyContactPhone: p.emergencyContactPhone,
        })}
        onCancel={() => cancelEdit('contactInfo')}
        onSave={() => saveSection('contactInfo', updateContactInfo)}>
        {!editing.contactInfo ? (
          <>
            <div className={styles.contactGroup}>
              <div className={styles.contactGroupLabel}>Primary Contact</div>
              <div className={styles.displayGrid}>
                <DisplayRow label="Name"  value={p.primaryContactName} />
                <DisplayRow label="Title" value={p.primaryContactTitle} />
                <DisplayRow label="Email" value={p.primaryContactEmail} mono />
                <DisplayRow label="Phone" value={p.primaryContactPhone} />
              </div>
            </div>
            <div className={styles.contactGroup}>
              <div className={styles.contactGroupLabel}>Secondary Contact</div>
              <div className={styles.displayGrid}>
                <DisplayRow label="Name"  value={p.secondaryContactName} />
                <DisplayRow label="Title" value={p.secondaryContactTitle} />
                <DisplayRow label="Email" value={p.secondaryContactEmail} mono />
                <DisplayRow label="Phone" value={p.secondaryContactPhone} />
              </div>
            </div>
            <div className={styles.contactGroup}>
              <div className={styles.contactGroupLabel}>Emergency Contact</div>
              <div className={styles.displayGrid}>
                <DisplayRow label="Name"  value={p.emergencyContactName} />
                <DisplayRow label="Phone" value={p.emergencyContactPhone} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.contactGroup}>
              <div className={styles.contactGroupLabel}>Primary Contact</div>
              <div className={styles.formGrid}>
                <Field label="Name"><Input value={draft.contactInfo?.primaryContactName}  onChange={v => setDraftField('contactInfo', 'primaryContactName', v)} /></Field>
                <Field label="Title"><Input value={draft.contactInfo?.primaryContactTitle} onChange={v => setDraftField('contactInfo', 'primaryContactTitle', v)} placeholder="Fleet Owner" /></Field>
                <Field label="Email"><Input type="email" value={draft.contactInfo?.primaryContactEmail} onChange={v => setDraftField('contactInfo', 'primaryContactEmail', v)} /></Field>
                <Field label="Phone"><Input value={draft.contactInfo?.primaryContactPhone} onChange={v => setDraftField('contactInfo', 'primaryContactPhone', v)} placeholder="+971 50…" /></Field>
              </div>
            </div>
            <div className={styles.contactGroup}>
              <div className={styles.contactGroupLabel}>Secondary Contact</div>
              <div className={styles.formGrid}>
                <Field label="Name"><Input value={draft.contactInfo?.secondaryContactName}  onChange={v => setDraftField('contactInfo', 'secondaryContactName', v)} /></Field>
                <Field label="Title"><Input value={draft.contactInfo?.secondaryContactTitle} onChange={v => setDraftField('contactInfo', 'secondaryContactTitle', v)} /></Field>
                <Field label="Email"><Input type="email" value={draft.contactInfo?.secondaryContactEmail} onChange={v => setDraftField('contactInfo', 'secondaryContactEmail', v)} /></Field>
                <Field label="Phone"><Input value={draft.contactInfo?.secondaryContactPhone} onChange={v => setDraftField('contactInfo', 'secondaryContactPhone', v)} /></Field>
              </div>
            </div>
            <div className={styles.contactGroup}>
              <div className={styles.contactGroupLabel}>Emergency Contact</div>
              <div className={styles.formGrid}>
                <Field label="Name"><Input value={draft.contactInfo?.emergencyContactName}  onChange={v => setDraftField('contactInfo', 'emergencyContactName', v)} /></Field>
                <Field label="Phone"><Input value={draft.contactInfo?.emergencyContactPhone} onChange={v => setDraftField('contactInfo', 'emergencyContactPhone', v)} /></Field>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ── 4. Fleet Documents ────────────────────────────────────────────── */}
      <Section id="documents" title="Fleet Documents" subtitle="Nomad-verified documents for your fleet. Contact Nomad to update core documents."
        icon="📄" readOnly>
        {docs.length === 0 ? (
          <p className={styles.emptyNote}>No documents found for this fleet.</p>
        ) : (
          <div className={styles.docGrid}>
            {docs.map((doc) => {
              const tag = expiryTag(doc.expiryDate)
              return (
                <div key={doc.id} className={`${styles.docCard} ${doc.status === 'rejected' ? styles.docRejected : ''}`}>
                  <div className={styles.docCardHead}>
                    <span className={styles.docType}>{doc.type ?? doc.name}</span>
                    <DocBadge status={doc.status} />
                  </div>
                  {doc.number && <div className={styles.docNumber}>{doc.number}</div>}
                  <div className={styles.docDates}>
                    {doc.issueDate  && <span>Issued: {doc.issueDate}</span>}
                    {doc.expiryDate && (
                      <span>
                        Expires: {doc.expiryDate}
                        {tag && <span className={`badge badge--${tag.cls}`} style={{ marginLeft: 6, fontSize: 10.5 }}><span className="badge__dot" />{tag.label}</span>}
                      </span>
                    )}
                  </div>
                  {doc.status === 'rejected' && doc.rejectionReason && (
                    <div className={styles.docRejectReason}>
                      <AlertTriangleIcon size={12} style={{ flexShrink: 0 }} />
                      {doc.rejectionReason}
                    </div>
                  )}
                  {(doc.status === 'rejected' || doc.status === 'expired') && (
                    <button className="btn btn--secondary" style={{ fontSize: 12.5, padding: '5px 10px', marginTop: 8 }}
                      onClick={() => handleReuploadRequest(doc.id, doc.type ?? doc.name)}>
                      Request Re-upload
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div className={styles.docNote}>
          <ShieldIcon size={13} style={{ color: 'var(--nomad-sage)', flexShrink: 0 }} />
          Document verification is performed by Nomad administrators. You can request a re-upload for rejected or expired documents.
        </div>
      </Section>

      {/* ── 5. Operating Information ─────────────────────────────────────── */}
      <Section id="operating-info" title="Operating Information" subtitle="Hours, service areas and vehicle types your fleet offers."
        icon="🗺️" editing={editing.operatingInfo} saving={saving.operatingInfo}
        onEdit={() => startEdit('operatingInfo', {
          operatingHoursFrom: p.operatingHoursFrom, operatingHoursTo: p.operatingHoursTo,
          operatingDays: [...(p.operatingDays ?? [])],
          serviceAreas: [...(p.serviceAreas ?? [])],
          vehicleTypesOffered: [...(p.vehicleTypesOffered ?? [])],
          specialServices: [...(p.specialServices ?? [])],
          maxVehicleCapacity: p.maxVehicleCapacity, maxDriverCapacity: p.maxDriverCapacity,
          notes: p.notes,
        })}
        onCancel={() => cancelEdit('operatingInfo')}
        onSave={() => saveSection('operatingInfo', updateOperatingInfo)}>
        {!editing.operatingInfo ? (
          <div className={styles.displayGrid}>
            <DisplayRow label="Operating Hours" value={`${p.operatingHoursFrom ?? '—'} – ${p.operatingHoursTo ?? '—'}`} />
            <DisplayRow label="Operating Days"  value={(p.operatingDays ?? []).join(', ')} />
            <DisplayRow label="Service Areas"   value={(p.serviceAreas ?? []).join(', ')} />
            <DisplayRow label="Vehicle Types"   value={(p.vehicleTypesOffered ?? []).join(', ')} />
            <DisplayRow label="Special Services" value={(p.specialServices ?? []).join(', ')} />
            <DisplayRow label="Max Vehicles"    value={p.maxVehicleCapacity} />
            <DisplayRow label="Max Drivers"     value={p.maxDriverCapacity} />
            <DisplayRow label="Notes"           value={p.notes} />
          </div>
        ) : (
          <div className={styles.formGrid}>
            <Field label="Operating From">
              <Input type="time" value={draft.operatingInfo?.operatingHoursFrom} onChange={v => setDraftField('operatingInfo', 'operatingHoursFrom', v)} />
            </Field>
            <Field label="Operating To">
              <Input type="time" value={draft.operatingInfo?.operatingHoursTo}   onChange={v => setDraftField('operatingInfo', 'operatingHoursTo', v)} />
            </Field>
            <Field label="Operating Days" hint="Select the days your fleet is active">
              <div className={styles.dayToggleRow}>
                {DAYS_OF_WEEK.map(d => {
                  const active = (draft.operatingInfo?.operatingDays ?? []).includes(d)
                  return (
                    <button key={d} type="button"
                      className={`${styles.dayToggle} ${active ? styles.dayToggleOn : ''}`}
                      onClick={() => {
                        const days = draft.operatingInfo?.operatingDays ?? []
                        setDraftField('operatingInfo', 'operatingDays', active ? days.filter(x => x !== d) : [...days, d])
                      }}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="Service Areas" hint="Cities or zones where your fleet operates">
              <TagInput values={draft.operatingInfo?.serviceAreas ?? []}
                onChange={v => setDraftField('operatingInfo', 'serviceAreas', v)} placeholder="Add city / zone…" />
            </Field>
            <Field label="Vehicle Types Offered">
              <TagInput values={draft.operatingInfo?.vehicleTypesOffered ?? []}
                onChange={v => setDraftField('operatingInfo', 'vehicleTypesOffered', v)} placeholder="e.g. Sedan, SUV…" />
            </Field>
            <Field label="Special Services">
              <TagInput values={draft.operatingInfo?.specialServices ?? []}
                onChange={v => setDraftField('operatingInfo', 'specialServices', v)} placeholder="e.g. Airport Transfers…" />
            </Field>
            <Field label="Notes">
              <textarea className={styles.textarea} value={draft.operatingInfo?.notes ?? ''}
                onChange={e => setDraftField('operatingInfo', 'notes', e.target.value)}
                placeholder="Additional notes about your fleet operations…" rows={3} />
            </Field>
          </div>
        )}
      </Section>

      {/* ── 6. Users & Role Management ───────────────────────────────────── */}
      <Section id="users" title="Users &amp; Role Management" subtitle="Manage who can access your fleet portal and what they can do."
        icon="👥" readOnly>
        <div className={styles.usersHeader}>
          <span className={styles.usersCount}>{users.length} user{users.length !== 1 ? 's' : ''} · {users.filter(u => u.status === 'active').length} active</span>
          <button className="btn btn--primary" style={{ fontSize: 13 }} onClick={() => setShowInvite(true)}>
            <PlusIcon size={14} style={{ marginRight: 5 }} />Invite User
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Permissions</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.status === 'suspended' ? styles.userRowSuspended : undefined}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar} style={{ background: ROLE_DEFINITIONS.find(r => r.key === u.role)?.color ?? '#5fa77c' }}>
                        {u.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className={styles.userName}>{u.name}</div>
                        <div className={styles.userEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><UserStatusBadge status={u.status} /></td>
                  <td>
                    <span className={styles.permCount}>{u.permissions.length}</span>
                    <span className={styles.permCountOf}> / {ALL_PERMISSIONS.length}</span>
                  </td>
                  <td className="table-cell-muted" style={{ fontSize: 12.5 }}>
                    {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <em>Never</em>}
                  </td>
                  <td>
                    {u.role === 'fleet_owner'
                      ? <span className="table-cell-muted" style={{ fontSize: 12 }}>—</span>
                      : <UserActionMenu user={u} fleetId={fleetId} onRefresh={reload} showToast={showToast} />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Access isolation note */}
        <div className={styles.isolationNote}>
          <ShieldIcon size={13} style={{ color: 'var(--nomad-sage)', flexShrink: 0 }} />
          <span>
            All users here can only access <strong>{fleetName}</strong> data. They cannot view other fleets, Nomad customers, platform revenue, or admin settings.
            All permission changes are recorded in the Nomad Audit Log.
          </span>
        </div>
      </Section>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          fleetId={fleetId} fleetName={fleetName}
          onClose={() => setShowInvite(false)}
          onInvited={(r) => { setShowInvite(false); showToast(`Invitation sent to ${r.email}`); reload() }}
        />
      )}
    </div>
  )
}
