'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { BrandMark } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';

const STOPS = [
  { x: 40, y: 250, label: 'Complaint logged', anchor: 'start' as const, dx: 0, dy: 30 },
  { x: 170, y: 190, label: 'Customer agrees', anchor: 'start' as const, dx: 14, dy: 22 },
  { x: 250, y: 105, label: 'Technician on site', anchor: 'end' as const, dx: -14, dy: 4 },
  { x: 360, y: 50, label: 'Checked and closed', anchor: 'end' as const, dx: 0, dy: -20 },
];

function RouteArt() {
  return (
    <svg viewBox="0 0 400 290" className="h-auto w-full max-w-[460px]" role="img" aria-label="A ticket's route from complaint to closed job">
      <path
        d="M40 250 C 100 250, 110 190, 170 190 C 230 190, 210 105, 250 105 C 300 105, 300 50, 360 50"
        fill="none"
        stroke="white"
        strokeOpacity="0.14"
        strokeWidth="2"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <path
        className="route-draw"
        d="M40 250 C 100 250, 110 190, 170 190 C 230 190, 210 105, 250 105 C 300 105, 300 50, 360 50"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {STOPS.map((s, i) => {
        const last = i === STOPS.length - 1;
        return (
          <g key={s.label} className="waypoint-in" style={{ animationDelay: `${0.35 + i * 0.6}s` }}>
            {last && <circle cx={s.x} cy={s.y} r="13" fill="hsl(37 91% 55%)" fillOpacity="0.25" />}
            <circle cx={s.x} cy={s.y} r={last ? 7 : 5} fill={last ? 'hsl(37 91% 55%)' : 'white'} />
            <text x={s.x + s.dx} y={s.y + s.dy} textAnchor={s.anchor} fill="white" fillOpacity={last ? 1 : 0.75} fontSize="13" fontWeight={last ? 700 : 500}>
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The server is not responding. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen content-start lg:grid-cols-[1.1fr_1fr] lg:content-stretch">
      <section className="flex flex-col bg-rail px-6 pb-8 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-wide text-[17px] font-bold tracking-tight">Service Check</span>
        </div>
        <div className="mt-8 lg:my-auto">
          <h1 className="font-wide max-w-[16ch] text-[30px] font-bold leading-[1.08] tracking-tight sm:text-[44px] lg:text-[52px]">
            Every GPS tracker service check, from the first call to a closed job.
          </h1>
          <div className="mt-6 hidden sm:block lg:mt-12">
            <RouteArt />
          </div>
        </div>
      </section>

      <section className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-wide text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use the email and password your admin gave you.</p>
          </div>
          <Field label="Email">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
        </form>
      </section>
    </div>
  );
}
