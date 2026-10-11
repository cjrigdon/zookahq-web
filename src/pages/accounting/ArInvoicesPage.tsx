import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export function ArInvoicesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-ar-invoices'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/ar-invoices'),
  });
  const rows = data?.data?.data ?? [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bill_to_name: '',
    bill_to_email: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    description: '',
    quantity: '1',
    unit_price: '0',
  });
  const [error, setError] = useState<string | null>(null);
  const [portalLink, setPortalLink] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/accounting/ar-invoices', {
        method: 'POST',
        body: JSON.stringify({
          bill_to_name: form.bill_to_name,
          bill_to_email: form.bill_to_email,
          invoice_date: form.invoice_date,
          due_date: form.due_date,
          status: 'sent',
          lines: [
            {
              description: form.description,
              quantity: Number(form.quantity),
              unit_price: Number(form.unit_price),
            },
          ],
        }),
      }),
    onSuccess: async () => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['accounting-ar-invoices'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">AR Invoices</h2>
          <p className="text-sm text-slate-600">Client invoices and portal payment links.</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
          onClick={() => setOpen(true)}
        >
          New invoice
        </button>
      </div>

      {portalLink && (
        <div className="mb-4 rounded-md border border-support bg-support/40 px-4 py-3 text-sm">
          Portal link ready:{' '}
          <a className="text-primary underline" href={portalLink} target="_blank" rel="noreferrer">
            {portalLink}
          </a>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Number</th>
              <th className="px-4 py-3 text-left">Bill to</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Balance</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-support/40"
                onClick={() => navigate(`/accounting/ar-invoices/${row.id}`)}
              >
                <td className="px-4 py-3 font-medium">
                  <Link
                    to={`/accounting/ar-invoices/${row.id}`}
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.bill_to_name}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3">
                  {Number(row.total).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </td>
                <td className="px-4 py-3">
                  {Number(row.balance_due).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      void api<{ data: { path: string; token: string } }>(
                        `/accounting/ar-invoices/${row.id}/portal-link`,
                        { method: 'POST' },
                      ).then((res) => {
                        setPortalLink(`${window.location.origin}${res.data.path}`);
                      });
                    }}
                  >
                    Portal link
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={onSubmit} className="w-full max-w-lg rounded-xl bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Create invoice</h3>
            {(
              [
                ['bill_to_name', 'Bill to name'],
                ['bill_to_email', 'Bill to email'],
                ['invoice_date', 'Invoice date'],
                ['due_date', 'Due date'],
                ['description', 'Line description'],
                ['quantity', 'Quantity'],
                ['unit_price', 'Unit price'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="mb-3 block text-sm">
                <span className="mb-1 block text-slate-600">{label}</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  type={key.includes('date') ? 'date' : key === 'quantity' || key === 'unit_price' ? 'number' : 'text'}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                />
              </label>
            ))}
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
