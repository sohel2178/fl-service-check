'use client';
import * as React from 'react';
import { Bell, BellOff, Download, Share, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sc_install_dismissed';
const PUSH_DISMISS_KEY = 'sc_push_dismissed';

/** Registers the service worker in production builds. */
export function PwaRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

// Chrome fires beforeinstallprompt once, often before the page that wants it mounts — keep it module-wide.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function useInstallPrompt() {
  const [, rerender] = React.useReducer((n: number) => n + 1, 0);
  const [env, setEnv] = React.useState({ isStandalone: true, isIOS: false });

  React.useEffect(() => {
    listeners.add(rerender);
    const nav = navigator as Navigator & { standalone?: boolean };
    const ua = navigator.userAgent;
    setEnv({
      isStandalone: window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true,
      // iPadOS reports itself as Mac; touch support tells them apart.
      isIOS: /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1),
    });
    return () => void listeners.delete(rerender);
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    rerender();
  };

  return { canInstall: !!deferred, promptInstall, ...env };
}

// ---- Push notifications ----

/** Whether this device currently delivers push; the in-app toast is skipped when it does. */
let pushActive = false;
export const isPushActive = () => pushActive;

function base64UrlToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// The service worker only runs in production builds (see PwaRegister), so push does too.
const pushCapable = () =>
  process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return { reg, sub: (await reg?.pushManager.getSubscription()) ?? null };
}

async function subscribe() {
  const { enabled, publicKey } = await api<{ enabled: boolean; publicKey: string | null }>('/push/public-key');
  if (!enabled || !publicKey) throw new Error('Notifications are not set up on the server yet');
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
  await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
  pushActive = true;
}

/** On sign-in/app start: if notifications were already allowed, (re)bind this device to the signed-in user. */
export async function syncPushSubscription() {
  if (!pushCapable() || Notification.permission !== 'granted') return;
  await subscribe();
}

/** On sign-out: stop this device receiving the previous user's notifications. */
export async function unsubscribePush() {
  if (!pushCapable()) return;
  const { sub } = await currentSubscription();
  if (!sub) return;
  await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe();
  pushActive = false;
}

export function usePush() {
  const [state, setState] = React.useState({ supported: false, permission: 'default' as NotificationPermission, subscribed: false });
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!pushCapable()) return;
    const { sub } = await currentSubscription();
    pushActive = !!sub && Notification.permission === 'granted';
    setState({ supported: true, permission: Notification.permission, subscribed: pushActive });
  }, []);

  React.useEffect(() => void refresh(), [refresh]);

  const enable = async () => {
    setBusy(true);
    try {
      // Must run straight from the tap: iOS only shows the permission prompt for a user gesture.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notifications are blocked. Allow them in your browser or phone settings.');
        return;
      }
      await subscribe();
      toast.success('Notifications are on');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn on notifications');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribePush();
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return { ...state, busy, enable, disable };
}

function InstallSteps({ isIOS, canInstall, onInstall }: { isIOS: boolean; canInstall: boolean; onInstall: () => void }) {
  if (canInstall) {
    return (
      <Button className="w-full" onClick={onInstall}>
        <Download /> Install app
      </Button>
    );
  }
  if (isIOS) {
    return (
      <p className="text-sm">
        In Safari, tap <Share className="inline h-4 w-4 align-[-3px]" aria-label="Share" /> <span className="font-semibold">Share</span>, then{' '}
        <span className="font-semibold">Add to Home Screen</span>.
      </p>
    );
  }
  return <p className="text-sm text-muted-foreground">Open your browser menu and choose “Install app” or “Add to Home screen”.</p>;
}

/** Account-page card: always available until the app is running installed. */
export function InstallAppCard() {
  const { canInstall, promptInstall, isStandalone, isIOS } = useInstallPrompt();
  if (isStandalone) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Install the app</CardTitle>
        <CardDescription>Open Service Check from your home screen, full-screen, like any other app.</CardDescription>
      </CardHeader>
      <CardContent>
        <InstallSteps isIOS={isIOS} canInstall={canInstall} onInstall={promptInstall} />
      </CardContent>
    </Card>
  );
}

/** Account-page card for turning phone notifications on or off. */
export function NotificationsCard() {
  const { isStandalone, isIOS } = useInstallPrompt();
  const { supported, permission, subscribed, busy, enable, disable } = usePush();

  let body: React.ReactNode;
  if (isIOS && !isStandalone) {
    body = <p className="text-sm text-muted-foreground">On iPhone and iPad, install the app to your home screen first, then turn notifications on from here.</p>;
  } else if (!supported) {
    body = <p className="text-sm text-muted-foreground">This browser can’t receive notifications. Open Service Check in Chrome or the installed app.</p>;
  } else if (permission === 'denied') {
    body = <p className="text-sm text-muted-foreground">Notifications are blocked for this site. Allow them in your browser or phone settings, then come back here.</p>;
  } else if (subscribed) {
    body = (
      <Button variant="outline" className="w-full" loading={busy} onClick={disable}>
        <BellOff /> Turn off on this device
      </Button>
    );
  } else {
    body = (
      <Button className="w-full" loading={busy} onClick={enable}>
        <Bell /> Turn on notifications
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          {subscribed ? 'On for this device. ' : ''}Get an alert when a ticket needs you: new complaints, new jobs, and work to verify.
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

function useDismissed(key: string) {
  const [dismissed, setDismissed] = React.useState(true);
  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(key) === '1');
    } catch {
      setDismissed(false);
    }
  }, [key]);
  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(key, '1');
    } catch {}
  };
  return [dismissed, dismiss] as const;
}

function Banner({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: React.ReactNode }) {
  return (
    <div className="relative mb-6 rounded-[10px] border bg-card p-4 pr-11 md:hidden">
      <button onClick={onDismiss} aria-label="Dismiss" className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
        <X className="h-4 w-4" />
      </button>
      <p className="font-wide mb-2 text-[15px] font-semibold">{title}</p>
      {children}
    </div>
  );
}

/** Dashboard nudge for phones: install first, then turn on notifications. Each dismissal is remembered on this device. */
export function InstallBanner() {
  const { canInstall, promptInstall, isStandalone, isIOS } = useInstallPrompt();
  const push = usePush();
  const [installDismissed, dismissInstall] = useDismissed(DISMISS_KEY);
  const [pushDismissed, dismissPush] = useDismissed(PUSH_DISMISS_KEY);

  if (!isStandalone) {
    if (installDismissed || !(canInstall || isIOS)) return null;
    return (
      <Banner title="Add Service Check to your home screen" onDismiss={dismissInstall}>
        <InstallSteps isIOS={isIOS} canInstall={canInstall} onInstall={promptInstall} />
      </Banner>
    );
  }

  if (pushDismissed || !push.supported || push.permission !== 'default') return null;
  return (
    <Banner title="Get alerts for your tickets" onDismiss={dismissPush}>
      <Button className="w-full" loading={push.busy} onClick={push.enable}>
        <Bell /> Turn on notifications
      </Button>
    </Banner>
  );
}
