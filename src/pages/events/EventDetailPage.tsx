import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { DetailShell, StatusBadge } from '../../components/detail/DetailShell';
import { Field, FieldGrid, FieldGroup, ReadField, inputClass, selectClassName } from '../../components/detail/FieldGroup';
import { HorizontalTimeline, type TimelineItem } from '../../components/detail/HorizontalTimeline';
import { DetailSection } from '../../components/detail/DetailSection';
import { RelatedTable } from '../../components/detail/RelatedTable';
import { RowDeleteButton } from '../../components/detail/RowDeleteButton';
import { EntityChecklists } from '../../components/checklists/EntityChecklists';
import { EntityDocuments } from '../../components/documents/EntityDocuments';
import { ActionButton, ActionLink } from '../../components/ui/ActionButton';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import { emptyToNull, parseWallClockDateTime, toDateTimeLocalValue } from '../../lib/datetimeInput';
import { EVENT_STATUSES } from '../../lib/eventStatuses';
import { formatDateTime } from '../../lib/formatDateTime';
import { useNavBack, withReturnTo } from '../../lib/navContext';

const money = (n: number) =>
  Number(n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

const SECTIONS = [
  { id: 'details', label: 'Details' },
  { id: 'vips', label: 'VIPs' },
  { id: 'related', label: 'Related' },
  { id: 'notes', label: 'Notes' },
  { id: 'documents', label: 'Documents' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'history', label: 'History' },
] as const;

type NoteForm = {
  body: string;
  contact_id: string;
};

const emptyNoteForm: NoteForm = { body: '', contact_id: '' };

type SectionId = (typeof SECTIONS)[number]['id'];

const LEGACY_DETAIL_SECTIONS = new Set(['overview', 'schedule', 'commercial', 'planner']);

function resolveSection(raw: string | null): SectionId {
  if (!raw || LEGACY_DETAIL_SECTIONS.has(raw)) return 'details';
  if (SECTIONS.some((s) => s.id === raw)) return raw as SectionId;
  return 'details';
}

function buildTimeline(record: any): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (record.load_in_at) {
    items.push({
      key: 'load-in',
      when: record.load_in_at,
      label: 'Load in',
      kind: 'Load in',
    });
  }
  if (record.starts_at) {
    items.push({
      key: 'event',
      when: record.starts_at,
      end: record.ends_at,
      label: record.name || 'Event',
      kind: 'Event',
    });
  }
  if (record.load_out_at) {
    items.push({
      key: 'load-out',
      when: record.load_out_at,
      label: 'Load out',
      kind: 'Load out',
    });
  }

  for (const fn of record.functions ?? []) {
    if (!fn.starts_at) continue;
    items.push({
      key: `function-${fn.id}`,
      when: fn.starts_at,
      end: fn.ends_at,
      label: fn.name || 'Function',
      kind: 'Function',
      href: withReturnTo(`/events/functions/${fn.id}`, `/events/events/${record.id}`, 'event'),
    });
  }

  for (const order of record.service_orders ?? []) {
    if (!order.service_at) continue;
    items.push({
      key: `service-${order.id}`,
      when: order.service_at,
      label: order.title || order.service_type || 'Service order',
      kind: 'Service order',
      href: withReturnTo(
        `/events/service-orders/${order.id}`,
        `/events/events/${record.id}`,
        'event',
      ),
    });
  }

  return items.sort((a, b) => {
    const left = parseWallClockDateTime(a.when)?.getTime() ?? 0;
    const right = parseWallClockDateTime(b.when)?.getTime() ?? 0;
    return left - right;
  });
}

