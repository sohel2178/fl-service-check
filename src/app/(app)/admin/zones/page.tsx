'use client';
import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, ApiError, fetcher } from '@/lib/api';
import type { Zone } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ZonesPage() {
  const { user } = useAuth();
  const { data, mutate } = useSWR<{ zones: Zone[] }>('/zones?all=true', fetcher);
  const [name, setName] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  if (user?.role !== 'admin') return <Card className="p-10 text-center text-sm text-muted-foreground">Admins only.</Card>;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/zones', { method: 'POST', body: { name, district } });
      setName('');
      setDistrict('');
      mutate();
      toast.success('Zone added');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add zone');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (z: Zone) => {
    try {
      await api(`/zones/${z._id}`, { method: 'PATCH', body: { isActive: !z.isActive } });
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update zone');
    }
  };

  return (
    <>
      <PageHeader title="Zones" description="Service areas used to match customers with the nearest technician" />
      <Card className="mb-4 p-4">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <Input required placeholder="Zone name (e.g. Dhaka - Banani)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="District" value={district} onChange={(e) => setDistrict(e.target.value)} className="sm:w-48" />
          <Button type="submit" loading={busy}><Plus /> Add</Button>
        </form>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data?.zones.map((z) => (
          <Card key={z._id} className={cn('flex items-center justify-between p-4', !z.isActive && 'opacity-60')}>
            <div>
              <p className="font-medium">{z.name}</p>
              <p className="text-xs text-muted-foreground">{z.district || '—'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toggle(z)}>{z.isActive ? 'Disable' : 'Enable'}</Button>
          </Card>
        ))}
      </div>
    </>
  );
}
