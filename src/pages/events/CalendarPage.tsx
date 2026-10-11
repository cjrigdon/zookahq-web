import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../../api/client';

function monthBounds(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const bounds = useMemo(() => monthBounds(cursor), [cursor]);

  const { data, isLoading } = useQuery({
    queryKey: ['events-calendar', bounds.from, bounds.to],
    queryFn: () =>
      api<{ data: { events: any[]; functions: any[] } }>(
        `/events/calendar?from=${bounds.from}&to=${bounds.to}`,
      ),
  });

  const label = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Calendar</h2>
          <p className="text-sm text-slate-600">Events and functions for the selected month.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-support/50"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            Prev
          </button>
          <div className="min-w-40 text-center text-sm font-medium text-text">{label}</div>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-support/50"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            Next
          </button>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">Loading calendar…</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium">
            Events
          </header>
          <ul className="divide-y divide-slate-100">
            {(data?.data.events ?? []).length === 0 && (
              <li className="px-4 py-6 text-sm text-slate-500">No events this month.</li>
            )}
            {(data?.data.events ?? []).map((event) => (
              <li key={event.id} className="px-4 py-3 hover:bg-support/40">
                <div className="font-medium text-text">{event.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {new Date(event.starts_at).toLocaleString()} →{' '}
                  {new Date(event.ends_at).toLocaleString()}
                  {event.venue_space ? ` · ${event.venue_space}` : ''}
                </div>
                <div className="mt-1 text-xs capitalize text-primary">{event.status}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium">
            Functions
          </header>
          <ul className="divide-y divide-slate-100">
            {(data?.data.functions ?? []).length === 0 && (
              <li className="px-4 py-6 text-sm text-slate-500">No functions this month.</li>
            )}
            {(data?.data.functions ?? []).map((fn) => (
              <li key={fn.id} className="px-4 py-3 hover:bg-support/40">
                <div className="font-medium text-text">{fn.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {fn.event?.name ?? 'Event'} · {new Date(fn.starts_at).toLocaleString()}
                  {fn.room ? ` · ${fn.room}` : ''}
                </div>
                <div className="mt-1 text-xs capitalize text-primary">{fn.function_type}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