function contactLabel(contact: { first_name?: string; last_name?: string }) {
  return `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Unnamed contact';
}

function recordToForm(record: any): Record<string, string> {
  return {
    name: String(record.name ?? ''),
    status: String(record.status ?? ''),
    event_type_id: record.event_type_id != null ? String(record.event_type_id) : '',
    account_id: record.account_id != null ? String(record.account_id) : '',
    contact_id: record.contact_id != null ? String(record.contact_id) : '',
    purpose: String(record.purpose ?? ''),
    description: String(record.description ?? ''),
    value: String(record.value ?? '0'),
    client_venue_budget: record.client_venue_budget != null ? String(record.client_venue_budget) : '',
    starts_at: toDateTimeLocalValue(record.starts_at),
    ends_at: toDateTimeLocalValue(record.ends_at),
    load_in_at: toDateTimeLocalValue(record.load_in_at),
    load_out_at: toDateTimeLocalValue(record.load_out_at),
    venue_space: String(record.venue_space ?? ''),
    expected_attendance:
      record.expected_attendance != null ? String(record.expected_attendance) : '',
    alcohol_served: record.alcohol_served ? '1' : '0',
    referral: String(record.referral ?? ''),
    planner_name: String(record.planner_name ?? ''),
    planner_title: String(record.planner_title ?? ''),
    planner_organization: String(record.planner_organization ?? ''),
    planner_email: String(record.planner_email ?? ''),
    planner_phone: String(record.planner_phone ?? ''),
  };
}

export function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const section = resolveSection(searchParams.get('section'));
  const nav = useNavBack('/events/events', 'Back to events');

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['event', id ?? ''],
    queryFn: () => api<{ data: any }>(`/events/events/${id}`),
  });

  const { data: typesData } = useQuery({
    queryKey: ['event-types'],
    queryFn: () =>
      api<{
        data: Array<{
          id: number;
          code: string;
          name: string;
          background_color: string;
          text_color: string;
        }>;
      }>('/events/event-types'),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['booking-accounts'],
    queryFn: () =>
      api<{
        data: {
          data: Array<{
            id: number;
            name: string;
            contacts?: Array<{ id: number; first_name?: string; last_name?: string }>;
          }>;
        };
      }>('/booking/accounts'),
  });

  const record = data?.data;
  const eventTypes = typesData?.data ?? [];
  const accounts = accountsData?.data?.data ?? [];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [relatedTab, setRelatedTab] = useState<'functions' | 'service_orders' | 'proposals' | 'contracts'>(
    'functions',
  );
  const [noteForm, setNoteForm] = useState<NoteForm>(emptyNoteForm);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  function closeNoteForm() {
    setNoteFormOpen(false);
    setEditingNoteId(null);
    setNoteForm(emptyNoteForm);
    setNoteError(null);
  }

  function openCreateNote() {
    setEditingNoteId(null);
    setNoteForm(emptyNoteForm);
    setNoteError(null);
    setNoteFormOpen(true);
  }

  function openEditNote(note: any) {
    setEditingNoteId(note.id);
    setNoteForm({
      body: String(note.body ?? ''),
      contact_id: note.contact_id ? String(note.contact_id) : '',
    });
    setNoteError(null);
    setNoteFormOpen(true);
  }

  useEffect(() => {
    if (record) setForm(recordToForm(record));
  }, [record]);

  const timeline = useMemo(() => (record ? buildTimeline(record) : []), [record]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api(`/events/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          event_type_id: form.event_type_id ? Number(form.event_type_id) : null,
          account_id: form.account_id ? Number(form.account_id) : null,
          contact_id: form.contact_id ? Number(form.contact_id) : null,
          value: Number(form.value || 0),
          client_venue_budget: form.client_venue_budget
            ? Number(form.client_venue_budget)
            : null,
          expected_attendance: form.expected_attendance
            ? Number(form.expected_attendance)
            : null,
          alcohol_served: form.alcohol_served === '1',
          load_in_at: emptyToNull(form.load_in_at),
          load_out_at: emptyToNull(form.load_out_at),
        }),
      }),
    onSuccess: async () => {
      setEditing(false);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['event', id ?? ''] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/events/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => navigate(nav.deleteRedirectTo),
    onError: (err: Error) => setError(err.message),
  });

  const saveNoteMutation = useMutation({
    mutationFn: () => {
      const payload = {
        body: noteForm.body,
        contact_id: noteForm.contact_id ? Number(noteForm.contact_id) : null,
      };
      if (editingNoteId) {
        return api(`/events/events/${id}/notes/${editingNoteId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(`/events/events/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      closeNoteForm();
      await qc.invalidateQueries({ queryKey: ['event', id ?? ''] });
    },
    onError: (err: Error) => setNoteError(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) =>
      api(`/events/events/${id}/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: async (_data, noteId) => {
      if (editingNoteId === noteId) closeNoteForm();
      await qc.invalidateQueries({ queryKey: ['event', id ?? ''] });
    },
    onError: (err: Error) => setNoteError(err.message),
  });

  function setSection(next: SectionId) {
    setSearchParams(next === 'details' ? {} : { section: next });
  }

  function setField(name: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'account_id' && value !== prev.account_id) {
        next.contact_id = '';
      }
      return next;
    });
  }

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (loadError || !record) {
    return (
      <div>
        <Link to={nav.backTo} className="text-sm text-primary hover:underline">
          ← {nav.backLabel}
        </Link>
        <p className="mt-4 text-sm text-red-600">
          {(loadError as Error | undefined)?.message ?? 'Event not found.'}
        </p>
      </div>
    );
  }

  const dignitaries = record.dignitaries ?? [];
  const functions = record.functions ?? [];
  const serviceOrders = record.service_orders ?? [];
  const proposals = record.proposals ?? [];
  const contracts = record.contracts ?? [];
  const changes = record.changes ?? [];
  const notes = record.notes ?? [];
  const accountContacts = record.account?.contacts ?? [];
  const accountOptions = [
    ...accounts,
    ...(record.account && !accounts.some((account) => account.id === record.account.id)
      ? [record.account]
      : []),
  ];
  const selectedAccount =
    accountOptions.find((account) => String(account.id) === form.account_id) ?? null;
  const formAccountContacts = selectedAccount?.contacts ?? [];

  return (
    <DetailShell
      backTo={nav.backTo}
      backLabel={nav.backLabel}
      title={record.name}
      subtitle={`ID ${record.id}${record.account ? ` · ${record.account.name}` : ''}`}
      badge={<StatusBadge>{record.status}</StatusBadge>}
      actions={
        section === 'details' ? (
          <>
            {!editing ? (
              <ActionButton onClick={() => setEditing(true)}>Edit</ActionButton>
            ) : (
              <>
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    setForm(recordToForm(record));
                    setError(null);
                  }}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? 'Saving…' : 'Save changes'}
                </ActionButton>
              </>
            )}
            <ActionButton
              variant="danger"
              onClick={() => {
                if (window.confirm('Delete this event?')) deleteMutation.mutate();
              }}
            >
              Delete
            </ActionButton>
          </>
        ) : undefined
      }
      sections={SECTIONS.map((s) => ({
        ...s,
        count:
          s.id === 'vips'
            ? dignitaries.length
            : s.id === 'related'
              ? functions.length + serviceOrders.length + proposals.length + contracts.length
              : s.id === 'notes'
                ? notes.length
                : s.id === 'history'
                  ? changes.length
                  : undefined,
      }))}
      activeSection={section}
      onSectionChange={(id) => setSection(id as SectionId)}
      aside={
        section === 'details' ? (
          <HorizontalTimeline items={timeline} title="Event timeline" />
        ) : undefined
      }
    >
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {section === 'details' && (
        <div className="space-y-4">
          <FieldGroup title="Overview" description="Core event details and venue context.">
            {editing ? (
              <FieldGrid>
                <Field label="Name">
                  <input className={inputClass} value={form.name} required onChange={(e) => setField('name', e.target.value)} />
                </Field>
                <Field label="Type">
                  <select
                    className={selectClassName}
                    value={form.event_type_id}
                    required
                    onChange={(e) => setField('event_type_id', e.target.value)}
                  >
                    <option value="">Select type…</option>
                    {eventTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.code})
                      </option>
                    ))}
                    {record.event_type &&
                    !eventTypes.some((type) => type.id === record.event_type.id) ? (
                      <option value={record.event_type.id}>
                        {record.event_type.name} ({record.event_type.code})
                      </option>
                    ) : null}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={selectClassName} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    {EVENT_STATUSES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Purpose" wide>
                  <input className={inputClass} value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} />
                </Field>
                <Field label="Description" wide>
                  <textarea
                    className={`${inputClass} min-h-28`}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </Field>
                <Field label="Venue space">
                  <input className={inputClass} value={form.venue_space} onChange={(e) => setField('venue_space', e.target.value)} />
                </Field>
                <Field label="Expected attendance">
                  <input
                    type="number"
                    className={inputClass}
                    value={form.expected_attendance}
                    onChange={(e) => setField('expected_attendance', e.target.value)}
                  />
                </Field>
                <Field label="Alcohol being served" wide>
                  <label className="mt-1 inline-flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={form.alcohol_served === '1'}
                      onChange={(e) => setField('alcohol_served', e.target.checked ? '1' : '0')}
                    />
                    Alcohol will be served
                  </label>
                </Field>
                <Field label="Account">
                  <select
                    className={selectClassName}
                    value={form.account_id}
                    onChange={(e) => setField('account_id', e.target.value)}
                  >
                    <option value="">Select account…</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Contact">
                  <select
                    className={selectClassName}
                    value={form.contact_id}
                    onChange={(e) => setField('contact_id', e.target.value)}
                    disabled={!form.account_id}
                  >
                    <option value="">
                      {form.account_id ? 'Select contact…' : 'Select an account first'}
                    </option>
                    {formAccountContacts.map((contact: any) => (
                      <option key={contact.id} value={contact.id}>
                        {contactLabel(contact)}
                      </option>
                    ))}
                    {form.contact_id &&
                    record.contact &&
                    String(record.contact.id) === form.contact_id &&
                    !formAccountContacts.some((contact: any) => String(contact.id) === form.contact_id) ? (
                      <option value={record.contact.id}>{contactLabel(record.contact)}</option>
                    ) : null}
                  </select>
                </Field>
              </FieldGrid>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Name" value={record.name} />
                <ReadField
                  label="Type"
                  value={
                    record.event_type ? (
                      <span
                        className="inline-flex rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: record.event_type.background_color,
                          color: record.event_type.text_color,
                        }}
                      >
                        {record.event_type.name}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                />
                <ReadField label="Status" value={<span className="capitalize">{record.status}</span>} />
                <ReadField label="Purpose" value={record.purpose} wide />
                <ReadField
                  label="Description"
                  value={
                    record.description ? (
                      <span className="whitespace-pre-wrap">{record.description}</span>
                    ) : null
                  }
                  wide
                />
                <ReadField label="Venue space" value={record.venue_space} />
                <ReadField label="Expected attendance" value={record.expected_attendance} />
                <ReadField label="Alcohol being served" value={record.alcohol_served ? 'Yes' : 'No'} />
                <ReadField
                  label="Account"
                  value={
                    record.account ? (
                      <Link
                        to={`/booking/accounts/${record.account.id}`}
                        className="font-medium text-slate-900 no-underline"
                      >
                        {record.account.name}
                      </Link>
                    ) : (
                      record.account_id
                    )
                  }
                />
                <ReadField
                  label="Contact"
                  value={
                    record.contact ? (
                      <Link
                        to={`/booking/contacts/${record.contact.id}`}
                        className="font-medium text-slate-900 no-underline"
                      >
                        {contactLabel(record.contact)}
                      </Link>
                    ) : (
                      record.contact_id
                    )
                  }
                />
              </dl>
            )}
          </FieldGroup>

          <FieldGroup title="Schedule" description="Event window plus load in and load out.">
            {editing ? (
              <FieldGrid>
                <Field label="Starts at">
                  <DateTimePicker value={form.starts_at} onChange={(next) => setField('starts_at', next)} required />
                </Field>
                <Field label="Ends at">
                  <DateTimePicker
                    value={form.ends_at}
                    defaultDate={form.starts_at || undefined}
                    onChange={(next) => setField('ends_at', next)}
                    required
                  />
                </Field>
                <Field label="Load in">
                  <DateTimePicker
                    value={form.load_in_at}
                    defaultDate={form.starts_at || undefined}
                    onChange={(next) => setField('load_in_at', next)}
                  />
                </Field>
                <Field label="Load out">
                  <DateTimePicker
                    value={form.load_out_at}
                    defaultDate={form.starts_at || form.ends_at || undefined}
                    onChange={(next) => setField('load_out_at', next)}
                  />
                </Field>
              </FieldGrid>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Starts at" value={formatDateTime(record.starts_at, { wallClock: true })} />
                <ReadField label="Ends at" value={formatDateTime(record.ends_at, { wallClock: true })} />
                <ReadField label="Load in" value={formatDateTime(record.load_in_at, { wallClock: true })} />
                <ReadField label="Load out" value={formatDateTime(record.load_out_at, { wallClock: true })} />
              </dl>
            )}
          </FieldGroup>

          <FieldGroup title="Commercial" description="Budget, contract value, and referral source.">
            {editing ? (
              <FieldGrid>
                <Field label="Value">
                  <input type="number" className={inputClass} value={form.value} onChange={(e) => setField('value', e.target.value)} />
                </Field>
                <Field label="Client venue budget">
                  <input
                    type="number"
                    className={inputClass}
                    value={form.client_venue_budget}
                    onChange={(e) => setField('client_venue_budget', e.target.value)}
                  />
                </Field>
                <Field label="Referral" wide>
                  <input className={inputClass} value={form.referral} onChange={(e) => setField('referral', e.target.value)} />
                </Field>
              </FieldGrid>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Value" value={money(record.value)} />
                <ReadField
                  label="Client venue budget"
                  value={
                    record.client_venue_budget != null ? money(record.client_venue_budget) : null
                  }
                />
                <ReadField label="Referral" value={record.referral} wide />
              </dl>
            )}
          </FieldGroup>

          <FieldGroup title="Third-party planner" description="External planner contact details.">
            {editing ? (
              <FieldGrid>
                <Field label="Name">
                  <input className={inputClass} value={form.planner_name} onChange={(e) => setField('planner_name', e.target.value)} />
                </Field>
                <Field label="Title">
                  <input className={inputClass} value={form.planner_title} onChange={(e) => setField('planner_title', e.target.value)} />
                </Field>
                <Field label="Organization" wide>
                  <input
                    className={inputClass}
                    value={form.planner_organization}
                    onChange={(e) => setField('planner_organization', e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputClass} value={form.planner_email} onChange={(e) => setField('planner_email', e.target.value)} />
                </Field>
                <Field label="Phone">
                  <input className={inputClass} value={form.planner_phone} onChange={(e) => setField('planner_phone', e.target.value)} />
                </Field>
              </FieldGrid>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Name" value={record.planner_name} />
                <ReadField label="Title" value={record.planner_title} />
                <ReadField label="Organization" value={record.planner_organization} wide />
                <ReadField label="Email" value={record.planner_email} />
                <ReadField label="Phone" value={record.planner_phone} />
              </dl>
            )}
          </FieldGroup>
        </div>
      )}

      {section === 'vips' && (
        <EventDignitariesPanel
          eventId={record.id}
          dignitaries={dignitaries}
          onDone={() => void qc.invalidateQueries({ queryKey: ['event', id ?? ''] })}
        />
      )}

      {section === 'related' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(
              [
                ['functions', `Functions (${functions.length})`],
                ['service_orders', `Service orders (${serviceOrders.length})`],
                ['proposals', `Proposals (${proposals.length})`],
                ['contracts', `Contracts (${contracts.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={[
                  'rounded-lg px-3 py-1.5 text-sm',
                  relatedTab === key ? 'bg-primary text-white' : 'text-slate-600 hover:bg-support/50',
                ].join(' ')}
                onClick={() => setRelatedTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {relatedTab === 'functions' && (
            <RelatedTable
              title="Functions"
              rows={functions}
              emptyText="No functions yet."
              headerAction={
                <ActionLink to="/events/functions" size="sm">
                  Manage functions
                </ActionLink>
              }
              getRowLink={(row) =>
                withReturnTo(`/events/functions/${row.id}`, `/events/events/${record.id}`, 'event')
              }
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'status', label: 'Status' },
                {
                  key: 'starts_at',
                  label: 'Starts',
                  render: (row) => formatDateTime(row.starts_at, { wallClock: true }),
                },
              ]}
            />
          )}
          {relatedTab === 'service_orders' && (
            <RelatedTable
              title="Service orders"
              rows={serviceOrders}
              emptyText="No service orders yet."
              getRowLink={(row) =>
                withReturnTo(
                  `/events/service-orders/${row.id}`,
                  `/events/events/${record.id}`,
                  'event',
                )
              }
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'status', label: 'Status' },
                { key: 'service_type', label: 'Type' },
                {
                  key: 'service_at',
                  label: 'When',
                  render: (row) => formatDateTime(row.service_at, { wallClock: true }),
                },
              ]}
            />
          )}
          {relatedTab === 'proposals' && (
            <RelatedTable
              title="Proposals"
              rows={proposals}
              emptyText="No proposals yet."
              headerAction={
                <ActionLink
                  to={withReturnTo(
                    `/booking/proposals/new?event_id=${record.id}`,
                    `/events/events/${record.id}`,
                    'event',
                  )}
                  size="sm"
                >
                  New proposal
                </ActionLink>
              }
              getRowLink={(row) =>
                withReturnTo(`/booking/proposals/${row.id}`, `/events/events/${record.id}`, 'event')
              }
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'status', label: 'Status' },
                { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
              ]}
            />
          )}
          {relatedTab === 'contracts' && (
            <RelatedTable
              title="Contracts"
              rows={contracts}
              emptyText="No contracts yet."
              getRowLink={(row) =>
                withReturnTo(`/booking/contracts/${row.id}`, `/events/events/${record.id}`, 'event')
              }
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'status', label: 'Status' },
                { key: 'amount', label: 'Amount', render: (row) => money(row.amount) },
              ]}
            />
          )}
        </div>
      )}

      {section === 'notes' && (
        <DetailSection
          title="Notes"
          action={
            !noteFormOpen ? (
              <ActionButton size="sm" onClick={openCreateNote}>
                Add note
              </ActionButton>
            ) : null
          }
        >
          {noteFormOpen && (
            <form
              className="space-y-3 border-b border-slate-100 px-4 py-4"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                saveNoteMutation.mutate();
              }}
            >
              <Field label="Note" wide>
                <textarea
                  required
                  className={`${inputClass} min-h-24`}
                  value={noteForm.body}
                  onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
                />
              </Field>
              <Field label="Related contact" wide>
                <select
                  className={selectClassName}
                  value={noteForm.contact_id}
                  onChange={(e) => setNoteForm({ ...noteForm, contact_id: e.target.value })}
                >
                  <option value="">None</option>
                  {accountContacts.map((contact: any) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </option>
                  ))}
                </select>
              </Field>
              {noteError && <p className="text-sm text-red-600">{noteError}</p>}
              <div className="flex justify-end gap-2">
                <ActionButton variant="secondary" onClick={closeNoteForm}>
                  Cancel
                </ActionButton>
                <ActionButton type="submit" disabled={saveNoteMutation.isPending}>
                  {saveNoteMutation.isPending
                    ? 'Saving…'
                    : editingNoteId
                      ? 'Update note'
                      : 'Add note'}
                </ActionButton>
              </div>
            </form>
          )}

          {notes.length === 0 && !noteFormOpen ? (
            <p className="px-4 py-6 text-sm text-slate-500">No notes yet.</p>
          ) : null}
          <div className="divide-y divide-slate-100">
            {notes.map((note: any) => (
              <article
                key={note.id}
                className="flex cursor-pointer items-start gap-3 px-4 py-4 hover:bg-support/40"
                onClick={() => openEditNote(note)}
              >
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-text">{note.body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(note.created_at)}
                    {note.author?.name ? ` · ${note.author.name}` : ''}
                    {note.contact
                      ? ` · Contact: ${note.contact.first_name} ${note.contact.last_name}`
                      : ''}
                  </p>
                </div>
                <RowDeleteButton
                  label="Delete note"
                  confirmMessage="Delete this note?"
                  onDelete={() => deleteNoteMutation.mutate(note.id)}
                />
              </article>
            ))}
          </div>
        </DetailSection>
      )}

      {section === 'documents' && id ? (
        <EntityDocuments
          type="event"
          recordId={id}
          defaultTo={record.contact?.email || record.planner_email || record.account?.email || ''}
        />
      ) : null}

      {section === 'checklists' && id ? (
        <EntityChecklists type="event" recordId={id} />
      ) : null}

      {section === 'history' && (
        <RelatedTable
          title="Change log"
          rows={changes}
          emptyText="No changes logged yet."
          columns={[
            { key: 'summary', label: 'Summary' },
            { key: 'field', label: 'Field' },
            {
              key: 'created_at',
              label: 'When',
              render: (row) => formatDateTime(row.created_at, { seconds: true }),
            },
          ]}
        />
      )}
    </DetailShell>
  );
}

