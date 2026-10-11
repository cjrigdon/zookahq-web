import { ResourcePage } from '../../components/ResourcePage';

export function AccountsPage() {
  return (
    <ResourcePage
      title="Accounts"
      description="Organizations and venue clients."
      queryKey="booking-accounts"
      endpoint="/booking/accounts"
      initialForm={{ name: '', email: '', phone: '', city: '', state: '' }}
      fields={[
        { name: 'name', label: 'Account name', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        {
          key: 'location',
          label: 'Location',
          render: (row: any) => [row.city, row.state].filter(Boolean).join(', ') || '—',
        },
      ]}
      detailTo={(row) => `/booking/accounts/${row.id}`}
    />
  );
}
