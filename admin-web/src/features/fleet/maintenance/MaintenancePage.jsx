import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  getFleetMaintenance, getMaintenanceStats,
  addMaintenanceRecord, updateMaintenanceStatus,
  getVehicles,
} from '../../../services/api/vehicleService'
import { storeGetFleets } from '../../../services/api/fleetStore'
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States'
import { Toolbar, SearchField, FilterSelect, ResultCount } from '../../../components/ui/Toolbar'
import { formatCurrency, formatNumber } from '../../../utils/formatters'
import styles from './MaintenancePage.module.css'

// ── Maintenance status config ─────────────────────────────────────────────────
const MAINT_STATUS = {
  operational:          { variant: 'success', label: 'Operational' },
  maintenance_required: { variant: 'warning', label: 'Maintenance Required' },
  under_maintenance:    { variant: 'danger',  label: 'Under Maintenance' },
  suspended:            { variant: 'neutral', label: 'Suspended' },
}

function MaintenanceBadge({ status }) {
  const cfg = MAINT_STATUS[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

// ── Service expiry warning ────────────────────────────────────────────────────
function serviceWarning(dateStr) {
  if (!dateStr) return null
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0)   return { label: 'Overdue',             cls: 'danger' }
  if (diff <= 7)  return { label: `Due in ${Math.ceil(diff)}d`, cls: 'danger' }
  if (diff <= 30) return { label: `Due in ${Math.ceil(diff)}d`, cls: 'warning' }
  return null
}

// ── Filter options ────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'all',                  label: 'All statuses' },
  { value: 'operational',          label: 'Operational' },
  { value: 'maintenance_required', label: 'Maintenance Required' },
  { value: 'under_maintenance',    label: 'Under Maintenance' },
  { value: 'suspended',            label: 'Suspended' },
]

const SERVICE_TYPE_OPTS = [
  'Oil Change & Filter',
  'Full Service',
  'Tyre Rotation',
  'Brake Inspection',
  'Engine Repair',
  'Transmission Service',
  'Battery Replacement',
  'Air Filter Replacement',
  'Coolant Flush',
  'Suspension Check',
  'Pre-delivery Inspection',
  'Other',
]

const MAINT_STATUS_OPTS = [
  { value: 'operational',          label: 'Operational' },
  { value: 'maintenance_required', label: 'Maintenance Required' },
  { value: 'under_maintenance',    label: 'Under Maintenance' },
  { value: 'suspended',            label: 'Suspended' },
]

const PAGE_SIZE = 15

const EMPTY_FORM = {
  vehicleId: '',
  serviceType: '',
  serviceDate: '',
  nextServiceDate: '',
  mileage: '',
  cost: '',
  technician: '',
  notes: '',
  maintenanceStatus: '',
}

