import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function ArInvoiceDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.invoice_number}
      backTo="/accounting/ar-invoices"
      backLabel="Back to AR invoices"
      queryKey={['ar-invoice', id ?? '']}
      endpoint={`/accounting/ar-invoices/${id}`}
      fields={[
        { name: 'invoice_number', label: 'Invoice #', readOnly: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
            { value: 'void', label: 'Void' },
          ],
        },
        { name: 'invoice_date', label: 'Invoice date', type: 'date' },
        { name: 'due_date', label: 'Due date', type: 'date' },
        { name: 'bill_to_name', label: 'Bill to name' },
        { name: 'bill_to_email', label: 'Bill to email', type: 'email' },
        { name: 'tax_total', label: 'Tax total', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        status: form.status,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        bill_to_name: form.bill_to_name || null,
        bill_to_email: form.bill_to_email || null,
        tax_total: Number(form.tax_total || 0),
        notes: form.notes || null,
      })}
      related={(record) => [
        {
          title: 'Line items',
          rows: record.lines ?? [],
          columns: [
            { key: 'description', label: 'Description' },
            { key: 'quantity', label: 'Qty' },
            { key: 'unit_price', label: 'Unit price' },
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
