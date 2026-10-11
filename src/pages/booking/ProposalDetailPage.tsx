import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { DetailRecord } from '../../components/DetailRecord';

export function ProposalDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const prefOpp = params.get('opportunity_id') ?? '';

  const { data: opps } = useQuery({
    queryKey: ['booking-opportunities'],
    queryFn: () => api<{ data: { data: any[] } }>('/booking/opportunities'),
    enabled: isNew,
  });

  const [form, setForm] = useState({
    opportunity_id: prefOpp,
    title: '',
    status: 'draft',
    amount: '0',
    valid_until: '',
    terms: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/booking/proposals', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          opportunity_id: Number(form.opportunity_id),
          amount: Number(form.amount || 0),
          valid_until: form.valid_until || null,
        }),
      }),
    onSuccess: async (res: any) => {
      await qc.invalidateQueries({ queryKey: ['booking-opportunity', form.opportunity_id] });
      navigate(`/booking/proposals/${res.data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isNew) {
    return (
      <div className="max-w-xl space-y-4">
        <Link
          to={prefOpp ? `/booking/opportunities/${prefOpp}` : '/booking/proposals'}
          className="text-sm text-primary hover:underline"
        >
          ← Back
        </Link>
        <h2 className="font-[family-name:var(--font-display)] text-2xl">New proposal</h2>
        <form
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Opportunity</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.opportunity_id}
              onChange={(e) => setForm({ ...form, opportunity_id: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {(opps?.data?.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Title</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Amount</span>
            <input
              type="number"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
            Create
          </button>
        </form>
      </div>
    );
  }

  return (
    <DetailRecord
      title={(r) => r.title}
      backTo="/booking/proposals"
      backLabel="Back to proposals"
      queryKey={['booking-proposal', id ?? '']}
      endpoint={`/booking/proposals/${id}`}
      fields={[
        { name: 'title', label: 'Title', required: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
          ],
        },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'version', label: 'Version', type: 'number' },
        { name: 'valid_until', label: 'Valid until', type: 'date' },
        { name: 'terms', label: 'Terms', type: 'textarea' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        amount: Number(form.amount || 0),
        version: Number(form.version || 1),
        valid_until: form.valid_until || null,
      })}
      actions={(record, { refresh }) =>
        !record.contract ? (
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm"
            onClick={() => {
              void api(`/booking/proposals/${record.id}/contracts`, {
                method: 'POST',
                body: '{}',
              }).then((res: any) => {
                refresh();
                if (res?.data?.id) navigate(`/booking/contracts/${res.data.id}`);
              });
            }}
          >
            Create contract
          </button>
        ) : null
      }
      related={(record) => [
        {
          title: 'Opportunity',
          rows: record.opportunity ? [record.opportunity] : [],
          getRowLink: (row) => `/booking/opportunities/${row.id}`,
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'stage', label: 'Stage' },
          ],
        },
        {
          title: 'Contract',
          rows: record.contract ? [record.contract] : [],
          emptyText: 'No contract yet.',
          getRowLink: (row) => `/booking/contracts/${row.id}`,
          columns: [
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            { key: 'amount', label: 'Amount' },
          ],
        },
      ]}
    />
  );
}
