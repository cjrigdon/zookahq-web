import { Link, useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function EventDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.name}
      backTo="/events/events"
      backLabel="Back to events"
      queryKey={['event', id ?? '']}
      endpoint={`/events/events/${id}`}
      fields={[
        { name: 'name', label: 'Name', required: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'tentative', label: 'Tentative' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        { name: 'starts_at', label: 'Starts at', type: 'datetime-local', required: true },
        { name: 'ends_at', label: 'Ends at', type: 'datetime-local', required: true },
        { name: 'venue_space', label: 'Venue space' },
        { name: 'expected_attendance', label: 'Expected attendance', type: 'number' },
        { name: 'opportunity_id', label: 'Opportunity ID' },
        { name: 'account_id', label: 'Account ID' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        expected_attendance: form.expected_attendance
          ? Number(form.expected_attendance)
          : null,
        opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
        account_id: form.account_id ? Number(form.account_id) : null,
      })}
      related={(record) => [
        {
          title: 'Functions',
          rows: record.functions ?? [],
          getRowLink: (row) => `/events/functions/${row.id}`,
          headerAction: (
            <Link to="/events/functions" className="text-sm text-primary hover:underline">
              Manage functions
            </Link>
          ),
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
            {
              key: 'starts_at',
              label: 'Starts',
              render: (row) => (row.starts_at ? new Date(row.starts_at).toLocaleString() : '—'),
            },
          ],
        },
        {
          title: 'Service orders',
          rows: record.service_orders ?? [],
          getRowLink: (row) => `/events/service-orders/${row.id}`,
          columns: [
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            { key: 'service_type', label: 'Type' },
          ],
        },
        {
          title: 'Change log',
          rows: record.changes ?? [],
          columns: [
            { key: 'summary', label: 'Summary' },
            { key: 'field', label: 'Field' },
            {
              key: 'created_at',
              label: 'When',
              render: (row) =>
                row.created_at ? new Date(row.created_at).toLocaleString() : '—',
            },
          ],
        },
      ]}
    />
  );
}
