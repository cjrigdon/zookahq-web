import { parseWallClockDateTime } from './datetimeInput';

const timeNoSeconds: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

const timeWithSeconds: Intl.DateTimeFormatOptions = {
  ...timeNoSeconds,
  second: '2-digit',
};

type FormatOptions = {
  seconds?: boolean;
  /** Treat value as venue wall-clock time (no UTC offset conversion). */
  wallClock?: boolean;
};

function toDate(
  value: string | number | Date | null | undefined,
  wallClock?: boolean,
): Date | null {
  if (value == null || value === '') return null;
  if (wallClock) return parseWallClockDateTime(value);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  options?: FormatOptions,
): string {
  if (value == null || value === '') return '—';
  const date = toDate(value, options?.wallClock);
  if (!date) return String(value);
  return date.toLocaleString(undefined, options?.seconds ? timeWithSeconds : timeNoSeconds);
}

export function formatDateTimeRange(
  start: string | number | Date | null | undefined,
  end?: string | number | Date | null,
  options?: FormatOptions,
): string {
  const opts = { wallClock: true, ...options };
  const from = formatDateTime(start, opts);
  if (!end) return from;
  const to = formatDateTime(end, opts);
  if (from === '—' || to === '—') return from;
  return `${from} → ${to}`;
}
