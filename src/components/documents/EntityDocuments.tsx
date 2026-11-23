import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiDownload } from '../../api/client';
import { DetailSection } from '../detail/DetailSection';
import { RowDeleteButton } from '../detail/RowDeleteButton';
import { ActionButton } from '../ui/ActionButton';
import {
  documentAppliesToLabel,
  type DocumentAppliesTo,
  type DocumentTemplate,
  type GeneratedDocument,
} from '../../lib/documents';
import { formatDateTime } from '../../lib/formatDateTime';

type Props = {
  type: DocumentAppliesTo;
  recordId: number | string;
  defaultTo?: string;
};

export function EntityDocuments({ type, recordId, defaultTo }: Props) {
  const qc = useQueryClient();
  const id = String(recordId);
  const listKey = ['documents', type, id];
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [emailingId, setEmailingId] = useState<number | null>(null);
  const [emailTo, setEmailTo] = useState(defaultTo ?? '');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const { data: docsData, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => api<{ data: GeneratedDocument[] }>(`/documents?type=${type}&id=${id}`),
    enabled: Boolean(recordId),
  });

  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: ['document-available', type],
    queryFn: () => api<{ data: DocumentTemplate[] }>(`/documents/available?applies_to=${type}`),
  });

  const documents = docsData?.data ?? [];
  const available = availableData?.data ?? [];
  const hasAvailable = available.length > 0;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: listKey });
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      api('/documents/generate', {
        method: 'POST',
        body: JSON.stringify({
          type,
          id: Number(id),
          document_template_id: selectedTemplateId ? Number(selectedTemplateId) : undefined,
        }),
      }),
    onSuccess: async () => {
      setAdding(false);
      setSelectedTemplateId('');
      setError(null);
      await refresh();
    },
    onError: (err: Error) => setError(err.message),
  });

  const emailMutation = useMutation({
    mutationFn: (documentId: number) =>
      api(`/documents/${documentId}/email`, {
        method: 'POST',
        body: JSON.stringify({
          to: emailTo || undefined,
          subject: emailSubject || undefined,
          body: emailBody || undefined,
        }),
      }),
    onSuccess: async () => {
      setEmailingId(null);
      setError(null);
      await refresh();
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (documentId: number) => api(`/documents/${documentId}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (err: Error) => setError(err.message),
  });

  if (!isLoading && !availableLoading && !hasAvailable && documents.length === 0) {
    return null;
  }

  return (
    <DetailSection
      title="Documents"
      description={`Generate and email ${documentAppliesToLabel(type).toLowerCase()} PDFs.`}
      action={
        !adding && hasAvailable ? (
          <ActionButton
            size="sm"
            aria-label="Generate document"
            title="Generate document"
            className="h-8 w-8 px-0 text-lg leading-none"
            onClick={() => {
              const fallback = available.find((item) => item.is_default) ?? available[0];
              setSelectedTemplateId(fallback ? String(fallback.id) : '');
              setAdding(true);
            }}
          >
            +
          </ActionButton>
        ) : null
      }
    >
      {error ? <p className="border-b border-slate-100 px-4 py-3 text-sm text-red-600">{error}</p> : null}

      {adding ? (
        <div className="border-b border-slate-100 px-4 py-4">
          <label className="block text-sm">
            <span className="sr-only">Template</span>
            <select
              className="zhq-select zhq-select--block"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Select a template…</option>
              {available.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.is_default ? ' (default)' : ''}
                  {template.kind === 'docx_merge' ? ' · merge' : ' · static'}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              disabled={!selectedTemplateId || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? 'Generating…' : 'Generate'}
            </ActionButton>
          </div>
        </div>
      ) : null}

      {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading documents…</p> : null}

      {!isLoading && documents.length === 0 && !adding ? (
        <p className="px-4 py-6 text-sm text-slate-500">No documents generated yet.</p>
      ) : null}

      <ul className="divide-y divide-slate-100">
        {documents.map((doc) => (
          <li key={doc.id} className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {doc.template?.name ?? 'Template'}
                  {doc.created_at ? ` · ${formatDateTime(doc.created_at)}` : ''}
                  {doc.status === 'sent' && doc.emailed_to ? ` · emailed to ${doc.emailed_to}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton
                  size="sm"
                  variant="secondary"
                  onClick={() => void apiDownload(`/documents/${doc.id}/download`, doc.original_filename)}
                >
                  Download
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEmailingId(doc.id);
                    setEmailSubject(doc.title);
                    setEmailBody(`Please find ${doc.title} attached.`);
                    if (defaultTo) setEmailTo(defaultTo);
                  }}
                >
                  Email
                </ActionButton>
                <RowDeleteButton
                  label="Remove document"
                  confirmMessage="Remove this generated document?"
                  onDelete={() => removeMutation.mutate(doc.id)}
                />
              </div>
            </div>
            {emailingId === doc.id ? (
              <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">To</span>
                  <input
                    type="email"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Subject</span>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Message</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <ActionButton variant="ghost" onClick={() => setEmailingId(null)}>
                    Cancel
                  </ActionButton>
                  <ActionButton
                    disabled={!emailTo || emailMutation.isPending}
                    onClick={() => emailMutation.mutate(doc.id)}
                  >
                    {emailMutation.isPending ? 'Sending…' : 'Send'}
                  </ActionButton>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </DetailSection>
  );
}
