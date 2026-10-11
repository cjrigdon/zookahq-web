import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { ResourcePage } from '../../components/ResourcePage';

export function InventoryPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['accounting-inventory'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/inventory-items'),
  });
  const [adjustItem, setAdjustItem] = useState<any | null>(null);
  const [delta, setDelta] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const adjustMutation = useMutation({
    mutationFn: () =>
      api(`/accounting/inventory-items/${adjustItem.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          quantity_delta: Number(delta),
          notes: notes || undefined,
        }),
      }),
    onSuccess: async () => {
      setAdjustItem(null);
      setDelta('0');
      setNotes('');
      await qc.invalidateQueries({ queryKey: ['accounting-inventory'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const rows = data?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <ResourcePage
        title="Inventory"
        description="Basic stock items for venue operations. Use Adjust to change on-hand quantity."
        queryKey="accounting-inventory"
        endpoint="/accounting/inventory-items"
        initialForm={{
          sku: '',
          name: '',
          category: '',
          quantity_on_hand: '0',
          reorder_level: '0',
          unit_cost: '0',
          unit_price: '0',
        }}
        fields={[
          { name: 'sku', label: 'SKU', required: true },
          { name: 'name', label: 'Name', required: true },
          { name: 'category', label: 'Category' },
          { name: 'quantity_on_hand', label: 'Qty on hand', type: 'number' },
          { name: 'reorder_level', label: 'Reorder level', type: 'number' },
          { name: 'unit_cost', label: 'Unit cost', type: 'number' },
          { name: 'unit_price', label: 'Unit price', type: 'number' },
        ]}
        transformPayload={(form) => ({
          ...form,
          quantity_on_hand: Number(form.quantity_on_hand || 0),
          reorder_level: Number(form.reorder_level || 0),
          unit_cost: Number(form.unit_cost || 0),
          unit_price: Number(form.unit_price || 0),
        })}
        columns={[
          { key: 'sku', label: 'SKU' },
          { key: 'name', label: 'Name' },
          { key: 'category', label: 'Category' },
          { key: 'quantity_on_hand', label: 'On hand' },
        {
          key: 'unit_price',
          label: 'Price',
          render: (row: any) =>
            Number(row.unit_price).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
      ]}
        detailTo={(row) => `/accounting/inventory/${row.id}`}
      />

      {rows.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium">Quick adjust</h3>
          <div className="flex flex-wrap gap-2">
            {rows.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-support/40"
                onClick={() => {
                  setError(null);
                  setAdjustItem(item);
                  setDelta('0');
                  setNotes('');
                }}
              >
                {item.sku} ({item.quantity_on_hand})
              </button>
            ))}
          </div>
        </section>
      )}

      {adjustItem && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              adjustMutation.mutate();
            }}
            className="w-full max-w-md rounded-xl bg-white p-6"
          >
            <h3 className="mb-1 text-lg font-semibold">Adjust {adjustItem.sku}</h3>
            <p className="mb-4 text-sm text-slate-600">
              Current on hand: {adjustItem.quantity_on_hand}
            </p>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Quantity delta (+/−)</span>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                required
              />
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-slate-600">Notes</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustItem(null)} className="px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
                Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
