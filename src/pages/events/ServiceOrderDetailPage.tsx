import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function ServiceOrderDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.title}
      backTo="/events/service-orders"
      backLabel="Back to service orders"
      queryKey={['service-order', id ?? '']}
      endpoint={`/events/service-orders/${id}`}
      fields={[
        { name: 'event_id', label: 'Event ID', readOnly: true },
        { name: 'event_function_id', label: 'Function ID' },
        { name: 'title', label: 'Title', required: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        { name: 'service_type', label: 'Service type' },
        { name: 'service_at', label: 'Service at', type: 'datetime-local' },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'instructions', label: 'Instructions', type: 'textarea' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        title: form.title,
        status: form.status,
        service_type: form.service_type || null,
        event_function_id: form.event_function_id ? Number(form.event_function_id) : null,
        amount: Number(form.amount || 0),
        service_at: form.service_at || null,
        instructions: form.instructions || null,
        notes: form.notes || null,
      })}
      related={(record) => [
        {
          title: 'Event',
          rows: record.event ? [record.event] : [],
          getRowLink: (row) => `/events/events/${row.id}`,
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
          ],
        },
      ]}
    />
  );
}
