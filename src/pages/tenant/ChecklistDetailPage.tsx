import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';
import {
  CHECKLIST_APPLIES_TO,
  type ChecklistAppliesTo,
  type ChecklistTemplate,
} from '../../lib/checklists';

type StepForm = {
  id?: number;
  title: string;
  description: string;
  is_required: boolean;
};

const emptyStep = (): StepForm => ({ title: '', description: '', is_required: true });

export function ChecklistDetailPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-checklist', id ?? 'new'],
    queryFn: () => api<{ data: ChecklistTemplate }>(`/admin/checklists/${id}`),
    enabled: !isNew,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [appliesTo, setAppliesTo] = useState<ChecklistAppliesTo>('event');
  const [isActive, setIsActive] = useState(true);
  const [isRequired, setIsRequired] = useState(false);
  const [steps, setSteps] = useState<StepForm[]>([emptyStep()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.data) return;
    const checklist = data.data;
    setName(checklist.name);
    setDescription(checklist.description ?? '');
    setAppliesTo(checklist.applies_to as ChecklistAppliesTo);
    setIsActive(checklist.is_active);
    setIsRequired(Boolean(checklist.is_required));
    setSteps(
      (checklist.steps ?? []).map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description ?? '',
        is_required: step.is_required ?? true,
      })),
    );
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        applies_to: appliesTo,
        is_active: isActive,
        is_required: isRequired,
        steps: steps.map((step, index) => ({
          ...(step.id ? { id: step.id } : {}),
          title: step.title,
          description: step.description || null,
          is_required: step.is_required,
          sort_order: index,
        })),
      };
      if (isNew) {
        return api<{ data: ChecklistTemplate }>('/admin/checklists', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      return api<{ data: ChecklistTemplate }>(`/admin/checklists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-checklists'] });
      navigate('/admin/checklists');
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/admin/checklists/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-checklists'] });
      navigate('/admin/checklists');
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (steps.length === 0 || steps.some((step) => !step.title.trim())) {
      setError('Each step needs a title.');
      return;
    }
    saveMutation.mutate();
  }

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/checklists" className="text-sm text-primary hover:underline">
        ← Back to checklists
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {isNew ? 'New checklist' : name || 'Checklist'}
          </h2>
          <p className="text-sm text-slate-600">
            Define steps users will complete and submit on matching records.
          </p>
        </div>
        {!isNew ? (
          <ActionButton
            variant="danger"
            onClick={() => {
              if (!window.confirm('Delete this checklist?')) return;
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
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Applies to</span>
            <select
              className="zhq-select zhq-select--block"
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value as ChecklistAppliesTo)}
              disabled={!isNew && (data?.data.instances_count ?? 0) > 0}
            >
              {CHECKLIST_APPLIES_TO.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-3 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="text-slate-700">Active (available to start on records)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-primary"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              <span className="text-slate-700">
                Required (auto-added when a matching record is created)
              </span>
            </label>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">Steps</h3>
            <ActionButton size="sm" onClick={() => setSteps((prev) => [...prev, emptyStep()])}>
              Add step
            </ActionButton>
          </div>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id ?? `new-${index}`} className="rounded-md border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Step {index + 1}
                  </span>
                  {steps.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <label className="mb-2 block text-sm">
                  <span className="mb-1 block text-slate-600">Title</span>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    value={step.title}
                    onChange={(e) =>
                      setSteps((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)),
                      )
                    }
                    required
                  />
                </label>
                <label className="mb-2 block text-sm">
                  <span className="mb-1 block text-slate-600">Description</span>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    rows={2}
                    value={step.description}
                    onChange={(e) =>
                      setSteps((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, description: e.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                    checked={step.is_required}
                    onChange={(e) =>
                      setSteps((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, is_required: e.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Required before submit
                </label>
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <ActionButton variant="ghost" onClick={() => navigate('/admin/checklists')}>
            Cancel
          </ActionButton>
          <ActionButton type="submit" disabled={saveMutation.isPending}>
            {isNew ? 'Create checklist' : 'Save changes'}
          </ActionButton>
        </div>
      </form>
    </div>
  );
}
