import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { ROLE_LABEL, ROUTE, STATUS_META, TONE_CLASS, routeProgress } from '@/lib/status';
import type { HistoryEntry, Status, Ticket } from '@/lib/types';
import { bdt, cn, formatDate } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const meta = STATUS_META[status];
  const tone = TONE_CLASS[meta.tone];
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', tone.chip, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      {meta.label}
    </span>
  );
}

/** Vehicle registration drawn as a Bangladeshi number plate. */
export function Plate({ value, size = 'sm', className }: { value: string; size?: 'sm' | 'lg'; className?: string }) {
  const m = value.toUpperCase().match(/^(.*?)[\s-]*([A-Z]{1,3})[\s-]+(\d{2})[\s-]?(\d{4})$/);
  const top = m ? [m[1].trim(), m[2]].filter(Boolean).join('-') : null;
  const bottom = m ? `${m[3]}-${m[4]}` : value.toUpperCase();
  return (
    <span
      className={cn(
        'font-narrow inline-flex shrink-0 flex-col items-center justify-center rounded-[4px] border-[1.5px] border-foreground bg-white font-bold leading-none text-foreground',
        size === 'sm' ? 'min-w-[84px] px-1.5 py-1' : 'min-w-[132px] px-3 py-1.5',
        className
      )}
      title={value}
    >
      {top && <span className={size === 'sm' ? 'text-[9px]' : 'text-[13px]'}>{top}</span>}
      <span className={cn('tnum', size === 'sm' ? 'mt-0.5 text-[13px]' : 'mt-1 text-[22px]')}>{bottom}</span>
    </span>
  );
}

/** Thin segmented track: how far along the route a ticket is. */
export function RouteTrack({ status, className }: { status: Status; className?: string }) {
  const at = routeProgress(status);
  const tone = TONE_CLASS[STATUS_META[status].tone].bar;
  return (
    <div className={cn('flex gap-[3px]', className)} aria-label={`Step ${at + 1} of ${ROUTE.length}`}>
      {ROUTE.map((s, i) => (
        <span
          key={s}
          className={cn('h-1 flex-1 rounded-full', at < 0 ? 'bg-destructive/25' : i <= at ? tone : 'bg-foreground/10')}
        />
      ))}
    </div>
  );
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function Stamp({ at }: { at: string }) {
  const d = new Date(at);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <time dateTime={at} className="tnum shrink-0 text-right text-xs leading-tight text-muted-foreground">
      <span className="block font-semibold text-foreground">{time}</span>
      {!sameDay(d, new Date()) && <span>{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
    </time>
  );
}

type Stop =
  | { kind: 'past'; entry: HistoryEntry; current: boolean }
  | { kind: 'note'; entry: HistoryEntry }
  | { kind: 'ahead'; status: Status };

/**
 * The ticket's history drawn as a GPS route: solid track for what happened,
 * a live position dot for now, dashed track for the stops still ahead.
 */
export function Journey({ history, status }: { history: HistoryEntry[]; status: Status }) {
  const lastMove = history.map((h) => h.action !== 'update').lastIndexOf(true);
  const stops: Stop[] = history.map((entry, i) =>
    entry.action === 'update' ? { kind: 'note', entry } : { kind: 'past', entry, current: i === lastMove }
  );
  const at = routeProgress(status);
  if (at >= 0) ROUTE.slice(at + 1).forEach((s) => stops.push({ kind: 'ahead', status: s }));

  return (
    <ol>
      {stops.map((stop, i) => {
        const next = stops[i + 1];
        const isLast = !next;
        const dashed = next?.kind === 'ahead';
        return (
          <li key={i} className={cn('relative grid grid-cols-[24px_1fr] gap-x-3', !isLast && 'pb-5')}>
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[11px] top-[18px] -bottom-[2px] w-0',
                  dashed ? 'border-l-2 border-dashed border-foreground/20' : 'border-l-2 border-foreground/70'
                )}
              />
            )}
            <Marker stop={stop} status={status} />
            <StopBody stop={stop} />
          </li>
        );
      })}
    </ol>
  );
}

function Marker({ stop, status }: { stop: Stop; status: Status }) {
  const base = 'relative z-10 mt-0.5 flex h-4 w-4 items-center justify-center justify-self-center rounded-full';
  if (stop.kind === 'ahead') return <span className={cn(base, 'border-2 border-dashed border-foreground/30 bg-background')} />;
  if (stop.kind === 'note') return <span className={cn(base, 'h-2 w-2 mt-1.5 bg-foreground/30')} />;
  if (stop.current && status === 'CLOSED')
    return <span className={cn(base, 'h-5 w-5 -mt-0.5 bg-ok text-white')}><Check className="h-3 w-3" strokeWidth={3} /></span>;
  if (stop.current && status === 'CANCELLED')
    return <span className={cn(base, 'h-5 w-5 -mt-0.5 bg-destructive text-white')}><X className="h-3 w-3" strokeWidth={3} /></span>;
  if (stop.current)
    return (
      <span className={cn(base, 'bg-fix ring-4 ring-fix/20')}>
        <span className="position-ping absolute inset-0 rounded-full bg-fix" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    );
  return <span className={cn(base, 'h-3 w-3 mt-1 bg-foreground')} />;
}

function StopBody({ stop }: { stop: Stop }) {
  if (stop.kind === 'ahead') {
    return <p className="pt-px text-sm text-muted-foreground/90">{STATUS_META[stop.status].upcoming}</p>;
  }
  const h = stop.entry;
  const name = h.by?.name || 'Unknown';
  const role = ROLE_LABEL[h.role];
  // Skip the role when the person's name already says it.
  const who = name.toLowerCase().includes(role.toLowerCase()) ? name : `${name}, ${role.toLowerCase()}`;
  if (stop.kind === 'note') {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {h.note} <span className="text-muted-foreground/80">by {who}</span>
        </p>
        <Stamp at={h.at} />
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={cn('text-sm font-semibold', stop.current && 'text-[15px]')}>
          {h.action === 'create' ? 'Complaint logged' : STATUS_META[h.to].label}
        </p>
        <p className="text-sm text-muted-foreground">{who}</p>
        {h.note && <p className="mt-1 whitespace-pre-line text-sm">{h.note}</p>}
      </div>
      <Stamp at={h.at} />
    </div>
  );
}

/** One ticket in a list. Amber edge = waiting on the person viewing it. */
export function TicketRow({ ticket: t, yourMove }: { ticket: Ticket; yourMove?: boolean }) {
  return (
    <Link
      href={`/tickets/${t._id}`}
      className={cn(
        'relative block px-4 py-3.5 transition-colors hover:bg-muted/70 focus-visible:z-10',
        yourMove && 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{t.customer.name}</p>
          <p className="truncate text-sm text-muted-foreground">{t.complaint}</p>
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <Plate value={t.vehicleRegNo} />
        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
          <p className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="font-narrow tnum text-[13px] font-semibold text-foreground">{t.ticketNo}</span>
            {t.location?.zone && <span>{t.location.zone.name}</span>}
            {t.scheduledDate && <span>{formatDate(t.scheduledDate)}</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3">
            {t.technician && <span>{t.technician.name}</span>}
            <span className="tnum">{bdt(t.finalCharge ?? t.serviceCharge)}</span>
          </p>
        </div>
      </div>
      <RouteTrack status={t.status} className="mt-3" />
    </Link>
  );
}
