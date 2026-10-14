'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app-shell';
import { useAuth } from '@/components/auth-provider';
import { InstallAppCard, NotificationsCard } from '@/components/pwa';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/status';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrent] = React.useState('');
  const [newPassword, setNew] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      toast.success('Password updated');
      setCurrent('');
      setNew('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Account" />
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{user?.name}</p>
            <p className="text-muted-foreground">{user?.email}</p>
            <p className="text-muted-foreground">{user && ROLE_LABEL[user.role]}</p>
            {!!user?.zones.length && <p className="text-muted-foreground">Zones: {user.zones.map((z) => z.name).join(', ')}</p>}
            <Button variant="outline" className="mt-4 w-full" onClick={logout}>Sign out</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Current password"><Input type="password" required value={currentPassword} onChange={(e) => setCurrent(e.target.value)} /></Field>
              <Field label="New password"><Input type="password" required minLength={6} value={newPassword} onChange={(e) => setNew(e.target.value)} /></Field>
              <Button type="submit" className="w-full" loading={busy}>Update password</Button>
            </form>
          </CardContent>
        </Card>
        <NotificationsCard />
        <InstallAppCard />
      </div>
    </>
  );
}
