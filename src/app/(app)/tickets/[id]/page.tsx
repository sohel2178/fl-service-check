'use client';
import * as React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Phone } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Journey, Plate, StatusBadge } from '@/components/ticket-bits';
import { TicketActions } from '@/components/ticket-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, fetcher } from '@/lib/api';
import { OUTCOME_LABEL, YOUR_MOVE_TEXT, waitingOn } from '@/lib/status';
import type { AllowedAction, Ticket } from '@/lib/types';
import { bdt, cn, formatDate } from '@/lib/utils';

function Item({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-medium">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t px-4 py-5 first:border-t-0 sm:px-6">
      <h2 className="font-wide mb-3 text-[15px] font-bold">{title}</h2>
      <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

const PhoneLink = ({ phone }: { phone?: string }) =>
  phone ? (
    <a href={`tel:${phone}`} className="tnum inline-flex items-center gap-1.5 text-fix hover:underline">
      <Phone className="h-3.5 w-3.5" />
      {phone}
    </a>
  ) : (
    <span className="text-muted-foreground">Not given</span>
  );

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { data, error, mutate } = useSWR<{ ticket: Ticket; actions: AllowedAction[] }>(`/tickets/${params.id}`, fetcher, {
    refreshInterval: 30000,
  });

  if (error) {
    return (
      <div className="rounded-[10px] border bg-card p-10 text-center">
        <p className="font-semibold">{error instanceof ApiError ? error.message : 'This ticket could not be loaded.'}</p>
        <Link href="/tickets" className="mt-3 inline-block text-sm font-semibold text-fix hover:underline">Back to tickets</Link>
      </div>
    );
  }
  if (!data) return <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div>;

  const { ticket: t, actions } = data;
  const yourMove = actions.length > 0;

  return (
    <>
      <Link href="/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tickets
      </Link>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-narrow tnum text-[15px] font-semibold text-muted-foreground">{t.ticketNo}</span>
            <StatusBadge status={t.status} />
          </div>
          <h1 className="font-wide mt-1.5 text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">{t.customer.name}</h1>
          <p className="mt-1.5 max-w-prose text-muted-foreground">{t.complaint}</p>
        </div>
        <Plate value={t.vehicleRegNo} size="lg" className="self-start sm:self-end" />
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section
            className={cn('rounded-[10px] border bg-card p-4 sm:p-6', yourMove && 'border-primary shadow-[inset_0_4px_0_hsl(var(--primary))]')}
            aria-label="Next step"
          >
            <h2 className="font-wide mb-1 text-[15px] font-bold">{yourMove ? 'Your move' : 'Where it stands'}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{yourMove ? YOUR_MOVE_TEXT[t.status] || waitingOn(t) : waitingOn(t)}</p>
            <TicketActions ticket={t} actions={actions} user={user!} onChange={(r) => mutate(r, { revalidate: false })} />
          </section>

          {/* On small screens the route sits right under the next step. */}
          <section className="rounded-[10px] border bg-card p-4 sm:p-6 lg:hidden" aria-label="Route">
            <h2 className="font-wide mb-4 text-[15px] font-bold">Route</h2>
            <Journey history={t.history || []} status={t.status} />
          </section>

          <div className="rounded-[10px] border bg-card">
            {t.result?.outcome && (
              <Section title="Result">
                <Item label="Outcome">{OUTCOME_LABEL[t.result.outcome]}</Item>
                <Item label="Charge collected"><span className="tnum">{bdt(t.result.chargeCollected)}</span></Item>
                {t.result.notes && <Item label="Technician's notes" wide><span className="whitespace-pre-line font-normal">{t.result.notes}</span></Item>}
              </Section>
            )}
            <Section title="Visit">
              <Item label="Address" wide>{t.location?.address || <span className="text-muted-foreground">Not confirmed yet</span>}</Item>
              <Item label="Zone">{t.location?.zone?.name || <span className="text-muted-foreground">Not set</span>}</Item>
              <Item label="Scheduled for">{t.scheduledDate ? formatDate(t.scheduledDate) : <span className="text-muted-foreground">Not scheduled</span>}</Item>
              <Item label="Charge quoted at intake"><span className="tnum">{bdt(t.serviceCharge)}</span></Item>
              <Item label="Charge agreed with customer"><span className="tnum">{bdt(t.finalCharge)}</span></Item>
            </Section>
            <Section title="Customer and device">
              <Item label="Phone"><PhoneLink phone={t.customer.phone} /></Item>
              {t.customer.altPhone && <Item label="Other phone"><PhoneLink phone={t.customer.altPhone} /></Item>}
              <Item label="Vehicle registration">{t.vehicleRegNo}</Item>
              <Item label="Tracker IMEI"><span className="tnum tracking-wide">{t.imei}</span></Item>
            </Section>
            <Section title="People">
              <Item label="Logged by">{t.createdBy?.name}</Item>
              <Item label="Service Check Manager">
                {t.manager ? <span className="flex flex-wrap gap-x-3">{t.manager.name} {t.manager.phone && <PhoneLink phone={t.manager.phone} />}</span> : <span className="text-muted-foreground">Not picked up yet</span>}
              </Item>
              <Item label="Technician">
                {t.technician ? <span className="flex flex-wrap gap-x-3">{t.technician.name} {t.technician.phone && <PhoneLink phone={t.technician.phone} />}</span> : <span className="text-muted-foreground">Not assigned yet</span>}
              </Item>
            </Section>
          </div>
        </div>

        <aside className="hidden rounded-[10px] border bg-card p-6 lg:sticky lg:top-8 lg:block" aria-label="Route">
          <h2 className="font-wide mb-4 text-[15px] font-bold">Route</h2>
          <Journey history={t.history || []} status={t.status} />
        </aside>
      </div>
    </>
  );
}
