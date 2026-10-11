import { Link, useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

const stageOptions = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
];

export function OpportunityDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.name}
      backTo="/booking/opportunities"
      backLabel="Back to opportunities"
      queryKey={['booking-opportunity', id ?? '']}
      endpoint={`/booking/opportunities/${id}`}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'stage', label: 'Stage', options: stageOptions },
        { name: 'value', label: 'Value', type: 'number' },
        { name: 'account_id', label: 'Account ID' },
        { name: 'contact_id', label: 'Contact ID' },
        { name: 'venue_space', label: 'Venue space' },
        { name: 'expected_attendance', label: 'Expected attendance', type: 'number' },
        { name: 'event_start_date', label: 'Event start', type: 'date' },
        { name: 'event_end_date', label: 'Event end', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        value: Number(form.value || 0),
        account_id: form.account_id ? Number(form.account_id) : null,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        expected_attendance: form.expected_attendance
          ? Number(form.expected_attendance)
          : null,
        event_start_date: form.event_start_date || null,
        event_end_date: form.event_end_date || null,
      })}
      related={(record) => [
        {
          title: 'Account',
          rows: record.account ? [record.account] : [],
          emptyText: 'No account linked.',
          getRowLink: (row) => `/booking/accounts/${row.id}`,
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
          ],
        },
        {
          title: 'Proposals',
          rows: record.proposals ?? [],
          emptyText: 'No proposals yet.',
          headerAction: (
            <Link
              to={`/booking/proposals/new?opportunity_id=${record.id}`}
              className="text-sm text-primary hover:underline"
            >
              New proposal
            </Link>
          ),
          getRowLink: (row) => `/booking/proposals/${row.id}`,
          columns: [
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            {
              key: 'amount',
              label: 'Amount',
              render: (row) =>
                Number(row.amount).toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                }),
            },
            { key: 'valid_until', label: 'Valid until' },
          ],
        },
        {
          title: 'Contracts',
          rows: record.contracts ?? [],
          emptyText: 'No contracts yet.',
          getRowLink: (row) => `/booking/contracts/${row.id}`,
          columns: [
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            {
              key: 'amount',
              label: 'Amount',
              render: (row) =>
                Number(row.amount).toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                }),
            },
            { key: 'signed_at', label: 'Signed' },
          ],
        },
      ]}
    />
  );
}
