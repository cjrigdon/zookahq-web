import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiDownload, apiForm } from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';
import {
  DOCUMENT_APPLIES_TO,
  type DocumentAppliesTo,
  type DocumentTemplate,
  type MergeField,
} from '../../lib/documents';

export function DocumentTemplateDetailPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-document-template', id ?? 'new'],
    queryFn: () => api<{ data: DocumentTemplate }>(`/admin/documents/templates/${id}`),
    enabled: !isNew,
  });

  const { data: fieldsData } = useQuery({
    queryKey: ['admin-document-merge-fields'],
    queryFn: () => api<{ data: MergeField[] }>('/admin/documents/merge-fields'),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [appliesTo, setAppliesTo] = useState<DocumentAppliesTo>('event');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.data) return;
    const template = data.data;
    setName(template.name);
    setDescription(template.description ?? '');
    setAppliesTo(template.applies_to as DocumentAppliesTo);
    setIsActive(template.is_active);
    setIsDefault(template.is_default);
  }, [data]);

  const groupedFields = useMemo(() => {
    const groups = new Map<string, MergeField[]>();
    for (const field of fieldsData?.data ?? []) {
      const list = groups.get(field.group) ?? [];
      list.push(field);
      groups.set(field.group, list);
    }
    return groups;
  }, [fieldsData?.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = new FormData();
      body.append('name', name);
      body.append('description', description);
      body.append('applies_to', appliesTo);
      body.append('is_active', isActive ? '1' : '0');
      body.append('is_default', isDefault ? '1' : '0');
      if (file) body.append('file', file);
      if (isNew) {
        return apiForm<{ data: DocumentTemplate }>('/admin/documents/templates', body);
      }
      return apiForm<{ data: DocumentTemplate }>(`/admin/documents/templates/${id}`, body);
    },
    onSuccess: async (res) => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-document-templates'] });
      navigate(`/admin/documents/${res.data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/admin/documents/templates/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-document-templates'] });
      navigate('/admin/documents');
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (isNew && !file) {
      setError('Upload a .docx or .pdf file.');
      return;
    }
    saveMutation.mutate();
  }

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const template = data?.data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/documents" className="text-sm text-primary hover:underline">
        ← Back to documents
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {isNew ? 'New document template' : name || 'Document template'}
          </h2>
          <p className="text-sm text-slate-600">
            Word files use <code className="text-xs">{'${account.name}'}</code> or{' '}
            <code className="text-xs">{'{{account.name}}'}</code> merge tokens. Generated documents
            are always PDFs; uploaded PDFs are copied as-is.
          </p>
        </div>
        {!isNew ? (
          <ActionButton
            variant="danger"
            onClick={() => {
              if (!window.confirm('Delete this template?')) return;
              deleteMutation.mutate();
            }}
          >
            Delete
          </ActionButton>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Name</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Description</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Defaults to</span>
          <select
            className="zhq-select zhq-select--block"
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value as DocumentAppliesTo)}
          >
            {DOCUMENT_APPLIES_TO.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">{isNew ? 'File' : 'Replace file'}</span>
          <input
            type="file"
            accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required={isNew}
          />
          {template?.original_filename ? (
            <button
              type="button"
              className="mt-2 text-sm text-primary hover:underline"
              onClick={() => void apiDownload(`/admin/documents/templates/${template.id}/download`, template.original_filename)}
            >
              Download current file ({template.original_filename})
            </button>
          ) : null}
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Default template for this record type
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end">
          <ActionButton type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </ActionButton>
        </div>
      </form>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-medium text-slate-900">Merge fields</h3>
        <p className="mt-1 text-xs text-slate-500">
          Place these tokens in a Word (.docx) template. Both {'${token}'} and {'{{token}}'} work.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[...groupedFields.entries()].map(([group, fields]) => (
            <div key={group}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{group}</p>
              <ul className="mt-1 space-y-1 text-sm">
                {fields.map((field) => (
                  <li key={field.token}>
                    <code className="text-xs text-primary">{`\${${field.token}}`}</code>
                    <span className="ml-2 text-slate-600">{field.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
