import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';
import { DateTimePicker, toDateTimeValue } from '../../components/ui/DateTimePicker';
import { formatDateTime, formatDateTimeRange } from '../../lib/formatDateTime';
import { withReturnTo } from '../../lib/navContext';

type AvailabilityHit = {
  id: number;
  title: string;
  status?: string | null;
  starts_at: string;
  ends_at: string;
  space?: string | null;
  kind: 'event' | 'activity';
  all_day?: boolean;
};

type AvailabilityWindow = {
  from: string;
  to: string;
  available: boolean;
  conflicts: AvailabilityHit[];
  tentative: AvailabilityHit[];
};

type SpaceResult = {
  id: number;
  name: string;
  description?: string | null;
  area_sq_ft?: number | null;
  max_capacity: number;
  matching_styles: Array<{
    id: number;
    space_style_id?: number;
    code?: string | null;
    name: string;
    seating_capacity: number;
  }>;
  available_count: number;
  window_count: number;
  available_windows: AvailabilityWindow[];
  conflict_windows: AvailabilityWindow[];
};

type AvailabilityResult = {
  starts_at: string;
  ends_at: string;
  duration_hours: number;
  capacity: number | null;
  attribute_ids: number[];
  space_count: number;
  available_space_count: number;
  spaces: SpaceResult[];
  available_spaces: SpaceResult[];
};

type SpaceAttributeOption = {
  id: number;
  name: string;
  description?: string | null;
};

function defaultStart() {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setHours(date.getHours() + 1);
  return toDateTimeValue(date);
}

/** Exclusive end of the start calendar day (midnight next day). */
function endOfStartDay(startValue: string) {
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return '';
  const nextDay = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, 0);
  return toDateTimeValue(nextDay);
}

function hoursBetween(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return (end.getTime() - start.getTime()) / 3600000;
}

