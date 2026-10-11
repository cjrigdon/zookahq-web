import { Link, useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function AccountDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.name}
      backTo="/booking/accounts"
      backLabel="Back to accounts"
      queryKey={['booking-account', id ?? '']}
      endpoint={`/booking/accounts/${id}`}
      fields={[
        { name: 'name', label: 'Account name', required: true },
        { name: 'type', label: 'Type' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'website', label: 'Website' },
        { name: 'billing_address', label: 'Billing address' },
        { name: 'city', label: 'City' },
        { name: 'state', label: 'State' },
        { name: 'postal_code', label: 'Postal code' },
        { name: 'country', label: 'Country' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      related={(record) => [
        {
          title: 'Contacts',
          rows: record.contacts ?? [],
          emptyText: 'No contacts yet.',
          headerAction: (
            <Link
              to={`/booking/contacts/new?account_id=${record.id}`}
              className="text-sm text-primary hover:underline"
            >
              Add contact
            </Link>
          ),
          getRowLink: (row) => `/booking/contacts/${row.id}`,
          columns: [
            {
              key: 'name',
              label: 'Name',
              render: (row) => `${row.first_name} ${row.last_name}`,
            },
            { key: 'email', label: 'Email' },
            { key: 'title', label: 'Title' },
            {
              key: 'is_primary',
              label: 'Primary',
              render: (row) => (row.is_primary ? 'Yes' : '—'),
            },
          ],
        },
        {
          title: 'Opportunities',
          rows: record.opportunities ?? [],
          emptyText: 'No opportunities yet.',
          headerAction: (
            <Link
              to={`/booking/opportunities?account_id=${record.id}`}
              className="text-sm text-primary hover:underline"
              onClick={() => {
                // Prefer creating from list with account prefilled via sessionStorage
                sessionStorage.setItem('pref_account_id', String(record.id));
              }}
            >
              View pipeline
            </Link>
          ),
          getRowLink: (row) => `/booking/opportunities/${row.id}`,
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'stage', label: 'Stage' },
            {
              key: 'value',
              label: 'Value',
              render: (row) =>
                Number(row.value).toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                }),
            },
            { key: 'event_start_date', label: 'Start' },
          ],
        },
      ]}
    />
  );
}
