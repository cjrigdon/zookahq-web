import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { DetailSection } from '../detail/DetailSection';
import { RowDeleteButton } from '../detail/RowDeleteButton';
import { ActionButton } from '../ui/ActionButton';
import { ChevronGlyphIcon } from '../layout/navIcons';
import {
  checklistAppliesToLabel,
  type ChecklistAppliesTo,
  type ChecklistInstance,
  type ChecklistTemplate,
} from '../../lib/checklists';
import { formatDateTime } from '../../lib/formatDateTime';

type Props = {
  type: ChecklistAppliesTo;
  recordId: number | string;
};

export function EntityChecklists({ type, recordId }: Props) {
  const qc = useQueryClient();
  const id = String(recordId);
  const instancesKey = ['checklist-instances', type, id];
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [historyOpen, setHistoryOpen] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { data: instancesData, isLoading } = useQuery({
    queryKey: instancesKey,
    queryFn: () =>
      api<{ data: ChecklistInstance[] }>(`/checklists/instances?type=${type}&id=${id}`),
    enabled: Boolean(recordId),
  });

  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: ['checklist-available', type],
    queryFn: () =>
      api<{ data: ChecklistTemplate[] }>(`/checklists/available?applies_to=${type}`),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: instancesKey });
  };

  const startMutation = useMutation({
    mutationFn: () =>
      api('/checklists/instances', {
        method: 'POST',
        body: JSON.stringify({
          checklist_id: Number(selectedTemplateId),
          type,
          id: Number(id),
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

  const completeMutation = useMutation({
    mutationFn: ({ instanceId, stepId }: { instanceId: number; stepId: number }) =>
      api(`/checklists/instances/${instanceId}/steps/${stepId}/complete`, { method: 'POST' }),
    onSuccess: refresh,
    onError: (err: Error) => setError(err.message),
  });

  const uncompleteMutation = useMutation({
    mutationFn: ({ instanceId, stepId }: { instanceId: number; stepId: number }) =>
      api(`/checklists/instances/${instanceId}/steps/${stepId}/uncomplete`, { method: 'POST' }),
    onSuccess: refresh,
    onError: (err: Error) => setError(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: (instanceId: number) =>
      api(`/checklists/instances/${instanceId}/submit`, { method: 'POST' }),
    onSuccess: refresh,
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (instanceId: number) =>
      api(`/checklists/instances/${instanceId}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (err: Error) => setError(err.message),
  });

  const instances = instancesData?.data ?? [];
  const available = availableData?.data ?? [];
  const hasAvailable = available.length > 0;

  const startedIds = useMemo(
    () => new Set(instances.map((item) => item.checklist?.id).filter(Boolean)),
    [instances],
  );

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const instance of instances) {
        if (next[instance.id] === undefined) {
          next[instance.id] = instance.status !== 'submitted';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [instances]);

  function toggleExpanded(instanceId: number) {
    setExpanded((prev) => ({ ...prev, [instanceId]: !prev[instanceId] }));
  }

  // Hide entirely when this entity type has no checklist templates and none started.
  if (!isLoading && !availableLoading && !hasAvailable && instances.length === 0) {
    return null;
  }

  return (
    <DetailSection
      title="Checklists"
      description={`Track and complete checklists for this ${checklistAppliesToLabel(type)
        .slice(0, -1)
        .toLowerCase()}.`}
      action={
        !adding && hasAvailable ? (
          <ActionButton
            size="sm"
            aria-label="Start checklist"
            title="Start checklist"
            className="h-8 w-8 px-0 text-lg leading-none"
            onClick={() => setAdding(true)}
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
            <span className="sr-only">Checklist</span>
            <select
              className="zhq-select zhq-select--block"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Select a checklist…</option>
              {available.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {startedIds.has(template.id) ? ' (already started)' : ''}
                  {typeof template.steps_count === 'number' ? ` · ${template.steps_count} steps` : ''}
                </option>
              ))}
            </select>
          </label>
          {available.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No active checklists are configured for {checklistAppliesToLabel(type).toLowerCase()}.
            </p>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <ActionButton
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setSelectedTemplateId('');
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton
              disabled={!selectedTemplateId || startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              Start
            </ActionButton>
          </div>
        </div>
      ) : null}

      {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading checklists…</p> : null}

      {!isLoading && instances.length === 0 && !adding ? (
        <p className="px-4 py-6 text-sm text-slate-500">No checklists started yet.</p>
      ) : null}

      {instances.map((instance, index) => {
        const requiredDone = instance.steps
          .filter((step) => step.is_required)
          .every((step) => step.is_completed);
        const completedCount = instance.steps.filter((step) => step.is_completed).length;
        const submitted = instance.status === 'submitted';
        const isOpen = expanded[instance.id] ?? !submitted;

        return (
          <div
            key={instance.id}
            className={index > 0 || adding || error ? 'border-t border-slate-100' : ''}
          >
            <div className="flex items-start gap-2 px-4 py-3">
              <button
                type="button"
                className="mt-0.5 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse checklist' : 'Expand checklist'}
                onClick={() => toggleExpanded(instance.id)}
              >
                <ChevronGlyphIcon
                  className={`h-4 w-4 transition ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => toggleExpanded(instance.id)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium text-slate-900">
                    {instance.checklist?.name ?? 'Checklist'}
                  </h4>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                      submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                    ].join(' ')}
                  >
                    {submitted ? 'Complete' : 'Open'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {completedCount}/{instance.steps.length} steps complete
                  {submitted && instance.submitted_at
                    ? ` · Completed ${formatDateTime(instance.submitted_at)}${
                        instance.submitter?.name ? ` by ${instance.submitter.name}` : ''
                      }`
                    : null}
                </p>
              </button>

              {!submitted ? (
                <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                  <RowDeleteButton
                    label="Remove checklist"
                    confirmMessage="Remove this checklist from the record?"
                    onDelete={() => {
                      setError(null);
                      removeMutation.mutate(instance.id);
                    }}
                  />
                </div>
              ) : null}
            </div>

            {isOpen ? (
              <>
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {instance.steps.map((step) => {
                    const showHistory = historyOpen[step.id];
                    return (
                      <li key={step.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary"
                            checked={step.is_completed}
                            disabled={
                              submitted ||
                              completeMutation.isPending ||
                              uncompleteMutation.isPending
                            }
                            onChange={() => {
                              setError(null);
                              if (step.is_completed) {
                                uncompleteMutation.mutate({
                                  instanceId: instance.id,
                                  stepId: step.id,
                                });
                              } else {
                                completeMutation.mutate({
                                  instanceId: instance.id,
                                  stepId: step.id,
                                });
                              }
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={[
                                  'text-sm font-medium',
                                  step.is_completed
                                    ? 'text-slate-500 line-through'
                                    : 'text-slate-900',
                                ].join(' ')}
                              >
                                {step.title}
                              </span>
                              {step.is_required ? (
                                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                  Required
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                  Optional
                                </span>
                              )}
                            </div>
                            {step.description ? (
                              <p className="mt-0.5 text-sm text-slate-500">{step.description}</p>
                            ) : null}
                            {step.is_completed ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Completed {formatDateTime(step.completed_at)}
                                {step.completed_by_user?.name
                                  ? ` by ${step.completed_by_user.name}`
                                  : ''}
                              </p>
                            ) : null}
                            {(step.events?.length ?? 0) > 0 ? (
                              <button
                                type="button"
                                className="mt-1 text-xs text-primary hover:underline"
                                onClick={() =>
                                  setHistoryOpen((prev) => ({
                                    ...prev,
                                    [step.id]: !prev[step.id],
                                  }))
                                }
                              >
                                {showHistory ? 'Hide history' : 'Show history'}
                              </button>
                            ) : null}
                            {showHistory ? (
                              <ul className="mt-2 space-y-1 border-l border-slate-200 pl-3 text-xs text-slate-600">
                                {(step.events ?? []).map((event) => (
                                  <li key={event.id}>
                                    <span className="font-medium capitalize">{event.action}</span>
                                    {' · '}
                                    {formatDateTime(event.occurred_at)}
                                    {event.user?.name ? ` · ${event.user.name}` : ''}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {!submitted ? (
                  <div className="flex justify-end border-t border-slate-100 px-4 py-3">
                    <ActionButton
                      size="sm"
                      disabled={!requiredDone || submitMutation.isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            'Mark this checklist complete? Steps cannot be changed afterward.',
                          )
                        ) {
                          return;
                        }
                        setError(null);
                        submitMutation.mutate(instance.id);
                      }}
                    >
                      Mark complete
                    </ActionButton>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </DetailSection>
  );
}
