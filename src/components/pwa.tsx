'use client';
import * as React from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'sc_install_dismissed';

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

/** Dashboard nudge for phones; dismissal is remembered on this device. */
export function InstallBanner() {
  const { canInstall, promptInstall, isStandalone, isIOS } = useInstallPrompt();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (isStandalone || dismissed || !(canInstall || isIOS)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  return (
    <div className="relative mb-6 rounded-[10px] border bg-card p-4 pr-11 md:hidden">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
        <X className="h-4 w-4" />
      </button>
      <p className="font-wide mb-2 text-[15px] font-semibold">Add Service Check to your home screen</p>
      <InstallSteps isIOS={isIOS} canInstall={canInstall} onInstall={promptInstall} />
    </div>
  );
}
