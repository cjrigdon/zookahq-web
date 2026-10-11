import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';

export function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api<{ data: any[] }>('/admin/users'),
  });
  const { data: rolesData } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api<{ data: Array<{ name: string }> }>('/admin/roles'),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'password',
    role: 'sales',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api('/admin/users', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: async () => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Users</h2>
          <p className="text-sm text-slate-600">Manage tenant users and roles.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
        >
          Add user
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Roles</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6" colSpan={3}>
                  Loading…
                </td>
              </tr>
            )}
            {data?.data.map((user) => (
              <tr key={user.id} className="border-t border-slate-100 hover:bg-support/40">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  {(user.roles ?? []).map((r: any) => r.name).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Add user</h3>
            {(['name', 'email', 'password'] as const).map((field) => (
              <label key={field} className="mb-3 block text-sm">
                <span className="mb-1 block capitalize text-slate-600">{field}</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  type={field === 'password' ? 'password' : 'text'}
                  required
                />
              </label>
            ))}
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Role</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {(rolesData?.data ?? []).map((role) => (
                  <option key={role.name} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
