import { useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { DetailRecord } from '../../components/DetailRecord';

export function ContactDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const prefAccount = params.get('account_id') ?? '';

  const { data: accountsData } = useQuery({
    queryKey: ['booking-accounts'],
    queryFn: () => api<{ data: { data: any[] } }>('/booking/accounts'),
    enabled: isNew,
  });

  const [form, setForm] = useState({
    account_id: prefAccount,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    is_primary: '0',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/booking/contacts', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          account_id: Number(form.account_id),
          is_primary: form.is_primary === '1',
        }),
      }),
    onSuccess: async (res: any) => {
      await qc.invalidateQueries({ queryKey: ['booking-account', form.account_id] });
      navigate(`/booking/contacts/${res.data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isNew) {
    return (
      <div className="max-w-xl space-y-4">
        <Link to="/booking/accounts" className="text-sm text-primary hover:underline">
          ← Back
        </Link>
        <h2 className="font-[family-name:var(--font-display)] text-2xl">New contact</h2>
        <form
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Account</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {(accountsData?.data?.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ['first_name', 'First name'],
              ['last_name', 'Last name'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['title', 'Title'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block text-slate-600">{label}</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === 'first_name' || key === 'last_name'}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_primary === '1'}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked ? '1' : '0' })}
            />
            Primary contact
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
      title={(r) => `${r.first_name} ${r.last_name}`}
      backTo={prefAccount ? `/booking/accounts/${prefAccount}` : '/booking/accounts'}
      backLabel="Back"
      queryKey={['booking-contact', id ?? '']}
      endpoint={`/booking/contacts/${id}`}
      fields={[
        { name: 'account_id', label: 'Account ID', readOnly: true },
        { name: 'first_name', label: 'First name', required: true },
        { name: 'last_name', label: 'Last name', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'title', label: 'Title' },
        {
          name: 'is_primary',
          label: 'Primary',
          options: [
            { value: '1', label: 'Yes' },
            { value: '0', label: 'No' },
          ],
        },
      ]}
      transformLoad={(r) => ({
        account_id: String(r.account_id ?? ''),
        first_name: r.first_name ?? '',
        last_name: r.last_name ?? '',
        email: r.email ?? '',
        phone: r.phone ?? '',
        title: r.title ?? '',
        is_primary: r.is_primary ? '1' : '0',
      })}
      transformSave={(form) => ({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        title: form.title || null,
        is_primary: form.is_primary === '1',
      })}
      related={(record) => [
        {
          title: 'Account',
          rows: record.account ? [record.account] : [],
          getRowLink: (row) => `/booking/accounts/${row.id}`,
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
          ],
        },
      ]}
    />
  );
}
