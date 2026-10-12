import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  getRolesStats, getRoleSummaries, getFleetUsers,
  updateUserPermissions, changeUserRole, changeUserStatus,
  inviteFleetUser, removeFleetUser,
  ROLE_DEFINITIONS, ALL_PERMISSIONS,
} from '../../../services/api/fleetRolesService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatDateTime } from '../../../utils/formatters'
import { ShieldIcon, PlusIcon, AlertTriangleIcon } from '../../../components/icons'
import styles from './FleetRolesPage.module.css'

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_CFG = {
  fleet_owner:    { variant: 'success', label: 'Fleet Owner' },
  fleet_manager:  { variant: 'info',    label: 'Fleet Manager' },
  dispatcher:     { variant: 'warning', label: 'Dispatcher' },
  finance_manager: { variant: 'neutral', label: 'Finance Manager' },
}

function RoleBadge({ role }) {
  const cfg = ROLE_CFG[role] ?? { variant: 'neutral', label: role }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:    { variant: 'success', label: 'Active' },
  invited:   { variant: 'warning', label: 'Invited' },
  suspended: { variant: 'danger',  label: 'Suspended' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

// ── Filter opts ───────────────────────────────────────────────────────────────
const ROLE_OPTS = [
  { value: 'all',            label: 'All roles' },
  { value: 'fleet_owner',    label: 'Fleet Owner' },
  { value: 'fleet_manager',  label: 'Fleet Manager' },
  { value: 'dispatcher',     label: 'Dispatcher' },
  { value: 'finance_manager', label: 'Finance Manager' },
]
const STATUS_OPTS = [
  { value: 'all',       label: 'All statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'invited',   label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
]

const PAGE_SIZE = 12

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles.statAccent : ''}`}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

// ── Role summary card ─────────────────────────────────────────────────────────
function RoleSummaryCard({ rd }) {
  const previewPerms = rd.defaultPermissions.slice(0, 3)
  const extra = rd.defaultPermissions.length - previewPerms.length
  return (
    <div className={styles.roleCard} style={{ '--role-color': rd.color }}>
      <div className={styles.roleCardHeader}>
        <div className={styles.roleColorDot} />
        <span className={styles.roleCardTitle}>{rd.label}</span>
        <span className={styles.roleUserPill}>{rd.userCount} user{rd.userCount !== 1 ? 's' : ''}</span>
      </div>
      <p className={styles.roleCardDesc}>{rd.description}</p>
      <div className={styles.rolePermList}>
        {previewPerms.map((pk) => {
          const p = ALL_PERMISSIONS.find((p) => p.key === pk)
          return <span key={pk} className={styles.rolePermChip}>{p?.label ?? pk}</span>
        })}
        {extra > 0 && <span className={styles.rolePermChip}>+{extra} more</span>}
      </div>
    </div>
  )
}

// ── Permission toggle grid ────────────────────────────────────────────────────
function PermissionGrid({ selected, onChange, roleKey }) {
  // Enforce business rules: certain roles cannot have certain perms
  const BLOCKED = {
    finance_manager: ['manage_drivers', 'manage_vehicles', 'manage_assignments'],
    dispatcher: ['view_financials', 'manage_documents'],
  }
  const blocked = BLOCKED[roleKey] ?? []

  return (
    <div className={styles.permGrid}>
      {ALL_PERMISSIONS.map((p) => {
        const isBlocked  = blocked.includes(p.key)
        const isChecked  = selected.includes(p.key)
        return (
          <label
            key={p.key}
            className={`${styles.permRow} ${isBlocked ? styles.permBlocked : ''}`}
            title={isBlocked ? 'Not available for this role' : undefined}
          >
            <input
              type="checkbox"
              className={styles.permCheck}
              checked={isChecked}
              disabled={isBlocked}
              onChange={() => {
                if (isBlocked) return
                if (isChecked) onChange(selected.filter((k) => k !== p.key))
                else           onChange([...selected, p.key])
              }}
            />
            <span className={styles.permLabel}>{p.label}</span>
            {isBlocked && <span className={styles.permBlockedNote}>Role restriction</span>}
          </label>
        )
      })}
    </div>
  )
}

// ── Invite modal ──────────────────────────────────────────────────────────────
const INVITE_STEPS = ['Details', 'Role', 'Permissions', 'Review']

function InviteModal({ fleets, onClose, onInvited }) {
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    fleetId: '', fleetName: '',
    name: '', email: '',
    role: 'fleet_manager',
    permissions: [...(ROLE_DEFINITIONS.find(r => r.key === 'fleet_manager')?.defaultPermissions ?? [])],
  })
  const [errors, setErrors] = useState({})

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function handleRoleChange(role) {
    const rd = ROLE_DEFINITIONS.find((r) => r.key === role)
    setForm((f) => ({ ...f, role, permissions: [...(rd?.defaultPermissions ?? [])] }))
  }

  function validateStep() {
    const e = {}
    if (step === 0) {
      if (!form.fleetId)         e.fleetId = 'Select a fleet'
      if (!form.name.trim())     e.name    = 'Name is required'
      if (!form.email.trim())    e.email   = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validateStep()) return
    setStep((s) => s + 1)
  }

  async function handleSend() {
    setSaving(true)
    try {
      const result = await inviteFleetUser(form)
      onInvited(result)
    } catch {
      setSaving(false)
    }
  }

  const rd = ROLE_DEFINITIONS.find((r) => r.key === form.role)

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Invite Fleet User">
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Invite Fleet User</h2>
            <p className={styles.modalSub}>Step {step + 1} of {INVITE_STEPS.length} — {INVITE_STEPS[step]}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Step indicator */}
        <div className={styles.stepBar}>
          {INVITE_STEPS.map((s, i) => (
            <div key={s} className={`${styles.stepItem} ${i <= step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
              <div className={styles.stepDot}>{i < step ? '✓' : i + 1}</div>
              <span className={styles.stepLabel}>{s}</span>
              {i < INVITE_STEPS.length - 1 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className={styles.modalBody}>
          {/* Step 0 — Details */}
          {step === 0 && (
            <div className={styles.formSection}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Fleet <span className={styles.req}>*</span></label>
                <select
                  className={`${styles.formSelect} ${errors.fleetId ? styles.inputError : ''}`}
                  value={form.fleetId}
                  onChange={(e) => {
                    const fl = fleets.find((f) => f.id === e.target.value)
                    setField('fleetId', fl?.id ?? '')
                    setField('fleetName', fl?.name ?? '')
                  }}
                >
                  <option value="">Select fleet…</option>
                  {fleets.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                </select>
                {errors.fleetId && <span className={styles.fieldError}>{errors.fleetId}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Full Name <span className={styles.req}>*</span></label>
                <input
                  className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
                  value={form.name} placeholder="e.g. Ahmed Al-Rashid"
                  onChange={(e) => setField('name', e.target.value)}
                />
                {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email Address <span className={styles.req}>*</span></label>
                <input
                  type="email"
                  className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
                  value={form.email} placeholder="user@fleet.ae"
                  onChange={(e) => setField('email', e.target.value)}
                />
                {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
              </div>
            </div>
          )}

          {/* Step 1 — Role */}
          {step === 1 && (
            <div className={styles.formSection}>
              <p className={styles.stepHint}>Select the role this user will have within their fleet.</p>
              <div className={styles.rolePickerGrid}>
                {ROLE_DEFINITIONS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={`${styles.rolePicker} ${form.role === r.key ? styles.rolePickerActive : ''}`}
                    style={{ '--rp-color': r.color }}
                    onClick={() => handleRoleChange(r.key)}
                  >
                    <div className={styles.rpTop}>
                      <span className={styles.rpDot} />
                      <span className={styles.rpName}>{r.label}</span>
                      {form.role === r.key && <span className={styles.rpCheck}>✓</span>}
                    </div>
                    <p className={styles.rpDesc}>{r.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Permissions */}
          {step === 2 && (
            <div className={styles.formSection}>
              <p className={styles.stepHint}>
                Default permissions for <strong>{rd?.label}</strong> are pre-selected. Adjust as needed.
                Business rules are enforced — some permissions are locked for this role.
              </p>
              <PermissionGrid
                selected={form.permissions}
                onChange={(perms) => setForm((f) => ({ ...f, permissions: perms }))}
                roleKey={form.role}
              />
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className={styles.formSection}>
              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>Fleet</span>
                  <span className={styles.reviewVal}>{form.fleetName} <span className={styles.reviewMono}>({form.fleetId})</span></span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>Name</span>
                  <span className={styles.reviewVal}>{form.name}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>Email</span>
                  <span className={styles.reviewVal}>{form.email}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>Role</span>
                  <span className={styles.reviewVal}><RoleBadge role={form.role} /></span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewKey}>Permissions</span>
                  <div className={styles.reviewPerms}>
                    {form.permissions.map((pk) => {
                      const p = ALL_PERMISSIONS.find((p) => p.key === pk)
                      return <span key={pk} className={styles.reviewPermChip}>{p?.label ?? pk}</span>
                    })}
                  </div>
                </div>
              </div>
              <div className={styles.reviewNote}>
                <AlertTriangleIcon size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
                An invitation email will be sent to <strong>{form.email}</strong>. The user can access only <strong>{form.fleetName}</strong> data after accepting.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {step > 0
            ? <button className="btn btn--secondary" onClick={() => setStep(s => s - 1)}>Back</button>
            : <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          }
          {step < INVITE_STEPS.length - 1
            ? <button className="btn btn--primary" onClick={next}>Continue</button>
            : <button className="btn btn--primary" onClick={handleSend} disabled={saving}>
                {saving ? 'Sending…' : 'Send Invitation'}
              </button>
          }
        </div>
      </div>
    </div>
  )
}

// ── Edit Permissions modal ────────────────────────────────────────────────────
function EditPermissionsModal({ user, onClose, onSaved }) {
  const [perms,   setPerms]   = useState([...user.permissions])
  const [role,    setRole]    = useState(user.role)
  const [saving,  setSaving]  = useState(false)
  const [changed, setChanged] = useState(false)

  function handleRoleChange(newRole) {
    const rd = ROLE_DEFINITIONS.find((r) => r.key === newRole)
    setRole(newRole)
    setPerms([...(rd?.defaultPermissions ?? [])])
    setChanged(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (role !== user.role) await changeUserRole(user.id, role)
      const result = await updateUserPermissions(user.id, perms)
      onSaved(result)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Manage Permissions">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Manage Permissions</h2>
            <p className={styles.modalSub}>{user.name} · {user.fleetName}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Role</label>
              <select
                className={styles.formSelect}
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                {ROLE_DEFINITIONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <span className={styles.fieldHint}>Changing the role resets permissions to role defaults.</span>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Permissions</label>
              <PermissionGrid
                selected={perms}
                onChange={(p) => { setPerms(p); setChanged(true) }}
                roleKey={role}
              />
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !changed}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Remove confirm modal ──────────────────────────────────────────────────────
function RemoveModal({ user, onClose, onRemoved }) {
  const [busy, setBusy] = useState(false)
  async function confirm() {
    setBusy(true)
    try { const r = await removeFleetUser(user.id); onRemoved(r) }
    catch { setBusy(false) }
  }
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={`${styles.modal} ${styles.modalSm}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Remove User</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.warnBanner}>
            <AlertTriangleIcon size={18} style={{ flexShrink: 0 }} />
            <span>This will revoke <strong>{user.name}</strong>'s access to <strong>{user.fleetName}</strong>. This action is recorded in Audit Logs.</span>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--danger" onClick={confirm} disabled={busy}>
            {busy ? 'Removing…' : 'Remove User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Action menu ───────────────────────────────────────────────────────────────
function ActionMenu({ user, onEdit, onStatusChange, onRemove }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className={styles.actionMenu} ref={ref}>
      <button className="btn btn--secondary" style={{ padding: '5px 10px', fontSize: 13 }} onClick={() => setOpen((o) => !o)}>
        Actions ▾
      </button>
      {open && (
        <div className={styles.actionDropdown}>
          <button className={styles.actionItem} onClick={() => { onEdit(); setOpen(false) }}>
            Manage Permissions
          </button>
          {user.status !== 'active' && (
            <button className={styles.actionItem} onClick={() => { onStatusChange('active'); setOpen(false) }}>
              Mark as Active
            </button>
          )}
          {user.status !== 'suspended' && (
            <button className={styles.actionItem} onClick={() => { onStatusChange('suspended'); setOpen(false) }}>
              Suspend Access
            </button>
          )}
          <button className={`${styles.actionItem} ${styles.actionDanger}`} onClick={() => { onRemove(); setOpen(false) }}>
            Remove User
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function FleetRolesPage() {
  const [searchParams] = useSearchParams()

  const [stats,       setStats]       = useState(null)
  const [summaries,   setSummaries]   = useState([])
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [fleets,      setFleets]      = useState([])

  const [search,      setSearch]      = useState('')
  const [filterFleet, setFilterFleet] = useState(searchParams.get('fleet') ?? 'all')
  const [filterRole,  setFilterRole]  = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page,        setPage]        = useState(1)

  const [showInvite,  setShowInvite]  = useState(false)
  const [editUser,    setEditUser]    = useState(null)
  const [removeUser,  setRemoveUser]  = useState(null)

  const [toast, setToast] = useState(null)
  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Load everything ─────────────────────────────────────────────────────────
  function loadAll() {
    setLoading(true)
    setError(null)
    Promise.all([
      getRolesStats(),
      getRoleSummaries(),
      getFleetUsers({ fleetId: filterFleet, role: filterRole, status: filterStatus, search }),
    ])
      .then(([st, sm, us]) => { setStats(st); setSummaries(sm); setUsers(us) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [filterFleet, filterRole, filterStatus, search])  // eslint-disable-line

  useEffect(() => {
    setFleets(storeGetFleets())
  }, [])

  // Fleet filter options
  const fleetOpts = [
    { value: 'all', label: 'All fleets' },
    ...fleets.map((f) => ({ value: f.id, label: `${f.name} (${f.id})` })),
  ]

  // Pagination
  const total  = users.length
  const pages  = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const slice  = users.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleStatusChange(user, status) {
    try {
      await changeUserStatus(user.id, status)
      showToast(`${user.name} marked as ${status}`)
      loadAll()
    } catch (e) { showToast(e.message, 'danger') }
  }

  function handleEditSaved(result) {
    setEditUser(null)
    showToast(`Permissions updated for ${result.name}`)
    loadAll()
  }

  function handleInvited(result) {
    setShowInvite(false)
    showToast(`Invitation sent to ${result.email}`)
    loadAll()
  }

  function handleRemoved() {
    setRemoveUser(null)
    showToast('User removed successfully')
    loadAll()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <ShieldIcon size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--nomad-sage)' }} />
            Roles &amp; Permissions
          </h1>
          <p className={styles.subtitle}>
            Manage fleet-level user access. Fleet users can only access their own fleet's data and cannot access Nomad platform settings.
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowInvite(true)}>
          <PlusIcon size={16} style={{ marginRight: 6 }} />
          Invite Fleet User
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <StatCard label="Total Users"  value={stats.total}     accent />
          <StatCard label="Active"       value={stats.active} />
          <StatCard label="Invited"      value={stats.invited} />
          <StatCard label="Suspended"    value={stats.suspended} />
        </div>
      )}

      {/* Role summary cards */}
      {summaries.length > 0 && (
        <div className={styles.roleCards}>
          {summaries.map((rd) => <RoleSummaryCard key={rd.key} rd={rd} />)}
        </div>
      )}

      {/* Users table */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <Toolbar>
            <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search name, email, fleet…" />
            <FilterSelect label="Fleet"  value={filterFleet}  onChange={(v) => { setFilterFleet(v);  setPage(1) }} options={fleetOpts} />
            <FilterSelect label="Role"   value={filterRole}   onChange={(v) => { setFilterRole(v);   setPage(1) }} options={ROLE_OPTS} />
            <FilterSelect label="Status" value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1) }} options={STATUS_OPTS} />
            <ResultCount count={total} label="user" />
          </Toolbar>
        </div>

        {loading ? <LoadingState message="Loading users…" /> :
         error   ? <ErrorState message={error} onRetry={loadAll} /> :
         slice.length === 0 ? <EmptyState title="No users found" message="Try adjusting your filters or invite a new fleet user." /> : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Fleet</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Permissions</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((u) => (
                    <tr key={u.id} className={u.status === 'suspended' ? styles.rowSuspended : undefined}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar} style={{ background: ROLE_DEFINITIONS.find(r => r.key === u.role)?.color ?? '#5fa77c' }}>
                            {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className={styles.userName}>{u.name}</div>
                            <div className={styles.userEmail}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Link to={`/fleet/${u.fleetId}`} className={styles.fleetLink}>{u.fleetName}</Link>
                        <div className="table-cell-muted" style={{ fontSize: 11.5 }}>{u.fleetId}</div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td><StatusBadge status={u.status} /></td>
                      <td>
                        <div className={styles.permCount}>
                          <span className={styles.permCountNum}>{u.permissions.length}</span>
                          <span className={styles.permCountOf}>/ {ALL_PERMISSIONS.length}</span>
                        </div>
                      </td>
                      <td className="table-cell-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {new Date(u.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="table-cell-muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {u.lastActiveAt
                          ? new Date(u.lastActiveAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span className={styles.neverActive}>Never</span>}
                      </td>
                      <td>
                        <ActionMenu
                          user={u}
                          onEdit={() => setEditUser(u)}
                          onStatusChange={(s) => handleStatusChange(u, s)}
                          onRemove={() => setRemoveUser(u)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className={styles.pagination}>
                <button className="btn btn--secondary" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>← Prev</button>
                <span className={styles.pageInfo}>Page {safePage} of {pages}</span>
                <button className="btn btn--secondary" disabled={safePage === pages} onClick={() => setPage(safePage + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Note about platform access restriction */}
      <div className={styles.accessNote}>
        <ShieldIcon size={14} style={{ color: 'var(--nomad-sage)', flexShrink: 0 }} />
        <span>Fleet users cannot access Nomad platform settings, other fleets' data, or admin-only modules. All permission changes are recorded in Audit Logs.</span>
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteModal fleets={fleets} onClose={() => setShowInvite(false)} onInvited={handleInvited} />
      )}
      {editUser && (
        <EditPermissionsModal user={editUser} onClose={() => setEditUser(null)} onSaved={handleEditSaved} />
      )}
      {removeUser && (
        <RemoveModal user={removeUser} onClose={() => setRemoveUser(null)} onRemoved={handleRemoved} />
      )}
    </div>
  )
}
