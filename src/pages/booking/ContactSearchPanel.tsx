import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DetailSection } from '../../components/detail/DetailSection';

type SearchHit = {
  id: number;
  type: 'lead' | 'account' | 'contact';
  title: string;
  subtitle?: string | null;
  href: string;
  status?: string | null;
  email?: string | null;
  phone?: string | null;
};

type SearchResponse = {
  query: string;
  leads: SearchHit[];
  accounts: SearchHit[];
  contacts: SearchHit[];
};

const TYPE_LABELS: Record<SearchHit['type'], string> = {
  lead: 'Lead',
  account: 'Account',
  contact: 'Contact',
};

function ResultSection({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: SearchHit[];
  emptyLabel: string;
}) {
  return (
    <DetailSection
      title={title}
      action={
        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
          {rows.length}
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={`${row.type}-${row.id}`}>
              <Link
                to={row.href}
                className="block px-4 py-3 no-underline hover:bg-support/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900 no-underline">{row.title}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {TYPE_LABELS[row.type]}
                    </span>
                    {row.status ? (
                      <span className="text-xs capitalize text-slate-500">{row.status}</span>
                    ) : null}
                  </div>
                  {row.subtitle ? (
                    <p className="mt-0.5 truncate text-sm text-slate-500">{row.subtitle}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DetailSection>
  );
}

export function ContactSearchPanel() {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebounced(input.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [input]);

  const enabled = debounced.length >= 2;

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['booking-search', debounced],
    queryFn: () =>
      api<{ data: SearchResponse }>(`/booking/search?q=${encodeURIComponent(debounced)}`),
    enabled,
  });

  const results = data?.data;
  const total = useMemo(() => {
    if (!results) return 0;
    return results.leads.length + results.accounts.length + results.contacts.length;
  }, [results]);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Search contacts, accounts, and leads</span>
        <input
          autoFocus
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base shadow-sm outline-none ring-primary/30 focus:ring-2"
          placeholder="Search by name, email, phone…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>

      {!enabled ? (
        <p className="text-sm text-slate-500">Type at least 2 characters to search.</p>
      ) : null}

      {enabled && isFetching ? <p className="text-sm text-slate-500">Searching…</p> : null}

      {isError ? (
        <p className="text-sm text-red-600">{(error as Error)?.message || 'Search failed.'}</p>
      ) : null}

      {enabled && !isFetching && results ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {total === 0
              ? `No matches for “${results.query}”.`
              : `${total} match${total === 1 ? '' : 'es'} for “${results.query}”.`}
          </p>
          <ResultSection
            title="Contacts"
            rows={results.contacts}
            emptyLabel="No matching contacts."
          />
          <ResultSection
            title="Accounts"
            rows={results.accounts}
            emptyLabel="No matching accounts."
          />
          <ResultSection title="Leads" rows={results.leads} emptyLabel="No matching leads." />
        </div>
      ) : null}
    </div>
  );
}
