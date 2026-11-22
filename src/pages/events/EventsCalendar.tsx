import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ActionButton } from '../../components/ui/ActionButton';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import { parseWallClockDateTime } from '../../lib/datetimeInput';
import { withReturnTo } from '../../lib/navContext';
import { DashboardCalendarTools } from '../tenant/DashboardCalendarTools';

type ViewMode = 'week' | 'month' | 'twoMonths';

const CALENDAR_VIEW_KEY = 'zookahq.calendar.view';
const CALENDAR_CURSOR_KEY = 'zookahq.calendar.cursor';

function loadStoredView(): ViewMode {
  try {
    const value = localStorage.getItem(CALENDAR_VIEW_KEY);
    if (value === 'week' || value === 'month' || value === 'twoMonths') return value;
  } catch {
    // ignore storage errors
  }
  return 'month';
}

function loadStoredCursor(): Date {
  try {
    const value = localStorage.getItem(CALENDAR_CURSOR_KEY);
    if (value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      }
    }
  } catch {
    // ignore storage errors
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type CalendarItem = {
  id: string;
  recordId?: number;
  kind: 'event' | 'activity';
  name: string;
  href?: string;
  meta: string;
  startsAt: Date;
  endsAt: Date;
  notes?: string | null;
  location?: string | null;
  allDay?: boolean;
  backgroundColor?: string | null;
  textColor?: string | null;
};

type ActivityForm = {
  title: string;
  activity_type: string;
  notes: string;
  location: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
};

type EventsCalendarProps = {
  title?: string;
  description?: string;
  showHeaderLink?: boolean;
  showDashboardTools?: boolean;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: '1 Month' },
  { id: 'twoMonths', label: '2 Months' },
];

