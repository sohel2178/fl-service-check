'use client';
import Link from 'next/link';
import useSWR from 'swr';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { InstallBanner } from '@/components/pwa';
import { TicketRow } from '@/components/ticket-bits';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';
import { STATUS_META, TABS, TONE_CLASS, YOUR_MOVE, type Tone } from '@/lib/status';
import type { Role, Status, Ticket } from '@/lib/types';
import { bdt, cn } from '@/lib/utils';

interface Stats {
  counts: Partial<Record<Status, number>>;
  scheduledToday: number;
  totalCollected: number;
}

const OPEN: Status[] = ['PENDING_MANAGER', 'CONTACTING_CUSTOMER', 'CUSTOMER_AGREED', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'];

/** What the list on this page holds, per role. */
const QUEUE: Record<Role, Status[]> = {
  call_center: OPEN,
  manager: YOUR_MOVE.manager,
  technician: YOUR_MOVE.technician,
  admin: YOUR_MOVE.admin,
};

function headline(role: Role, n: number) {
  if (role === 'call_center') return n === 0 ? 'None of your complaints are open' : `${n} of your complaints ${n === 1 ? 'is' : 'are'} still open`;
  const noun = role === 'technician' ? (n === 1 ? 'job' : 'jobs') : n === 1 ? 'ticket' : 'tickets';
  return n === 0 ? `No ${role === 'technician' ? 'jobs' : 'tickets'} are waiting on you` : `${n} ${noun} ${n === 1 ? 'is' : 'are'} waiting on you`;
}

const PHASES: { tone: Tone; label: string }[] = [
  { tone: 'office', label: 'With manager' },
  { tone: 'field', label: 'With technician' },
  { tone: 'review', label: 'To verify' },
  { tone: 'done', label: 'Closed' },
  { tone: 'cancelled', label: 'Cancelled' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user!.role;
  const { data: stats } = useSWR<Stats>('/dashboard/stats', fetcher, { refreshInterval: 30000 });
  const { data: queue, isLoading } = useSWR<{ tickets: Ticket[]; total: number }>(
    `/tickets?status=${QUEUE[role].join(',')}&limit=8`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const byTone = PHASES.map((p) => ({
    ...p,
    count: (Object.keys(STATUS_META) as Status[])
      .filter((s) => STATUS_META[s].tone === p.tone)
      .reduce((n, s) => n + (stats?.counts[s] || 0), 0),
  }));
  const total = byTone.reduce((n, p) => n + p.count, 0);
  const tabFor = (tone: Tone) =>
    TABS[role].find((t) => t.statuses.length && t.statuses.every((s) => STATUS_META[s].tone === tone))?.key;
  const canLog = role === 'call_center' || role === 'admin';

  return (
    <>
      <InstallBanner />
      <section className="mb-8">
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {queue ? (
          <h1 className="font-wide mt-1 max-w-[22ch] text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[40px]">
            {headline(role, queue.total)}
          </h1>
        ) : (
          <Skeleton className="mt-2 h-10 w-3/4 max-w-md" />
        )}
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="tnum font-semibold text-foreground">{stats?.scheduledToday ?? '–'}</span> scheduled for today
          </span>
          {role !== 'call_center' && (
            <span>
              <span className="tnum font-semibold text-foreground">{stats ? bdt(stats.totalCollected) : '–'}</span> collected so far
            </span>
          )}
        </p>
        {canLog && (
          <Link href="/tickets/new" className="mt-5 inline-block">
            <Button size="lg"><PlusCircle /> New complaint</Button>
          </Link>
        )}
      </section>

      {total > 0 && (
        <section className="mb-8" aria-label="Tickets by phase">
          <div className="flex h-3 overflow-hidden rounded-full bg-foreground/10">
            {byTone.filter((p) => p.count).map((p) => (
              <span key={p.tone} className={cn('h-full border-r-2 border-background last:border-r-0', TONE_CLASS[p.tone].bar)} style={{ width: `${(p.count / total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-7">
            {byTone.map((p) => {
              const tab = tabFor(p.tone);
              const body = (
                <>
                  <span className={cn('h-2.5 w-2.5 rounded-full', TONE_CLASS[p.tone].bar)} />
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="tnum font-semibold">{p.count}</span>
                </>
              );
              return (
                <li key={p.tone}>
                  {tab ? (
                    <Link href={`/tickets?tab=${tab}`} className="flex items-center gap-2 text-sm hover:underline">{body}</Link>
                  ) : (
                    <span className="flex items-center gap-2 text-sm">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-wide text-lg font-bold">{role === 'call_center' ? 'Open complaints' : 'Your queue'}</h2>
          <Link href="/tickets" className="text-sm font-semibold text-fix hover:underline">See all tickets</Link>
        </div>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : queue?.tickets.length ? (
          <div className="divide-y overflow-hidden rounded-[10px] border bg-card">
            {queue.tickets.map((t) => (
              <TicketRow key={t._id} ticket={t} yourMove={YOUR_MOVE[role].includes(t.status)} />
            ))}
          </div>
        ) : (
          <div className="rounded-[10px] border border-dashed bg-card/60 px-6 py-10 text-center">
            <p className="font-semibold">Your queue is clear.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canLog ? 'Log a new complaint when a customer calls.' : 'New tickets for you will show up here automatically.'}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
