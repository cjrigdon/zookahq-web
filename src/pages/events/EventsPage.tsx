import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '../../api/client';
import { ResourcePage } from '../../components/ResourcePage';
import { EVENT_STATUSES } from '../../lib/eventStatuses';
import { formatDateTime } from '../../lib/formatDateTime';

type EventTypeOption = {
  id: number;
  code: string;
  name: string;
  background_color: string;
  text_color: string;
};

type AccountOption = {
  id: number;
  name: string;
  contacts?: Array<{ id: number; first_name?: string; last_name?: string }>;
};

function contactLabel(contact: { first_name?: string; last_name?: string }) {
  return `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Unnamed contact';
}

export function EventsPage() {
  const { data: typesData } = useQuery({
    queryKey: ['event-types'],
    queryFn: () => api<{ data: EventTypeOption[] }>('/events/event-types'),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['booking-accounts'],
    queryFn: () => api<{ data: { data: AccountOption[] } }>('/booking/accounts'),
  });

  const accounts = accountsData?.data?.data ?? [];

  const typeOptions = useMemo(
    () =>
      (typesData?.data ?? []).map((type) => ({
        value: String(type.id),
        label: `${type.name} (${type.code})`,
      })),
    [typesData?.data],
  );

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: String(account.id),
        label: account.name,
      })),
    [accounts],
  );

  return (
    <ResourcePage
      title="Events"
      description="Venue events across the pipeline, from opportunity through completion."
      queryKey="events-list"
      endpoint="/events/events"
      initialForm={{
        name: '',
        event_type_id: '',
        status: 'confirmed',
        account_id: '',
        contact_id: '',
        value: '0',
        starts_at: '',
        ends_at: '',
        venue_space: '',
        expected_attendance: '',
      }}
      fields={[
        { name: 'name', label: 'Event name', required: true },
        {
          name: 'event_type_id',
          label: 'Event type',
          required: true,
          options: typeOptions,
        },
        { name: 'status', label: 'Status', options: EVENT_STATUSES },
        {
          name: 'account_id',
          label: 'Account',
          options: accountOptions,
          clears: ['contact_id'],
        },
        {
          name: 'contact_id',
          label: 'Contact',
          options: (form) => {
            const account = accounts.find((row) => String(row.id) === form.account_id);
            return (account?.contacts ?? []).map((contact) => ({
              value: String(contact.id),
              label: contactLabel(contact),
            }));
          },
          disabled: (form) => !form.account_id,
        },
        { name: 'value', label: 'Value', type: 'number' },
        { name: 'starts_at', label: 'Starts at', type: 'datetime-local', required: true },
        { name: 'ends_at', label: 'Ends at', type: 'datetime-local', required: true },
        { name: 'venue_space', label: 'Venue space' },
        { name: 'expected_attendance', label: 'Expected attendance', type: 'number' },
      ]}
      transformPayload={(form) => ({
        ...form,
        event_type_id: form.event_type_id ? Number(form.event_type_id) : null,
        account_id: form.account_id ? Number(form.account_id) : null,
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        value: Number(form.value || 0),
        expected_attendance: form.expected_attendance
          ? Number(form.expected_attendance)
          : null,
      })}
      columns={[
        { key: 'name', label: 'Name' },
        {
          key: 'account',
          label: 'Account',
          render: (row: any) => row.account?.name ?? '—',
        },
        {
          key: 'event_type',
          label: 'Type',
          render: (row: any) =>
            row.event_type ? (
              <span
                className="inline-flex rounded px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: row.event_type.background_color,
                  color: row.event_type.text_color,
                }}
              >
                {row.event_type.name}
              </span>
            ) : (
              '—'
            ),
        },
        {
          key: 'status',
          label: 'Status',
          render: (row: any) =>
            row.status === 'confirmed' ? (
              <span className="rounded bg-accent/30 px-2 py-0.5 text-xs font-medium">
                Confirmed
              </span>
            ) : row.status === 'opportunity' ? (
              <span className="rounded bg-support px-2 py-0.5 text-xs font-medium text-primary">
                Opportunity
              </span>
            ) : (
              <span className="capitalize">{row.status}</span>
            ),
        },
        {
          key: 'value',
          label: 'Value',
          render: (row: any) =>
            Number(row.value ?? 0).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
        {
          key: 'starts_at',
          label: 'Starts',
          render: (row: any) => formatDateTime(row.starts_at, { wallClock: true }),
        },
        { key: 'venue_space', label: 'Space' },
      ]}
      detailTo={(row) => `/events/events/${row.id}`}
    />
  );
}
