import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { THEMES, type ThemeId } from '../../lib/themes';

type SettingsPayload = {
  company_name?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  branding?: {
    theme?: string;
  };
};

export function SettingsPage() {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api<{ data: SettingsPayload }>('/admin/settings'),
  });

  const [form, setForm] = useState({
    company_name: '',
    timezone: 'UTC',
    locale: 'en',
    currency: 'USD',
    theme: 'teal' as ThemeId,
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.data) return;
    setForm({
      company_name: data.data.company_name ?? '',
      timezone: data.data.timezone ?? 'UTC',
      locale: data.data.locale ?? 'en',
      currency: data.data.currency ?? 'USD',
      theme: (data.data.branding?.theme as ThemeId) ?? 'teal',
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          company_name: form.company_name,
          timezone: form.timezone,
          locale: form.locale,
          currency: form.currency,
          branding: {
            theme: form.theme,
          },
        }),
      }),
    onSuccess: async () => {
      setMessage('Settings saved');
      await qc.invalidateQueries({ queryKey: ['admin-settings'] });
      await refresh();
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Tenant settings</h2>
        <p className="text-sm text-slate-600">Workspace defaults for this venue.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        {(['company_name', 'timezone', 'locale', 'currency'] as const).map((field) => (
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

        <fieldset>
          <legend className="mb-2 text-sm text-slate-600">Theme color</legend>
          <div className="grid grid-cols-4 gap-3">
            {THEMES.map((theme) => {
              const selected = form.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setForm({ ...form, theme: theme.id })}
                  className={[
                    'rounded-md border p-2 text-left transition',
                    selected
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-slate-200 hover:border-slate-300',
                  ].join(' ')}
                >
                  <span className="mb-2 flex h-8 overflow-hidden rounded" aria-hidden="true">
                    <span className="w-1/2" style={{ background: theme.primaryDeep }} />
                    <span className="w-1/2" style={{ background: theme.primary }} />
                  </span>
                  <span className="block text-xs font-medium">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {message && <p className="text-sm text-primary">{message}</p>}
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
          {saveMutation.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm">
        <p className="font-medium text-slate-800">Website lead form</p>
        <p className="mt-1 text-slate-600">
          Configure the embeddable customer lead form, copy the iframe snippet, and preview submissions.
        </p>
        <Link to="/admin/lead-form" className="mt-3 inline-block text-primary hover:underline">
          Open lead form settings →
        </Link>
      </div>
    </div>
  );
}
