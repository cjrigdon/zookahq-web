import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SVGProps,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { parseWallClockDateTime } from '../../lib/datetimeInput';
import { formatDateTime } from '../../lib/formatDateTime';

export type TimelineItem = {
  key: string;
  when: string;
  end?: string | null;
  label: string;
  kind: string;
  href?: string;
};

type Span = {
  key: string;
  label: string;
  kind: string;
  href?: string;
  startMs: number;
  endMs: number;
  hasEnd: boolean;
};

type PointMarker = {
  key: string;
  label: string;
  kind: string;
  href?: string;
  atMs: number;
};

type IconProps = SVGProps<SVGSVGElement>;

function TimelineSvg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function EventKindIcon(props: IconProps) {
  return (
    <TimelineSvg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </TimelineSvg>
  );
}

function FunctionKindIcon(props: IconProps) {
  return (
    <TimelineSvg {...props}>
      <path d="M4 19V7l8-3 8 3v12" />
      <path d="M9 19v-6h6v6" />
      <path d="M9 10h6" />
    </TimelineSvg>
  );
}

function ServiceKindIcon(props: IconProps) {
  return (
    <TimelineSvg {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </TimelineSvg>
  );
}

function LoadInKindIcon(props: IconProps) {
  return (
    <TimelineSvg {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </TimelineSvg>
  );
}

function LoadOutKindIcon(props: IconProps) {
  return (
    <TimelineSvg {...props}>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </TimelineSvg>
  );
}

function DefaultKindIcon(props: IconProps) {
  return (
    <TimelineSvg {...props}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v4l2.5 2.5" />
    </TimelineSvg>
  );
}

const kindMeta: Record<
  string,
  {
    Icon: (props: IconProps) => ReactNode;
    bar: string;
    chip: string;
  }
> = {
  Event: {
    Icon: EventKindIcon,
    bar: 'bg-primary/40',
    chip: 'bg-support text-primary-deep',
  },
  Function: {
    Icon: FunctionKindIcon,
    bar: 'bg-accent/55',
    chip: 'bg-accent/15 text-text',
  },
  'Service order': {
    Icon: ServiceKindIcon,
    bar: 'bg-primary/25',
    chip: 'bg-white text-primary',
  },
  'Load in': {
    Icon: LoadInKindIcon,
    bar: 'bg-slate-300/90',
    chip: 'bg-slate-50 text-slate-700',
  },
  'Load out': {
    Icon: LoadOutKindIcon,
    bar: 'bg-slate-300/90',
    chip: 'bg-slate-50 text-slate-700',
  },
};

const fallbackMeta = {
  Icon: DefaultKindIcon,
  bar: 'bg-slate-200',
  chip: 'bg-white text-text',
};

const LANE_HEIGHT = 36;
const HOUR_MS = 60 * 60 * 1000;
const PX_PER_HOUR = 88;
const MIN_TRACK_WIDTH = 720;
const MARKER_SLOT_PX = 72;
const CLUSTER_PX = 28;
const AXIS_PAD_PCT = 1.5;
const MIN_RANGE_MS = HOUR_MS;
const POINT_MARKER_HEIGHT = 52;

function toMs(value: string): number | null {
  const date = parseWallClockDateTime(value);
  if (!date) return null;
  return date.getTime();
}

function sameCalendarDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateOnly(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

function formatAxisDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatHoverSchedule(atMs: number, peerMs?: number | null): string {
  if (peerMs == null || peerMs === atMs) return formatDateTime(atMs);

  const start = Math.min(atMs, peerMs);
  const end = Math.max(atMs, peerMs);

  if (sameCalendarDay(start, end)) {
    return `${formatDateOnly(start)} · ${formatTime(start)} – ${formatTime(end)}`;
  }

  return `${formatDateTime(start)} → ${formatDateTime(end)}`;
}

function buildSpans(items: TimelineItem[]): Span[] {
  const spans: Span[] = [];
  for (const item of items) {
    const startMs = toMs(item.when);
    if (startMs == null) continue;
    const endMs = item.end ? toMs(item.end) : null;
    const hasEnd = endMs != null && endMs > startMs;
    spans.push({
      key: item.key,
      label: item.label,
      kind: item.kind,
      href: item.href,
      startMs,
      endMs: hasEnd ? endMs! : startMs,
      hasEnd,
    });
  }
  return spans.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}

function assignLanes(spans: Span[]): number[] {
  const laneEnds: number[] = [];
  const lanes: number[] = [];

  for (const span of spans) {
    const visualEnd = span.hasEnd ? span.endMs : span.startMs;
    let lane = laneEnds.findIndex((end) => end <= span.startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(visualEnd);
    } else {
      laneEnds[lane] = visualEnd;
    }
    lanes.push(lane);
  }

  return lanes;
}

function buildPointMarkers(spans: Span[]): PointMarker[] {
  return spans
    .filter((span) => !span.hasEnd)
    .map((span) => ({
      key: span.key,
      label: span.label,
      kind: span.kind,
      href: span.href,
      atMs: span.startMs,
    }))
    .sort((a, b) => a.atMs - b.atMs);
}

function pct(ms: number, minMs: number, rangeMs: number): number {
  if (rangeMs <= 0) return AXIS_PAD_PCT;
  const raw = ((ms - minMs) / rangeMs) * 100;
  return AXIS_PAD_PCT + (raw * (100 - AXIS_PAD_PCT * 2)) / 100;
}

function clusterPoints(points: PointMarker[], minMs: number, rangeMs: number, trackWidth: number) {
  const clusters: { xPct: number; points: PointMarker[] }[] = [];

  for (const point of points) {
    const xPct = pct(point.atMs, minMs, rangeMs);
    const last = clusters[clusters.length - 1];
    if (last && (Math.abs(last.xPct - xPct) * trackWidth) / 100 < CLUSTER_PX) {
      last.points.push(point);
      last.xPct =
        last.points.reduce((sum, p) => sum + pct(p.atMs, minMs, rangeMs), 0) / last.points.length;
    } else {
      clusters.push({ xPct, points: [point] });
    }
  }

  return clusters;
}

function buildHourTicks(minMs: number, maxMs: number): number[] {
  const first = Math.ceil(minMs / HOUR_MS) * HOUR_MS;
  const ticks: number[] = [];
  for (let t = first; t <= maxMs; t += HOUR_MS) {
    ticks.push(t);
  }
  if (ticks.length === 0 || ticks[0] !== minMs) ticks.unshift(Math.floor(minMs / HOUR_MS) * HOUR_MS);
  return ticks.filter(
    (t, i, arr) => t >= minMs - HOUR_MS / 4 && t <= maxMs + HOUR_MS / 4 && arr.indexOf(t) === i,
  );
}

function PortalTooltip({
  open,
  anchorRef,
  kind,
  label,
  schedule,
  href,
  align = 'center',
  tooltipId,
  onEnter,
  onLeave,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  kind: string;
  label: string;
  schedule: string;
  href?: string;
  align?: 'left' | 'center' | 'right';
  tooltipId: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left:
          align === 'left'
            ? rect.left
            : align === 'right'
              ? rect.right
              : rect.left + rect.width / 2,
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, align, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  const transform =
    align === 'left' ? 'translateX(0)' : align === 'right' ? 'translateX(-100%)' : 'translateX(-50%)';

  return createPortal(
    <div
      id={tooltipId}
      role="tooltip"
      className="fixed z-[200]"
      style={{ top: coords.top, left: coords.left, transform }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="w-max rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{kind}</p>
        <p className="mt-1 text-sm font-medium text-text">{label}</p>
        <p className="mt-1 whitespace-nowrap text-xs text-slate-600">{schedule}</p>
        {href ? (
          <Link
            to={href}
            className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
          >
            Open details
          </Link>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function RangeBar({
  span,
  left,
  width,
  top,
  open,
  onOpen,
  onClose,
}: {
  span: Span;
  left: number;
  width: number;
  top: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const meta = kindMeta[span.kind] ?? fallbackMeta;
  const Icon = meta.Icon;
  const tooltipId = useId();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const align = left < 18 ? 'left' : left + width > 82 ? 'right' : 'center';

  function handleOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onOpen();
  }

  function handleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(onClose, 150);
  }

  return (
    <div
      ref={anchorRef}
      className={['absolute', open ? 'z-50' : 'z-10'].join(' ')}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        top,
        height: LANE_HEIGHT - 8,
      }}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        type="button"
        className={[
          'flex h-full w-full items-center gap-1.5 overflow-hidden rounded-md px-2 text-left shadow-sm transition',
          meta.bar,
          meta.chip,
          open ? 'ring-2 ring-primary/25' : '',
        ].join(' ')}
        aria-label={`${span.kind}: ${span.label}`}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={handleOpen}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70">
          <Icon className="h-3 w-3" />
        </span>
        <span className="truncate text-xs font-medium">{span.label}</span>
      </button>

      <PortalTooltip
        open={open}
        anchorRef={anchorRef}
        tooltipId={tooltipId}
        kind={span.kind}
        label={span.label}
        schedule={formatHoverSchedule(span.startMs, span.endMs)}
        href={span.href}
        align={align}
        onEnter={handleOpen}
        onLeave={handleClose}
      />
    </div>
  );
}

function PointMarkerView({
  point,
  open,
  onOpen,
  onClose,
  align = 'center',
}: {
  point: PointMarker;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  align?: 'left' | 'center' | 'right';
}) {
  const meta = kindMeta[point.kind] ?? fallbackMeta;
  const Icon = meta.Icon;
  const tooltipId = useId();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onOpen();
  }

  function handleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(onClose, 150);
  }

  return (
    <div
      ref={anchorRef}
      className={['relative flex max-w-[5.5rem] flex-col items-center', open ? 'z-50' : 'z-0'].join(
        ' ',
      )}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <button
        type="button"
        className={[
          'flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-400 shadow-sm transition',
          meta.chip,
          open ? 'ring-2 ring-primary/25' : '',
        ].join(' ')}
        aria-label={`${point.kind}: ${point.label}`}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={handleOpen}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      <p className="mt-0.5 w-full truncate text-center text-[11px] leading-tight font-medium text-text">
        {point.label}
      </p>

      <PortalTooltip
        open={open}
        anchorRef={anchorRef}
        tooltipId={tooltipId}
        kind={point.kind}
        label={point.label}
        schedule={formatDateTime(point.atMs)}
        href={point.href}
        align={align}
        onEnter={handleOpen}
        onLeave={handleClose}
      />
    </div>
  );
}

export function HorizontalTimeline({
  items,
  title = 'Timeline',
  emptyText = 'No timed items yet.',
}: {
  items: TimelineItem[];
  title?: string;
  emptyText?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const spans = buildSpans(items);
  const rangedSpans = spans.filter((span) => span.hasEnd);
  const pointMarkers = buildPointMarkers(spans);
  const lanes = assignLanes(rangedSpans);
  const laneCount = rangedSpans.length === 0 ? 0 : Math.max(...lanes) + 1;

  const rawMin = spans.length === 0 ? 0 : Math.min(...spans.map((s) => s.startMs));
  const rawMax =
    spans.length === 0
      ? 0
      : Math.max(...spans.map((s) => (s.hasEnd ? s.endMs : s.startMs)));
  const minMs = spans.length === 0 ? 0 : Math.floor(rawMin / HOUR_MS) * HOUR_MS;
  const maxMs =
    spans.length === 0
      ? 0
      : Math.max(Math.ceil(rawMax / HOUR_MS) * HOUR_MS, minMs + MIN_RANGE_MS);
  const rangeMs = Math.max(maxMs - minMs, MIN_RANGE_MS);
  const rangeHours = rangeMs / HOUR_MS;
  const trackWidth = Math.max(
    MIN_TRACK_WIDTH,
    Math.ceil(rangeHours) * PX_PER_HOUR,
    Math.max(pointMarkers.length, 1) * MARKER_SLOT_PX,
  );
  const clusters = clusterPoints(pointMarkers, minMs, rangeMs, trackWidth);
  const maxStack = clusters.reduce((max, c) => Math.max(max, c.points.length), 1);
  const markerAreaHeight =
    pointMarkers.length === 0 ? 0 : maxStack * POINT_MARKER_HEIGHT;
  const hourTicks = buildHourTicks(minMs, maxMs);
  const tickStep = rangeHours > 18 ? 2 : 1;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-5 py-3">
        <h3 className="font-[family-name:var(--font-display)] text-lg">{title}</h3>
      </header>

      {spans.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="scrollbar-timeline overflow-x-auto px-4 py-3 pb-4">
          <div className="relative" style={{ width: trackWidth, minWidth: '100%' }}>
            {rangedSpans.length > 0 ? (
              <div className="relative mb-2" style={{ height: laneCount * LANE_HEIGHT }}>
                {rangedSpans.map((span, index) => {
                  const left = pct(span.startMs, minMs, rangeMs);
                  const right = pct(span.endMs, minMs, rangeMs);
                  return (
                    <RangeBar
                      key={`${span.key}-range`}
                      span={span}
                      left={left}
                      width={Math.max(right - left, 1.2)}
                      top={lanes[index] * LANE_HEIGHT + 2}
                      open={openKey === span.key}
                      onOpen={() => setOpenKey(span.key)}
                      onClose={() =>
                        setOpenKey((current) => (current === span.key ? null : current))
                      }
                    />
                  );
                })}
              </div>
            ) : null}

            <div className="relative h-10">
              <div className="absolute inset-x-0 top-1.5 h-px bg-gradient-to-r from-primary/15 via-primary/45 to-primary/15" />
              {hourTicks.map((tick, index) => {
                if (index % tickStep !== 0) return null;
                const prevVisible = index === 0 ? null : hourTicks[index - tickStep];
                const showDate = prevVisible == null || !sameCalendarDay(prevVisible, tick);
                return (
                  <div
                    key={tick}
                    className="absolute top-0 -translate-x-1/2"
                    style={{ left: `${pct(tick, minMs, rangeMs)}%` }}
                  >
                    <span className="mx-auto block h-1.5 w-px bg-slate-300" />
                    <div className="mt-1.5 whitespace-nowrap text-center leading-none">
                      {showDate ? (
                        <span className="block text-[10px] font-medium text-slate-600">
                          {formatAxisDate(tick)}
                        </span>
                      ) : null}
                      <span
                        className={[
                          'block text-[10px] text-slate-500',
                          showDate ? 'mt-1' : '',
                        ].join(' ')}
                      >
                        {formatTime(tick)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {pointMarkers.length > 0 ? (
              <div className="relative mt-1" style={{ height: markerAreaHeight + 12 }}>
                {clusters.map((cluster) => {
                  const align =
                    cluster.xPct < 18 ? 'left' : cluster.xPct > 82 ? 'right' : 'center';
                  const clusterOpen = cluster.points.some((p) => p.key === openKey);

                  return (
                    <div
                      key={cluster.points.map((p) => p.key).join('|')}
                      className={[
                        'absolute top-0 flex -translate-x-1/2 flex-col items-center',
                        clusterOpen ? 'z-50' : 'z-10',
                      ].join(' ')}
                      style={{ left: `${cluster.xPct}%` }}
                    >
                      <span className="h-3 w-px shrink-0 bg-slate-400" aria-hidden="true" />
                      <div className="flex flex-col items-center gap-1">
                        {cluster.points.map((point) => (
                          <PointMarkerView
                            key={point.key}
                            point={point}
                            align={align}
                            open={openKey === point.key}
                            onOpen={() => setOpenKey(point.key)}
                            onClose={() =>
                              setOpenKey((current) => (current === point.key ? null : current))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
