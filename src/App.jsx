import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { PortalProvider }           from './features/portal/context/PortalContext'
import { PortalShell }              from './features/portal/layout/PortalShell'
import { PortalDashboardPage }      from './features/portal/dashboard/PortalDashboardPage'
import { PortalDriversPage }        from './features/portal/drivers/PortalDriversPage'
import { PortalVehiclesPage }       from './features/portal/vehicles/PortalVehiclesPage'
import { PortalAssignmentsPage }    from './features/portal/assignments/PortalAssignmentsPage'
import { PortalRidesPage }          from './features/portal/rides/PortalRidesPage'
import { PortalDocumentsPage }      from './features/portal/documents/PortalDocumentsPage'
import { PortalMaintenancePage }    from './features/portal/maintenance/PortalMaintenancePage'
import { PortalFinancialsPage }     from './features/portal/financials/PortalFinancialsPage'
import { PortalReportsPage }        from './features/portal/reports/PortalReportsPage'
import { PortalSettingsPage }       from './features/portal/settings/PortalSettingsPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { CustomersPage } from './features/customers/CustomersPage'
import { CustomerProfilePage } from './features/customers/CustomerProfilePage'
import { DriverDirectoryPage } from './features/drivers/DriverDirectoryPage'
import { DriverApplicationsListPage } from './features/drivers/DriverApplicationsListPage'
import { ApplicationReviewPage } from './features/drivers/application-review/ApplicationReviewPage'
import { DriverProfilePage } from './features/drivers/driver-profile/DriverProfilePage'
import { FleetManagementPage } from './features/fleet/FleetManagementPage'
import { FleetDetailPage } from './features/fleet/FleetDetailPage'
import { AddFleetPage } from './features/fleet/AddFleetPage'
import { PendingFleetsPage } from './features/fleet/PendingFleetsPage'
import { FleetApplicationPage } from './features/fleet/FleetApplicationPage'
import { VehiclesPage } from './features/fleet/vehicles/VehiclesPage'
import { AddVehiclePage } from './features/fleet/vehicles/AddVehiclePage'
import { VehicleDetailPage } from './features/fleet/vehicles/VehicleDetailPage'
import { DriversPage } from './features/fleet/drivers/DriversPage'
import { AddDriverPage } from './features/fleet/drivers/AddDriverPage'
import { DriverDetailPage } from './features/fleet/drivers/DriverDetailPage'
import { AssignmentsPage } from './features/fleet/assignments/AssignmentsPage'
import { AssignVehiclePage } from './features/fleet/assignments/AssignVehiclePage'
import { AssignmentDetailPage } from './features/fleet/assignments/AssignmentDetailPage'
import { FleetDocumentsPage } from './features/fleet/documents/FleetDocumentsPage'
import { FleetRidesPage } from './features/fleet/rides/FleetRidesPage'
import { FleetPerformancePage } from './features/fleet/performance/FleetPerformancePage'
import { MaintenancePage } from './features/fleet/maintenance/MaintenancePage'
import { FleetFinancialsPage } from './features/fleet/financials/FleetFinancialsPage'
import { FleetRolesPage } from './features/fleet/roles/FleetRolesPage'
import { RidesPage } from './features/rides/RidesPage'
import { RideDetailPage } from './features/rides/RideDetailPage'
import { PricingPage } from './features/pricing/PricingPage'
import { PaymentsPage } from './features/payments/PaymentsPage'
import { PromotionsPage } from './features/promotions/PromotionsPage'
import { SupportPage } from './features/support/SupportPage'
import { TicketDetailPage } from './features/support/TicketDetailPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { ConfigurationPage } from './features/configuration/ConfigurationPage'
import { AuditLogsPage } from './features/audit-logs/AuditLogsPage'
import { AdminUsersPage } from './features/admins/AdminUsersPage'
import { LoginPage } from './features/auth/LoginPage'
import { SignupPage } from './features/auth/SignupPage'
import { RequireAuth } from './features/auth/RequireAuth'

function App() {
  return (
    <Routes>
      {/* The only two screens reachable without a session. */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/*
        Everything below needs a signed-in admin. A convenience, not a
        security boundary — the API refuses an unauthenticated call
        whatever this renders.
      */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/:customerId" element={<CustomerProfilePage />} />
          <Route path="drivers" element={<DriverDirectoryPage />} />
          <Route path="drivers/applications" element={<DriverApplicationsListPage />} />
          <Route path="drivers/applications/:applicationId" element={<ApplicationReviewPage />} />
          <Route path="drivers/:driverId" element={<DriverProfilePage />} />
          <Route path="fleet" element={<FleetManagementPage />} />
          <Route path="fleet/add" element={<AddFleetPage />} />
          <Route path="fleet/pending" element={<PendingFleetsPage />} />
          <Route path="fleet/pending/:fleetId" element={<FleetApplicationPage />} />
          <Route path="fleet/vehicles" element={<VehiclesPage />} />
          <Route path="fleet/vehicles/add" element={<AddVehiclePage />} />
          <Route path="fleet/vehicles/:vehicleId" element={<VehicleDetailPage />} />
          <Route path="fleet/drivers" element={<DriversPage />} />
          <Route path="fleet/drivers/add" element={<AddDriverPage />} />
          <Route path="fleet/drivers/:driverId" element={<DriverDetailPage />} />
          <Route path="fleet/assignments" element={<AssignmentsPage />} />
          <Route path="fleet/assignments/new" element={<AssignVehiclePage />} />
          <Route path="fleet/assignments/:assignmentId" element={<AssignmentDetailPage />} />
          <Route path="fleet/documents" element={<FleetDocumentsPage />} />
          <Route path="fleet/rides" element={<FleetRidesPage />} />
          <Route path="fleet/performance" element={<FleetPerformancePage />} />
          <Route path="fleet/maintenance" element={<MaintenancePage />} />
          <Route path="fleet/financials" element={<FleetFinancialsPage />} />
          <Route path="fleet/roles"      element={<FleetRolesPage />} />
          <Route path="fleet/:fleetId"   element={<FleetDetailPage />} />
          <Route path="rides" element={<RidesPage />} />
          <Route path="rides/:rideId" element={<RideDetailPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="support/:ticketId" element={<TicketDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="configuration" element={<ConfigurationPage />} />
          {/* The open section is in the address, so a refresh or a shared link
              lands back on the same one. */}
          <Route path="configuration/:section" element={<ConfigurationPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="admins" element={<AdminUsersPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* ── Fleet Owner Portal (separate shell, isolated route tree) ──── */}
      <Route
        path="/portal"
        element={
          <PortalProvider>
            <PortalShell />
          </PortalProvider>
        }
      >
        <Route index element={<Navigate to="/portal/dashboard" replace />} />
        <Route path="dashboard"   element={<PortalDashboardPage />} />
        <Route path="drivers"     element={<PortalDriversPage />} />
        <Route path="vehicles"    element={<PortalVehiclesPage />} />
        <Route path="assignments" element={<PortalAssignmentsPage />} />
        <Route path="rides"       element={<PortalRidesPage />} />
        <Route path="documents"   element={<PortalDocumentsPage />} />
        <Route path="maintenance" element={<PortalMaintenancePage />} />
        <Route path="financials"  element={<PortalFinancialsPage />} />
        <Route path="reports"     element={<PortalReportsPage />} />
        <Route path="settings"    element={<PortalSettingsPage />} />
        <Route path="*"           element={<Navigate to="/portal/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
