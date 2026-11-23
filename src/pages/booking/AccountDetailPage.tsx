import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import {
  AddressFields,
  accountAddressKeys,
  formatAddressLines,
} from '../../components/AddressFields';
import { DetailShell, StatusBadge } from '../../components/detail/DetailShell';
import { Field, FieldGrid, FieldGroup, ReadField, inputClass, selectClassName } from '../../components/detail/FieldGroup';
import { DetailSection } from '../../components/detail/DetailSection';
import { RelatedTable } from '../../components/detail/RelatedTable';
import { RowDeleteButton } from '../../components/detail/RowDeleteButton';
import { EntityChecklists } from '../../components/checklists/EntityChecklists';
import { EntityDocuments } from '../../components/documents/EntityDocuments';
import { ActionButton, ActionLink } from '../../components/ui/ActionButton';
import { formatDateTime } from '../../lib/formatDateTime';
import { useNavBack, withReturnTo } from '../../lib/navContext';

type Tab = 'overview' | 'contacts' | 'events' | 'notes' | 'documents' | 'checklists';

type NoteForm = {
  body: string;
  contact_id: string;
  event_id: string;
};

const emptyNoteForm: NoteForm = { body: '', contact_id: '', event_id: '' };

const money = (n: number) =>
  Number(n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const rawTab = searchParams.get('tab');
  const tab: Tab =
    rawTab === 'account' || rawTab === 'overview' || !rawTab
      ? 'overview'
      : (rawTab as Tab);
  const nav = useNavBack('/booking/accounts', 'Back to accounts');

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['booking-account', id ?? ''],
    queryFn: () => api<{ data: any }>(`/booking/accounts/${id}`),
  });

  const record = data?.data;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});
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
      event_id: note.event_id ? String(note.event_id) : '',
    });
    setNoteError(null);
    setNoteFormOpen(true);
  }

  useEffect(() => {
    if (!record) return;
    setForm({
      name: String(record.name ?? ''),
      type: String(record.type ?? ''),
      email: String(record.email ?? ''),
      phone: String(record.phone ?? ''),
      website: String(record.website ?? ''),
      billing_address: String(record.billing_address ?? ''),
      address_2: String(record.address_2 ?? ''),
      city: String(record.city ?? ''),
      state: String(record.state ?? ''),
      postal_code: String(record.postal_code ?? ''),
      country: String(record.country ?? ''),
    });
  }, [record]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api(`/booking/accounts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: async () => {
      setEditing(false);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['booking-account', id ?? ''] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/booking/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => navigate('/booking/accounts'),
    onError: (err: Error) => setError(err.message),
  });

  const saveNoteMutation = useMutation({
    mutationFn: () => {
      const payload = {
        body: noteForm.body,
        contact_id: noteForm.contact_id ? Number(noteForm.contact_id) : null,
        event_id: noteForm.event_id ? Number(noteForm.event_id) : null,
      };
      if (editingNoteId) {
        return api(`/booking/accounts/${id}/notes/${editingNoteId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(`/booking/accounts/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      closeNoteForm();
      await qc.invalidateQueries({ queryKey: ['booking-account', id ?? ''] });
    },
    onError: (err: Error) => setNoteError(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) =>
      api(`/booking/accounts/${id}/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: async (_data, noteId) => {
      if (editingNoteId === noteId) closeNoteForm();
      await qc.invalidateQueries({ queryKey: ['booking-account', id ?? ''] });
    },
    onError: (err: Error) => setNoteError(err.message),
  });

  function setTab(next: Tab) {
    setSearchParams(next === 'overview' ? {} : { tab: next });
  }

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (loadError || !record) {
    return (
      <div>
        <Link to="/booking/accounts" className="text-sm text-primary hover:underline">
          ← Back to accounts
        </Link>
        <p className="mt-4 text-sm text-red-600">
          {(loadError as Error | undefined)?.message ?? 'Account not found.'}
        </p>
      </div>
    );
  }

  const contacts = record.contacts ?? [];
  const events = record.events ?? [];
  const notes = record.notes ?? [];
  const addressLines = formatAddressLines(record, accountAddressKeys, record.country);

  return (
    <DetailShell
      backTo={nav.backTo}
      backLabel={nav.backLabel}
      title={record.name}
      subtitle={`ID ${record.id}${record.type ? ` · ${record.type}` : ''}`}
      badge={record.city || record.state ? <StatusBadge>{[record.city, record.state].filter(Boolean).join(', ')}</StatusBadge> : undefined}
      actions={
        <>
          {tab === 'overview' && !editing && (
            <ActionButton onClick={() => setEditing(true)}>Edit</ActionButton>
          )}
          {tab === 'overview' && editing && (
            <>
              <ActionButton variant="secondary" onClick={() => setEditing(false)}>
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
          {tab === 'overview' ? (
            <ActionButton
              variant="danger"
              onClick={() => {
                if (window.confirm('Delete this account?')) deleteMutation.mutate();
              }}
            >
              Delete
            </ActionButton>
          ) : null}
        </>
      }
      sections={[
        { id: 'overview', label: 'Overview' },
        { id: 'contacts', label: 'Contacts', count: contacts.length },
        { id: 'events', label: 'Events', count: events.length },
        { id: 'notes', label: 'Notes', count: notes.length },
        { id: 'documents', label: 'Documents' },
        { id: 'checklists', label: 'Checklists' },
      ]}
      activeSection={tab}
      onSectionChange={(id) => setTab(id as Tab)}
    >
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {tab === 'overview' && (
        <div className="space-y-4">
          <FieldGroup title="Profile" description="Organization identity and contact channels.">
            {editing ? (
              <FieldGrid>
                <Field label="Account name">
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Type">
                  <input
                    className={inputClass}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="Website" wide>
                  <input
                    className={inputClass}
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <ReadField label="Name" value={record.name} />
                <ReadField label="Type" value={record.type} />
                <ReadField label="Email" value={record.email} />
                <ReadField label="Phone" value={record.phone} />
                <ReadField label="Website" value={record.website} wide />
              </dl>
            )}
          </FieldGroup>

          <FieldGroup title="Address" description="Billing and mailing location.">
            {editing ? (
              <div className="space-y-2">
                <AddressFields
                  values={form}
                  keys={accountAddressKeys}
                  onChange={(patch) => setForm({ ...form, ...patch })}
                />
                <input
                  className={inputClass}
                  value={form.country ?? ''}
                  placeholder="Country"
                  aria-label="Country"
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            ) : (
              <div className="text-sm text-text">
                {addressLines.length === 0 ? (
                  '—'
                ) : (
                  <div className="space-y-0.5">
                    {addressLines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FieldGroup>
        </div>
      )}

      {tab === 'contacts' && (
        <RelatedTable
          title="Contacts"
          rows={contacts}
          emptyText="No contacts yet."
          headerAction={
            <ActionLink
              to={withReturnTo(
                `/booking/contacts/new?account_id=${record.id}`,
                `/booking/accounts/${record.id}`,
                'account',
              )}
              size="sm"
            >
              Add contact
            </ActionLink>
          }
          getRowLink={(row) =>
            withReturnTo(`/booking/contacts/${row.id}`, `/booking/accounts/${record.id}`, 'account')
          }
          columns={[
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
          ]}
        />
      )}

      {tab === 'events' && (
        <DetailSection
          title="Events"
          action={
            <ActionLink to="/events/events" size="sm">
              View all events
            </ActionLink>
          }
        >
          {events.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No events yet.</p>
          ) : null}
          {events.map((event: any, index: number) => {
            const open = expandedEvents[event.id] ?? false;
            const proposals = event.proposals ?? [];
            const contracts = event.contracts ?? [];
            return (
              <div
                key={event.id}
                className={index > 0 ? 'border-t border-slate-100' : undefined}
              >
                <div className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-support/30">
                  <Link
                    to={withReturnTo(
                      `/events/events/${event.id}`,
                      `/booking/accounts/${record.id}`,
                      'account',
                    )}
                    className="min-w-0 flex-1 no-underline"
                  >
                    <p className="text-sm font-medium text-slate-900">{event.name}</p>
                    <p className="text-xs text-slate-500">
                      {event.status}
                      {' · '}
                      {money(event.value)}
                      {' · '}
                      {event.starts_at ? formatDateTime(event.starts_at, { wallClock: true }) : 'No start'}
                      {' · '}
                      {`${proposals.length} proposal${proposals.length === 1 ? '' : 's'}`}
                      {' · '}
                      {`${contracts.length} contract${contracts.length === 1 ? '' : 's'}`}
                    </p>
                  </Link>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-slate-500"
                    onClick={() =>
                      setExpandedEvents((prev) => ({ ...prev, [event.id]: !open }))
                    }
                  >
                    {open ? 'Hide' : 'Show'}
                  </button>
                </div>
                {open && (
                  <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                    <RelatedTable
                      title="Proposals"
                      rows={proposals}
                      emptyText="No proposals yet."
                      headerAction={
                        <ActionLink
                          to={withReturnTo(
                            `/booking/proposals/new?event_id=${event.id}`,
                            `/booking/accounts/${record.id}`,
                            'account',
                          )}
                          size="sm"
                        >
                          New proposal
                        </ActionLink>
                      }
                      getRowLink={(row) =>
                        withReturnTo(
                          `/booking/proposals/${row.id}`,
                          `/booking/accounts/${record.id}`,
                          'account',
                        )
                      }
                      columns={[
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        {
                          key: 'amount',
                          label: 'Amount',
                          render: (row) => money(row.amount),
                        },
                      ]}
                    />
                    <RelatedTable
                      title="Contracts"
                      rows={contracts}
                      emptyText="No contracts yet."
                      getRowLink={(row) =>
                        withReturnTo(
                          `/booking/contracts/${row.id}`,
                          `/booking/accounts/${record.id}`,
                          'account',
                        )
                      }
                      columns={[
                        { key: 'title', label: 'Title' },
                        { key: 'status', label: 'Status' },
                        {
                          key: 'amount',
                          label: 'Amount',
                          render: (row) => money(row.amount),
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </DetailSection>
      )}

      {tab === 'notes' && (
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
              <FieldGrid>
                <Field label="Related contact">
                  <select
                    className={selectClassName}
                    value={noteForm.contact_id}
                    onChange={(e) => setNoteForm({ ...noteForm, contact_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {contacts.map((contact: any) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Related event">
                  <select
                    className={selectClassName}
                    value={noteForm.event_id}
                    onChange={(e) => setNoteForm({ ...noteForm, event_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {events.map((event: any) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </FieldGrid>
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
                    {note.event ? ` · Event: ${note.event.name}` : ''}
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

      {tab === 'documents' && id ? (
        <EntityDocuments
          type="account"
          recordId={id}
          defaultTo={
            record.email ||
            record.contacts?.find((c: any) => c.is_primary)?.email ||
            record.contacts?.[0]?.email ||
            ''
          }
        />
      ) : null}

      {tab === 'checklists' && id ? <EntityChecklists type="account" recordId={id} /> : null}
    </DetailShell>
  );
}
