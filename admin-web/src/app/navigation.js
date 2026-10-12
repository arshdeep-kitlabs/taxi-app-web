import {
  DashboardIcon,
  CustomersIcon,
  DriversIcon,
  FleetIcon,
  VehicleIcon,
  AssignmentIcon,
  FileTextIcon,
  RidesIcon,
  WrenchIcon,
  ShieldIcon,
  PricingIcon,
  PaymentsIcon,
  PromotionsIcon,
  SupportIcon,
  ReportsIcon,
  ConfigurationIcon,
  AuditLogsIcon,
  AdminRolesIcon,
} from '../components/icons'

/*
  Single source of truth for the primary navigation.
  Sidebar links, page routing and the header's page title all derive from
  this list, so adding a module only means adding one entry here.
  Items with `children` render as expandable groups in the sidebar.
*/
export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
  { key: 'customers', label: 'Customers', path: '/customers', icon: CustomersIcon },
  { key: 'drivers', label: 'Drivers', path: '/drivers', icon: DriversIcon },
  {
    key: 'fleet',
    label: 'Fleet Management',
    path: '/fleet',
    icon: FleetIcon,
    children: [
      { key: 'fleet-all', label: 'All Fleets', path: '/fleet' },
      { key: 'fleet-pending', label: 'Pending Fleets', path: '/fleet/pending' },
      { key: 'fleet-vehicles', label: 'Vehicles', path: '/fleet/vehicles', icon: VehicleIcon },
      { key: 'fleet-drivers', label: 'Drivers', path: '/fleet/drivers', icon: DriversIcon },
      { key: 'fleet-assignments', label: 'Assignments', path: '/fleet/assignments', icon: AssignmentIcon },
      { key: 'fleet-documents',    label: 'Documents',   path: '/fleet/documents',   icon: FileTextIcon },
      { key: 'fleet-rides',        label: 'Rides',       path: '/fleet/rides',       icon: RidesIcon },
      { key: 'fleet-performance',  label: 'Performance',  path: '/fleet/performance',  icon: ReportsIcon },
      { key: 'fleet-maintenance',  label: 'Maintenance',  path: '/fleet/maintenance',  icon: WrenchIcon },
      { key: 'fleet-financials',   label: 'Financials',   path: '/fleet/financials',   icon: PaymentsIcon },
      { key: 'fleet-roles',        label: 'Roles & Perms', path: '/fleet/roles',        icon: ShieldIcon },
    ],
  },
  { key: 'rides', label: 'Rides', path: '/rides', icon: RidesIcon },
  { key: 'pricing', label: 'Pricing', path: '/pricing', icon: PricingIcon },
  { key: 'payments', label: 'Payments', path: '/payments', icon: PaymentsIcon },
  { key: 'promotions', label: 'Promotions', path: '/promotions', icon: PromotionsIcon },
  { key: 'support', label: 'Support', path: '/support', icon: SupportIcon },
  { key: 'reports', label: 'Reports', path: '/reports', icon: ReportsIcon },
  { key: 'configuration', label: 'Configuration', path: '/configuration', icon: ConfigurationIcon },
  { key: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', icon: AuditLogsIcon },
  { key: 'admins', label: 'Admin Users', path: '/admins', icon: AdminRolesIcon },
  { key: 'fleet-portal', label: 'Fleet Owner Portal', path: '/portal', icon: ShieldIcon, external: true },
]

export function findNavItemByPath(pathname) {
  for (const item of NAV_ITEMS) {
    if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return item
    if (item.children) {
      const child = item.children.find(
        (c) => pathname === c.path || pathname.startsWith(`${c.path}/`),
      )
      if (child) return item
    }
  }
  return undefined
}
