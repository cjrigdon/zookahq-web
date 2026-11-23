import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionLink } from '../../components/ui/ActionButton';
import { documentAppliesToLabel, type DocumentTemplate } from '../../lib/documents';

export function DocumentsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-document-templates'],
    queryFn: () => api<{ data: DocumentTemplate[] }>('/admin/documents/templates'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Documents</h2>
          <p className="text-sm text-slate-600">
            Upload Word templates with merge fields, or static PDFs. Generating always produces a PDF.
          </p>
        </div>
        <ActionLink to="/admin/documents/new">New template</ActionLink>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Applies to</th>
              <th className="px-4 py-3 text-left">Kind</th>
              <th className="px-4 py-3 text-left">Default</th>
              <th className="px-4 py-3 text-left">Generated</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                  No document templates yet. Upload a .docx or .pdf to get started.
                </td>
              </tr>
            )}
            {data?.data.map((template) => (
              <tr
                key={template.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-support/40"
                onClick={() => navigate(`/admin/documents/${template.id}`)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{template.name}</td>
                <td className="px-4 py-3">{documentAppliesToLabel(template.applies_to)}</td>
                <td className="px-4 py-3">
                  {template.kind === 'docx_merge' ? 'Word merge' : 'Static file'}
                </td>
                <td className="px-4 py-3">{template.is_default ? 'Yes' : '—'}</td>
                <td className="px-4 py-3">{template.documents_count ?? 0}</td>
                <td className="px-4 py-3">
                  {template.is_active ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-slate-500">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
