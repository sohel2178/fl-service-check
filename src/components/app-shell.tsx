'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, LayoutDashboard, LogOut, MapPin, PlusCircle, Users, CircleUser } from 'lucide-react';
import { useAuth } from './auth-provider';
import { ROLE_LABEL } from '@/lib/status';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { RealtimeProvider } from './realtime';

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', short: 'Overview', icon: LayoutDashboard, roles: ['admin', 'call_center', 'manager', 'technician'] },
  { href: '/tickets', label: 'Tickets', short: 'Tickets', icon: ClipboardList, roles: ['admin', 'call_center', 'manager'] },
  { href: '/tickets', label: 'My Jobs', short: 'Jobs', icon: ClipboardList, roles: ['technician'] },
  { href: '/tickets/new', label: 'New Complaint', short: 'New', icon: PlusCircle, roles: ['admin', 'call_center'] },
  { href: '/admin/users', label: 'Users', short: 'Users', icon: Users, roles: ['admin'] },
  { href: '/admin/zones', label: 'Zones', short: 'Zones', icon: MapPin, roles: ['admin'] },
  { href: '/account', label: 'Account', short: 'Account', icon: CircleUser, roles: ['admin', 'call_center', 'manager', 'technician'] },
];

function isActive(pathname: string, href: string) {
  if (href === '/tickets') return pathname === '/tickets' || (pathname.startsWith('/tickets/') && pathname !== '/tickets/new');
  return pathname === href || pathname.startsWith(href + '/');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, unreachable, retry, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user && !unreachable) router.replace('/login');
  }, [loading, user, unreachable, router]);

  if (unreachable) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <BrandMark />
          <h1 className="font-wide mt-4 text-xl font-bold">Can’t reach the server</h1>
          <p className="mt-2 text-sm text-muted-foreground">You’re still signed in. Check your mobile data or Wi-Fi, then try again.</p>
          <Button size="lg" className="mt-5 w-full" onClick={retry}>Try again</Button>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen md:flex">
      <RealtimeProvider key={user._id} />
      {/* Desktop rail */}
      <aside className="hidden w-60 shrink-0 flex-col bg-rail text-white md:sticky md:top-0 md:flex md:h-screen">
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-5">
          <BrandMark />
          <span className="font-wide text-[17px] font-bold tracking-tight">Service Check</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className={cn('h-4 w-4', active && 'text-primary')} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-lg bg-white/5 p-3">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-white/55">{ROLE_LABEL[user.role]}</p>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-rail px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white md:hidden">
        <div className="flex items-center gap-2">
          <BrandMark small />
          <span className="font-wide font-bold tracking-tight">Service Check</span>
        </div>
        <span className="truncate pl-3 text-xs text-white/60">{user.name}</span>
      </header>

      <main className="min-w-0 flex-1 pb-24 md:pb-10">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {active && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-primary" />}
              <item.icon className="h-5 w-5" />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** A GPS fix: amber position inside a signal ring. */
export function BrandMark({ small }: { small?: boolean }) {
  const s = small ? 22 : 26;
  return (
    <svg width={s} height={s} viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="13" cy="13" r="7" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="13" cy="13" r="3.5" fill="hsl(37 91% 55%)" />
    </svg>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-wide text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
