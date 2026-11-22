import { api } from '../../api/client';
import { ResourcePage } from '../../components/ResourcePage';
import { ActionButton } from '../../components/ui/ActionButton';

export function ContractsPage() {
  return (
    <ResourcePage
      title="Contracts"
      description="Signed agreements and booking milestones."
      queryKey="booking-contracts"
      endpoint="/booking/contracts"
      disableCreate
      initialForm={{}}
      fields={[]}
      columns={[
        { key: 'title', label: 'Title' },
        {
          key: 'status',
          label: 'Status',
          render: (row: any) =>
            row.status === 'signed' ? (
              <span className="rounded bg-accent/30 px-2 py-0.5 text-xs font-medium">Signed</span>
            ) : (
              <span className="capitalize">{row.status}</span>
            ),
        },
        {
          key: 'amount',
          label: 'Amount',
          render: (row: any) =>
            Number(row.amount).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
        {
          key: 'event',
          label: 'Event',
          render: (row: any) => row.event?.name ?? '—',
        },
      ]}
      detailTo={(row) => `/booking/contracts/${row.id}`}
      actions={(row, { refresh }) =>
        row.status !== 'signed' ? (
          <ActionButton
            size="sm"
            onClick={() => {
              void api(`/booking/contracts/${row.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'signed', signed_by_name: 'Client' }),
              }).then(refresh);
            }}
          >
            Mark signed
          </ActionButton>
        ) : null
      }
    />
  );
}
