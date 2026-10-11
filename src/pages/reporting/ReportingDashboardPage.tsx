import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

const money = (n: number) =>
  Number(n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export function ReportingDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['reporting-overview'],
    queryFn: () => api<{ data: any }>('/reporting/overview'),
  });
  const { data: saved } = useQuery({
    queryKey: ['saved-reports'],
    queryFn: () => api<{ data: any[] }>('/reporting/saved-reports'),
  });

  const overview = data?.data;
  const favorites = (saved?.data ?? []).filter((r) => r.is_favorite).slice(0, 4);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Reporting</h2>
          <p className="text-sm text-slate-600">
            Client data summaries, saved reports, and AI-assisted custom builders.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/reporting/builder"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-900"
          >
            New report
          </Link>
          <Link
            to="/reporting/library"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
          >
            Library
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Pipeline value"
          value={money(overview?.booking?.pipeline_value ?? 0)}
          hint={`${overview?.booking?.opportunities_total ?? 0} opportunities`}
        />
        <Stat
          label="Leads"
          value={String(overview?.booking?.leads_total ?? 0)}
          hint="Booking funnel"
        />
        <Stat
          label="Upcoming events"
          value={String(overview?.events?.upcoming ?? 0)}
          hint={`${overview?.events?.events_total ?? 0} total`}
        />
        <Stat
          label="Open work orders"
          value={String(overview?.operations?.open ?? 0)}
          hint={`AR open ${money(overview?.accounting?.ar_open ?? 0)}`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-medium">Pipeline by stage</h3>
          <ul className="space-y-2 text-sm">
            {(overview?.booking?.opportunities_by_stage ?? []).map((row: any) => (
              <li key={row.stage} className="flex justify-between border-b border-slate-50 pb-2">
                <span className="capitalize text-slate-700">{row.stage}</span>
                <span>
                  {row.count} · {money(Number(row.value))}
                </span>
              </li>
            ))}
            {!overview?.booking?.opportunities_by_stage?.length && (
              <li className="text-slate-500">No opportunity data.</li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Favorite reports</h3>
            <Link to="/reporting/library" className="text-xs text-primary">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {favorites.map((report) => (
              <li key={report.id}>
                <Link
                  to={`/reporting/library/${report.id}`}
                  className="block rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-support/40"
                >
                  <div className="font-medium text-primary">{report.name}</div>
                  <div className="text-xs text-slate-500">{report.dataset}</div>
                </Link>
              </li>
            ))}
            {favorites.length === 0 && (
              <li className="text-sm text-slate-500">Save a report as favorite to pin it here.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-medium text-text">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
