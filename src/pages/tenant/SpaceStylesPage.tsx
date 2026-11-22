import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';

type SpaceStyle = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
};

export function SpaceStylesPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-space-styles'],
    queryFn: () => api<{ data: SpaceStyle[] }>('/admin/space-styles'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api('/admin/space-styles', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim() || null,
          name: name.trim(),
          description: description.trim() || null,
          is_active: true,
        }),
      }),
    onSuccess: async () => {
      setCode('');
      setName('');
      setDescription('');
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-space-styles'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; patch: Partial<SpaceStyle> }) =>
      api(`/admin/space-styles/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload.patch),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-space-styles'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/admin/space-styles/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-space-styles'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/spaces" className="text-sm text-primary hover:underline">
        Back to spaces
      </Link>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">Space styles</h2>
      <p className="mt-1 text-sm text-slate-600">
        Known seating setups (theater, banquet, classroom…). Spaces pick from this list when setting
        capacity.
      </p>

      <form
        onSubmit={onCreate}
        className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h3 className="text-sm font-medium text-slate-900">Add style</h3>
        <div className="grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Code</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="THEATER"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Theater / Auditorium"
              required
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Description</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Rows facing a stage or presentation area"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ActionButton type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Saving…' : 'Add style'}
        </ActionButton>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Style</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
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
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                  No styles yet.
                </td>
              </tr>
            )}
            {data?.data.map((style) => (
              <tr key={style.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{style.name}</div>
                  {style.description ? (
                    <div className="mt-0.5 text-xs text-slate-500">{style.description}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{style.code}</td>
                <td className="px-4 py-3">
                  {style.is_active ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-slate-500">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        updateMutation.mutate({
                          id: style.id,
                          patch: { is_active: !style.is_active },
                        })
                      }
                    >
                      {style.is_active ? 'Disable' : 'Enable'}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm(`Delete “${style.name}”? Spaces using it will lose that capacity row.`)) {
                          deleteMutation.mutate(style.id);
                        }
                      }}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
