import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { isPlatformHost } from './api/client';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { TenantsPage } from './pages/platform/TenantsPage';
import { TenantDetailPage } from './pages/platform/TenantDetailPage';
import { ModulesPage } from './pages/platform/ModulesPage';
import { DashboardPage } from './pages/tenant/DashboardPage';
import { UsersPage } from './pages/tenant/UsersPage';
import { SettingsPage } from './pages/tenant/SettingsPage';
import { ChecklistsPage } from './pages/tenant/ChecklistsPage';
import { ChecklistDetailPage } from './pages/tenant/ChecklistDetailPage';
import { DocumentsPage } from './pages/tenant/DocumentsPage';
import { DocumentTemplateDetailPage } from './pages/tenant/DocumentTemplateDetailPage';
import { SpacesPage } from './pages/tenant/SpacesPage';
import { SpaceDetailPage } from './pages/tenant/SpaceDetailPage';
import { SpaceAttributesPage } from './pages/tenant/SpaceAttributesPage';
import { SpaceStylesPage } from './pages/tenant/SpaceStylesPage';
import { EventTypesPage } from './pages/tenant/EventTypesPage';
import { LeadFormPage } from './pages/tenant/LeadFormPage';
import { BookingSearchPage } from './pages/booking/BookingSearchPage';
import { LeadsPage } from './pages/booking/LeadsPage';
import { LeadDetailPage } from './pages/booking/LeadDetailPage';
import { AccountsPage } from './pages/booking/AccountsPage';
import { AccountDetailPage } from './pages/booking/AccountDetailPage';
import { ContactDetailPage } from './pages/booking/ContactDetailPage';
import { ProposalsPage } from './pages/booking/ProposalsPage';
import { ProposalDetailPage } from './pages/booking/ProposalDetailPage';
import { ContractsPage } from './pages/booking/ContractsPage';
import { ContractDetailPage } from './pages/booking/ContractDetailPage';
import { SalesGoalsPage } from './pages/booking/SalesGoalsPage';
import { SalesGoalDetailPage } from './pages/booking/SalesGoalDetailPage';
import { CalendarPage } from './pages/events/CalendarPage';
import { EventsPage } from './pages/events/EventsPage';
import { EventDetailPage } from './pages/events/EventDetailPage';
import { FunctionsPage } from './pages/events/FunctionsPage';
import { FunctionDetailPage } from './pages/events/FunctionDetailPage';
import { ServiceOrdersPage } from './pages/events/ServiceOrdersPage';
import { ServiceOrderDetailPage } from './pages/events/ServiceOrderDetailPage';
import { ChangesPage } from './pages/events/ChangesPage';
import { WorkOrdersPage } from './pages/operations/WorkOrdersPage';
import { WorkOrderDetailPage } from './pages/operations/WorkOrderDetailPage';
import { AccountingDashboardPage } from './pages/accounting/AccountingDashboardPage';
import { InventoryPage } from './pages/accounting/InventoryPage';
import { InventoryItemDetailPage } from './pages/accounting/InventoryItemDetailPage';
import { ArInvoicesPage } from './pages/accounting/ArInvoicesPage';
import { ArInvoiceDetailPage } from './pages/accounting/ArInvoiceDetailPage';
import { ArPaymentsPage } from './pages/accounting/ArPaymentsPage';
import { BudgetsPage } from './pages/accounting/BudgetsPage';
import { ArBudgetDetailPage } from './pages/accounting/ArBudgetDetailPage';
import { GeneralLedgerPage } from './pages/accounting/GeneralLedgerPage';
import { ApBillsPage } from './pages/accounting/ApBillsPage';
import { ApBillDetailPage } from './pages/accounting/ApBillDetailPage';
import { ApPaymentsPage } from './pages/accounting/ApPaymentsPage';
import { AccountingReportsPage } from './pages/accounting/AccountingReportsPage';
import { ReportingDashboardPage } from './pages/reporting/ReportingDashboardPage';
import { ReportLibraryPage } from './pages/reporting/ReportLibraryPage';
import { ReportBuilderPage } from './pages/reporting/ReportBuilderPage';
import { InvoicePortalPage } from './pages/portal/InvoicePortalPage';
import { LeadIntakePage } from './pages/public/LeadIntakePage';
import { ProfilePage } from './pages/ProfilePage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-slate-500">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PlatformRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/tenants" replace />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function TenantRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/invoices/:token" element={<InvoicePortalPage />} />
      <Route path="/embed/leads" element={<LeadIntakePage />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="booking/search" element={<BookingSearchPage />} />
        <Route path="booking/leads" element={<LeadsPage />} />
        <Route path="booking/leads/:id" element={<LeadDetailPage />} />
        <Route path="booking/accounts" element={<AccountsPage />} />
        <Route path="booking/accounts/:id" element={<AccountDetailPage />} />
        <Route path="booking/contacts/new" element={<ContactDetailPage />} />
        <Route path="booking/contacts/:id" element={<ContactDetailPage />} />
        <Route path="booking/proposals" element={<ProposalsPage />} />
        <Route path="booking/proposals/new" element={<ProposalDetailPage />} />
        <Route path="booking/proposals/:id" element={<ProposalDetailPage />} />
        <Route path="booking/contracts" element={<ContractsPage />} />
        <Route path="booking/contracts/:id" element={<ContractDetailPage />} />
        <Route path="booking/sales-goals" element={<SalesGoalsPage />} />
        <Route path="booking/sales-goals/:id" element={<SalesGoalDetailPage />} />
        <Route path="events/calendar" element={<CalendarPage />} />
        <Route path="events/events" element={<EventsPage />} />
        <Route path="events/events/:id" element={<EventDetailPage />} />
        <Route path="events/functions" element={<FunctionsPage />} />
        <Route path="events/functions/:id" element={<FunctionDetailPage />} />
        <Route path="events/service-orders" element={<ServiceOrdersPage />} />
        <Route path="events/service-orders/:id" element={<ServiceOrderDetailPage />} />
        <Route path="events/changes" element={<ChangesPage />} />
        <Route path="operations/work-orders" element={<WorkOrdersPage />} />
        <Route path="operations/work-orders/:id" element={<WorkOrderDetailPage />} />
        <Route path="accounting" element={<AccountingDashboardPage />} />
        <Route path="accounting/inventory" element={<InventoryPage />} />
        <Route path="accounting/inventory/:id" element={<InventoryItemDetailPage />} />
        <Route path="accounting/ar-invoices" element={<ArInvoicesPage />} />
        <Route path="accounting/ar-invoices/:id" element={<ArInvoiceDetailPage />} />
        <Route path="accounting/ar-payments" element={<ArPaymentsPage />} />
        <Route path="accounting/budgets" element={<BudgetsPage />} />
        <Route path="accounting/budgets/:id" element={<ArBudgetDetailPage />} />
        <Route path="accounting/gl" element={<GeneralLedgerPage />} />
        <Route path="accounting/ap-bills" element={<ApBillsPage />} />
        <Route path="accounting/ap-bills/:id" element={<ApBillDetailPage />} />
        <Route path="accounting/ap-payments" element={<ApPaymentsPage />} />
        <Route path="accounting/reports" element={<AccountingReportsPage />} />
        <Route path="reporting" element={<ReportingDashboardPage />} />
        <Route path="reporting/library" element={<ReportLibraryPage />} />
        <Route path="reporting/library/:id" element={<ReportLibraryPage />} />
        <Route path="reporting/builder" element={<ReportBuilderPage />} />
        <Route path="admin/users" element={<UsersPage />} />
        <Route path="admin/checklists" element={<ChecklistsPage />} />
        <Route path="admin/checklists/:id" element={<ChecklistDetailPage />} />
        <Route path="admin/documents" element={<DocumentsPage />} />
        <Route path="admin/documents/:id" element={<DocumentTemplateDetailPage />} />
        <Route path="admin/spaces" element={<SpacesPage />} />
        <Route path="admin/spaces/:id" element={<SpaceDetailPage />} />
        <Route path="admin/space-attributes" element={<SpaceAttributesPage />} />
        <Route path="admin/space-styles" element={<SpaceStylesPage />} />
        <Route path="admin/event-types" element={<EventTypesPage />} />
        <Route path="admin/lead-form" element={<LeadFormPage />} />
        <Route path="admin/settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return isPlatformHost() ? <PlatformRoutes /> : <TenantRoutes />;
}
