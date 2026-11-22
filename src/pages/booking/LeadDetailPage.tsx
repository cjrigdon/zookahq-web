import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { leadAddressKeys } from '../../components/AddressFields';
import { EntityChecklists } from '../../components/checklists/EntityChecklists';
import { DetailRecord } from '../../components/DetailRecord';
import { ActionButton } from '../../components/ui/ActionButton';

type MatchSuggestion = {
  account: { id: number; name: string; email?: string | null; city?: string | null; state?: string | null; contacts_count?: number };
  score: number;
  reasons: string[];
};

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <DetailRecord
      title={(r) =>
        r.account_name ||
        `${r.contact_first_name ?? ''} ${r.contact_last_name ?? ''}`.trim() ||
        'Lead'
      }
      backTo="/booking/leads"
      backLabel="Back to leads"
      queryKey={['booking-lead', id ?? '']}
      endpoint={`/booking/leads/${id}`}
      fields={[
        { name: 'account_name', label: 'Account name' },
        { name: 'account_address', label: 'Account address', type: 'address', addressKeys: leadAddressKeys },
        { name: 'contact_first_name', label: 'Contact first name', required: true },
        { name: 'contact_last_name', label: 'Contact last name', required: true },
        { name: 'contact_email', label: 'Contact email', type: 'email' },
        { name: 'contact_title', label: 'Contact title' },
        { name: 'contact_phone', label: 'Contact phone' },
        { name: 'source', label: 'Source' },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'unqualified', label: 'Unqualified' },
            { value: 'new', label: 'New' },
            { value: 'qualified', label: 'Qualified' },
            { value: 'converted', label: 'Converted' },
          ],
        },
        { name: 'event_date', label: 'Event date', type: 'date' },
        { name: 'load_in_at', label: 'Load in start', type: 'datetime-local' },
        { name: 'event_starts_at', label: 'Event start', type: 'datetime-local' },
        { name: 'event_ends_at', label: 'Event end', type: 'datetime-local' },
        { name: 'load_out_at', label: 'Load out complete', type: 'datetime-local' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        account_name: form.account_name || null,
        contact_first_name: form.contact_first_name,
        contact_last_name: form.contact_last_name,
        contact_email: form.contact_email || null,
        contact_title: form.contact_title || null,
        contact_phone: form.contact_phone || null,
        source: form.source || null,
        status: form.status,
        event_date: form.event_date || null,
        load_in_at: form.load_in_at || null,
        event_starts_at: form.event_starts_at || null,
        event_ends_at: form.event_ends_at || null,
        load_out_at: form.load_out_at || null,
        notes: form.notes || null,
        account_address: form.account_address || null,
        account_address_2: form.account_address_2 || null,
        account_city: form.account_city || null,
        account_state: form.account_state || null,
        account_postal_code: form.account_postal_code || null,
      })}
      extra={(record, { refresh }) => (
        <div className="space-y-6">
          {record.status === 'converted' ? null : (
            <LeadMatchingPanel
              leadId={record.id}
              suggestions={record.match_suggestions ?? []}
              onDone={refresh}
            />
          )}
          <EntityChecklists type="lead" recordId={record.id} />
        </div>
      )}
      actions={(record, { refresh }) =>
        record.status !== 'converted' ? (
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm"
            onClick={() => {
              void api(`/booking/leads/${record.id}/convert`, { method: 'POST', body: '{}' }).then(
                (res: any) => {
                  refresh();
                  if (res?.data?.account?.id) {
                    navigate(`/booking/accounts/${res.data.account.id}`);
                  }
                },
              );
            }}
          >
            Convert to new account
          </button>
        ) : null
      }
    />
  );
}

function LeadMatchingPanel({
  leadId,
  suggestions,
  onDone,
}: {
  leadId: number;
  suggestions: MatchSuggestion[];
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: ['booking-accounts-match-search', search],
    queryFn: () =>
      api<{ data: { data: Array<{ id: number; name: string; email?: string; city?: string; state?: string }> } }>(
        `/booking/accounts?search=${encodeURIComponent(search)}`,
      ),
    enabled: search.trim().length >= 2,
  });

  const attach = useMutation({
    mutationFn: (accountId: number) =>
      api(`/booking/leads/${leadId}/attach`, {
        method: 'POST',
        body: JSON.stringify({ account_id: accountId }),
      }),
    onSuccess: async (res: any) => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['booking-lead', String(leadId)] });
      onDone();
      if (res?.data?.account?.id) {
        navigate(`/booking/accounts/${res.data.account.id}`);
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  const searched = searchQuery.data?.data?.data ?? [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-medium text-text">Lead to account matching</h3>
      <p className="mt-1 text-sm text-slate-600">
        Check whether this contact belongs to an existing customer, add them to an account, or convert to a new
        account.
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Suggested matches</p>
        {suggestions.length === 0 ? (
          <p className="text-sm text-slate-500">No strong account matches found. This lead stays unqualified.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {suggestions.map((match) => (
              <li key={match.account.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{match.account.name}</p>
                  <p className="text-xs text-slate-500">
                    {[match.account.city, match.account.state].filter(Boolean).join(', ') || match.account.email || '—'}
                    {' · '}
                    score {match.score}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{match.reasons.join(' · ')}</p>
                </div>
                <ActionButton
                  size="sm"
                  disabled={attach.isPending}
                  onClick={() => attach.mutate(match.account.id)}
                >
                  Add to account
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Search existing accounts</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={search}
            placeholder="Search by account name"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {search.trim().length >= 2 && (
          <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
            {searched.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-slate-500">
                    {[account.city, account.state].filter(Boolean).join(', ') || account.email || '—'}
                  </p>
                </div>
                <ActionButton
                  size="sm"
                  disabled={attach.isPending}
                  onClick={() => attach.mutate(account.id)}
                >
                  Add to account
                </ActionButton>
              </li>
            ))}
            {searched.length === 0 && !searchQuery.isLoading && (
              <li className="px-3 py-3 text-sm text-slate-500">No accounts found.</li>
            )}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
