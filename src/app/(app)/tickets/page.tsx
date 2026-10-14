'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, PlusCircle, Search } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { PageHeader } from '@/components/app-shell';
import { Plate, RouteTrack, StatusBadge, TicketRow } from '@/components/ticket-bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';
import { TABS, YOUR_MOVE } from '@/lib/status';
import type { Ticket } from '@/lib/types';
import { bdt, cn, formatDate, timeAgo } from '@/lib/utils';

export default function TicketsPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-64" />}>
      <TicketList />
    </React.Suspense>
  );
}

function TicketList() {
  const { user } = useAuth();
  const role = user!.role;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const tabs = TABS[role];
  const tab = tabs.find((t) => t.key === params.get('tab')) || tabs[0];
  const page = Number(params.get('page')) || 1;
  const [q, setQ] = React.useState(params.get('q') || '');
  const [debouncedQ, setDebouncedQ] = React.useState(q);

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(id);
  }, [q]);

  const setParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  React.useEffect(() => {
    if ((params.get('q') || '') !== debouncedQ) setParams({ q: debouncedQ || null, page: null });
  }, [debouncedQ, params, setParams]);

  const query = new URLSearchParams({ page: String(page), limit: '20' });
  if (tab.statuses.length) query.set('status', tab.statuses.join(','));
  if (debouncedQ) query.set('q', debouncedQ);

  const { data, isLoading } = useSWR<{ tickets: Ticket[]; total: number; pages: number }>(`/tickets?${query}`, fetcher, {
    keepPreviousData: true,
  });

  return (
    <>
      <PageHeader
        title={role === 'technician' ? 'My Jobs' : 'Tickets'}
        description={data ? `${data.total} ${tab.key === 'all' ? '' : `${tab.label.toLowerCase()} `}ticket${data.total === 1 ? '' : 's'}` : undefined}
        action={
          (role === 'call_center' || role === 'admin') && (
            <Link href="/tickets/new">
              <Button className="w-full sm:w-auto"><PlusCircle /> New complaint</Button>
            </Link>
          )
        }
      />

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by IMEI, plate, phone, name or ticket number" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-[10px] border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setParams({ tab: t.key, page: null })}
              className={cn('whitespace-nowrap rounded-[7px] px-3 py-1.5 text-sm font-semibold transition-colors', t.key === tab.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data ? (
        <Skeleton className="h-72" />
      ) : !data?.tickets.length ? (
        <div className="rounded-[10px] border border-dashed bg-card/60 px-6 py-12 text-center">
          <p className="font-semibold">{debouncedQ ? `Nothing matches "${debouncedQ}"` : `No tickets in ${tab.label.toLowerCase()}`}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {debouncedQ ? 'Check the IMEI, plate or phone number, or try another tab.' : 'Try another tab, or search all tickets.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile rows */}
          <div className="divide-y overflow-hidden rounded-[10px] border bg-card md:hidden">
            {data.tickets.map((t) => <TicketRow key={t._id} ticket={t} yourMove={YOUR_MOVE[role].includes(t.status)} />)}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[10px] border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Visit</th>
                  <th className="px-4 py-3 font-semibold">Technician</th>
                  <th className="px-4 py-3 text-right font-semibold">Charge</th>
                  <th className="w-56 px-4 py-3 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.tickets.map((t) => (
                  <tr
                    key={t._id}
                    className={cn('cursor-pointer align-top hover:bg-muted/60', YOUR_MOVE[role].includes(t.status) && '[&>td:first-child]:shadow-[inset_4px_0_0_hsl(var(--primary))]')}
                    onClick={() => router.push(`/tickets/${t._id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <Plate value={t.vehicleRegNo} />
                      <Link href={`/tickets/${t._id}`} onClick={(e) => e.stopPropagation()} className="font-narrow tnum mt-1.5 block text-[13px] font-semibold text-fix hover:underline">
                        {t.ticketNo}
                      </Link>
                    </td>
                    <td className="max-w-[260px] px-4 py-3.5">
                      <p className="font-semibold">{t.customer.name}</p>
                      <p className="tnum text-xs text-muted-foreground">{t.customer.phone}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{t.complaint}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p>{t.location?.zone?.name || <span className="text-muted-foreground">No zone yet</span>}</p>
                      <p className="text-xs text-muted-foreground">{t.scheduledDate ? formatDate(t.scheduledDate) : 'Not scheduled'}</p>
                    </td>
                    <td className="px-4 py-3.5">{t.technician?.name || <span className="text-muted-foreground">None yet</span>}</td>
                    <td className="tnum px-4 py-3.5 text-right font-medium">{bdt(t.finalCharge ?? t.serviceCharge)}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={t.status} />
                      <RouteTrack status={t.status} className="mt-2.5" />
                      <p className="mt-1.5 text-xs text-muted-foreground">Updated {timeAgo(t.updatedAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data.pages}</span>
              <Button variant="outline" size="icon" disabled={page >= data.pages} onClick={() => setParams({ page: String(page + 1) })} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
