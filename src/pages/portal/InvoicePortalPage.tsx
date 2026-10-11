import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';

export function InvoicePortalPage() {
  const { token = '' } = useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-invoice', token],
    queryFn: () => api<{ data: any }>(`/portal/invoices/${token}`),
    enabled: Boolean(token),
  });
  const invoice = data?.data;
  const [form, setForm] = useState({
    card_number: '4111111111111111',
    card_expiration: '1228',
    card_cvv: '123',
    payer_name: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const payMutation = useMutation({
    mutationFn: () =>
      api(`/portal/invoices/${token}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          payer_name: form.payer_name,
          card: {
            number: form.card_number,
            expiration: form.card_expiration,
            cvv: form.card_cvv,
          },
        }),
      }),
    onSuccess: async (res: any) => {
      setMessage(
        `Payment ${res.data.payment_number} approved (${res.data.transaction_id}). Balance now ${res.data.invoice_balance_due}.`,
      );
      setPayError(null);
      await qc.invalidateQueries({ queryKey: ['portal-invoice', token] });
    },
    onError: (err: Error) => setPayError(err.message),
  });

  if (isLoading) {
    return <div className="p-8 text-slate-500">Loading invoice…</div>;
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-primary">ZookaHQ</h1>
          <p className="mt-3 text-sm text-slate-600">
            This payment link is invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  const paid = Number(invoice.balance_due) <= 0;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_35%),linear-gradient(160deg,#f8fafc,#e2e8f0)] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <div className="font-[family-name:var(--font-display)] text-3xl text-primary">ZookaHQ</div>
          <p className="mt-1 text-sm text-slate-600">Secure client payment portal</p>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-canvas p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-medium">{invoice.invoice_number}</div>
              <div className="text-sm text-slate-600">{invoice.bill_to_name}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-slate-500">Balance due</div>
              <div className="text-xl font-medium text-text">
                {Number(invoice.balance_due).toLocaleString(undefined, {
                  style: 'currency',
                  currency: invoice.currency || 'USD',
                })}
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            {(invoice.lines ?? []).map((line: any) => (
              <li key={line.id} className="flex justify-between gap-4">
                <span>
                  {line.description} × {line.quantity}
                </span>
                <span>
                  {Number(line.line_total).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {paid ? (
          <div className="rounded-md bg-support/50 px-4 py-3 text-sm text-primary">
            This invoice is paid in full.
          </div>
        ) : (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              payMutation.mutate();
            }}
            className="space-y-3"
          >
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Name on card</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.payer_name}
                onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Card number</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={form.card_number}
                onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Exp (MMYY)</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  value={form.card_expiration}
                  onChange={(e) => setForm({ ...form, card_expiration: e.target.value })}
                  required
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
            {payError && <p className="text-sm text-red-600">{payError}</p>}
            {message && <p className="text-sm text-primary">{message}</p>}
            <button
              type="submit"
              disabled={payMutation.isPending}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-text hover:bg-accent-dark disabled:opacity-60"
            >
              {payMutation.isPending ? 'Processing…' : 'Pay balance'}
            </button>
            <p className="text-xs text-slate-500">
              Payments process through Authorize.net. Without merchant credentials, sandbox stub
              approvals are used locally.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
