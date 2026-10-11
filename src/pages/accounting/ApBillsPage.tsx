import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export function ApBillsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-ap-bills'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/ap-bills'),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vendor_name: '',
    vendor_email: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    description: '',
    quantity: '1',
    unit_cost: '0',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api('/accounting/ap-bills', {
        method: 'POST',
        body: JSON.stringify({
          vendor_name: form.vendor_name,
          vendor_email: form.vendor_email,
          bill_date: form.bill_date,
          due_date: form.due_date,
          status: 'open',
          lines: [
            {
              description: form.description,
              quantity: Number(form.quantity),
              unit_cost: Number(form.unit_cost),
            },
          ],
        }),
      }),
    onSuccess: async () => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['accounting-ap-bills'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const rows = data?.data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Accounts Payable</h2>
          <p className="text-sm text-slate-600">Vendor bills and payables.</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
          onClick={() => setOpen(true)}
        >
          New bill
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Bill #</th>
              <th className="px-4 py-3 text-left">Vendor</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Balance</th>
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
              <tr
                key={row.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-support/40"
                onClick={() => navigate(`/accounting/ap-bills/${row.id}`)}
              >
                <td className="px-4 py-3 font-medium">
                  <Link
                    to={`/accounting/ap-bills/${row.id}`}
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.bill_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.vendor_name}</td>
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
            <h3 className="mb-4 text-lg font-semibold">Create AP bill</h3>
            {(
              [
                ['vendor_name', 'Vendor name'],
                ['vendor_email', 'Vendor email'],
                ['bill_date', 'Bill date'],
                ['due_date', 'Due date'],
                ['description', 'Line description'],
                ['quantity', 'Quantity'],
                ['unit_cost', 'Unit cost'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="mb-3 block text-sm">
                <span className="mb-1 block text-slate-600">{label}</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  type={
                    key.includes('date')
                      ? 'date'
                      : key === 'quantity' || key === 'unit_cost'
                        ? 'number'
                        : 'text'
                  }
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key !== 'vendor_email'}
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
