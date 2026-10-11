import { ResourcePage } from '../../components/ResourcePage';

export function EventsPage() {
  return (
    <ResourcePage
      title="Events"
      description="Confirmed venue events and timelines."
      queryKey="events-list"
      endpoint="/events/events"
      initialForm={{
        name: '',
        status: 'confirmed',
        starts_at: '',
        ends_at: '',
        venue_space: '',
        expected_attendance: '',
      }}
      fields={[
        { name: 'name', label: 'Event name', required: true },
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
      ]}
      transformPayload={(form) => ({
        ...form,
        expected_attendance: form.expected_attendance
          ? Number(form.expected_attendance)
          : null,
      })}
      columns={[
        { key: 'name', label: 'Name' },
        {
          key: 'status',
          label: 'Status',
          render: (row: any) =>
            row.status === 'confirmed' ? (
              <span className="rounded bg-accent/30 px-2 py-0.5 text-xs font-medium">
                Confirmed
              </span>
            ) : (
              <span className="capitalize">{row.status}</span>
            ),
        },
        {
          key: 'starts_at',
          label: 'Starts',
          render: (row: any) => new Date(row.starts_at).toLocaleString(),
        },
        { key: 'venue_space', label: 'Space' },
      ]}
      detailTo={(row) => `/events/events/${row.id}`}
    />
  );
}
