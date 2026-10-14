'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app-shell';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { api, ApiError, fetcher } from '@/lib/api';
import type { Ticket, User } from '@/lib/types';

const EMPTY = { name: '', phone: '', altPhone: '', vehicleRegNo: '', imei: '', complaint: '', serviceCharge: '0', manager: '', note: '' };

export default function NewTicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: managers } = useSWR<{ users: User[] }>('/users/managers', fetcher);
  const [form, setForm] = React.useState(EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (user && !['call_center', 'admin'].includes(user.role)) router.replace('/tickets');
  }, [user, router]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setErrors({ ...errors, [k]: '' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\d{15}$/.test(form.imei)) errs.imei = 'IMEI must be exactly 15 digits';
    const charge = Number(form.serviceCharge);
    if (!(charge >= 0 && charge <= 1000)) errs.serviceCharge = 'Charge must be between 0 and 1000 BDT';
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(form.phone)) errs.phone = 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX)';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const { ticket } = await api<{ ticket: Ticket }>('/tickets', {
        method: 'POST',
        body: {
          customer: { name: form.name, phone: form.phone, altPhone: form.altPhone },
          vehicleRegNo: form.vehicleRegNo,
          imei: form.imei,
          complaint: form.complaint,
          serviceCharge: charge,
          manager: form.manager || null,
          note: form.note,
        },
      });
      toast.success(`Forwarded to manager as ${ticket.ticketNo}`);
      router.push(`/tickets/${ticket._id}`);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        const fieldErrs: Record<string, string> = {};
        (err.details as { path: string; message: string }[]).forEach((d) => (fieldErrs[d.path.split('.').pop()!] = d.message));
        setErrors(fieldErrs);
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not create ticket');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="New complaint" description="Take down the customer’s details and forward the complaint to a Service Check Manager." />
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Customer name" error={errors.name}>
              <Input required value={form.name} onChange={set('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact number" error={errors.phone}>
                <Input type="tel" inputMode="tel" required placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Alternate number (optional)">
                <Input type="tel" inputMode="tel" value={form.altPhone} onChange={set('altPhone')} />
              </Field>
            </div>
            <Field label="Complaint" error={errors.complaint}>
              <Textarea required value={form.complaint} onChange={set('complaint')} placeholder="e.g. Tracker shows offline for 3 days, no location updates" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vehicle & device</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Vehicle registration no." error={errors.vehicleRegNo}>
              <Input required placeholder="DHAKA METRO GA 11-2233" value={form.vehicleRegNo} onChange={set('vehicleRegNo')} />
            </Field>
            <Field label="Device IMEI" error={errors.imei} hint={`${form.imei.length}/15 digits`}>
              <Input
                required
                inputMode="numeric"
                maxLength={15}
                className="font-mono"
                value={form.imei}
                onChange={(e) => {
                  setForm({ ...form, imei: e.target.value.replace(/\D/g, '') });
                  setErrors({ ...errors, imei: '' });
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service check charge (BDT)" error={errors.serviceCharge} hint="0 – 1000 BDT">
                <Input type="number" inputMode="numeric" min={0} max={1000} required value={form.serviceCharge} onChange={set('serviceCharge')} />
              </Field>
              <Field label="Forward to manager" hint="Leave empty for any available manager">
                <Select value={form.manager} onChange={set('manager')}>
                  <option value="">Any manager</option>
                  {managers?.users.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Note for manager (optional)">
              <Input value={form.note} onChange={set('note')} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-2">
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" size="lg" loading={busy}>Forward to manager</Button>
        </div>
      </form>
    </>
  );
}
