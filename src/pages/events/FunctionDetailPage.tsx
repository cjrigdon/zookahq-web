import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function FunctionDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.name}
      backTo="/events/functions"
      backLabel="Back to functions"
      queryKey={['event-function', id ?? '']}
      endpoint={`/events/functions/${id}`}
      fields={[
        { name: 'event_id', label: 'Event ID', readOnly: true },
        { name: 'name', label: 'Name', required: true },
        {
          name: 'function_type',
          label: 'Type',
          options: [
            { value: 'general', label: 'General' },
            { value: 'reception', label: 'Reception' },
            { value: 'meal', label: 'Meal' },
            { value: 'breakout', label: 'Breakout' },
            { value: 'ceremony', label: 'Ceremony' },
          ],
        },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        { name: 'starts_at', label: 'Starts at', type: 'datetime-local' },
        { name: 'ends_at', label: 'Ends at', type: 'datetime-local' },
        { name: 'room', label: 'Room' },
        { name: 'guaranteed_count', label: 'Guaranteed count', type: 'number' },
        { name: 'set_count', label: 'Set count', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        name: form.name,
        function_type: form.function_type,
        status: form.status,
        guaranteed_count: form.guaranteed_count ? Number(form.guaranteed_count) : null,
        set_count: form.set_count ? Number(form.set_count) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        room: form.room || null,
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
