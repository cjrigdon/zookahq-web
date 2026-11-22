import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { toDateTimeLocalValue } from '../lib/datetimeInput';
import { formatDateTime } from '../lib/formatDateTime';
import { useNavBack } from '../lib/navContext';
import { AddressFields, addressFieldValues, type AddressKeys } from './AddressFields';
import { DetailSection } from './detail/DetailSection';
import { RelatedTable } from './detail/RelatedTable';
import { ActionButton } from './ui/ActionButton';
import { DateTimePicker } from './ui/DateTimePicker';

export type DetailField = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  readOnly?: boolean;
  addressKeys?: AddressKeys;
};

export type RelatedColumn = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
};

export type RelatedSection = {
  title: string;
  rows: any[];
  columns: RelatedColumn[];
  getRowLink?: (row: any) => string;
  emptyText?: string;
  headerAction?: ReactNode;
};

type Props = {
  title: string | ((record: any) => string);
  backTo: string;
  backLabel: string;
  queryKey: string | string[];
  endpoint: string;
  fields: DetailField[];
  transformLoad?: (record: any) => Record<string, string>;
  transformSave?: (form: Record<string, string>, record: any) => Record<string, unknown>;
  related?: (record: any) => RelatedSection[];
  actions?: (record: any, helpers: { refresh: () => void }) => ReactNode;
  extra?: (record: any, helpers: { refresh: () => void }) => ReactNode;
  canDelete?: boolean;
  deleteRedirectTo?: string;
};

