import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

type Column<T> = { key: string; label: string; render?: (row: T) => ReactNode };

type Props<T extends { id: number }> = {
  title: string;
  description: string;
  queryKey: string;
  endpoint: string;
  columns: Column<T>[];
  fields: Array<{
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  initialForm: Record<string, string>;
  actions?: (row: T, helpers: { refresh: () => void }) => ReactNode;
  transformPayload?: (form: Record<string, string>) => Record<string, unknown>;
  disableCreate?: boolean;
  detailTo?: (row: T) => string;
};

export function ResourcePage<T extends { id: number }>({
  title,
  description,
  queryKey,
  endpoint,
  columns,
  fields,
  initialForm,
  actions,
  transformPayload,
  disableCreate = false,
  detailTo,
}: Props<T>) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => api<{ data: { data: T[] } | T[] }>(endpoint),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  const rows: T[] = Array.isArray(data?.data)
    ? (data?.data as T[])
    : ((data?.data as { data: T[] } | undefined)?.data ?? []);

  const createMutation = useMutation({
    mutationFn: () =>
      api(endpoint, {
        method: 'POST',
        body: JSON.stringify(transformPayload ? transformPayload(form) : form),
      }),
    onSuccess: async (res: any) => {
      setOpen(false);
      setForm(initialForm);
      setError(null);
      await qc.invalidateQueries({ queryKey: [queryKey] });
      const created = res?.data;
      if (detailTo && created?.id) {
        navigate(detailTo(created));
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        {!disableCreate && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text hover:bg-accent-dark"
          >
            New
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left">
                  {col.label}
                </th>
              ))}
              {(actions || detailTo) && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={columns.length + 1}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={columns.length + 1}>
                  No records yet.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const href = detailTo?.(row);
              return (
                <tr
                  key={row.id}
                  className={[
                    'border-t border-slate-100 hover:bg-support/40',
                    href ? 'cursor-pointer' : '',
                  ].join(' ')}
                  onClick={() => {
                    if (href) navigate(href);
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? (
                        col.render(row)
                      ) : href && col === columns[0] ? (
                        <Link
                          to={href}
                          className="font-medium text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {String((row as unknown as Record<string, unknown>)[col.key] ?? '—')}
                        </Link>
                      ) : (
                        String((row as unknown as Record<string, unknown>)[col.key] ?? '—')
                      )}
                    </td>
                  ))}
                  {(actions || detailTo) && (
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {actions?.(row, {
                        refresh: () => void qc.invalidateQueries({ queryKey: [queryKey] }),
                      })}
                      {detailTo && !actions && (
                        <Link to={href!} className="text-primary hover:underline">
                          Open
                        </Link>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={onSubmit}
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6"
          >
            <h3 className="mb-4 text-lg font-semibold">Create {title.slice(0, -1) || title}</h3>
            <div className="space-y-3">
              {fields.map((field) => (
                <label key={field.name} className="block text-sm">
                  <span className="mb-1 block text-slate-600">{field.label}</span>
                  {field.options ? (
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={form[field.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                      required={field.required}
                    >
                      <option value="">Select…</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      type={field.type ?? 'text'}
                      value={form[field.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                      required={field.required}
                    />
                  )}
                </label>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
