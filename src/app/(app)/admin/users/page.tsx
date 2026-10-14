'use client';
import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Pencil, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError, fetcher } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/status';
import type { Role, User, Zone } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLES = Object.keys(ROLE_LABEL) as Role[];

export default function UsersPage() {
  const { user: me } = useAuth();
  const [roleFilter, setRoleFilter] = React.useState('');
  const { data, mutate, isLoading } = useSWR<{ users: User[] }>(`/users${roleFilter ? `?role=${roleFilter}` : ''}`, fetcher);
  const [editing, setEditing] = React.useState<User | 'new' | null>(null);

  if (me?.role !== 'admin') return <Card className="p-10 text-center text-sm text-muted-foreground">Admins only.</Card>;

  return (
    <>
      <PageHeader
        title="Users"
        description="Call center agents, Service Check Managers and Technicians"
        action={<Button className="w-full sm:w-auto" onClick={() => setEditing('new')}><UserPlus /> Add user</Button>}
      />
      <Select className="mb-4 sm:w-64" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
        <option value="">All roles</option>
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </Select>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.users.map((u) => (
            <Card key={u._id} className={cn('p-4', !u.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  {u.phone && <p className="text-sm text-muted-foreground">{u.phone}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(u)} aria-label="Edit user"><Pencil /></Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge className="bg-accent text-accent-foreground">{ROLE_LABEL[u.role]}</Badge>
                {!u.isActive && <Badge className="bg-rose-100 text-rose-800">Disabled</Badge>}
                {u.zones.map((z) => <Badge key={z._id} className="bg-muted text-muted-foreground">{z.name}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <UserDialog
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { mutate(); setEditing(null); }}
        />
      )}
    </>
  );
}

function UserDialog({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const { data: zoneData } = useSWR<{ zones: Zone[] }>('/zones', fetcher);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: (user?.role || 'technician') as Role,
    zones: user?.zones.map((z) => z._id) || [],
    isActive: user?.isActive ?? true,
  });

  const toggleZone = (id: string) =>
    setForm({ ...form, zones: form.zones.includes(id) ? form.zones.filter((z) => z !== id) : [...form.zones, id] });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, zones: ['technician', 'manager'].includes(form.role) ? form.zones : [] };
      if (user) await api(`/users/${user._id}`, { method: 'PATCH', body });
      else await api('/users', { method: 'POST', body });
      toast.success(user ? 'User updated' : 'User created');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save user');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open title={user ? 'Edit user' : 'Add user'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </Field>
          <Field label={user ? 'New password' : 'Password'} hint={user ? 'Leave blank to keep current' : 'Min 6 characters'}>
            <Input type="password" required={!user} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
        </div>
        {['technician', 'manager'].includes(form.role) && (
          <Field label="Zones covered">
            <div className="flex flex-wrap gap-2">
              {zoneData?.zones.map((z) => (
                <button
                  type="button"
                  key={z._id}
                  onClick={() => toggleZone(z._id)}
                  className={cn('rounded-full border px-3 py-1 text-sm transition', form.zones.includes(z._id) ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-muted')}
                >
                  {z.name}
                </button>
              ))}
            </div>
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active
        </label>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Save</Button>
      </form>
    </Dialog>
  );
}
