import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionLink } from '../../components/ui/ActionButton';

type SpaceRow = {
  id: number;
  name: string;
  description?: string | null;
  area_sq_ft?: number | null;
  is_active: boolean;
  styles_count: number;
  max_capacity: number;
};

export function SpacesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-spaces'],
    queryFn: () => api<{ data: SpaceRow[] }>('/admin/spaces'),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Spaces</h2>
          <p className="text-sm text-slate-600">
            Manage venue spaces, seating capacities by style, and yes/no attributes used in
            availability search.
          </p>
        </div>
        <div className="flex gap-2">
          <ActionLink to="/admin/space-styles" variant="secondary">
            Styles
          </ActionLink>
          <ActionLink to="/admin/space-attributes" variant="secondary">
            Attributes
          </ActionLink>
          <ActionLink to="/admin/spaces/new">New space</ActionLink>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Area</th>
              <th className="px-4 py-3 text-left">Styles</th>
              <th className="px-4 py-3 text-left">Max capacity</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  No spaces yet.{' '}
                  <Link to="/admin/spaces/new" className="text-primary hover:underline">
                    Create one
                  </Link>{' '}
                  to start matching availability by capacity and attributes.
                </td>
              </tr>
            )}
            {data?.data.map((space) => (
              <tr
                key={space.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-support/40"
                onClick={() => navigate(`/admin/spaces/${space.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{space.name}</div>
                  {space.description ? (
                    <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">{space.description}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {space.area_sq_ft != null ? `${space.area_sq_ft.toLocaleString()} sq ft` : '—'}
                </td>
                <td className="px-4 py-3">{space.styles_count}</td>
                <td className="px-4 py-3">{space.max_capacity || '—'}</td>
                <td className="px-4 py-3">
                  {space.is_active ? (
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
