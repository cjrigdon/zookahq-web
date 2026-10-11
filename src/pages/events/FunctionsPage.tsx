import { ResourcePage } from '../../components/ResourcePage';

export function FunctionsPage() {
  return (
    <ResourcePage
      title="Functions"
      description="Agenda blocks within each event."
      queryKey="events-functions"
      endpoint="/events/functions"
      initialForm={{
        event_id: '',
        name: '',
        function_type: 'general',
        status: 'scheduled',
        starts_at: '',
        ends_at: '',
        room: '',
        guaranteed_count: '',
      }}
      fields={[
        { name: 'event_id', label: 'Event ID', required: true },
        { name: 'name', label: 'Function name', required: true },
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
        { name: 'starts_at', label: 'Starts at', type: 'datetime-local', required: true },
        { name: 'ends_at', label: 'Ends at', type: 'datetime-local', required: true },
        { name: 'room', label: 'Room' },
        { name: 'guaranteed_count', label: 'Guaranteed count', type: 'number' },
      ]}
      transformPayload={(form) => ({
        ...form,
        event_id: Number(form.event_id),
        guaranteed_count: form.guaranteed_count ? Number(form.guaranteed_count) : null,
      })}
      columns={[
        { key: 'name', label: 'Name' },
        {
          key: 'event',
          label: 'Event',
          render: (row: any) => row.event?.name ?? row.event_id,
        },
        { key: 'function_type', label: 'Type' },
        { key: 'room', label: 'Room' },
        {
          key: 'starts_at',
          label: 'Starts',
          render: (row: any) => new Date(row.starts_at).toLocaleString(),
        },
      ]}
      detailTo={(row) => `/events/functions/${row.id}`}
    />
  );
}
