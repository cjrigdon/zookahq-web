import { ResourcePage } from '../../components/ResourcePage';

export function OpportunitiesPage() {
  return (
    <ResourcePage
      title="Opportunities"
      description="Event opportunities moving through the pipeline."
      queryKey="booking-opportunities"
      endpoint="/booking/opportunities"
      initialForm={{
        name: '',
        stage: 'prospecting',
        value: '0',
        venue_space: '',
        event_start_date: '',
        event_end_date: '',
      }}
      fields={[
        { name: 'name', label: 'Opportunity name', required: true },
        {
          name: 'stage',
          label: 'Stage',
          options: [
            { value: 'prospecting', label: 'Prospecting' },
            { value: 'qualification', label: 'Qualification' },
            { value: 'proposal', label: 'Proposal' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'booked', label: 'Booked' },
            { value: 'lost', label: 'Lost' },
          ],
        },
        { name: 'value', label: 'Value', type: 'number' },
        { name: 'venue_space', label: 'Venue space' },
        { name: 'event_start_date', label: 'Start date', type: 'date' },
        { name: 'event_end_date', label: 'End date', type: 'date' },
      ]}
      transformPayload={(form) => ({
        ...form,
        value: Number(form.value || 0),
      })}
      columns={[
        { key: 'name', label: 'Name' },
        {
          key: 'stage',
          label: 'Stage',
          render: (row: any) =>
            row.stage === 'booked' ? (
              <span className="rounded bg-accent/30 px-2 py-0.5 text-xs font-medium text-text">
                Booked
              </span>
            ) : (
              <span className="capitalize">{row.stage}</span>
            ),
        },
        {
          key: 'value',
          label: 'Value',
          render: (row: any) =>
            Number(row.value).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
        { key: 'venue_space', label: 'Space' },
        { key: 'event_start_date', label: 'Start' },
      ]}
      detailTo={(row) => `/booking/opportunities/${row.id}`}
    />
  );
}
