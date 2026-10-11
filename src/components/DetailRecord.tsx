import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export type DetailField = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  readOnly?: boolean;
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
  canDelete?: boolean;
  deleteRedirectTo?: string;
};

function toInputValue(value: unknown, type?: string): string {
  if (value == null) return '';
  if (type === 'datetime-local') {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  canDelete = true,
  deleteRedirectTo,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = Array.isArray(queryKey) ? queryKey : [queryKey];

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
      next[field.name] = toInputValue(record[field.name], field.type);
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
      navigate(deleteRedirectTo ?? backTo);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (loadError || !record) {
    return (
      <div>
        <Link to={backTo} className="text-sm text-primary hover:underline">
          ← {backLabel}
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
        <Link to={backTo} className="text-sm text-primary hover:underline">
          ← {backLabel}
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
              <button
                type="button"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-700"
                onClick={() => {
                  if (window.confirm('Delete this record?')) deleteMutation.mutate();
                }}
              >
                Delete
              </button>
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
            {fields.map((field) => (
              <label
                key={field.name}
                className={`block text-sm ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}
              >
                <span className="mb-1 block text-slate-600">{field.label}</span>
                {field.options ? (
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
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
            ))}
            {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{field.label}</dt>
                <dd className="mt-1 text-sm text-text">
                  {formatDisplay(record[field.name], field)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {sections.map((section) => (
        <section key={section.title} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-medium">{section.title}</h3>
            {section.headerAction}
          </header>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {section.columns.map((col) => (
                  <th key={col.key} className="px-4 py-2 text-left">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(section.rows ?? []).map((row) => {
                const link = section.getRowLink?.(row);
                const cells = section.columns.map((col) => (
                  <td key={col.key} className="px-4 py-2">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? '—')}
                  </td>
                ));
                return link ? (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-support/40"
                    onClick={() => navigate(link)}
                  >
                    {cells}
                  </tr>
                ) : (
                  <tr key={row.id} className="border-t border-slate-100">
                    {cells}
                  </tr>
                );
              })}
              {(section.rows ?? []).length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-slate-500"
                    colSpan={Math.max(section.columns.length, 1)}
                  >
                    {section.emptyText ?? 'None yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function formatDisplay(value: unknown, field: DetailField) {
  if (value == null || value === '') return '—';
  if (field.options) {
    return field.options.find((o) => o.value === String(value))?.label ?? String(value);
  }
  if (field.type === 'datetime-local') {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
