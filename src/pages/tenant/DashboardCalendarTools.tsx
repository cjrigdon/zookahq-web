import { useState, type ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AvailabilitySearch } from '../events/AvailabilitySearch';
import { ContactSearchPanel } from '../booking/ContactSearchPanel';

type ToolId = 'availability' | 'contacts';

function ToolToggle({
  id,
  label,
  description,
  active,
  onSelect,
}: {
  id: ToolId;
  label: string;
  description: string;
  active: boolean;
  onSelect: (id: ToolId) => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={active}
      onClick={() => onSelect(id)}
      className={[
        'rounded-lg border px-4 py-3 text-left transition',
        active
          ? 'border-primary bg-support/40'
          : 'border-slate-200 bg-white hover:border-primary/40 hover:bg-support/20',
      ].join(' ')}
    >
      <div className="text-sm font-medium text-primary">{label}</div>
      <p className="mt-0.5 text-xs text-slate-600">{description}</p>
    </button>
  );
}

export function DashboardCalendarTools({
  onActivityClick,
}: {
  onActivityClick?: (row: {
    id: number;
    title: string;
    status?: string | null;
    starts_at: string;
    ends_at: string;
    space?: string | null;
    all_day?: boolean;
  }) => void;
}) {
  const { hasModule } = useAuth();
  const [active, setActive] = useState<ToolId | null>(null);

  const tools = (
    [
      {
        id: 'availability' as const,
        label: 'Availability search',
        description: 'Find spaces by datetime range, duration, capacity, and attributes.',
        show: hasModule('events'),
        content: (
          <AvailabilitySearch
            embedded
            onActivityClick={
              onActivityClick
                ? (row) =>
                    onActivityClick({
                      id: row.id,
                      title: row.title,
                      status: row.status,
                      starts_at: row.starts_at,
                      ends_at: row.ends_at,
                      space: row.space,
                      all_day: row.all_day,
                    })
                : undefined
            }
          />
        ),
      },
      {
        id: 'contacts' as const,
        label: 'Contact search',
        description: 'Find contacts, accounts, and leads.',
        show: hasModule('booking'),
        content: <ContactSearchPanel />,
      },
    ] satisfies Array<{
      id: ToolId;
      label: string;
      description: string;
      show: boolean;
      content: ReactNode;
    }>
  ).filter((tool) => tool.show);

  if (tools.length === 0) return null;

  const selected = tools.find((tool) => tool.id === active);

  return (
    <div className="mt-4 space-y-3">
      <div className={`grid gap-3 ${tools.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {tools.map((tool) => (
          <ToolToggle
            key={tool.id}
            id={tool.id}
            label={tool.label}
            description={tool.description}
            active={active === tool.id}
            onSelect={(id) => setActive((current) => (current === id ? null : id))}
          />
        ))}
      </div>

      {selected ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-900">{selected.label}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{selected.description}</p>
          </div>
          <div className="p-4">{selected.content}</div>
        </div>
      ) : null}
    </div>
  );
}
