import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { tenant, hasModule, user } = useAuth();

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl">
        Welcome, {user?.name?.split(' ')[0]}
      </h2>
      <p className="mt-1 text-slate-600">
        {tenant?.name} workspace — keep sales and operations moving without the clutter.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {hasModule('booking') && (
          <Link
            to="/booking/opportunities"
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-primary hover:bg-support/30"
          >
            <div className="text-sm font-medium text-primary">Booking</div>
            <p className="mt-1 text-sm text-slate-600">
              Leads, accounts, opportunities, proposals, and contracts.
            </p>
          </Link>
        )}
        {hasModule('events') && (
          <Link
            to="/events/calendar"
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-primary hover:bg-support/30"
          >
            <div className="text-sm font-medium text-primary">Event Management</div>
            <p className="mt-1 text-sm text-slate-600">
              Calendar, functions, service orders, and change tracking.
            </p>
          </Link>
        )}
        {hasModule('operations') && (
          <Link
            to="/operations/work-orders"
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-primary hover:bg-support/30"
          >
            <div className="text-sm font-medium text-primary">Operations</div>
            <p className="mt-1 text-sm text-slate-600">Work orders across facilities and venues.</p>
          </Link>
        )}
        {hasModule('accounting') && (
          <Link
            to="/accounting"
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-primary hover:bg-support/30"
          >
            <div className="text-sm font-medium text-primary">Accounting</div>
            <p className="mt-1 text-sm text-slate-600">
              Inventory, AR/AP, budgets, ledger, and client payment portal.
            </p>
          </Link>
        )}
        {hasModule('reporting') && (
          <Link
            to="/reporting"
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-primary hover:bg-support/30"
          >
            <div className="text-sm font-medium text-primary">Reporting</div>
            <p className="mt-1 text-sm text-slate-600">
              Client summaries, custom report builder, and AI-assisted report design.
            </p>
          </Link>
        )}
        <Link
          to="/admin/settings"
          className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-primary hover:bg-support/30"
        >
          <div className="text-sm font-medium text-primary">Settings</div>
          <p className="mt-1 text-sm text-slate-600">Timezone, locale, and company defaults.</p>
        </Link>
      </div>
    </div>
  );
}
