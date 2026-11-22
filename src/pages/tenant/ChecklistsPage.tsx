import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionLink } from '../../components/ui/ActionButton';
import { checklistAppliesToLabel, type ChecklistTemplate } from '../../lib/checklists';

export function ChecklistsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-checklists'],
    queryFn: () => api<{ data: ChecklistTemplate[] }>('/admin/checklists'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Checklists</h2>
          <p className="text-sm text-slate-600">
            Create reusable checklists for leads, accounts, events, functions, and service orders.
          </p>
        </div>
        <ActionLink to="/admin/checklists/new">New checklist</ActionLink>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Applies to</th>
              <th className="px-4 py-3 text-left">Steps</th>
              <th className="px-4 py-3 text-left">Started</th>
              <th className="px-4 py-3 text-left">Required</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No checklists yet. Create one to get started.
                </td>
              </tr>
            )}
            {data?.data.map((checklist) => (
              <tr
                key={checklist.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-support/40"
                onClick={() => navigate(`/admin/checklists/${checklist.id}`)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{checklist.name}</td>
                <td className="px-4 py-3">{checklistAppliesToLabel(checklist.applies_to)}</td>
                <td className="px-4 py-3">{checklist.steps_count ?? 0}</td>
                <td className="px-4 py-3">{checklist.instances_count ?? 0}</td>
                <td className="px-4 py-3">
                  {checklist.is_required ? (
                    <span className="text-primary">Required</span>
                  ) : (
                    <span className="text-slate-500">Optional</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {checklist.is_active ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-slate-500">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
