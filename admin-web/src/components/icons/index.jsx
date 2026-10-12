/*
  Custom line-icon set for Nomad Admin.
  Deliberately original (not sourced from a third-party icon pack tied to
  another product's visual identity) and kept to a single stroke-based style
  so the whole app reads as one consistent system.
*/

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Icon({ children, size, ...props }) {
  return (
    <svg
      {...base}
      width={size ?? base.width}
      height={size ?? base.height}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function DashboardIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="1.4" />
      <rect x="13.3" y="3.5" width="7.2" height="4.6" rx="1.4" />
      <rect x="13.3" y="10.4" width="7.2" height="10.1" rx="1.4" />
      <rect x="3.5" y="13" width="7.2" height="7.5" rx="1.4" />
    </Icon>
  )
}

export function CustomersIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
      <circle cx="16.8" cy="7.8" r="2.4" />
      <path d="M15.6 12.3c2.4.4 4.9 2.4 4.9 6.2" />
    </Icon>
  )
}

export function DriversIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.5 15.5 6 9.8a2.4 2.4 0 0 1 2.3-1.8h7.4A2.4 2.4 0 0 1 18 9.8l1.5 5.7" />
      <rect x="3" y="15.5" width="18" height="4.5" rx="1.4" />
      <circle cx="7.5" cy="19.8" r="1.2" />
      <circle cx="16.5" cy="19.8" r="1.2" />
      <path d="M7 12h10" />
    </Icon>
  )
}

export function RidesIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M6 8.3v3.2a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4" />
    </Icon>
  )
}

export function PricingIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3v18" />
      <path d="M16.5 6.8c0-1.5-1.8-2.5-4.5-2.5s-4.7 1.1-4.7 2.9c0 3.7 9.2 1.7 9.2 5.6 0 1.9-2.1 3-4.7 3s-4.8-1-4.9-2.7" />
    </Icon>
  )
}

export function PaymentsIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 9.8h18" />
      <path d="M6.5 14.5h4" />
    </Icon>
  )
}

export function PromotionsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 13.6 13.6 4a2 2 0 0 1 2.8 0l3.6 3.6a2 2 0 0 1 0 2.8L10.4 20 4 13.6Z" />
      <circle cx="14.2" cy="9.8" r="1.4" />
      <path d="M4 13.6 3 20l6.4-1" />
    </Icon>
  )
}

export function SupportIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="m6 6 3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" />
    </Icon>
  )
}

export function ReportsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h9l4 4v13a1.4 1.4 0 0 1-1.4 1.4H6A1.4 1.4 0 0 1 4.6 20.5v-15A1.4 1.4 0 0 1 6 3.5Z" />
      <path d="M14.5 3.5v3.6a1 1 0 0 0 1 1h3.6" />
      <path d="M8.2 12.5h7.2M8.2 15.7h7.2M8.2 9.3h3.4" />
    </Icon>
  )
}

export function ConfigurationIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 3.8v2.1M12 18.1v2.1M20.2 12h-2.1M5.9 12H3.8M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3" />
    </Icon>
  )
}

export function AuditLogsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 3.6h8.3L19 7.3V19a1.3 1.3 0 0 1-1.3 1.3H7A1.3 1.3 0 0 1 5.6 19V4.9A1.3 1.3 0 0 1 7 3.6Z" />
      <path d="M9 11.2l1.8 1.8 4-4" />
    </Icon>
  )
}

export function AdminRolesIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3.4 5 6v5.4c0 4.5 2.9 7.7 7 8.6 4.1-.9 7-4.1 7-8.6V6l-7-2.6Z" />
      <path d="M9.3 12.2l1.9 1.9 3.5-3.9" />
    </Icon>
  )
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m19.5 19.5-4-4" />
    </Icon>
  )
}

export function BellIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 3.4.9 5.3 1.7 6.3H4.3C5.1 15.8 6 13.9 6 10.5Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </Icon>
  )
}

export function ChevronDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  )
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  )
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  )
}

export function AlertTriangleIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 4.2 21 19.5H3L12 4.2Z" />
      <path d="M12 10v4.2" />
      <circle cx="12" cy="17" r="0.15" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function FileTextIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 3.6h6.3L18 8.3V19a1.3 1.3 0 0 1-1.3 1.3H7A1.3 1.3 0 0 1 5.6 19V4.9A1.3 1.3 0 0 1 7 3.6Z" />
      <path d="M13 3.6v3.7a1 1 0 0 0 1 1H18" />
      <path d="M8.4 12.8h7.2M8.4 15.6h7.2" />
    </Icon>
  )
}

export function UserIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M5 20c0-3.6 3-6.3 7-6.3s7 2.7 7 6.3" />
    </Icon>
  )
}

export function ArrowRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.5 12h15M13 5.5 19.5 12 13 18.5" />
    </Icon>
  )
}

export function TrendUpIcon(props) {
  return (
    <Icon {...props}>
      <path d="m4 16 5.5-5.5 3.5 3.5L20 6.5" />
      <path d="M14.5 6.5H20V12" />
    </Icon>
  )
}

export function TrendDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="m4 8 5.5 5.5 3.5-3.5L20 17.5" />
      <path d="M14.5 17.5H20V12" />
    </Icon>
  )
}

export function CarIcon(props) {
  return <RidesIcon {...props} />
}

export function InboxIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 12.5 6 5.4A1.6 1.6 0 0 1 7.5 4.2h9a1.6 1.6 0 0 1 1.5 1.2l2 7.1" />
      <path d="M4 12.5h4.7l1 2h4.6l1-2H20V18a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18v-5.5Z" />
    </Icon>
  )
}

export function ClockIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  )
}

export function FleetIcon(props) {
  return (
    <Icon {...props}>
      <rect x="2" y="13" width="8" height="5" rx="1.2" />
      <rect x="14" y="13" width="8" height="5" rx="1.2" />
      <path d="M6 13V9.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 9.5V13" />
      <path d="M10 13V8" />
      <path d="M14 13V8" />
      <circle cx="5" cy="18.5" r="1" />
      <circle cx="19" cy="18.5" r="1" />
    </Icon>
  )
}

export function VehicleIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 15.5 6.8 9.6A2 2 0 0 1 8.7 8h6.6a2 2 0 0 1 1.9 1.6l1.8 5.9" />
      <rect x="3" y="15.5" width="18" height="4" rx="1.2" />
      <circle cx="7.5" cy="19.3" r="1.2" />
      <circle cx="16.5" cy="19.3" r="1.2" />
      <path d="M7.5 12h9" />
    </Icon>
  )
}

export function AssignmentIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 15.5h4" />
    </Icon>
  )
}

export function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function MoreVerticalIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="0.8" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function ChevronUpIcon(props) {
  return (
    <Icon {...props}>
      <path d="m18 15-6-6-6 6" />
    </Icon>
  )
}

export function WrenchIcon(props) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Icon>
  )
}

export function ShieldIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  )
}

export function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.1" />
    </Icon>
  )
}

export function EyeOffIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9.9 6.1A8.9 8.9 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a16.4 16.4 0 0 1-3 3.8" />
      <path d="M6.4 7.8A16.3 16.3 0 0 0 2.5 12S6 18.2 12 18.2a9.3 9.3 0 0 0 3.9-.85" />
      <path d="M10.1 10.2a3.1 3.1 0 0 0 4.2 4.3" />
      <path d="M4 4l16 16" />
    </Icon>
  )
}
