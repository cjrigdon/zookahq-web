import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';

export function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api<{ data: any }>('/admin/settings'),
  });

  const [form, setForm] = useState({
    company_name: '',
    timezone: 'UTC',
    locale: 'en',
    currency: 'USD',
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data?.data) {
      setForm({
        company_name: data.data.company_name ?? '',
        timezone: data.data.timezone ?? 'UTC',
        locale: data.data.locale ?? 'en',
        currency: data.data.currency ?? 'USD',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api('/admin/settings', { method: 'PUT', body: JSON.stringify(form) }),
    onSuccess: async () => {
      setMessage('Settings saved');
      await qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="max-w-xl">
      <h2 className="font-[family-name:var(--font-display)] text-2xl">Tenant settings</h2>
      <p className="mb-6 text-sm text-slate-600">Workspace defaults for this venue.</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {(Object.keys(form) as Array<keyof typeof form>).map((field) => (
          <label key={field} className="block text-sm">
            <span className="mb-1 block capitalize text-slate-600">
              {field.replace('_', ' ')}
            </span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          </label>
        ))}
        {message && <p className="text-sm text-primary">{message}</p>}
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
          Save settings
        </button>
      </form>
    </div>
  );
}
