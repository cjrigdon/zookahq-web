import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function ApBillDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.bill_number}
      backTo="/accounting/ap-bills"
      backLabel="Back to AP bills"
      queryKey={['ap-bill', id ?? '']}
      endpoint={`/accounting/ap-bills/${id}`}
      fields={[
        { name: 'bill_number', label: 'Bill #', readOnly: true },
        { name: 'vendor_name', label: 'Vendor', required: true },
        { name: 'vendor_email', label: 'Vendor email', type: 'email' },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'open', label: 'Open' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
            { value: 'void', label: 'Void' },
          ],
        },
        { name: 'bill_date', label: 'Bill date', type: 'date' },
        { name: 'due_date', label: 'Due date', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      canDelete
      related={(record) => [
        {
          title: 'Line items',
          rows: record.lines ?? [],
          columns: [
            { key: 'description', label: 'Description' },
            { key: 'quantity', label: 'Qty' },
            { key: 'unit_cost', label: 'Unit cost' },
            { key: 'line_total', label: 'Line total' },
          ],
        },
        {
          title: 'Payments',
          rows: record.payments ?? [],
          columns: [
            { key: 'payment_number', label: 'Payment #' },
            { key: 'method', label: 'Method' },
            { key: 'amount', label: 'Amount' },
            { key: 'paid_at', label: 'Paid at' },
          ],
        },
      ]}
    />
  );
}
