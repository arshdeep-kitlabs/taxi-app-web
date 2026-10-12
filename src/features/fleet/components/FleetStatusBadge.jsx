const STATUS_CONFIG = {
  active:    { variant: 'success', label: 'Active' },
  pending:   { variant: 'warning', label: 'Pending' },
  suspended: { variant: 'danger',  label: 'Suspended' },
  inactive:  { variant: 'neutral', label: 'Inactive' },
  rejected:  { variant: 'danger',  label: 'Rejected' },
  draft:     { variant: 'neutral', label: 'Draft' },
}

export function FleetStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? { variant: 'neutral', label: status }
  return (
    <span className={`badge badge--${config.variant}`}>
      <span className="badge__dot" />
      {config.label}
    </span>
  )
}
