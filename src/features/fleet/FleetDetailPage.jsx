import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getFleetById,
  getFleetDocuments,
  getFleetDrivers,
  getFleetVehicles,
  getFleetAssignments,
  getFleetRecentRides,
} from '../../services/api/fleetService'
import { LoadingState, ErrorState } from '../../components/ui/States'
import { FleetStatusBadge } from './components/FleetStatusBadge'
import { ChevronRightIcon } from '../../components/icons'
import { formatDateTime, formatCurrency, formatNumber } from '../../utils/formatters'
import styles from './FleetDetailPage.module.css'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'documents', label: 'Documents' },
  { key: 'rides', label: 'Rides' },
  { key: 'performance', label: 'Performance' },
  { key: 'financials', label: 'Financials' },
  { key: 'roles',      label: 'Roles & Perms' },
]

/* ---- Tab content components ---- */

function OverviewTab({ fleet }) {
  return (
    <div className={styles.overviewGrid}>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-header__title">Fleet Details</span>
        </div>
        <div className={styles.detailList}>
          <DetailRow label="Fleet ID" value={fleet.id} mono />
          <DetailRow label="Fleet Name" value={fleet.name} />
          <DetailRow label="Status" value={<FleetStatusBadge status={fleet.status} />} />
          <DetailRow label="City" value={fleet.city} />
          <DetailRow label="Created" value={formatDateTime(fleet.createdAt)} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-header__title">Fleet Owner</span>
        </div>
        <div className={styles.detailList}>
          <DetailRow label="Name" value={fleet.owner.name} />
          <DetailRow label="Email" value={fleet.owner.email} />
          <DetailRow label="Phone" value={fleet.owner.phone} />
        </div>
      </div>

      <div className={styles.metricsRow}>
        <MetricCard label="Vehicles" value={formatNumber(fleet.vehicles)} />
        <MetricCard label="Drivers" value={formatNumber(fleet.drivers)} />
        <MetricCard label="Active Rides" value={formatNumber(fleet.activeRides)} accent={fleet.activeRides > 0} />
        <MetricCard label="Fleet Revenue" value={formatCurrency(fleet.revenue)} />
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={`${styles.detailValue} ${mono ? styles.mono : ''}`}>{value}</span>
    </div>
  )
}

function MetricCard({ label, value, accent }) {
  return (
    <div className={`${styles.metricCard} ${accent ? styles.metricCardAccent : ''}`}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  )
}

