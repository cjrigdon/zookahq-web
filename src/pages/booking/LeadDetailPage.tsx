import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { leadAddressKeys } from '../../components/AddressFields';
import { EntityChecklists } from '../../components/checklists/EntityChecklists';
import { DetailRecord } from '../../components/DetailRecord';

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <DetailRecord
      title={(r) =>
        r.account_name ||
        `${r.contact_first_name ?? ''} ${r.contact_last_name ?? ''}`.trim() ||
        'Lead'
      }
      backTo="/booking/leads"
      backLabel="Back to leads"
      queryKey={['booking-lead', id ?? '']}
      endpoint={`/booking/leads/${id}`}
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
        { name: 'event_date', label: 'Event date', type: 'date' },
        { name: 'load_in_at', label: 'Load in start', type: 'datetime-local' },
        { name: 'event_starts_at', label: 'Event start', type: 'datetime-local' },
        { name: 'event_ends_at', label: 'Event end', type: 'datetime-local' },
        { name: 'load_out_at', label: 'Load out complete', type: 'datetime-local' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        account_name: form.account_name || null,
        contact_first_name: form.contact_first_name,
        contact_last_name: form.contact_last_name,
        contact_email: form.contact_email || null,
        contact_title: form.contact_title || null,
        contact_phone: form.contact_phone || null,
        source: form.source || null,
        status: form.status,
        event_date: form.event_date || null,
        load_in_at: form.load_in_at || null,
        event_starts_at: form.event_starts_at || null,
        event_ends_at: form.event_ends_at || null,
        load_out_at: form.load_out_at || null,
        notes: form.notes || null,
        account_address: form.account_address || null,
        account_address_2: form.account_address_2 || null,
        account_city: form.account_city || null,
        account_state: form.account_state || null,
        account_postal_code: form.account_postal_code || null,
      })}
      extra={(record) => <EntityChecklists type="lead" recordId={record.id} />}
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