function toInputValue(value: unknown, type?: string): string {
  if (value == null) return '';
  if (type === 'datetime-local') {
    return toDateTimeLocalValue(value);
  }
  if (type === 'date') {
    return String(value).slice(0, 10);
  }
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

export function DetailRecord({
  title,
  backTo,
  backLabel,
  queryKey,
  endpoint,
  fields,
  transformLoad,
  transformSave,
  related,
  actions,
  extra,
  canDelete = true,
  deleteRedirectTo,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];
  const nav = useNavBack(backTo, backLabel);
  const resolvedBackTo = nav.backTo;
  const resolvedBackLabel = nav.backLabel;
  const resolvedDeleteTo = deleteRedirectTo ?? nav.deleteRedirectTo;

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: key,
    queryFn: () => api<{ data: any }>(endpoint),
  });

  const record = data?.data;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) return;
    if (transformLoad) {
      setForm(transformLoad(record));
      return;
    }
    const next: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === 'address' && field.addressKeys) {
        for (const key of Object.values(field.addressKeys)) {
          next[key] = toInputValue(record[key]);
        }
      } else {
        next[field.name] = toInputValue(record[field.name], field.type);
      }
    }
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when record identity changes
  }, [record]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api(endpoint, {
        method: 'PUT',
        body: JSON.stringify(
          transformSave ? transformSave(form, record) : form,
        ),
      }),
    onSuccess: async () => {
      setEditing(false);
      setError(null);
      await qc.invalidateQueries({ queryKey: key });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(endpoint, { method: 'DELETE' }),
    onSuccess: () => {
      navigate(resolvedDeleteTo);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (loadError || !record) {
    return (
      <div>
        <Link to={resolvedBackTo} className="text-sm text-primary hover:underline">
          ← {resolvedBackLabel}
        </Link>
        <p className="mt-4 text-sm text-red-600">
          {(loadError as Error | undefined)?.message ?? 'Record not found.'}
        </p>
      </div>
    );
  }

  const heading = typeof title === 'function' ? title(record) : title;
  const sections = related?.(record) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link to={resolvedBackTo} className="text-sm text-primary hover:underline">
          ← {resolvedBackLabel}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">{heading}</h2>
            <p className="text-sm text-slate-500">ID {record.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions?.(record, {
              refresh: () => void qc.invalidateQueries({ queryKey: key }),
            })}
            {!editing ? (
              <ActionButton onClick={() => setEditing(true)}>Edit</ActionButton>
            ) : (
              <ActionButton variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </ActionButton>
            )}
            {canDelete && (
              <ActionButton
                variant="danger"
                onClick={() => {
                  if (window.confirm('Delete this record?')) deleteMutation.mutate();
                }}
              >
                Delete
              </ActionButton>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        {editing ? (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            {fields.map((field) =>
              field.type === 'address' && field.addressKeys ? (
                <AddressFields
                  key={field.name}
                  values={form}
                  keys={field.addressKeys}
                  disabled={field.readOnly}
                  onChange={(patch) => setForm({ ...form, ...patch })}
                />
              ) : (
              <label
                key={field.name}
                className={`block text-sm ${field.type === 'textarea' || field.type === 'checkbox' ? 'md:col-span-2' : ''}`}
              >
                {field.type !== 'checkbox' && (
                  <span className="mb-1 block text-slate-600">{field.label}</span>
                )}
                {field.options ? (
                  <select
                    className="zhq-select zhq-select--block"
                    value={form[field.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    required={field.required}
                    disabled={field.readOnly}
                  >
                    <option value="">Select…</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={form[field.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    disabled={field.readOnly}
                  />
                ) : field.type === 'checkbox' ? (
                  <span className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={form[field.name] === '1' || form[field.name] === 'true'}
                      onChange={(e) =>
                        setForm({ ...form, [field.name]: e.target.checked ? '1' : '0' })
                      }
                      disabled={field.readOnly}
                    />
                    <span className="text-slate-700">{field.label}</span>
                  </span>
                ) : field.type === 'datetime-local' ? (
                  <DateTimePicker
                    required={field.required}
                    value={form[field.name] ?? ''}
                    defaultDate={form.event_date || form.starts_at || undefined}
                    onChange={(next) => setForm({ ...form, [field.name]: next })}
                    className={field.readOnly ? 'pointer-events-none opacity-60' : undefined}
                  />
                ) : (
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    type={field.type ?? 'text'}
                    value={form[field.name] ?? ''}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    required={field.required}
                    disabled={field.readOnly}
                  />
                )}
              </label>
              ),
            )}
            {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="md:col-span-2 flex justify-end gap-2">
              <ActionButton type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save changes'}
              </ActionButton>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 md:grid-cols-2">
            {fields.map((field) =>
              field.type === 'address' && field.addressKeys ? (
                addressFieldValues(record, field.addressKeys).map((part) => (
                  <div key={`${field.name}-${part.label}`} className="md:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">{part.label}</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm text-text">
                      {part.value == null || part.value === '' ? '—' : String(part.value)}
                    </dd>
                  </div>
                ))
              ) : (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{field.label}</dt>
                <dd className="mt-1 text-sm text-text">
                  {formatDisplay(record[field.name], field)}
                </dd>
              </div>
              ),
            )}
          </dl>
        )}
      </section>

      {extra?.(record, {
        refresh: () => void qc.invalidateQueries({ queryKey: key }),
      })}

      {sections.map((section) => (
        <DetailSection
          key={section.title}
          title={section.title}
          action={section.headerAction}
        >
          <RelatedTable
            bare
            rows={section.rows ?? []}
            columns={section.columns}
            emptyText={section.emptyText ?? 'None yet.'}
            getRowLink={section.getRowLink}
          />
        </DetailSection>
      ))}
    </div>
  );
}

function formatDisplay(value: unknown, field: DetailField) {
  if (field.type === 'checkbox') {
    return value === true || value === 1 || value === '1' || value === 'true' ? 'Yes' : 'No';
  }
  if (value == null || value === '') return '—';
  if (field.options) {
    return field.options.find((o) => o.value === String(value))?.label ?? String(value);
  }
  if (field.type === 'datetime-local') {
    return formatDateTime(String(value), { wallClock: true });
  }
  if (field.type === 'date') {
    return String(value).slice(0, 10);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