function DriversTab({ fleetId }) {
  const [drivers, setDrivers] = useState(null)

  useEffect(() => {
    getFleetDrivers(fleetId).then(setDrivers).catch(() => setDrivers([]))
  }, [fleetId])

  if (!drivers) return <LoadingState label="Loading drivers…" />

  if (drivers.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <p className={styles.emptyTabText}>No drivers assigned to this fleet yet.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Driver</th>
            <th>Phone</th>
            <th>Rating</th>
            <th>Total Rides</th>
            <th>Status</th>
            <th className="visually-hidden">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id}>
              <td>
                <div className={styles.personCell}>
                  <span className={styles.personAvatar}>{d.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                  <div>
                    <div className={styles.personName}>{d.name}</div>
                    <div className={styles.personId}>{d.id}</div>
                  </div>
                </div>
              </td>
              <td className="table-cell-muted">{d.phone}</td>
              <td>{d.rating.toFixed(2)}</td>
              <td>{formatNumber(d.rides)}</td>
              <td>
                <span className={`badge badge--${d.status === 'active' ? 'success' : 'danger'}`}>
                  <span className="badge__dot" />{d.status === 'active' ? 'Active' : 'Suspended'}
                </span>
              </td>
              <td>
                <button type="button" className="btn btn--secondary btn--sm">View Profile</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VehiclesTab({ fleetId }) {
  const [vehicles, setVehicles] = useState(null)

  useEffect(() => {
    getFleetVehicles(fleetId).then(setVehicles).catch(() => setVehicles([]))
  }, [fleetId])

  if (!vehicles) return <LoadingState label="Loading vehicles…" />

  if (vehicles.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <p className={styles.emptyTabText}>No vehicles registered in this fleet yet.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Plate</th>
            <th>Type</th>
            <th>Year</th>
            <th>Status</th>
            <th className="visually-hidden">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{v.make} {v.model}</div>
                  <div className={styles.personId}>{v.id}</div>
                </div>
              </td>
              <td>
                <span className={styles.plateBadge}>{v.plate}</span>
              </td>
              <td className="table-cell-muted">{v.type}</td>
              <td className="table-cell-muted">{v.year}</td>
              <td>
                {v.status === 'active' && <span className="badge badge--success"><span className="badge__dot" />Active</span>}
                {v.status === 'maintenance' && <span className="badge badge--warning"><span className="badge__dot" />Maintenance</span>}
                {v.status === 'inactive' && <span className="badge badge--neutral"><span className="badge__dot" />Inactive</span>}
              </td>
              <td>
                <button type="button" className="btn btn--secondary btn--sm">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AssignmentsTab({ fleetId }) {
  const [assignments, setAssignments] = useState(null)

  useEffect(() => {
    getFleetAssignments(fleetId).then(setAssignments).catch(() => setAssignments([]))
  }, [fleetId])

  if (!assignments) return <LoadingState label="Loading assignments…" />

  if (assignments.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <p className={styles.emptyTabText}>No driver–vehicle assignments found.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Assignment ID</th>
            <th>Driver</th>
            <th>Vehicle</th>
            <th>Assigned</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id}>
              <td><span className={styles.mono}>{a.id}</span></td>
              <td>{a.driver}</td>
              <td className="table-cell-muted">{a.vehicle}</td>
              <td className="table-cell-muted">{formatDateTime(a.assignedAt)}</td>
              <td>
                <span className={`badge badge--${a.status === 'active' ? 'success' : 'neutral'}`}>
                  <span className="badge__dot" />{a.status === 'active' ? 'Active' : a.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocumentsTab({ fleetId }) {
  const [docs, setDocs] = useState(null)

  useEffect(() => {
    getFleetDocuments(fleetId).then(setDocs).catch(() => setDocs([]))
  }, [fleetId])

  if (!docs) return <LoadingState label="Loading documents…" />

  const statusBadge = (status) => {
    if (status === 'verified') return <span className="badge badge--success"><span className="badge__dot" />Verified</span>
    if (status === 'pending')  return <span className="badge badge--warning"><span className="badge__dot" />Pending Review</span>
    if (status === 'rejected') return <span className="badge badge--danger"><span className="badge__dot" />Rejected</span>
    if (status === 'expired')  return <span className="badge badge--danger"><span className="badge__dot" />Expired</span>
    return <span className="badge badge--neutral"><span className="badge__dot" />Not Uploaded</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Link to={`/fleet/documents?fleet=${fleetId}`}
          style={{ fontSize: 13, color: 'var(--nomad-sage,#5fa77c)', fontWeight: 600, textDecoration: 'none' }}>
          View all in Fleet Documents →
        </Link>
      </div>
      <div className={styles.docsGrid}>
        {docs.length === 0 && (
          <p style={{ color: 'var(--color-muted,#6b7280)', fontSize: 13.5 }}>No documents uploaded yet.</p>
        )}
        {docs.map((doc) => (
          <div key={doc.id} className={styles.docCard}>
            <div className={styles.docInfo}>
              <span className={styles.docName}>{doc.name}</span>
              {doc.uploadedAt && (
                <span className={styles.docDate}>Uploaded {doc.uploadedAt.slice(0, 10)}</span>
              )}
            </div>
            <div className={styles.docStatus}>{statusBadge(doc.status)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RidesTab({ fleetId }) {
  const [rides, setRides] = useState(null)

  useEffect(() => {
    getFleetRecentRides(fleetId).then(setRides).catch(() => setRides([]))
  }, [fleetId])

  if (!rides) return <LoadingState label="Loading rides…" />

  if (rides.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <p className={styles.emptyTabText}>No rides found for this fleet.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Link to={`/fleet/rides?fleet=${fleetId}`}
          style={{ fontSize: 13, color: 'var(--nomad-sage,#5fa77c)', fontWeight: 600, textDecoration: 'none' }}>
          View all rides →
        </Link>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Ride ID</th>
              <th>Driver</th>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Fare</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((r) => (
              <tr key={r.id}>
                <td><span className={styles.mono}>{r.id}</span></td>
                <td>{r.driver}</td>
                <td className="table-cell-muted">{r.pickup}</td>
                <td className="table-cell-muted">{r.dropoff}</td>
                <td>{formatCurrency(r.fare)}</td>
                <td>
                  {r.status === 'active'
                    ? <span className="badge badge--success"><span className="badge__dot" />Active</span>
                    : <span className="badge badge--neutral"><span className="badge__dot" />Completed</span>
                  }
                </td>
                <td className="table-cell-muted">{formatDateTime(r.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PerformanceTab({ fleet }) {
  return (
    <div className={styles.tabRedirectCard}>
      <div className={styles.tabRedirectIcon}>📊</div>
      <div className={styles.tabRedirectTitle}>Fleet Performance</div>
      <div className={styles.tabRedirectDesc}>
        View detailed metrics, revenue charts, ride trends and utilisation data for {fleet.name}.
      </div>
      <Link to={`/fleet/performance?fleet=${fleet.id}`} className="btn btn--primary">
        Open Fleet Performance
      </Link>
    </div>
  )
}

function FinancialsTab({ fleet }) {
  return (
    <div className={styles.tabRedirectCard}>
      <div className={styles.tabRedirectIcon}>💰</div>
      <div className={styles.tabRedirectTitle}>Fleet Financials</div>
      <div className={styles.tabRedirectDesc}>
        View revenue, commission breakdowns, transaction history, and payment statuses for {fleet.name}.
      </div>
      <Link to={`/fleet/financials?fleet=${fleet.id}`} className="btn btn--primary">
        Open Fleet Financials
      </Link>
    </div>
  )
}

function RolesTab({ fleet }) {
  return (
    <div className={styles.tabRedirectCard}>
      <div className={styles.tabRedirectIcon}>🛡️</div>
      <div className={styles.tabRedirectTitle}>Roles &amp; Permissions</div>
      <div className={styles.tabRedirectDesc}>
        Manage users, roles, and access permissions for {fleet.name}. Invite new team members and control what each role can access within this fleet.
      </div>
      <Link to={`/fleet/roles?fleet=${fleet.id}`} className="btn btn--primary">
        Manage Roles &amp; Permissions
      </Link>
    </div>
  )
}

/* ---- Main page ---- */

export function FleetDetailPage() {
  const { fleetId } = useParams()
  const navigate = useNavigate()
  const [fleet, setFleet] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    let cancelled = false
    setFleet(null)
    setError(null)
    getFleetById(fleetId)
      .then((data) => { if (!cancelled) setFleet(data) })
      .catch(() => { if (!cancelled) setError('Fleet not found.') })
    return () => { cancelled = true }
  }, [fleetId])

  if (!fleet && !error) return <LoadingState label="Loading fleet…" />
  if (error) return <ErrorState description={error} />

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <button type="button" className={styles.breadcrumbLink} onClick={() => navigate('/fleet')}>
          Fleet Management
        </button>
        <ChevronRightIcon size={14} className={styles.breadcrumbSep} />
        <span className={styles.breadcrumbCurrent}>{fleet.name}</span>
      </nav>

      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.fleetAvatar}>{fleet.name.slice(0, 2).toUpperCase()}</div>
          <div className={styles.headerInfo}>
            <div className={styles.headerTitleRow}>
              <h1 className={styles.title}>{fleet.name}</h1>
              <FleetStatusBadge status={fleet.status} />
            </div>
            <div className={styles.headerMeta}>
              <span>{fleet.id}</span>
              <span className={styles.metaDot}>·</span>
              <span>{fleet.city}</span>
              <span className={styles.metaDot}>·</span>
              <span>Owner: {fleet.owner.name}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className="btn btn--secondary">Edit Fleet</button>
          {fleet.status !== 'suspended'
            ? <button type="button" className="btn btn--danger">Suspend Fleet</button>
            : <button type="button" className="btn btn--secondary">Reinstate Fleet</button>
          }
        </div>
      </div>

      {/* Tabs */}
      <nav className={styles.tabs} aria-label="Fleet sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview'     && <OverviewTab fleet={fleet} />}
        {activeTab === 'drivers'      && <DriversTab fleetId={fleet.id} />}
        {activeTab === 'vehicles'     && <VehiclesTab fleetId={fleet.id} />}
        {activeTab === 'assignments'  && <AssignmentsTab fleetId={fleet.id} />}
        {activeTab === 'documents'    && <DocumentsTab fleetId={fleet.id} />}
        {activeTab === 'rides'        && <RidesTab fleetId={fleet.id} />}
        {activeTab === 'performance'  && <PerformanceTab fleet={fleet} />}
        {activeTab === 'financials'   && <FinancialsTab fleet={fleet} />}
        {activeTab === 'roles'        && <RolesTab fleet={fleet} />}
      </div>
    </div>
  )
}
