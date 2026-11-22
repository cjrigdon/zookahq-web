import { useAuth } from '../../auth/AuthContext';
import { EventsCalendar } from '../events/EventsCalendar';
import { DashboardCalendarTools } from './DashboardCalendarTools';

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

      {hasModule('events') && (
        <div className="mt-8">
          <EventsCalendar showHeaderLink showDashboardTools />
        </div>
      )}
      {!hasModule('events') && hasModule('booking') && (
        <div className="mt-8">
          <DashboardCalendarTools />
        </div>
      )}
    </div>
  );
}
