import { api } from '../../api/client';
import { ResourcePage } from '../../components/ResourcePage';

export function LeadsPage() {
  return (
    <ResourcePage
      title="Leads"
      description="Capture and qualify inbound event demand."
      queryKey="booking-leads"
      endpoint="/booking/leads"
      initialForm={{
        first_name: '',
        last_name: '',
        email: '',
        company: '',
        source: 'website',
        status: 'new',
      }}
      fields={[
        { name: 'first_name', label: 'First name', required: true },
        { name: 'last_name', label: 'Last name', required: true },
        { name: 'email', label: 'Email', type: 'email' },
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
      ]}
      columns={[
        {
          key: 'name',
          label: 'Name',
          render: (row: any) => `${row.first_name} ${row.last_name}`,
        },
        { key: 'company', label: 'Company' },
        { key: 'email', label: 'Email' },
        { key: 'status', label: 'Status' },
      ]}
      detailTo={(row) => `/booking/leads/${row.id}`}
      actions={(row, { refresh }) => (
        <button
          type="button"
          className="text-primary hover:underline disabled:opacity-40"
          disabled={row.status === 'converted'}
          onClick={() => {
            void api(`/booking/leads/${row.id}/convert`, { method: 'POST', body: '{}' }).then(
              refresh,
            );
          }}
        >
          Convert
        </button>
      )}
    />
  );
}