const ACTIVITY_TYPES = [
  { value: 'activity', label: 'Activity' },
  { value: 'hold', label: 'Hold' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  return addDays(day, -day.getDay());
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(value: string | null | undefined) {
  return parseWallClockDateTime(value);
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function monthLabel(date: Date) {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function rangeLabel(from: Date, to: Date, mode: ViewMode) {
  if (mode === 'week') {
    const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
    if (sameMonth) {
      return `${from.toLocaleString(undefined, { month: 'long' })} ${from.getDate()}–${to.getDate()}, ${from.getFullYear()}`;
    }
    return `${from.toLocaleString(undefined, { month: 'short', day: 'numeric' })} – ${to.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (mode === 'twoMonths') {
    const second = addMonths(from, 1);
    return `${monthLabel(from)} – ${monthLabel(second)}`;
  }
  return monthLabel(from);
}

function viewWindow(cursor: Date, mode: ViewMode) {
  if (mode === 'week') {
    const from = startOfWeek(cursor);
    const to = endOfWeek(cursor);
    return { from, to, fetchFrom: from, fetchTo: to };
  }

  if (mode === 'twoMonths') {
    const first = startOfMonth(cursor);
    const secondEnd = endOfMonth(addMonths(cursor, 1));
    const from = startOfWeek(first);
    const to = endOfWeek(secondEnd);
    return { from: first, to: secondEnd, fetchFrom: from, fetchTo: to };
  }

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  return {
    from: monthStart,
    to: monthEnd,
    fetchFrom: startOfWeek(monthStart),
    fetchTo: endOfWeek(monthEnd),
  };
}

function daysInRange(from: Date, to: Date) {
  const days: Date[] = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

function monthGridDays(month: Date) {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  return daysInRange(start, end);
}

function emptyActivityForm(day?: Date): ActivityForm {
  const base = day ? startOfDay(day) : startOfDay(new Date());
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 10, 0);
  return {
    title: '',
    activity_type: 'activity',
    notes: '',
    location: '',
    starts_at: toLocalInput(start),
    ends_at: toLocalInput(end),
    all_day: false,
  };
}

function activityToForm(item: CalendarItem): ActivityForm {
  return {
    title: item.name,
    activity_type: item.meta || 'activity',
    notes: item.notes ?? '',
    location: item.location ?? '',
    starts_at: toLocalInput(item.startsAt),
    ends_at: toLocalInput(item.endsAt),
    all_day: Boolean(item.allDay),
  };
}

function buildItems(events: any[], activities: any[]): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const event of events) {
    const startsAt = parseDate(event.starts_at);
    if (!startsAt) continue;
    const endsAt = parseDate(event.ends_at) ?? startsAt;
    items.push({
      id: `event-${event.id}`,
      kind: 'event',
      name: event.name,
      href: withReturnTo(`/events/events/${event.id}`, '/events/calendar', 'calendar'),
      meta: event.event_type?.name ?? event.status ?? 'event',
      startsAt,
      endsAt,
      backgroundColor: event.event_type?.background_color ?? null,
      textColor: event.event_type?.text_color ?? null,
    });
  }

  for (const activity of activities) {
    const startsAt = parseDate(activity.starts_at);
    if (!startsAt) continue;
    const endsAt = parseDate(activity.ends_at) ?? startsAt;
    items.push({
      id: `activity-${activity.id}`,
      recordId: activity.id,
      kind: 'activity',
      name: activity.title,
      meta: activity.activity_type ?? 'activity',
      startsAt,
      endsAt,
      notes: activity.notes,
      location: activity.location,
      allDay: activity.all_day,
    });
  }

  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function itemsForDay(items: CalendarItem[], day: Date) {
  const start = startOfDay(day).getTime();
  const end = addDays(day, 1).getTime();
  return items.filter((item) => {
    const itemStart = startOfDay(item.startsAt).getTime();
    const itemEnd = startOfDay(item.endsAt).getTime() + 24 * 60 * 60 * 1000;
    return itemStart < end && itemEnd > start;
  });
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function ItemChip({
  item,
  compact,
  onActivityClick,
}: {
  item: CalendarItem;
  compact?: boolean;
  onActivityClick?: (item: CalendarItem) => void;
}) {
  const hasTypeColors = item.kind === 'event' && Boolean(item.backgroundColor && item.textColor);
  const className = cx(
    'block w-full truncate rounded px-1.5 py-0.5 text-left leading-snug transition',
    item.kind === 'event' &&
      !hasTypeColors &&
      'bg-primary/10 text-primary-deep hover:bg-primary/20',
    item.kind === 'activity' && 'bg-slate-200/80 text-slate-800 hover:bg-slate-300/80',
    hasTypeColors && 'hover:brightness-95',
    compact ? 'text-[10px]' : 'text-xs',
  );
  const style = hasTypeColors
    ? {
        backgroundColor: item.backgroundColor!,
        color: item.textColor!,
      }
    : undefined;

  const content = (
    <>
      {!compact && !item.allDay && (
        <span className={cx('mr-1 font-medium', !hasTypeColors && 'text-slate-500')} style={hasTypeColors ? { opacity: 0.8 } : undefined}>
          {formatTime(item.startsAt)}
        </span>
      )}
      {item.name}
    </>
  );

  if (item.kind === 'activity') {
    return (
      <button
        type="button"
        title={`${item.name} · ${item.meta}`}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          onActivityClick?.(item);
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={item.href!}
      title={`${item.name} · ${item.meta}`}
      className={className}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </Link>
  );
}

function DayCell({
  day,
  items,
  inMonth,
  dense,
  maxVisible,
  canAdd,
  onAddDay,
  onActivityClick,
}: {
  day: Date;
  items: CalendarItem[];
  inMonth?: boolean;
  dense?: boolean;
  maxVisible: number;
  canAdd?: boolean;
  onAddDay?: (day: Date) => void;
  onActivityClick?: (item: CalendarItem) => void;
}) {
  const today = toDateKey(new Date()) === toDateKey(day);
  const visible = items.slice(0, maxVisible);
  const overflow = items.length - visible.length;

  return (
    <div
      className={cx(
        'group flex min-h-0 flex-col border-b border-r border-slate-200 bg-white p-1.5',
        dense ? 'min-h-24' : 'min-h-28',
        inMonth === false && 'bg-slate-50/80',
        canAdd && 'cursor-pointer hover:bg-support/20',
      )}
      onClick={() => {
        if (canAdd) onAddDay?.(day);
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={cx(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
            today && 'bg-primary text-white',
            !today && inMonth === false && 'text-slate-400',
            !today && inMonth !== false && 'text-slate-700',
          )}
        >
          {day.getDate()}
        </span>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <span className="text-[10px] text-slate-400">{items.length}</span>
          )}
          {canAdd && (
            <span className="hidden text-[10px] font-medium text-primary group-hover:inline">+</span>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {visible.map((item) => (
          <ItemChip
            key={item.id}
            item={item}
            compact={dense}
            onActivityClick={onActivityClick}
          />
        ))}
        {overflow > 0 && (
          <div className="px-1 text-[10px] font-medium text-slate-500">+{overflow} more</div>
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  items,
  dense,
  canAdd,
  onAddDay,
  onActivityClick,
}: {
  month: Date;
  items: CalendarItem[];
  dense?: boolean;
  canAdd?: boolean;
  onAddDay?: (day: Date) => void;
  onActivityClick?: (item: CalendarItem) => void;
}) {
  const days = monthGridDays(month);
  const monthIndex = month.getMonth();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-sm font-medium text-text">
        {monthLabel(month)}
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r border-slate-200 px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={toDateKey(day)}
            day={day}
            items={itemsForDay(items, day)}
            inMonth={day.getMonth() === monthIndex}
            dense={dense}
            maxVisible={dense ? 2 : 3}
            canAdd={canAdd}
            onAddDay={onAddDay}
            onActivityClick={onActivityClick}
          />
        ))}
      </div>
    </div>
  );
}

function WeekGrid({
  cursor,
  items,
  canAdd,
  onAddDay,
  onActivityClick,
}: {
  cursor: Date;
  items: CalendarItem[];
  canAdd?: boolean;
  onAddDay?: (day: Date) => void;
  onActivityClick?: (item: CalendarItem) => void;
}) {
  const days = daysInRange(startOfWeek(cursor), endOfWeek(cursor));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {days.map((day) => (
          <div
            key={toDateKey(day)}
            className="border-r border-slate-200 px-2 py-2 text-center last:border-r-0"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {WEEKDAYS[day.getDay()]}
            </div>
            <div
              className={cx(
                'mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                toDateKey(day) === toDateKey(new Date())
                  ? 'bg-primary text-white'
                  : 'text-slate-700',
              )}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = itemsForDay(items, day);
          return (
            <div
              key={toDateKey(day)}
              className={cx(
                'min-h-72 border-r border-slate-200 p-2 last:border-r-0',
                canAdd && 'cursor-pointer hover:bg-support/20',
              )}
              onClick={() => {
                if (canAdd) onAddDay?.(day);
              }}
            >
              <div className="flex flex-col gap-1">
                {dayItems.length === 0 && (
                  <div className="px-1 py-6 text-center text-xs text-slate-400">
                    {canAdd ? 'Click to add' : 'No items'}
                  </div>
                )}
                {dayItems.map((item) => (
                  <ItemChip key={item.id} item={item} onActivityClick={onActivityClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityModal({
  editingId,
  form,
  error,
  saving,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: {
  editingId: number | null;
  form: ActivityForm;
  error: string | null;
  saving: boolean;
  onChange: (patch: Partial<ActivityForm>) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold">
          {editingId ? 'Edit activity' : 'Add activity'}
        </h3>
        <p className="mb-4 text-sm text-slate-600">
          Track holds, meetings, and other client activities on the calendar.
        </p>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Title</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              required
              autoFocus
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Type</span>
            <select
              className="zhq-select zhq-select--block"
              value={form.activity_type}
              onChange={(e) => onChange({ activity_type: e.target.value })}
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(e) => onChange({ all_day: e.target.checked })}
            />
            All day
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Starts</span>
              <DateTimePicker
                required
                value={form.starts_at}
                onChange={(next) => onChange({ starts_at: next })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Ends</span>
              <DateTimePicker
                required
                value={form.ends_at}
                min={form.starts_at || undefined}
                onChange={(next) => onChange({ ends_at: next })}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Location</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.location}
              onChange={(e) => onChange({ location: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Notes</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-2">
          <div>
            {editingId && onDelete && (
              <ActionButton variant="danger" type="button" onClick={onDelete} disabled={saving}>
                Delete
              </ActionButton>
            )}
          </div>
          <div className="flex gap-2">
            <ActionButton variant="ghost" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </ActionButton>
          </div>
        </div>
      </form>
    </div>
  );
}

export function EventsCalendar({
  title = 'Calendar',
  description = 'Events and tracked activities across the selected period.',
  showHeaderLink = false,
  showDashboardTools = false,
}: EventsCalendarProps) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const canManage = can('events.calendar.manage');

  const [cursor, setCursor] = useState(() => loadStoredCursor());
  const [view, setView] = useState<ViewMode>(() => loadStoredView());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ActivityForm>(() => emptyActivityForm());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CALENDAR_VIEW_KEY, view);
      localStorage.setItem(CALENDAR_CURSOR_KEY, toDateKey(cursor));
    } catch {
      // ignore storage errors
    }
  }, [view, cursor]);

  const period = useMemo(() => viewWindow(cursor, view), [cursor, view]);
  const fetchFrom = toDateKey(period.fetchFrom);
  const fetchTo = toDateKey(period.fetchTo);

  const { data, isLoading } = useQuery({
    queryKey: ['events-calendar', fetchFrom, fetchTo],
    queryFn: () =>
      api<{ data: { events: any[]; functions: any[]; activities?: any[] } }>(
        `/events/calendar?from=${fetchFrom}&to=${fetchTo}`,
      ),
  });

  const items = useMemo(
    () => buildItems(data?.data.events ?? [], data?.data.activities ?? []),
    [data],
  );

  const label = rangeLabel(period.from, period.to, view);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        activity_type: form.activity_type,
        notes: form.notes.trim() || null,
        location: form.location.trim() || null,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        all_day: form.all_day,
      };

      if (editingId) {
        return api(`/events/calendar-activities/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      return api('/events/calendar-activities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditingId(null);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['events-calendar'] });
    },
    onError: (err: Error) => {
      setError(err.message || 'Unable to save activity.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      return api(`/events/calendar-activities/${editingId}`, { method: 'DELETE' });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditingId(null);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['events-calendar'] });
    },
    onError: (err: Error) => {
      setError(err.message || 'Unable to delete activity.');
    },
  });

  function openCreate(day?: Date) {
    setEditingId(null);
    setForm(emptyActivityForm(day));
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: CalendarItem) {
    if (!item.recordId) return;
    setEditingId(item.recordId);
    setForm(activityToForm(item));
    setError(null);
    setModalOpen(true);
  }

  function goPrev() {
    if (view === 'week') setCursor((current) => addDays(current, -7));
    else if (view === 'twoMonths') setCursor((current) => addMonths(current, -2));
    else setCursor((current) => addMonths(current, -1));
  }

  function goNext() {
    if (view === 'week') setCursor((current) => addDays(current, 7));
    else if (view === 'twoMonths') setCursor((current) => addMonths(current, 2));
    else setCursor((current) => addMonths(current, 1));
  }

  function goToday() {
    setCursor(startOfDay(new Date()));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {showHeaderLink ? (
              <Link to="/events/calendar" className="hover:text-primary">
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canManage && (
            <ActionButton
              size="sm"
              aria-label="Add activity"
              title="Add activity"
              className="h-8 w-8 px-0 text-lg leading-none"
              onClick={() => openCreate()}
            >
              +
            </ActionButton>
          )}

          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cx(
                  'rounded px-3 py-1.5 text-sm transition',
                  view === option.id
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-support/50',
                )}
                onClick={() => setView(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-support/50"
              onClick={goPrev}
            >
              ‹
            </button>
            <div className="min-w-40 text-center text-sm font-medium text-text">{label}</div>
            <button
              type="button"
              aria-label="Next"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-support/50"
              onClick={goNext}
            >
              ›
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-support/50"
              onClick={goToday}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {isLoading && <p className="mb-3 text-sm text-slate-500">Loading…</p>}

      {view === 'week' && (
        <WeekGrid
          cursor={cursor}
          items={items}
          canAdd={canManage}
          onAddDay={openCreate}
          onActivityClick={openEdit}
        />
      )}

      {view === 'month' && (
        <MonthGrid
          month={cursor}
          items={items}
          canAdd={canManage}
          onAddDay={openCreate}
          onActivityClick={openEdit}
        />
      )}

      {view === 'twoMonths' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <MonthGrid
            month={cursor}
            items={items}
            dense
            canAdd={canManage}
            onAddDay={openCreate}
            onActivityClick={openEdit}
          />
          <MonthGrid
            month={addMonths(cursor, 1)}
            items={items}
            dense
            canAdd={canManage}
            onAddDay={openCreate}
            onActivityClick={openEdit}
          />
        </div>
      )}

      {showDashboardTools && (
        <DashboardCalendarTools
          onActivityClick={(row) => {
            const startsAt = parseDate(row.starts_at);
            const endsAt = parseDate(row.ends_at) ?? startsAt;
            if (!startsAt || !endsAt) return;
            openEdit({
              id: `activity-${row.id}`,
              recordId: row.id,
              kind: 'activity',
              name: row.title,
              meta: row.status ?? 'activity',
              startsAt,
              endsAt,
              location: row.space,
              allDay: row.all_day,
            });
          }}
        />
      )}

      {modalOpen && (
        <ActivityModal
          editingId={editingId}
          form={form}
          error={error}
          saving={saveMutation.isPending || deleteMutation.isPending}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onClose={() => setModalOpen(false)}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            saveMutation.mutate();
          }}
          onDelete={
            editingId
              ? () => {
                  if (window.confirm('Delete this activity?')) {
                    deleteMutation.mutate();
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
