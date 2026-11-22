import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { parseWallClockDateTime } from '../../lib/datetimeInput';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MINUTES = [0, 15, 30, 45] as const;
const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function toHour12(hours24: number) {
  const hour = hours24 % 12;
  return hour === 0 ? 12 : hour;
}

function isPm(hours24: number) {
  return hours24 >= 12;
}

function toHour24(hour12: number, pm: boolean) {
  const normalized = hour12 % 12;
  return pm ? normalized + 12 : normalized;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function snapMinutes(minutes: number) {
  const stepped = Math.round(minutes / 15) * 15;
  if (stepped === 60) return 45;
  return stepped as (typeof MINUTES)[number];
}

export function toDateTimeValue(date: Date) {
  const snapped = new Date(date);
  snapped.setMinutes(snapMinutes(snapped.getMinutes()), 0, 0);
  return `${snapped.getFullYear()}-${pad(snapped.getMonth() + 1)}-${pad(snapped.getDate())}T${pad(snapped.getHours())}:${pad(snapped.getMinutes())}`;
}

export function parseDateTimeValue(value: string): Date | null {
  if (!value) return null;
  const date = parseWallClockDateTime(value);
  if (!date) return null;
  date.setMinutes(snapMinutes(date.getMinutes()), 0, 0);
  return date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDisplay(value: string) {
  const date = parseDateTimeValue(value);
  if (!date) return 'Select date & time';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function monthLabel(date: Date) {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function calendarDays(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type DateTimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  required?: boolean;
  className?: string;
};

export function DateTimePicker({
  id,
  value,
  onChange,
  min,
  required,
  className,
}: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    top: 0,
    left: 0,
    visibility: 'hidden',
  });
  const selected = useMemo(() => parseDateTimeValue(value) ?? new Date(), [value]);
  const [cursor, setCursor] = useState(() => startOfMonth(selected));
  const [draft, setDraft] = useState(() => selected);
  const minDate = useMemo(() => parseDateTimeValue(min ?? ''), [min]);

  useEffect(() => {
    if (!open) return;
    const next = parseDateTimeValue(value) ?? new Date();
    next.setMinutes(snapMinutes(next.getMinutes()), 0, 0);
    setDraft(next);
    setCursor(startOfMonth(next));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = rootRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const rect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const gap = 8;
      const viewportPadding = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - gap - viewportPadding;
      const openUp =
        panelRect.height > spaceBelow && spaceAbove > spaceBelow;

      let top = openUp
        ? rect.top - panelRect.height - gap
        : rect.bottom + gap;
      top = Math.min(
        Math.max(top, viewportPadding),
        window.innerHeight - panelRect.height - viewportPadding,
      );

      let left = rect.left;
      left = Math.min(
        Math.max(left, viewportPadding),
        window.innerWidth - panelRect.width - viewportPadding,
      );

      setPanelStyle({
        position: 'fixed',
        top,
        left,
        zIndex: 80,
        visibility: 'visible',
      });
    }

    // First paint measures the panel, then we lock it into view.
    setPanelStyle({
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 80,
      visibility: 'hidden',
    });
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function applyDraft(next: Date) {
    next.setMinutes(snapMinutes(next.getMinutes()), 0, 0);
    setDraft(next);
    onChange(toDateTimeValue(next));
  }

  function chooseDay(day: Date) {
    const next = new Date(day);
    next.setHours(draft.getHours(), snapMinutes(draft.getMinutes()), 0, 0);
    if (minDate && next < minDate) {
      next.setTime(minDate.getTime());
      next.setMinutes(snapMinutes(next.getMinutes()), 0, 0);
    }
    applyDraft(next);
  }

  const days = calendarDays(cursor);
  const today = new Date();

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <button
        id={id}
        type="button"
        className={cx(
          'zhq-select zhq-select--block text-left',
          !value && 'text-slate-400',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {formatDisplay(value)}
      </button>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          value={value}
          required
          onChange={() => undefined}
        />
      ) : null}

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Choose date and time"
              style={panelStyle}
              className="w-[19.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
            >
              <div className="border-b border-slate-100 bg-support/40 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-white/80"
                    aria-label="Previous month"
                    onClick={() => setCursor((current) => addMonths(current, -1))}
                  >
                    ‹
                  </button>
                  <div className="text-sm font-medium text-primary-deep">{monthLabel(cursor)}</div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-white/80"
                    aria-label="Next month"
                    onClick={() => setCursor((current) => addMonths(current, 1))}
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 px-3 pb-3">
                {days.map((day) => {
                  const inMonth = day.getMonth() === cursor.getMonth();
                  const isSelected = sameDay(day, draft);
                  const isToday = sameDay(day, today);
                  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                  const minDay = minDate
                    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
                    : null;
                  const disabled = Boolean(minDay && dayStart < minDay);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      className={cx(
                        'flex h-9 items-center justify-center rounded-lg text-sm transition',
                        !inMonth && 'text-slate-300',
                        inMonth && !isSelected && 'text-slate-700 hover:bg-support/60',
                        isToday && !isSelected && 'ring-1 ring-primary/30',
                        isSelected && 'bg-primary font-medium text-white hover:bg-primary',
                        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                      )}
                      onClick={() => chooseDay(day)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 px-3 py-3">
                <label className="block text-xs text-slate-600">
                  <span className="mb-1 block">Hour</span>
                  <select
                    className="zhq-select zhq-select--block"
                    value={toHour12(draft.getHours())}
                    onChange={(e) => {
                      const next = new Date(draft);
                      next.setHours(toHour24(Number(e.target.value), isPm(draft.getHours())));
                      applyDraft(next);
                    }}
                  >
                    {HOURS_12.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-slate-600">
                  <span className="mb-1 block">Minute</span>
                  <select
                    className="zhq-select zhq-select--block"
                    value={snapMinutes(draft.getMinutes())}
                    onChange={(e) => {
                      const next = new Date(draft);
                      next.setMinutes(Number(e.target.value));
                      applyDraft(next);
                    }}
                  >
                    {MINUTES.map((minute) => (
                      <option key={minute} value={minute}>
                        {pad(minute)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-slate-600">
                  <span className="mb-1 block">AM/PM</span>
                  <select
                    className="zhq-select zhq-select--block"
                    value={isPm(draft.getHours()) ? 'pm' : 'am'}
                    onChange={(e) => {
                      const next = new Date(draft);
                      next.setHours(toHour24(toHour12(draft.getHours()), e.target.value === 'pm'));
                      applyDraft(next);
                    }}
                  >
                    <option value="am">AM</option>
                    <option value="pm">PM</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2.5">
                <button
                  type="button"
                  className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-white"
                  onClick={() => {
                    const now = new Date();
                    now.setMinutes(snapMinutes(now.getMinutes()), 0, 0);
                    applyDraft(now);
                    setCursor(startOfMonth(now));
                  }}
                >
                  Now
                </button>
                <button
                  type="button"
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-inherit hover:brightness-[0.98]"
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
