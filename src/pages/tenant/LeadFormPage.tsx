import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

type SettingsPayload = {
  branding?: {
    lead_intake?: { enabled?: boolean; title?: string; intro?: string };
  };
};

const DEFAULT_INTAKE_TITLE = 'Request a proposal';
const DEFAULT_INTAKE_INTRO =
  'Share your company details and event timeline and we will follow up shortly.';

function embedSnippet() {
  const src = `${window.location.origin}/embed/leads`;
  return `<iframe src="${src}" title="Lead form" style="width:100%;min-height:860px;border:0;border-radius:12px;"></iframe>`;
}

export function LeadFormPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api<{ data: SettingsPayload }>('/admin/settings'),
  });

  const [form, setForm] = useState({
    enabled: true,
    title: DEFAULT_INTAKE_TITLE,
    intro: DEFAULT_INTAKE_INTRO,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!data?.data) return;
    setForm({
      enabled: data.data.branding?.lead_intake?.enabled ?? true,
      title: data.data.branding?.lead_intake?.title || DEFAULT_INTAKE_TITLE,
      intro: data.data.branding?.lead_intake?.intro || DEFAULT_INTAKE_INTRO,
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          branding: {
            lead_intake: {
              enabled: form.enabled,
              title: form.title,
              intro: form.intro,
            },
          },
        }),
      }),
    onSuccess: async () => {
      setMessage('Lead form settings saved');
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (err: Error) => {
      setMessage(null);
      setError(err.message);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Lead form</h2>
        <p className="text-sm text-slate-600">
          Embed a customer form on your website. Submissions create Booking leads with company,
          contact, event date, and timeline details.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span>
            <span className="block font-medium">Accept submissions</span>
            <span className="text-slate-600">
              When enabled, the embed form creates new leads with source “website”.
            </span>
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Form title</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Intro text</span>
          <textarea
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.intro}
            onChange={(e) => setForm({ ...form, intro: e.target.value })}
          />
        </label>

        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-700">Fields collected</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Company name</li>
            <li>Contact first name, last name, and title</li>
            <li>Contact email</li>
            <li>Event date</li>
            <li>Event timeline: load in start, event start, event end, load out complete</li>
          </ul>
        </div>

        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-slate-700">Embed code</h3>
            <p className="text-xs text-slate-500">Paste this iframe on your website.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/embed/leads"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open form
            </a>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={async () => {
                await navigator.clipboard.writeText(embedSnippet());
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <textarea
          readOnly
          rows={4}
          className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs"
          value={embedSnippet()}
        />
        <p className="mt-3 text-xs text-slate-500">
          Theme colors follow your{' '}
          <Link to="/admin/settings" className="text-primary hover:underline">
            tenant settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
