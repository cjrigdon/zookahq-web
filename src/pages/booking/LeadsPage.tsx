import { leadAddressKeys } from '../../components/AddressFields';
import { ResourcePage } from '../../components/ResourcePage';

export function LeadsPage() {
  return (
    <ResourcePage
      title="Leads"
      description="Match inbound contacts to existing accounts or convert them into new ones."
      queryKey="booking-leads"
      endpoint="/booking/leads"
      initialForm={{
        account_name: '',
        account_address: '',
        account_address_2: '',
        account_city: '',
        account_state: '',
        account_postal_code: '',
        contact_first_name: '',
        contact_last_name: '',
        contact_email: '',
        contact_title: '',
        contact_phone: '',
        source: 'website',
        status: 'unqualified',
      }}
      fields={[
        { name: 'account_name', label: 'Account name' },
        { name: 'account_address', label: 'Account address', type: 'address', addressKeys: leadAddressKeys },
        { name: 'contact_first_name', label: 'Contact first name', required: true },
        { name: 'contact_last_name', label: 'Contact last name', required: true },
        { name: 'contact_email', label: 'Contact email', type: 'email' },
        { name: 'contact_title', label: 'Contact title' },
        { name: 'contact_phone', label: 'Contact phone' },
        { name: 'source', label: 'Source' },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'unqualified', label: 'Unqualified' },
            { value: 'new', label: 'New' },
            { value: 'qualified', label: 'Qualified' },
            { value: 'converted', label: 'Converted' },
          ],
        },
      ]}
      columns={[
        { key: 'account_name', label: 'Account name' },
        {
          key: 'contact',
          label: 'Contact',
          render: (row: any) =>
            `${row.contact_first_name ?? ''} ${row.contact_last_name ?? ''}`.trim() || '—',
        },
        { key: 'contact_email', label: 'Contact email' },
        { key: 'contact_title', label: 'Title' },
        { key: 'contact_phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
      ]}
      detailTo={(row) => `/booking/leads/${row.id}`}
    />
  );
}
