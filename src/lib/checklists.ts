export const CHECKLIST_APPLIES_TO = [
  { value: 'lead', label: 'Leads' },
  { value: 'account', label: 'Accounts' },
  { value: 'event', label: 'Events' },
  { value: 'function', label: 'Functions' },
  { value: 'service_order', label: 'Service orders' },
] as const;

export type ChecklistAppliesTo = (typeof CHECKLIST_APPLIES_TO)[number]['value'];

export function checklistAppliesToLabel(value: string): string {
  return CHECKLIST_APPLIES_TO.find((item) => item.value === value)?.label ?? value;
}

export type ChecklistStepEvent = {
  id: number;
  action: 'completed' | 'uncompleted';
  occurred_at: string;
  user?: { id: number; name: string } | null;
};

export type ChecklistInstanceStep = {
  id: number;
  title: string;
  description?: string | null;
  sort_order: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by_user?: { id: number; name: string } | null;
  events?: ChecklistStepEvent[];
};

export type ChecklistInstance = {
  id: number;
  status: 'open' | 'submitted';
  submitted_at?: string | null;
  checklist?: { id: number; name: string; applies_to: string } | null;
  steps: ChecklistInstanceStep[];
  submitter?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  created_at?: string;
};

export type ChecklistTemplate = {
  id: number;
  name: string;
  description?: string | null;
  applies_to: ChecklistAppliesTo | string;
  is_active: boolean;
  is_required?: boolean;
  steps_count?: number;
  instances_count?: number;
  steps?: Array<{
    id?: number;
    title: string;
    description?: string | null;
    sort_order?: number;
    is_required?: boolean;
  }>;
};
