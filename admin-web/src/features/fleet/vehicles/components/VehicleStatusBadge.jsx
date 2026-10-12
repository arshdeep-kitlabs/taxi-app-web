const VEHICLE_STATUS = {
  active:       { variant: 'success', label: 'Active' },
  available:    { variant: 'info',    label: 'Available' },
  assigned:     { variant: 'success', label: 'Assigned' },
  maintenance:  { variant: 'warning', label: 'Maintenance' },
  suspended:    { variant: 'danger',  label: 'Suspended' },
  inactive:     { variant: 'neutral', label: 'Inactive' },
  pending:      { variant: 'warning', label: 'Pending' },
}

const DOC_STATUS = {
  verified: { variant: 'success', label: 'Verified' },
  pending:  { variant: 'warning', label: 'Pending' },
  rejected: { variant: 'danger',  label: 'Rejected' },
  expired:  { variant: 'danger',  label: 'Expired' },
  missing:  { variant: 'neutral', label: 'Missing' },
}

export function VehicleStatusBadge({ status }) {
  const cfg = VEHICLE_STATUS[status] ?? { variant: 'neutral', label: status }
  return (
    <span className={`badge badge--${cfg.variant}`}>
      <span className="badge__dot" />{cfg.label}
    </span>
  )
}

export function VehicleDocStatusBadge({ status }) {
  const cfg = DOC_STATUS[status] ?? { variant: 'neutral', label: status }
  return (
    <span className={`badge badge--${cfg.variant}`}>
      <span className="badge__dot" />{cfg.label}
    </span>
  )
}