function formatDuration(hours: number) {
  if (!Number.isFinite(hours)) return '';
  if (Number.isInteger(hours)) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours} hours`;
}

function ResultList({
  title,
  rows,
  emptyLabel,
  tone,
  onActivityClick,
}: {
  title: string;
  rows: AvailabilityHit[];
  emptyLabel: string;
  tone: 'conflict' | 'tentative';
  onActivityClick?: (row: AvailabilityHit) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <h5 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h5>
        <span
          className={[
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            tone === 'conflict' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800',
          ].join(' ')}
        >
          {rows.length}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-xs text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => {
            const body = (
              <>
                <div className="font-medium text-slate-900">{row.title}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatDateTimeRange(row.starts_at, row.ends_at)}
                </div>
              </>
            );
            if (row.kind === 'event') {
              return (
                <li key={`event-${row.id}`}>
                  <Link
                    to={withReturnTo(`/events/events/${row.id}`, '/events/calendar', 'calendar')}
                    className="block px-3 py-2 text-sm hover:bg-support/40"
                  >
                    {body}
                  </Link>
                </li>
              );
            }
            return (
              <li key={`activity-${row.id}`}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-support/40"
                  onClick={() => onActivityClick?.(row)}
                >
                  {body}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function WindowCard({
  window,
  onActivityClick,
}: {
  window: AvailabilityWindow;
  onActivityClick?: (row: AvailabilityHit) => void;
}) {
  return (
    <div
      className={[
        'overflow-hidden rounded-lg border',
        window.available ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/40',
      ].join(' ')}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div className="text-sm font-medium text-slate-900">
          {formatDateTimeRange(window.from, window.to)}
        </div>
        <span
          className={[
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            window.available
              ? window.tentative.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-support text-primary-deep'
              : 'bg-red-100 text-red-700',
          ].join(' ')}
        >
          {window.available ? 'Available' : 'Conflict'}
        </span>
      </header>
      {(window.conflicts.length > 0 || window.tentative.length > 0) && (
        <div className="grid gap-2 p-2 lg:grid-cols-2">
          <ResultList
            title="Conflicts"
            rows={window.conflicts}
            emptyLabel="No direct conflicts."
            tone="conflict"
          />
          <ResultList
            title="Tentative"
            rows={window.tentative}
            emptyLabel="No tentative conflicts."
            tone="tentative"
            onActivityClick={onActivityClick}
          />
        </div>
      )}
    </div>
  );
}

function SpaceCard({
  space,
  onActivityClick,
}: {
  space: SpaceResult;
  onActivityClick?: (row: AvailabilityHit) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-support/20"
        onClick={() => setExpanded((value) => !value)}
      >
        <div>
          <div className="font-medium text-slate-900">{space.name}</div>
          <p className="mt-0.5 text-xs text-slate-500">
            {space.area_sq_ft != null ? `${space.area_sq_ft.toLocaleString()} sq ft · ` : ''}
            Max capacity {space.max_capacity || '—'}
            {space.matching_styles.length > 0
              ? ` · Styles: ${space.matching_styles
                  .map((style) =>
                    `${style.code ? `${style.code} ` : ''}${style.name} (${style.seating_capacity})`,
                  )
                  .join(', ')}`
              : ''}
          </p>
          {space.description ? (
            <p className="mt-1 text-xs text-slate-500">{space.description}</p>
          ) : null}
        </div>
        <span
          className={[
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            space.available_count > 0
              ? 'bg-support text-primary-deep'
              : 'bg-red-100 text-red-700',
          ].join(' ')}
        >
          {space.available_count > 0
            ? `${space.available_count} open`
            : 'Unavailable'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {space.available_windows.length > 0 ? (
            <div className="space-y-2">
              <h5 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Available windows
              </h5>
              {space.available_windows.map((window) => (
                <WindowCard
                  key={`${space.id}-${window.from}-${window.to}`}
                  window={window}
                  onActivityClick={onActivityClick}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <h5 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sample blocked windows
              </h5>
              {space.conflict_windows.map((window) => (
                <WindowCard
                  key={`${space.id}-${window.from}-${window.to}`}
                  window={window}
                  onActivityClick={onActivityClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AvailabilitySearch({
  onActivityClick,
  embedded = false,
}: {
  onActivityClick?: (row: AvailabilityHit) => void;
  embedded?: boolean;
}) {
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [includeEnd, setIncludeEnd] = useState(false);
  const [endsAt, setEndsAt] = useState(() => endOfStartDay(defaultStart()));
  const [durationHours, setDurationHours] = useState('2');
  const [capacity, setCapacity] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    starts_at: string;
    ends_at: string;
    duration_hours: string;
    capacity: string;
    attribute_ids: number[];
    include_end: boolean;
  } | null>(null);

  const effectiveEndsAt = includeEnd ? endsAt : endOfStartDay(startsAt);

  const { data: optionsData } = useQuery({
    queryKey: ['calendar-space-options'],
    queryFn: () =>
      api<{ data: { attributes: SpaceAttributeOption[] } }>('/events/calendar/space-options'),
  });

  const attributes = optionsData?.data.attributes ?? [];
  const enabled = Boolean(submitted?.starts_at && submitted?.ends_at && submitted?.duration_hours);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: [
      'calendar-availability',
      submitted?.starts_at,
      submitted?.ends_at,
      submitted?.duration_hours,
      submitted?.capacity,
      submitted?.attribute_ids,
    ],
    enabled,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('starts_at', submitted!.starts_at);
      params.set('ends_at', submitted!.ends_at);
      params.set('duration_hours', submitted!.duration_hours);
      if (submitted!.capacity) params.set('capacity', submitted!.capacity);
      for (const id of submitted!.attribute_ids) {
        params.append('attribute_ids[]', String(id));
      }
      return api<{ data: AvailabilityResult }>(
        `/events/calendar/availability?${params.toString()}`,
      );
    },
  });

  const result = data?.data;

  const rangeHint = useMemo(() => {
    const spanHours = hoursBetween(startsAt, effectiveEndsAt);
    const duration = Number(durationHours);
    if (spanHours == null) {
      return includeEnd
        ? 'End must be after start.'
        : 'Start time leaves no room left on that day for a search window.';
    }
    if (!Number.isFinite(duration) || duration <= 0) return null;
    if (duration > spanHours) {
      return includeEnd
        ? `Duration must be ${spanHours} hours or less for this range.`
        : `Duration must fit in the remaining ${spanHours} hours on the start day.`;
    }
    if (!includeEnd) {
      return `Searches the start day from the start time onward for a ${formatDuration(duration)} window.`;
    }
    return `Finds spaces that can host a ${formatDuration(duration)} event inside the selected range.`;
  }, [startsAt, effectiveEndsAt, durationHours, includeEnd]);

  function toggleAttribute(id: number) {
    setSelectedAttributes((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!startsAt) return;
    if (includeEnd && !endsAt) return;

    const searchEndsAt = includeEnd ? endsAt : endOfStartDay(startsAt);
    if (!searchEndsAt) return;

    const duration = Number(durationHours);
    if (!Number.isFinite(duration) || duration < 0.5) {
      setFormError('Enter a duration of at least 0.5 hours.');
      return;
    }

    const spanHours = hoursBetween(startsAt, searchEndsAt);
    if (spanHours == null) {
      setFormError(
        includeEnd
          ? 'End date/time must be after the start.'
          : 'Start time leaves no room left on that day for the duration.',
      );
      return;
    }
    if (duration > spanHours) {
      setFormError(
        includeEnd
          ? 'Duration cannot be longer than the selected date/time range.'
          : 'Duration cannot be longer than the time remaining on the start day.',
      );
      return;
    }

    if (capacity.trim()) {
      const guests = Number(capacity);
      if (!Number.isFinite(guests) || guests < 1) {
        setFormError('Capacity must be a positive number.');
        return;
      }
    }

    setFormError(null);
    setSubmitted({
      starts_at: startsAt,
      ends_at: searchEndsAt,
      duration_hours: String(duration),
      capacity: capacity.trim(),
      attribute_ids: selectedAttributes,
      include_end: includeEnd,
    });
  }

  const body = (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className={embedded ? '' : 'px-4 pt-4'}>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={includeEnd}
              onChange={(e) => {
                const checked = e.target.checked;
                setIncludeEnd(checked);
                if (checked && (!endsAt || new Date(endsAt) <= new Date(startsAt))) {
                  setEndsAt(endOfStartDay(startsAt) || startsAt);
                }
              }}
            />
            Include end date/time
          </label>
        </div>

        <div
          className={[
            'grid gap-3 lg:items-end',
            includeEnd
              ? 'lg:grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_auto]'
              : 'lg:grid-cols-[1.4fr_0.7fr_0.7fr_auto]',
            embedded ? '' : 'px-4',
          ].join(' ')}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Start</span>
            <DateTimePicker
              required
              value={startsAt}
              onChange={(next) => {
                setStartsAt(next);
                if (includeEnd && (!endsAt || new Date(endsAt) < new Date(next))) {
                  setEndsAt(next);
                }
              }}
            />
          </label>
          {includeEnd ? (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">End</span>
              <DateTimePicker
                required
                value={endsAt}
                min={startsAt || undefined}
                onChange={setEndsAt}
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Duration (hours)</span>
            <input
              type="number"
              min={0.5}
              max={720}
              step={0.5}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Capacity</span>
            <input
              type="number"
              min={1}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="Guests"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <ActionButton type="submit" disabled={isFetching}>
            {isFetching ? 'Searching…' : 'Search'}
          </ActionButton>
        </div>

        <div className={embedded ? '' : 'px-4'}>
          <div className="mb-2 text-sm text-slate-600">Attributes</div>
          {attributes.length === 0 ? (
            <p className="text-xs text-slate-500">
              No space attributes configured yet. Add them under Admin → Spaces → Attributes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attributes.map((attr) => {
                const selected = selectedAttributes.includes(attr.id);
                return (
                  <button
                    key={attr.id}
                    type="button"
                    title={attr.description ?? attr.name}
                    onClick={() => toggleAttribute(attr.id)}
                    className={[
                      'rounded-md border px-3 py-1.5 text-sm transition',
                      selected
                        ? 'border-primary bg-support/50 text-primary-deep'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {attr.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </form>

      {rangeHint && (
        <p className={`${embedded ? 'pt-2' : 'px-4 pb-3 pt-2'} text-xs text-slate-500`}>
          {rangeHint}
        </p>
      )}

      {(formError || isError) && (
        <p className={`${embedded ? 'pt-1' : 'px-4 py-3'} text-sm text-red-600`}>
          {formError || (error as Error)?.message || 'Availability search failed.'}
        </p>
      )}

      {result && (
        <div className={`space-y-4 ${embedded ? 'pt-4' : 'px-4 py-4'}`}>
          <div
            className={[
              'rounded-md px-3 py-2 text-sm',
              result.available_space_count > 0
                ? 'bg-support/50 text-primary-deep'
                : 'bg-red-50 text-red-800',
            ].join(' ')}
          >
            {result.available_space_count > 0
              ? submitted?.include_end
                ? `Found ${result.available_space_count} available space${result.available_space_count === 1 ? '' : 's'} for a ${formatDuration(result.duration_hours)} event between ${formatDateTime(result.starts_at, { wallClock: true })} and ${formatDateTime(result.ends_at, { wallClock: true })}.`
                : `Found ${result.available_space_count} available space${result.available_space_count === 1 ? '' : 's'} for a ${formatDuration(result.duration_hours)} window starting on or after ${formatDateTime(result.starts_at, { wallClock: true })} the same day.`
              : submitted?.include_end
                ? `No available spaces matched this search between ${formatDateTime(result.starts_at, { wallClock: true })} and ${formatDateTime(result.ends_at, { wallClock: true })}.`
                : `No available spaces matched a ${formatDuration(result.duration_hours)} window starting on or after ${formatDateTime(result.starts_at, { wallClock: true })} the same day.`}
            {result.space_count > result.available_space_count
              ? ` ${result.space_count - result.available_space_count} matching space${result.space_count - result.available_space_count === 1 ? '' : 's'} fully booked in the range.`
              : ''}
          </div>

          {(result.available_spaces.length > 0 ? result.available_spaces : result.spaces).map(
            (space) => (
              <SpaceCard key={space.id} space={space} onActivityClick={onActivityClick} />
            ),
          )}

          {result.spaces.length === 0 && (
            <p className="text-sm text-slate-500">
              No spaces matched capacity/attribute filters. Configure spaces under Admin → Spaces.
            </p>
          )}
        </div>
      )}
    </>
  );

  if (embedded) return <div>{body}</div>;

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-900">Availability search</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Find spaces that can host your event duration, capacity, and required attributes.
        </p>
      </header>
      {body}
    </section>
  );
}
