import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, apiDownload } from '../../api/client';
import { DetailRecord } from '../../components/DetailRecord';
import { ActionButton } from '../../components/ui/ActionButton';
import { type DocumentTemplate } from '../../lib/documents';
import { formatDateTime } from '../../lib/formatDateTime';

export function ContractDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const { data: templatesData } = useQuery({
    queryKey: ['document-available', 'event'],
    queryFn: () => api<{ data: DocumentTemplate[] }>('/documents/available?applies_to=event'),
  });

  const templates = templatesData?.data ?? [];

  const generateMutation = useMutation({
    mutationFn: () =>
      api(`/booking/contracts/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          document_template_id: templateId ? Number(templateId) : undefined,
        }),
      }),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['booking-contract', id ?? ''] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const emailMutation = useMutation({
    mutationFn: () =>
      api(`/booking/contracts/${id}/email`, {
        method: 'POST',
        body: JSON.stringify({
          to: emailTo || undefined,
          subject: emailSubject || undefined,
          body: emailBody || undefined,
          document_template_id: templateId ? Number(templateId) : undefined,
        }),
      }),
    onSuccess: async () => {
      setError(null);
      setEmailOpen(false);
      await qc.invalidateQueries({ queryKey: ['booking-contract', id ?? ''] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <DetailRecord
      title={(r) => r.title}
      backTo="/booking/contracts"
      backLabel="Back to contracts"
      queryKey={['booking-contract', id ?? '']}
      endpoint={`/booking/contracts/${id}`}
      fields={[
        { name: 'title', label: 'Title', required: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'signed', label: 'Signed' },
            { value: 'void', label: 'Void' },
          ],
        },
        { name: 'amount', label: 'Amount', type: 'number' },
        { name: 'signed_at', label: 'Signed at', type: 'datetime-local' },
        { name: 'signed_by_name', label: 'Signed by' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        amount: Number(form.amount || 0),
        signed_at: form.signed_at || null,
      })}
      extra={(record) => {
        const doc = record.document;
        const defaultEmail =
          record.event?.contact?.email || record.event?.planner_email || record.event?.account?.email || '';
        return (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-medium text-slate-900">Contract document</h3>
            <p className="mt-1 text-sm text-slate-600">
              Generate a PDF from an event template, then download or email it.
            </p>

            {templates.length > 0 ? (
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-slate-600">Template</span>
                <select
                  className="zhq-select zhq-select--block"
                  value={templateId || (record.document_template_id ? String(record.document_template_id) : '')}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">Default event template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.is_default ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No event document templates yet. Add one under Admin → Documents.
              </p>
            )}

            {doc ? (
              <p className="mt-3 text-sm text-slate-700">
                Current file: {doc.title}
                {doc.status === 'sent' && doc.emailed_to ? ` · emailed to ${doc.emailed_to}` : ''}
                {doc.created_at ? ` · ${formatDateTime(doc.created_at)}` : ''}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No generated PDF yet.</p>
            )}

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                disabled={templates.length === 0 || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? 'Generating…' : doc ? 'Regenerate' : 'Generate'}
              </ActionButton>
              {doc ? (
                <ActionButton
                  variant="secondary"
                  onClick={() => void apiDownload(`/documents/${doc.id}/download`, doc.original_filename)}
                >
                  Download
                </ActionButton>
              ) : null}
              <ActionButton
                variant="secondary"
                disabled={templates.length === 0 && !doc}
                onClick={() => {
                  setEmailOpen(true);
                  setEmailTo(defaultEmail);
                  setEmailSubject(record.title);
                  setEmailBody(`Please find ${record.title} attached.`);
                }}
              >
                Email
              </ActionButton>
            </div>

            {emailOpen ? (
              <div className="mt-4 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">To</span>
                  <input
                    type="email"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
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
                  <ActionButton variant="ghost" onClick={() => setEmailOpen(false)}>
                    Cancel
                  </ActionButton>
                  <ActionButton disabled={!emailTo || emailMutation.isPending} onClick={() => emailMutation.mutate()}>
                    {emailMutation.isPending ? 'Sending…' : 'Send'}
                  </ActionButton>
                </div>
              </div>
            ) : null}
          </section>
        );
      }}
      related={(record) => [
        {
          title: 'Event',
          rows: record.event ? [record.event] : [],
          getRowLink: (row) => `/events/events/${row.id}`,
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'status', label: 'Status' },
          ],
        },
        {
          title: 'Proposal',
          rows: record.proposal ? [record.proposal] : [],
          getRowLink: (row) => `/booking/proposals/${row.id}`,
          columns: [
            { key: 'title', label: 'Title' },
            { key: 'status', label: 'Status' },
            { key: 'amount', label: 'Amount' },
          ],
        },
      ]}
    />
  );
}
