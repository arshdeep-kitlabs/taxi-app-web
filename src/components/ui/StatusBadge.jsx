import { Badge } from './Badge'

/*
  Central vocabulary for the driver application status lifecycle.
  Other modules (rides, customers, payments, tickets…) will get their own
  small status maps like this one as they are built out — kept local to
  avoid one giant cross-domain enum.
*/
const APPLICATION_STATUS = {
  draft: { tone: 'neutral', label: 'Draft' },
  // What the API calls an application waiting to be looked at.
  submitted: { tone: 'warning', label: 'Pending Review' },
  pending_review: { tone: 'warning', label: 'Pending Review' },
  in_review: { tone: 'info', label: 'In Review' },
  changes_requested: { tone: 'danger', label: 'Changes Requested' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'neutral', label: 'Rejected' },
}

export function ApplicationStatusBadge({ status }) {
  const config = APPLICATION_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}

const DRIVER_STATUS = {
  active: { tone: 'success', label: 'Active' },
  suspended: { tone: 'warning', label: 'Suspended' },
  blocked: { tone: 'danger', label: 'Blocked' },
}

export function DriverStatusBadge({ status }) {
  const config = DRIVER_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}

// Customers share the same active/suspended/blocked lifecycle as drivers.
export const CustomerStatusBadge = DriverStatusBadge

const TICKET_STATUS = {
  open: { tone: 'warning', label: 'Open' },
  in_progress: { tone: 'info', label: 'In Progress' },
  resolved: { tone: 'success', label: 'Resolved' },
}

export function TicketStatusBadge({ status }) {
  const config = TICKET_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}


const DOCUMENT_STATUS = {
  submitted: { tone: 'info', label: 'Submitted' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
  reupload_requested: { tone: 'warning', label: 'Re-upload Requested' },
  missing: { tone: 'neutral', label: 'Missing' },
}

export function DocumentStatusBadge({ status }) {
  const config = DOCUMENT_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}

const RIDE_STATUS = {
  completed: { tone: 'success', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
}

export function RideStatusBadge({ status }) {
  const config = RIDE_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}

const RIDE_LIFECYCLE_STATUS = {
  requested: { tone: 'info', label: 'Requested' },
  ongoing: { tone: 'warning', label: 'Ongoing' },
  completed: { tone: 'success', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
}

export function RideLifecycleBadge({ status }) {
  const config = RIDE_LIFECYCLE_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}

const PAYMENT_STATUS = {
  paid: { tone: 'success', label: 'Paid' },
  pending: { tone: 'warning', label: 'Pending' },
  failed: { tone: 'danger', label: 'Failed' },
  refunded: { tone: 'info', label: 'Refunded' },
}

export function PaymentStatusBadge({ status }) {
  const config = PAYMENT_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}

const PROMO_STATUS = {
  active: { tone: 'success', label: 'Active' },
  scheduled: { tone: 'info', label: 'Scheduled' },
  expired: { tone: 'neutral', label: 'Expired' },
  exhausted: { tone: 'warning', label: 'Exhausted' },
  disabled: { tone: 'neutral', label: 'Disabled' },
}

export function PromoStatusBadge({ status }) {
  const config = PROMO_STATUS[status] ?? { tone: 'neutral', label: status }
  return <Badge tone={config.tone}>{config.label}</Badge>
}

const ALERT_SEVERITY = {
  critical: { tone: 'danger', label: 'Critical' },
  warning: { tone: 'warning', label: 'Warning' },
  info: { tone: 'info', label: 'Info' },
}

export function AlertSeverityBadge({ severity }) {
  const config = ALERT_SEVERITY[severity] ?? { tone: 'neutral', label: severity }
  return (
    <Badge tone={config.tone} withDot>
      {config.label}
    </Badge>
  )
}
