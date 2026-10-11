import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';

export function ApPaymentsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-ap-payments'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/ap-payments'),
  });
  const { data: billsData } = useQuery({
    queryKey: ['accounting-ap-bills'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/ap-bills'),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ap_bill_id: '',
    amount: '',
    method: 'check',
    reference: '',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/accounting/ap-payments', {
        method: 'POST',
        body: JSON.stringify({
          ap_bill_id: Number(form.ap_bill_id),
          amount: Number(form.amount),
          method: form.method,
          reference: form.reference || undefined,
        }),
      }),
    onSuccess: async () => {
      setOpen(false);
      setForm({ ap_bill_id: '', amount: '', method: 'check', reference: '' });
      await qc.invalidateQueries({ queryKey: ['accounting-ap-payments'] });
      await qc.invalidateQueries({ queryKey: ['accounting-ap-bills'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const rows = data?.data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">AP Payments</h2>
          <p className="text-sm text-slate-600">
            Record vendor disbursements; posts to the general ledger automatically.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          Record payment
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Payment #</th>
              <th className="px-4 py-3 text-left">Bill</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Paid</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-support/40">
                <td className="px-4 py-3 font-medium">{row.payment_number}</td>
                <td className="px-4 py-3">{row.bill?.bill_number ?? row.ap_bill_id}</td>
                <td className="px-4 py-3 capitalize">{row.method}</td>
                <td className="px-4 py-3">
                  {Number(row.amount).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </td>
                <td className="px-4 py-3">{row.paid_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="w-full max-w-lg rounded-xl bg-white p-6"
          >
            <h3 className="mb-4 text-lg font-semibold">Record AP payment</h3>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Bill</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.ap_bill_id}
                onChange={(e) => setForm({ ...form, ap_bill_id: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {(billsData?.data?.data ?? [])
                  .filter((b) => Number(b.balance_due) > 0)
                  .map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.bill_number} — {bill.vendor_name} (bal {bill.balance_due})
                    </option>
                  ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Amount</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Method</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {['check', 'ach', 'card', 'cash', 'other'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Reference</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Check # / confirmation"
              />
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
