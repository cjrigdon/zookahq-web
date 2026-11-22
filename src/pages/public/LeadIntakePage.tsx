import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, isPlatformHost } from '../../api/client';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import { applyTheme } from '../../lib/themes';

type IntakeConfig = {
  enabled: boolean;
  tenant_name: string;
  theme: string;
  title: string;
  intro: string;
};

type IntakeForm = {
  account_name: string;
  contact_name: string;
  contact_email: string;
  contact_title: string;
  event_date: string;
  load_in_at: string;
  event_starts_at: string;
  event_ends_at: string;
  load_out_at: string;
  website: string;
};

const emptyForm: IntakeForm = {
  account_name: '',
  contact_name: '',
  contact_email: '',
  contact_title: '',
  event_date: '',
  load_in_at: '',
  event_starts_at: '',
  event_ends_at: '',
  load_out_at: '',
  website: '',
};

const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2';

export function LeadIntakePage() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ['public-intake'],
    queryFn: () => api<{ data: IntakeConfig }>('/public/intake'),
    enabled: !isPlatformHost(),
    retry: false,
  });

  useEffect(() => {
    if (configQuery.data?.data.theme) {
      applyTheme(configQuery.data.data.theme);
    }
  }, [configQuery.data]);

  const submit = useMutation({
    mutationFn: () =>
      api('/public/leads', {
        method: 'POST',
        body: JSON.stringify({
          account_name: form.account_name,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_title: form.contact_title || undefined,
          event_date: form.event_date,
          load_in_at: form.load_in_at || undefined,
          event_starts_at: form.event_starts_at || undefined,
          event_ends_at: form.event_ends_at || undefined,
          load_out_at: form.load_out_at || undefined,
          website: form.website,
        }),
      }),
    onError: (err: Error) => setError(err.message),
    onSuccess: () => setError(null),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    submit.mutate();
  }

  if (isPlatformHost()) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <p className="text-sm text-slate-600">Open this form on a venue site to collect leads.</p>
      </div>
    );
  }

  if (configQuery.isLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading form…</div>;
  }

  const config = configQuery.data?.data;
  if (configQuery.isError || !config) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">This lead form is unavailable.</p>
        </div>
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Lead intake is not accepting submissions right now.</p>
        </div>
      </div>
    );
  }

  if (submit.isSuccess) {
    return (
      <div className="flex min-h-full items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-primary">Thank you</h1>
          <p className="mt-3 text-sm text-slate-600">
            {config.tenant_name} received your request and will follow up shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas px-4 py-6">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{config.tenant_name}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl">{config.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{config.intro}</p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Company name</span>
          <input
            required
            className={inputClass}
            value={form.account_name}
            onChange={(e) => setForm({ ...form, account_name: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Contact name</span>
          <input
            required
            className={inputClass}
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Contact title</span>
          <input
            className={inputClass}
            value={form.contact_title}
            onChange={(e) => setForm({ ...form, contact_title: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Contact email</span>
          <input
            required
            type="email"
            className={inputClass}
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Event date</span>
          <input
            required
            type="date"
            className={inputClass}
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
        </label>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Event timeline</legend>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Load in start</span>
            <DateTimePicker
              value={form.load_in_at}
              onChange={(next) => setForm({ ...form, load_in_at: next })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Event start</span>
            <DateTimePicker
              value={form.event_starts_at}
              onChange={(next) => setForm({ ...form, event_starts_at: next })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Event end</span>
            <DateTimePicker
              value={form.event_ends_at}
              min={form.event_starts_at || undefined}
              onChange={(next) => setForm({ ...form, event_ends_at: next })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Load out complete</span>
            <DateTimePicker
              value={form.load_out_at}
              onChange={(next) => setForm({ ...form, load_out_at: next })}
            />
          </label>
        </fieldset>

        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submit.isPending}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          {submit.isPending ? 'Sending…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
