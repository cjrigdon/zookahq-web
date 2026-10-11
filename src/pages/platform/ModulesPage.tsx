import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export function ModulesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-modules'],
    queryFn: () => api<{ data: Array<any> }>('/platform/modules'),
  });

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl">Modules catalog</h2>
      <p className="mb-6 text-sm text-slate-600">
        Billable modules available when provisioning tenants.
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Billable</th>
              <th className="px-4 py-3 text-left">Active</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {data?.data.map((module) => (
              <tr key={module.id} className="border-t border-slate-100 hover:bg-support/40">
                <td className="px-4 py-3 font-mono text-xs">{module.code}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{module.name}</div>
                  <div className="text-xs text-slate-500">{module.description}</div>
                </td>
                <td className="px-4 py-3">{module.billable ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">{module.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
