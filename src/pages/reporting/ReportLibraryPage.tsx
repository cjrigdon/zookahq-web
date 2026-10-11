import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ReportResultTable } from './ReportResultTable';

export function ReportLibraryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['saved-reports'],
    queryFn: () => api<{ data: any[] }>('/reporting/saved-reports'),
  });

  const selected = (data?.data ?? []).find((r) => String(r.id) === id) ?? null;

  const { data: runData, isFetching: running } = useQuery({
    queryKey: ['saved-report-run', id],
    queryFn: () => api<{ data: any }>(`/reporting/saved-reports/${id}/run`, { method: 'POST' }),
    enabled: !!id,
  });

  const toggleFavorite = useMutation({
    mutationFn: (report: any) =>
      api(`/reporting/saved-reports/${report.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_favorite: !report.is_favorite }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['saved-reports'] });
    },
  });

  const remove = useMutation({
    mutationFn: (reportId: number) =>
      api(`/reporting/saved-reports/${reportId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['saved-reports'] });
      navigate('/reporting/library');
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg">Library</h2>
          <Link to="/reporting/builder" className="text-sm text-primary">
            New
          </Link>
        </div>
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        <ul>
          {(data?.data ?? []).map((report) => (
            <li key={report.id}>
              <button
                type="button"
                onClick={() => navigate(`/reporting/library/${report.id}`)}
                className={`w-full border-b border-slate-50 px-4 py-3 text-left text-sm hover:bg-support/40 ${
                  String(report.id) === id ? 'bg-support/50' : ''
                }`}
              >
                <div className="font-medium">{report.name}</div>
                <div className="text-xs text-slate-500">
                  {report.dataset}
                  {report.is_favorite ? ' · ★' : ''}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section>
        {!selected && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Select a saved report to run it.
          </div>
        )}
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl">{selected.name}</h3>
                <p className="text-sm text-slate-600">{selected.description ?? '—'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  onClick={() => toggleFavorite.mutate(selected)}
                >
                  {selected.is_favorite ? 'Unfavorite' : 'Favorite'}
                </button>
                <Link
                  to={`/reporting/builder?from=${selected.id}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
                >
                  Edit in builder
                </Link>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700"
                  onClick={() => remove.mutate(selected.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {running && <p className="text-sm text-slate-500">Running…</p>}
            {runData?.data && <ReportResultTable result={runData.data} />}
          </div>
        )}
      </section>
    </div>
  );
}
