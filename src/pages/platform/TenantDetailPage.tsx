import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, getBaseDomain } from '../../api/client';

type ModuleRow = { code: string; name: string; enabled: boolean };

export function TenantDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenant', id],
    queryFn: () => api<any>(`/platform/tenants/${id}`),
    enabled: Boolean(id),
  });

  const { data: modulesData } = useQuery({
    queryKey: ['platform-modules'],
    queryFn: () => api<{ data: Array<{ code: string; name: string }> }>('/platform/modules'),
  });

  const tenant = data?.data;
  const enabledCodes = new Set(
    (tenant?.tenant_modules ?? [])
      .filter((m: any) => m.enabled)
      .map((m: any) => m.module.code),
  );

  const syncMutation = useMutation({
    mutationFn: (rows: ModuleRow[]) =>
      api(`/platform/tenants/${id}/modules`, {
        method: 'PUT',
        body: JSON.stringify({
          modules: rows.map((r) => ({ code: r.code, enabled: r.enabled })),
        }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform-tenant', id] });
    },
  });

  if (isLoading || !tenant) {
    return <p className="text-slate-500">Loading tenant…</p>;
  }

  const rows: ModuleRow[] = (modulesData?.data ?? []).map((m) => ({
    code: m.code,
    name: m.name,
    enabled: enabledCodes.has(m.code),
  }));

  return (
    <div className="max-w-3xl">
      <Link to="/tenants" className="text-sm text-primary hover:underline">
        ← Back to tenants
      </Link>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">{tenant.name}</h2>
      <p className="text-sm text-slate-600">
        {tenant.slug}.{getBaseDomain()} · status {tenant.status}
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Module</th>
              <th className="px-4 py-3 text-left">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.code} className="border-t border-slate-100 hover:bg-support/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-slate-500">{row.code}</div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => {
                      const next = rows.map((r, i) =>
                        i === index ? { ...r, enabled: e.target.checked } : r,
                      );
                      syncMutation.mutate(next);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
