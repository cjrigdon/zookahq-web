import { api } from '../../api/client';
import { ResourcePage } from '../../components/ResourcePage';

export function ProposalsPage() {
  return (
    <ResourcePage
      title="Proposals"
      description="Proposal versions tied to opportunities."
      queryKey="booking-proposals"
      endpoint="/booking/proposals"
      initialForm={{
        opportunity_id: '',
        title: '',
        amount: '0',
        status: 'draft',
      }}
      fields={[
        { name: 'opportunity_id', label: 'Opportunity ID', required: true },
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
        opportunity_id: Number(form.opportunity_id),
        amount: Number(form.amount || 0),
      })}
      columns={[
        { key: 'title', label: 'Title' },
        {
          key: 'opportunity',
          label: 'Opportunity',
          render: (row: any) => row.opportunity?.name ?? row.opportunity_id,
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
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => {
            void api(`/booking/proposals/${row.id}/contracts`, {
              method: 'POST',
              body: '{}',
            }).then(refresh);
          }}
        >
          Create contract
        </button>
      )}
    />
  );
}