export function MaintenancePage() {
  const [searchParams]      = useSearchParams()
  const [search, setSearch] = useState('')
  const [fleet, setFleet]   = useState(() => searchParams.get('fleet') ?? 'all')
  const [mStatus, setMStatus] = useState('all')
  const [page, setPage]     = useState(1)

  const [rows, setRows]     = useState(null)
  const [stats, setStats]   = useState(null)
  const [allVehicles, setAllVehicles] = useState([])
  const [error, setError]   = useState(null)

  // Add Record modal
  const [addModal, setAddModal]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [formBusy, setFormBusy]   = useState(false)
  const [formError, setFormError] = useState('')

  // Status change modal
  const [statusModal, setStatusModal] = useState(null) // { row, newStatus }
  const [statusBusy, setStatusBusy]   = useState(false)

  // Toast
  const [toast, setToast] = useState(null)

  const allFleets = storeGetFleets()
  const fleetOpts = [
    { value: 'all', label: 'All fleets' },
    ...allFleets.map((f) => ({ value: f.id, label: f.name })),
  ]

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3200)
  }

  async function reload() {
    const [r, s] = await Promise.all([
      getFleetMaintenance({ fleetId: fleet, maintenanceStatus: mStatus, search }),
      getMaintenanceStats(),
    ])
    setRows(r); setStats(s)
  }

  useEffect(() => {
    let cancelled = false
    setPage(1)
    Promise.all([
      getFleetMaintenance({ fleetId: fleet, maintenanceStatus: mStatus, search }),
      getMaintenanceStats(),
      getVehicles(),
    ])
      .then(([r, s, v]) => { if (!cancelled) { setRows(r); setStats(s); setAllVehicles(v); setError(null) } })
      .catch(() => { if (!cancelled) setError('Unable to load maintenance data.') })
    return () => { cancelled = true }
  }, [search, fleet, mStatus])

  function resetFilters() { setSearch(''); setFleet('all'); setMStatus('all'); setPage(1) }

  function openAddModal(vehicleId = '') {
    setForm({ ...EMPTY_FORM, vehicleId })
    setFormError('')
    setAddModal(true)
  }

  async function submitAdd() {
    if (!form.vehicleId || !form.serviceType || !form.serviceDate) {
      setFormError('Vehicle, service type and date are required.'); return
    }
    setFormBusy(true); setFormError('')
    try {
      await addMaintenanceRecord(form.vehicleId, {
        serviceType: form.serviceType,
        serviceDate: form.serviceDate,
        nextServiceDate: form.nextServiceDate || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        cost: form.cost ? Number(form.cost) : null,
        technician: form.technician || null,
        notes: form.notes || null,
        maintenanceStatus: form.maintenanceStatus || null,
      })
      await reload()
      setAddModal(false)
      showToast('Maintenance record added')
    } catch (e) {
      setFormError(e.message)
    } finally { setFormBusy(false) }
  }

  async function confirmStatusChange() {
    if (!statusModal) return
    setStatusBusy(true)
    try {
      await updateMaintenanceStatus(statusModal.row.vehicleId, statusModal.newStatus)
      await reload()
      setStatusModal(null)
      showToast(`Status updated to "${MAINT_STATUS[statusModal.newStatus]?.label}"`)
    } finally { setStatusBusy(false) }
  }

  const totalPages = rows ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1
  const paged      = rows ? rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []

  // Vehicles for dropdown in form — filtered by selected fleet if any
  const vehicleOpts = allVehicles.filter((v) => fleet === 'all' || v.fleetId === fleet)

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>{toast.msg}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fleet Maintenance</h1>
          <p className={styles.subtitle}>
            Track maintenance status, service history and upcoming service dates across all vehicles.
            Vehicles under maintenance or suspended cannot receive ride assignments.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => openAddModal()}>
          + Maintenance Record
        </button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span className={styles.statLabel}>Total Vehicles</span><span className={styles.statValue}>{stats.total}</span></div>
          <div className={`${styles.statCard} ${styles.statAccent}`}><span className={styles.statLabel}>Operational</span><span className={styles.statValue}>{stats.operational}</span></div>
          <div className={`${styles.statCard} ${styles.statWarning}`}><span className={styles.statLabel}>Service Required</span><span className={styles.statValue}>{stats.maintenanceRequired}</span></div>
          <div className={`${styles.statCard} ${styles.statDanger}`}><span className={styles.statLabel}>Under Maintenance</span><span className={styles.statValue}>{stats.underMaintenance}</span></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Suspended</span><span className={styles.statValue}>{stats.suspended}</span></div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableSection}>
        <Toolbar>
          <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Vehicle, plate, fleet, driver…" ariaLabel="Search" />
          <FilterSelect value={fleet}   onChange={(v) => { setFleet(v);   setPage(1) }} options={fleetOpts}   ariaLabel="Filter by fleet" />
          <FilterSelect value={mStatus} onChange={(v) => { setMStatus(v); setPage(1) }} options={STATUS_OPTS} ariaLabel="Filter by status" />
          {rows && <ResultCount count={rows.length} noun="vehicle" />}
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>Reset</button>
        </Toolbar>

        {!rows && !error && <LoadingState label="Loading maintenance data…" />}
        {error && <ErrorState description={error} />}
        {rows && rows.length === 0 && <EmptyState title="No vehicles found" description="Try a different search or reset the filters." />}

        {rows && rows.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Fleet</th>
                    <th>Current Driver</th>
                    <th>Maintenance Status</th>
                    <th>Last Service</th>
                    <th>Next Service</th>
                    <th>Last Record</th>
                    <th className="visually-hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row) => {
                    const warn = serviceWarning(row.nextServiceDate)
                    return (
                      <tr key={row.vehicleId}
                        className={row.maintenanceStatus === 'under_maintenance' || row.maintenanceStatus === 'suspended' ? styles.rowAlert : ''}>
                        <td>
                          <Link to={`/fleet/vehicles/${row.vehicleId}`} className={styles.vehicleLink}>{row.vehicleDisplay}</Link>
                          <div className={styles.regNo}>{row.regNo}</div>
                        </td>
                        <td>
                          <Link to={`/fleet/${row.fleetId}`} className={styles.fleetLink}>{row.fleetName}</Link>
                          <div className={styles.sub}>{row.fleetId}</div>
                        </td>
                        <td>
                          {row.driverName
                            ? <><span className={styles.driverName}>{row.driverName}</span><div className={styles.sub}>{row.driverId}</div></>
                            : <span className="table-cell-muted">Unassigned</span>}
                        </td>
                        <td><MaintenanceBadge status={row.maintenanceStatus} /></td>
                        <td className="table-cell-muted">{row.lastServiceDate ?? '—'}</td>
                        <td>
                          {row.nextServiceDate
                            ? <div className={styles.nextService}>
                                <span>{row.nextServiceDate}</span>
                                {warn && <span className={`${styles.serviceTag} ${styles[`tag--${warn.cls}`]}`}>{warn.label}</span>}
                              </div>
                            : <span className="table-cell-muted">—</span>}
                        </td>
                        <td>
                          {row.lastRecord
                            ? <div>
                                <span className={styles.lastRecordType}>{row.lastRecord.serviceType}</span>
                                <div className={styles.sub}>{row.lastRecord.serviceDate}</div>
                              </div>
                            : <span className="table-cell-muted">No records</span>}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button type="button" className="btn btn--ghost btn--sm"
                              onClick={() => openAddModal(row.vehicleId)}>
                              + Record
                            </button>
                            <div className={styles.statusDropdownWrap}>
                              <select
                                className={styles.statusDropdown}
                                value={row.maintenanceStatus}
                                onChange={(e) => setStatusModal({ row, newStatus: e.target.value })}
                                aria-label="Change maintenance status"
                              >
                                {MAINT_STATUS_OPTS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                <button type="button" className="btn btn--ghost btn--sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Maintenance Record modal ──────────────────────────────────── */}
      {addModal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setAddModal(false)}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Add Maintenance Record</h3>

            {formError && <div className={styles.formError}>{formError}</div>}

            <div className={styles.formGrid}>
              {/* Vehicle */}
              <div className={styles.fieldFull}>
                <label className={styles.fieldLabel}>Vehicle *</label>
                <select className={styles.fieldInput}
                  value={form.vehicleId}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}>
                  <option value="">Select vehicle…</option>
                  {allVehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} — {v.regNo} ({v.fleetName})</option>
                  ))}
                </select>
              </div>

              {/* Service Type */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Service Type *</label>
                <select className={styles.fieldInput}
                  value={form.serviceType}
                  onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}>
                  <option value="">Select type…</option>
                  {SERVICE_TYPE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Service Date */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Service Date *</label>
                <input type="date" className={styles.fieldInput}
                  value={form.serviceDate}
                  onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))} />
              </div>

              {/* Next Service Date */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Next Service Date</label>
                <input type="date" className={styles.fieldInput}
                  value={form.nextServiceDate}
                  onChange={(e) => setForm((f) => ({ ...f, nextServiceDate: e.target.value }))} />
              </div>

              {/* Mileage */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Mileage (km)</label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 45000"
                  value={form.mileage}
                  onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))} />
              </div>

              {/* Cost */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Cost (AED)</label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 350"
                  value={form.cost}
                  onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
              </div>

              {/* Technician */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Technician / Service Centre</label>
                <input className={styles.fieldInput} placeholder="e.g. Toyota Service Centre Dubai"
                  value={form.technician}
                  onChange={(e) => setForm((f) => ({ ...f, technician: e.target.value }))} />
              </div>

              {/* Update Maintenance Status */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Update Status (optional)</label>
                <select className={styles.fieldInput}
                  value={form.maintenanceStatus}
                  onChange={(e) => setForm((f) => ({ ...f, maintenanceStatus: e.target.value }))}>
                  <option value="">— No change —</option>
                  {MAINT_STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div className={styles.fieldFull}>
                <label className={styles.fieldLabel}>Notes</label>
                <textarea className={styles.fieldTextarea} rows={3}
                  placeholder="Any additional notes, findings or follow-up actions…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {form.maintenanceStatus === 'under_maintenance' && (
              <div className={styles.warningNote}>
                ⚠ Setting this vehicle to <strong>Under Maintenance</strong> will prevent ride assignments.
              </div>
            )}
            {form.maintenanceStatus === 'suspended' && (
              <div className={styles.warningNote}>
                ⚠ Setting this vehicle to <strong>Suspended</strong> will block all operations.
              </div>
            )}

            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setAddModal(false)} disabled={formBusy}>Cancel</button>
              <button type="button" className="btn btn--primary" onClick={submitAdd} disabled={formBusy}>
                {formBusy ? 'Saving…' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status change confirmation modal ──────────────────────────────── */}
      {statusModal && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setStatusModal(null)}>
          <div className={`${styles.modalBox} ${styles.modalBoxSm}`}>
            <h3 className={styles.modalTitle}>Update Maintenance Status</h3>
            <p className={styles.modalDesc}>
              Change <strong>{statusModal.row.vehicleDisplay}</strong> status to{' '}
              <strong>{MAINT_STATUS[statusModal.newStatus]?.label}</strong>?
            </p>
            {(statusModal.newStatus === 'under_maintenance' || statusModal.newStatus === 'suspended') && (
              <div className={styles.warningNote}>
                ⚠ This vehicle will be <strong>removed from active ride assignments</strong> until the status is restored.
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className="btn btn--ghost" onClick={() => setStatusModal(null)} disabled={statusBusy}>Cancel</button>
              <button type="button"
                className={statusModal.newStatus === 'suspended' || statusModal.newStatus === 'under_maintenance' ? 'btn btn--danger' : 'btn btn--primary'}
                onClick={confirmStatusChange} disabled={statusBusy}>
                {statusBusy ? 'Updating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
