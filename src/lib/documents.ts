export const DOCUMENT_APPLIES_TO = [
  { value: 'event', label: 'Events' },
  { value: 'account', label: 'Accounts' },
  { value: 'contact', label: 'Contacts' },
] as const;

export type DocumentAppliesTo = (typeof DOCUMENT_APPLIES_TO)[number]['value'];

export function documentAppliesToLabel(value: string): string {
  return DOCUMENT_APPLIES_TO.find((item) => item.value === value)?.label ?? value;
}

export type DocumentTemplate = {
  id: number;
  name: string;
  description?: string | null;
  applies_to: DocumentAppliesTo | string;
  is_default: boolean;
  is_active: boolean;
  kind: 'docx_merge' | 'static' | string;
  original_filename: string;
  mime_type: string;
  file_size?: number | null;
  documents_count?: number;
};

export type GeneratedDocument = {
  id: number;
  title: string;
  original_filename: string;
  mime_type: string;
  status: string;
  emailed_to?: string | null;
  emailed_at?: string | null;
  created_at?: string;
  template?: { id: number; name: string; applies_to: string; kind: string } | null;
  creator?: { id: number; name: string } | null;
};

export type MergeField = {
  token: string;
  label: string;
  group: string;
};
