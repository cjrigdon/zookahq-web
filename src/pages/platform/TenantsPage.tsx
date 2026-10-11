import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  tenant_modules?: Array<{ enabled: boolean; module: { code: string; name: string } }>;
};

type Module = { id: number; code: string; name: string };

export function TenantsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: () => api<{ data: Tenant[] }>('/platform/tenants'),
  });
  const { data: modulesData } = useQuery({
    queryKey: ['platform-modules'],
    queryFn: () => api<{ data: Module[] }>('/platform/modules'),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    admin_password: 'password',
    modules: ['booking'],
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/platform/tenants', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: async () => {
      setOpen(false);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['platform-tenants'] });
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
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-text">Tenants</h2>
          <p className="text-sm text-slate-600">Provision venues and configure billable modules.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text hover:bg-accent-dark"
        >
          New tenant
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Modules</th>
              <th className="px-4 py-3" />
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
            {data?.data.map((tenant) => (
              <tr key={tenant.id} className="border-t border-slate-100 hover:bg-support/40">
                <td className="px-4 py-3 font-medium">{tenant.name}</td>
                <td className="px-4 py-3">{tenant.slug}</td>
                <td className="px-4 py-3 capitalize">{tenant.status}</td>
                <td className="px-4 py-3">
                  {(tenant.tenant_modules ?? [])
                    .filter((m) => m.enabled)
                    .map((m) => m.module.code)
                    .join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-primary hover:underline" to={`/tenants/${tenant.id}`}>
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={onSubmit} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Create tenant</h3>
            <div className="grid gap-3">
              {(['name', 'slug', 'admin_name', 'admin_email', 'admin_password'] as const).map(
                (field) => (
                  <label key={field} className="text-sm">
                    <span className="mb-1 block capitalize text-slate-600">
                      {field.replace('_', ' ')}
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      required
                      type={field.includes('password') ? 'password' : 'text'}
                    />
                  </label>
                ),
              )}
              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-sm text-slate-600">Modules</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(modulesData?.data ?? []).map((module) => {
                    const checked = form.modules.includes(module.code);
                    return (
                      <label key={module.code} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setForm({
                              ...form,
                              modules: checked
                                ? form.modules.filter((c) => c !== module.code)
                                : [...form.modules, module.code],
                            });
                          }}
                        />
                        {module.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
                disabled={createMutation.isPending}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
