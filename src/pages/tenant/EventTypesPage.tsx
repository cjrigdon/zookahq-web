import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';

type EventType = {
  id: number;
  code: string;
  name: string;
  background_color: string;
  text_color: string;
  sort_order: number;
  is_active: boolean;
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function EventTypesPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#1F4E79');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-event-types'],
    queryFn: () => api<{ data: EventType[] }>('/admin/event-types'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api('/admin/event-types', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim() || null,
          name: name.trim(),
          background_color: backgroundColor,
          text_color: textColor,
          is_active: true,
        }),
      }),
    onSuccess: async () => {
      setCode('');
      setName('');
      setBackgroundColor('#1F4E79');
      setTextColor('#FFFFFF');
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-event-types'] });
      await qc.invalidateQueries({ queryKey: ['event-types'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; patch: Partial<EventType> }) =>
      api(`/admin/event-types/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload.patch),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event-types'] });
      await qc.invalidateQueries({ queryKey: ['event-types'] });
      await qc.invalidateQueries({ queryKey: ['events-calendar'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/admin/event-types/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event-types'] });
      await qc.invalidateQueries({ queryKey: ['event-types'] });
      await qc.invalidateQueries({ queryKey: ['events-calendar'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!HEX.test(backgroundColor) || !HEX.test(textColor)) {
      setError('Colors must be hex values like #1F4E79.');
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-[family-name:var(--font-display)] text-2xl">Event types</h2>
      <p className="mt-1 text-sm text-slate-600">
        Define named types with calendar colors. Users pick a type when creating an event.
      </p>

      <form
        onSubmit={onCreate}
        className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h3 className="text-sm font-medium text-slate-900">Add type</h3>
        <div className="grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Code</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WEDDING"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wedding"
              required
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Background color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())}
              />
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())}
              />
            </div>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Text color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value.toUpperCase())}
              />
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value.toUpperCase())}
              />
            </div>
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <ActionButton type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Saving…' : 'Add type'}
        </ActionButton>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Colors</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
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
                  No event types yet.
                </td>
              </tr>
            )}
            {data?.data.map((type) => (
              <tr key={type.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{type.name}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{type.code}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      BG
                      <input
                        type="color"
                        className="h-7 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                        value={type.background_color}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: type.id,
                            patch: { background_color: e.target.value.toUpperCase() },
                          })
                        }
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      Text
                      <input
                        type="color"
                        className="h-7 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                        value={type.text_color}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: type.id,
                            patch: { text_color: e.target.value.toUpperCase() },
                          })
                        }
                      />
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {type.is_active ? (
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
                          id: type.id,
                          patch: { is_active: !type.is_active },
                        })
                      }
                    >
                      {type.is_active ? 'Disable' : 'Enable'}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm(`Delete “${type.name}”?`)) {
                          deleteMutation.mutate(type.id);
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

      <p className="mt-4 text-xs text-slate-500">
        Need spaces too?{' '}
        <Link to="/admin/spaces" className="text-primary hover:underline">
          Manage spaces
        </Link>
      </p>
    </div>
  );
}
