import { ResourcePage } from '../../components/ResourcePage';

export function ServiceOrdersPage() {
  return (
    <ResourcePage
      title="Service Orders"
      description="F&B, AV, and operational service instructions."
      queryKey="events-service-orders"
      endpoint="/events/service-orders"
      initialForm={{
        event_id: '',
        title: '',
        status: 'draft',
        service_type: 'general',
        service_at: '',
        amount: '0',
        instructions: '',
      }}
      fields={[
        { name: 'event_id', label: 'Event ID', required: true },
        { name: 'title', label: 'Title', required: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'issued', label: 'Issued' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        { name: 'service_type', label: 'Service type' },
        { name: 'service_at', label: 'Service at', type: 'datetime-local' },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'instructions', label: 'Instructions' },
      ]}
      transformPayload={(form) => ({
        ...form,
        event_id: Number(form.event_id),
        amount: Number(form.amount || 0),
        service_at: form.service_at || null,
      })}
      columns={[
        { key: 'title', label: 'Title' },
        {
          key: 'event',
          label: 'Event',
          render: (row: any) => row.event?.name ?? row.event_id,
        },
        { key: 'status', label: 'Status' },
        { key: 'service_type', label: 'Type' },
        {
          key: 'amount',
          label: 'Amount',
          render: (row: any) =>
            Number(row.amount).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
      ]}
      detailTo={(row) => `/events/service-orders/${row.id}`}
    />
  );
}
