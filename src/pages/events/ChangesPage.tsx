import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export function ChangesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['events-changes'],
    queryFn: () => api<{ data: { data: any[] } }>('/events/changes'),
  });

  const rows = data?.data?.data ?? [];

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl">Change tracking</h2>
      <p className="mb-6 text-sm text-slate-600">
        Audit trail for event, function, and service order updates.
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">Summary</th>
              <th className="px-4 py-3 text-left">By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={4}>
                  No changes logged yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-support/40">
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">{row.event?.name ?? row.event_id}</td>
                <td className="px-4 py-3">
                  <div>{row.summary}</div>
                  {row.field && (
                    <div className="mt-1 text-xs text-slate-500">
                      {row.field}: {String(row.old_value ?? '—')} → {String(row.new_value ?? '—')}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{row.changed_by_user?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