function EventDignitariesPanel({
  eventId,
  dignitaries,
  onDone,
}: {
  eventId: number;
  dignitaries: any[];
  onDone: () => void;
}) {
  const emptyForm = { name: '', title: '', organization: '' };
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(row: any) {
    setEditingId(row.id);
    setForm({
      name: row.name ?? '',
      title: row.title ?? '',
      organization: row.organization ?? '',
    });
    setError(null);
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingId) {
        return api(`/events/events/${eventId}/dignitaries/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      }
      return api(`/events/events/${eventId}/dignitaries`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
    },
    onSuccess: () => {
      closeForm();
      onDone();
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (dignitaryId: number) =>
      api(`/events/events/${eventId}/dignitaries/${dignitaryId}`, { method: 'DELETE' }),
    onSuccess: onDone,
    onError: (err: Error) => setError(err.message),
  });

  return (
    <DetailSection
      title="VIPs"
      action={
        !formOpen ? (
          <ActionButton size="sm" onClick={openCreate}>
            Add VIP
          </ActionButton>
        ) : null
      }
    >
      {formOpen && (
        <form
          className="space-y-3 border-b border-slate-100 px-4 py-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <FieldGrid>
            <Field label="Name">
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Title">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Organization" wide>
              <input
                className={inputClass}
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
              />
            </Field>
          </FieldGrid>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <ActionButton variant="secondary" onClick={closeForm}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Add VIP'}
            </ActionButton>
          </div>
        </form>
      )}

      <RelatedTable
        bare
        rows={dignitaries}
        emptyText="No dignitaries or VIPs listed yet."
        onRowClick={openEdit}
        onRowDelete={(row) => {
          deleteMutation.mutate(row.id);
          if (editingId === row.id) closeForm();
        }}
        deleteConfirmMessage="Delete this dignitary?"
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'title', label: 'Title' },
          { key: 'organization', label: 'Organization' },
        ]}
      />
    </DetailSection>
  );
}
