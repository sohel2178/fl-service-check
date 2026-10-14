'use client';
import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Pencil, PhoneCall } from 'lucide-react';
import { api, ApiError, fetcher } from '@/lib/api';
import type { Action, AllowedAction, Outcome, TechnicianOption, Ticket, User, Zone } from '@/lib/types';
import { OUTCOME_LABEL } from '@/lib/status';
import { cn, toDateInput } from '@/lib/utils';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Field, Input, Select, Textarea } from './ui/input';

type Result = { ticket: Ticket; actions: AllowedAction[] };

/** Actions that just need a click (with an optional note). */
const SIMPLE: Action[] = ['pick_up', 'accept', 'on_the_way', 'start_work', 'verify_close'];
/** Actions that require a reason. */
const NEEDS_REASON: Action[] = ['customer_declined', 'reject', 'reopen', 'cancel'];
const DANGER: Action[] = ['customer_declined', 'reject', 'cancel'];

const FINISHED = ['COMPLETED', 'CLOSED', 'CANCELLED'];

/** Confirmation copy that mirrors each button's label. */
const DONE: Record<Action, string> = {
  pick_up: 'Picked up. Call the customer next.',
  customer_agreed: 'Agreement saved',
  customer_declined: 'Marked as declined',
  assign_technician: 'Technician assigned',
  accept: 'Job accepted',
  reject: 'Job rejected and sent back',
  on_the_way: 'Marked as on the way',
  start_work: 'Service check started',
  complete: 'Result submitted',
  verify_close: 'Verified and closed',
  reopen: 'Sent back to technician',
  cancel: 'Ticket cancelled',
};

