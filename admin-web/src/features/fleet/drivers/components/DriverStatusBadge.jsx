const DRIVER_STATUS = {
  online:    { variant: 'success', label: 'Online' },
  offline:   { variant: 'neutral', label: 'Offline' },
  on_trip:   { variant: 'info',    label: 'On Trip' },
  pending:   { variant: 'warning', label: 'Pending' },
  suspended: { variant: 'danger',  label: 'Suspended' },
  inactive:  { variant: 'neutral', label: 'Inactive' },
}

const VERIFY_STATUS = {
  approved: { variant: 'success', label: 'Approved' },
  pending:  { variant: 'warning', label: 'Pending' },
  rejected: { variant: 'danger',  label: 'Rejected' },
}

const DOC_STATUS = {
  verified: { variant: 'success', label: 'Verified' },
  pending:  { variant: 'warning', label: 'Pending' },
  rejected: { variant: 'danger',  label: 'Rejected' },
  expired:  { variant: 'danger',  label: 'Expired' },
  missing:  { variant: 'neutral', label: 'Missing' },
}

export function DriverStatusBadge({ status }) {
  const cfg = DRIVER_STATUS[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

export function DriverVerifyBadge({ status }) {
  const cfg = VERIFY_STATUS[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}

export function DriverDocStatusBadge({ status }) {
  const cfg = DOC_STATUS[status] ?? { variant: 'neutral', label: status }
  return <span className={`badge badge--${cfg.variant}`}><span className="badge__dot" />{cfg.label}</span>
}
