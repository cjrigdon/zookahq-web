import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function ContractDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.title}
      backTo="/booking/contracts"
      backLabel="Back to contracts"
      queryKey={['booking-contract', id ?? '']}
      endpoint={`/booking/contracts/${id}`}
      fields={[
        { name: 'title', label: 'Title', required: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'signed', label: 'Signed' },
            { value: 'void', label: 'Void' },
          ],
        },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'signed_at', label: 'Signed at', type: 'datetime-local' },
        { name: 'signed_by_name', label: 'Signed by' },
        { name: 'document_path', label: 'Document path' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        amount: Number(form.amount || 0),
        signed_at: form.signed_at || null,
      })}
      related={(record) => [
        {
          title: 'Opportunity',
          rows: record.opportunity ? [record.opportunity] : [],
          getRowLink: (row) => `/booking/opportunities/${row.id}`,
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'stage', label: 'Stage' },
          ],
        },
        {
          title: 'Proposal',
          rows: record.proposal ? [record.proposal] : [],
          getRowLink: (row) => `/booking/proposals/${row.id}`,
          columns: [
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            { key: 'amount', label: 'Amount' },
          ],
        },
      ]}
    />
  );
}
