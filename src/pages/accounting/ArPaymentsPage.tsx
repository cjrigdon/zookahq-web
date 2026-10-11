import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';

export function ArPaymentsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-ar-payments'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/ar-payments'),
  });
  const { data: invoicesData } = useQuery({
    queryKey: ['accounting-ar-invoices'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/ar-invoices'),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ar_invoice_id: '',
    amount: '',
    method: 'card',
    charge_card: true,
    card_number: '4111111111111111',
    card_expiration: '1228',
    card_cvv: '123',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/accounting/ar-payments', {
        method: 'POST',
        body: JSON.stringify({
          ar_invoice_id: Number(form.ar_invoice_id),
          amount: Number(form.amount),
          method: form.method,
          charge_card: form.charge_card,
          card: form.charge_card
            ? {
                number: form.card_number,
                expiration: form.card_expiration,
                cvv: form.card_cvv,
              }
            : undefined,
        }),
      }),
    onSuccess: async () => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['accounting-ar-payments'] });
      await qc.invalidateQueries({ queryKey: ['accounting-ar-invoices'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const rows = data?.data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">AR Payments</h2>
          <p className="text-sm text-slate-600">
            Record receipts and process cards via Authorize.net (stubbed without credentials).
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
          onClick={() => setOpen(true)}
        >
          Record payment
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Payment #</th>
              <th className="px-4 py-3 text-left">Invoice</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Auth.net</th>
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
                <td className="px-4 py-3">{row.invoice?.invoice_number ?? row.ar_invoice_id}</td>
                <td className="px-4 py-3 capitalize">{row.method}</td>
                <td className="px-4 py-3">
                  {Number(row.amount).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {row.authorize_net_trans_id ?? '—'}
                </td>
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
            <h3 className="mb-4 text-lg font-semibold">Record AR payment</h3>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Invoice</span>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.ar_invoice_id}
                onChange={(e) => setForm({ ...form, ar_invoice_id: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {(invoicesData?.data?.data ?? []).map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — balance {inv.balance_due}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Amount</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.charge_card}
                onChange={(e) => setForm({ ...form, charge_card: e.target.checked })}
              />
              Charge via Authorize.net
            </label>
            {form.charge_card && (
              <>
                <label className="mb-3 block text-sm">
                  <span className="mb-1 block text-slate-600">Card number</span>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    value={form.card_number}
                    onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                  />
                </label>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Exp (MMYY)</span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={form.card_expiration}
                      onChange={(e) => setForm({ ...form, card_expiration: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">CVV</span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={form.card_cvv}
                      onChange={(e) => setForm({ ...form, card_cvv: e.target.value })}
                    />
                  </label>
                </div>
              </>
            )}
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