export function TicketActions({ ticket, actions, user, onChange }: { ticket: Ticket; actions: AllowedAction[]; user: User; onChange: (r: Result) => void }) {
  const [open, setOpen] = React.useState<Action | 'edit' | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const run = async (action: Action, body: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const r = await api<Result>(`/tickets/${ticket._id}/actions/${action}`, { method: 'POST', body });
      onChange(r);
      setOpen(null);
      toast.success(DONE[action]);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const canEdit =
    (user.role === 'admin' || (user.role === 'manager' && ticket.manager?._id === user._id)) && !FINISHED.includes(ticket.status);

  const primary = actions.filter((a) => !DANGER.includes(a.action));
  const danger = actions.filter((a) => DANGER.includes(a.action));
  const close = () => setOpen(null);

  if (!actions.length && !canEdit) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {primary.map((a) => (
          <Button
            key={a.action}
            size="lg"
            className="w-full sm:w-auto"
            loading={busy === a.action}
            onClick={() => (SIMPLE.includes(a.action) ? run(a.action) : setOpen(a.action))}
          >
            {a.label}
          </Button>
        ))}
        {canEdit && (
          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => setOpen('edit')}>
            <Pencil /> Edit details
          </Button>
        )}
        {user.role === 'technician' && (
          <a href={`tel:${ticket.customer.phone}`} className="sm:hidden">
            <Button variant="outline" size="lg" className="w-full">
              <PhoneCall /> Call customer
            </Button>
          </a>
        )}
      </div>
      {danger.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {danger.map((a) => (
            <Button key={a.action} variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto" onClick={() => setOpen(a.action)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}

      {open === 'customer_agreed' && <AgreeDialog ticket={ticket} busy={!!busy} onClose={close} onSubmit={(b) => run('customer_agreed', b)} />}
      {open === 'assign_technician' && <AssignDialog ticket={ticket} busy={!!busy} onClose={close} onSubmit={(b) => run('assign_technician', b)} />}
      {open === 'complete' && <CompleteDialog ticket={ticket} busy={!!busy} onClose={close} onSubmit={(b) => run('complete', b)} />}
      {open && NEEDS_REASON.includes(open as Action) && (
        <ReasonDialog
          title={actions.find((a) => a.action === open)?.label || ''}
          danger={DANGER.includes(open as Action)}
          busy={!!busy}
          onClose={close}
          onSubmit={(note) => run(open as Action, { note })}
        />
      )}
      {open === 'edit' && <EditDialog ticket={ticket} onClose={close} onSaved={(r) => { onChange(r); close(); }} />}
    </div>
  );
}

function useZones() {
  return useSWR<{ zones: Zone[] }>('/zones', fetcher).data?.zones || [];
}

function AgreeDialog({ ticket, busy, onClose, onSubmit }: { ticket: Ticket; busy: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const zones = useZones();
  const [form, setForm] = React.useState({
    address: ticket.location?.address || '',
    zone: ticket.location?.zone?._id || '',
    scheduledDate: toDateInput(ticket.scheduledDate) || toDateInput(new Date(Date.now() + 86400000).toISOString()),
    finalCharge: String(ticket.finalCharge ?? ticket.serviceCharge),
    note: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open title="Customer agreed" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, finalCharge: Number(form.finalCharge) }); }}>
        <Field label="Customer location / address">
          <Textarea required value={form.address} onChange={set('address')} placeholder="House, road, area, landmark" />
        </Field>
        <Field label="Zone" hint="Decides which technicians are suggested">
          <Select required value={form.zone} onChange={set('zone')}>
            <option value="">Select zone…</option>
            {zones.map((z) => <option key={z._id} value={z._id}>{z.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Scheduled date">
            <Input type="date" required value={form.scheduledDate} onChange={set('scheduledDate')} />
          </Field>
          <Field label="Agreed charge (BDT)">
            <Input type="number" inputMode="numeric" min={0} max={1000} required value={form.finalCharge} onChange={set('finalCharge')} />
          </Field>
        </div>
        <Field label="Note (optional)">
          <Input value={form.note} onChange={set('note')} placeholder="e.g. Customer available after 3pm" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Confirm agreement</Button>
      </form>
    </Dialog>
  );
}

function AssignDialog({ ticket, busy, onClose, onSubmit }: { ticket: Ticket; busy: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const zoneId = ticket.location?.zone?._id || '';
  const { data, isLoading } = useSWR<{ users: TechnicianOption[] }>(`/users/technicians?zone=${zoneId}`, fetcher);
  const techs = data?.users || [];
  const [selected, setSelected] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (!selected && techs.length) setSelected(techs[0]._id);
  }, [techs, selected]);

  return (
    <Dialog open title="Assign technician" onClose={onClose}>
      <p className="mb-3 text-sm text-muted-foreground">
        Technicians who cover <span className="font-semibold text-foreground">{ticket.location?.zone?.name || 'this zone'}</span> are listed first, then whoever has the fewest open jobs.
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Loading technicians…</p>}
        {!isLoading && !techs.length && <p className="text-sm text-muted-foreground">No active technicians found.</p>}
        {techs.map((t) => (
          <label
            key={t._id}
            className={cn('flex cursor-pointer items-center gap-3 rounded-md border p-3 transition', selected === t._id ? 'border-primary bg-accent' : 'hover:bg-muted')}
          >
            <input type="radio" name="tech" className="accent-[hsl(var(--primary))]" checked={selected === t._id} onChange={() => setSelected(t._id)} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {t.name}
                {t.inZone && <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-semibold text-ok">Covers this zone</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{t.zones.map((z) => z.name).join(', ') || 'No zones'}</p>
            </div>
            <span className={cn('tnum shrink-0 text-right text-xs leading-tight', t.openJobs >= 5 ? 'text-destructive' : 'text-muted-foreground')}>
              <span className="block text-base font-bold text-foreground">{t.openJobs}</span>
              open {t.openJobs === 1 ? 'job' : 'jobs'}
            </span>
          </label>
        ))}
      </div>
      <Field label="Note for technician (optional)" className="mt-4">
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button size="lg" className="mt-4 w-full" disabled={!selected} loading={busy} onClick={() => onSubmit({ technicianId: selected, note })}>
        Assign technician
      </Button>
    </Dialog>
  );
}

function CompleteDialog({ ticket, busy, onClose, onSubmit }: { ticket: Ticket; busy: boolean; onClose: () => void; onSubmit: (b: Record<string, unknown>) => void }) {
  const [outcome, setOutcome] = React.useState<Outcome>('FIXED');
  const [notes, setNotes] = React.useState('');
  const [charge, setCharge] = React.useState(String(ticket.finalCharge ?? ticket.serviceCharge));

  return (
    <Dialog open title="Complete service check" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ outcome, notes, chargeCollected: Number(charge) }); }}>
        <Field label="Result">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => setOutcome(o)}
                className={cn('rounded-md border px-3 py-2.5 text-sm font-medium transition', outcome === o ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted')}
              >
                {OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Service notes">
          <Textarea required minLength={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was found and what was done" />
        </Field>
        <Field label="Charge collected (BDT)" hint={`Agreed charge: ${ticket.finalCharge ?? ticket.serviceCharge} BDT`}>
          <Input type="number" inputMode="numeric" min={0} max={1000} required value={charge} onChange={(e) => setCharge(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Submit result</Button>
      </form>
    </Dialog>
  );
}

function ReasonDialog({ title, danger, busy, onClose, onSubmit }: { title: string; danger: boolean; busy: boolean; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = React.useState('');
  return (
    <Dialog open title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(note); }}>
        <Field label="Reason">
          <Textarea required minLength={3} autoFocus value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" variant={danger ? 'destructive' : 'default'} className="w-full" loading={busy}>
          {title}
        </Button>
      </form>
    </Dialog>
  );
}

function EditDialog({ ticket, onClose, onSaved }: { ticket: Ticket; onClose: () => void; onSaved: (r: Result) => void }) {
  const zones = useZones();
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    address: ticket.location?.address || '',
    zone: ticket.location?.zone?._id || '',
    scheduledDate: toDateInput(ticket.scheduledDate),
    finalCharge: String(ticket.finalCharge ?? ticket.serviceCharge),
    altPhone: ticket.customer.altPhone || '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<Result>(`/tickets/${ticket._id}`, {
        method: 'PATCH',
        body: {
          location: { address: form.address, zone: form.zone || null },
          ...(form.scheduledDate ? { scheduledDate: form.scheduledDate } : {}),
          finalCharge: Number(form.finalCharge),
          customer: { altPhone: form.altPhone },
        },
      });
      onSaved(r);
      toast.success('Details updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open title="Edit ticket details" onClose={onClose}>
      <form className="space-y-4" onSubmit={save}>
        <Field label="Location / address">
          <Textarea value={form.address} onChange={set('address')} />
        </Field>
        <Field label="Zone">
          <Select value={form.zone} onChange={set('zone')}>
            <option value="">Not set</option>
            {zones.map((z) => <option key={z._id} value={z._id}>{z.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Scheduled date">
            <Input type="date" value={form.scheduledDate} onChange={set('scheduledDate')} />
          </Field>
          <Field label="Charge (BDT)">
            <Input type="number" inputMode="numeric" min={0} max={1000} value={form.finalCharge} onChange={set('finalCharge')} />
          </Field>
        </div>
        <Field label="Alternate phone">
          <Input type="tel" value={form.altPhone} onChange={set('altPhone')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Save changes</Button>
      </form>
    </Dialog>
  );
}
