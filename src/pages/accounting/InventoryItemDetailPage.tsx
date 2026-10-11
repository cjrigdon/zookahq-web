import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function InventoryItemDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.name}
      backTo="/accounting/inventory"
      backLabel="Back to inventory"
      queryKey={['inventory-item', id ?? '']}
      endpoint={`/accounting/inventory-items/${id}`}
      fields={[
        { name: 'sku', label: 'SKU', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'category', label: 'Category' },
        { name: 'unit', label: 'Unit' },
        { name: 'quantity_on_hand', label: 'Qty on hand', type: 'number' },
        { name: 'reorder_level', label: 'Reorder level', type: 'number' },
        { name: 'unit_cost', label: 'Unit cost', type: 'number' },
        { name: 'unit_price', label: 'Unit price', type: 'number' },
        {
          name: 'is_active',
          label: 'Active',
          options: [
            { value: '1', label: 'Yes' },
            { value: '0', label: 'No' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformLoad={(r) => ({
        sku: r.sku ?? '',
        name: r.name ?? '',
        category: r.category ?? '',
        unit: r.unit ?? 'each',
        quantity_on_hand: String(r.quantity_on_hand ?? 0),
        reorder_level: String(r.reorder_level ?? 0),
        unit_cost: String(r.unit_cost ?? 0),
        unit_price: String(r.unit_price ?? 0),
        is_active: r.is_active ? '1' : '0',
        notes: r.notes ?? '',
      })}
      transformSave={(form) => ({
        ...form,
        quantity_on_hand: Number(form.quantity_on_hand || 0),
        reorder_level: Number(form.reorder_level || 0),
        unit_cost: Number(form.unit_cost || 0),
        unit_price: Number(form.unit_price || 0),
        is_active: form.is_active === '1',
      })}
    />
  );
}
