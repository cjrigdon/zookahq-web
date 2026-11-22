import { api } from '../../api/client';
import { ResourcePage } from '../../components/ResourcePage';
import { ActionButton } from '../../components/ui/ActionButton';

export function ProposalsPage() {
  return (
    <ResourcePage
      title="Proposals"
      description="Proposal versions tied to events."
      queryKey="booking-proposals"
      endpoint="/booking/proposals"
      initialForm={{
        event_id: '',
        title: '',
        amount: '0',
        status: 'draft',
      }}
      fields={[
        { name: 'event_id', label: 'Event ID', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'amount', label: 'Amount', type: 'number' },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Rejected' },
          ],
        },
      ]}
      transformPayload={(form) => ({
        ...form,
        event_id: Number(form.event_id),
        amount: Number(form.amount || 0),
      })}
      columns={[
        { key: 'title', label: 'Title' },
        {
          key: 'event',
          label: 'Event',
          render: (row: any) => row.event?.name ?? row.event_id,
        },
        { key: 'status', label: 'Status' },
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
      detailTo={(row) => `/booking/proposals/${row.id}`}
      actions={(row, { refresh }) => (
        <ActionButton
          size="sm"
          onClick={() => {
            void api(`/booking/proposals/${row.id}/contracts`, {
              method: 'POST',
              body: '{}',
            }).then(refresh);
          }}
        >
          Create contract
        </ActionButton>
      )}
    />
  );
}
