import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { DetailRecord } from '../../components/DetailRecord';

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <DetailRecord
      title={(r) => `${r.first_name} ${r.last_name}`}
      backTo="/booking/leads"
      backLabel="Back to leads"
      queryKey={['booking-lead', id ?? '']}
      endpoint={`/booking/leads/${id}`}
      fields={[
        { name: 'first_name', label: 'First name', required: true },
        { name: 'last_name', label: 'Last name', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'company', label: 'Company' },
        { name: 'source', label: 'Source' },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'new', label: 'New' },
            { value: 'qualified', label: 'Qualified' },
            { value: 'converted', label: 'Converted' },
          ],
        },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      actions={(record, { refresh }) =>
        record.status !== 'converted' ? (
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm"
            onClick={() => {
              void api(`/booking/leads/${record.id}/convert`, { method: 'POST', body: '{}' }).then(
                (res: any) => {
                  refresh();
                  if (res?.data?.account?.id) {
                    navigate(`/booking/accounts/${res.data.account.id}`);
                  }
                },
              );
            }}
          >
            Convert to account
          </button>
        ) : null
      }
    />
  );
}
