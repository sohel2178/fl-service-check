'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { API_URL, tokenStore } from '@/lib/api';
import { isPushActive, syncPushSubscription } from './pwa';

interface Notice {
  title: string;
  body: string;
  url: string;
  ticketId: string;
}

/**
 * Live updates: the server only says "ticket X changed"; we refetch ticket and dashboard data
 * through the REST API, which decides what this user may see.
 */
export function RealtimeProvider() {
  const { mutate } = useSWRConfig();
  const router = useRouter();

  React.useEffect(() => {
    const token = tokenStore.get();
    if (!token) return;

    const refresh = () =>
      mutate((key) => typeof key === 'string' && (key.startsWith('/tickets') || key.startsWith('/dashboard')));

    const socket = io(new URL(API_URL).origin, { auth: { token } });
    let connectedBefore = false;
    // After a drop (sleep, lost signal) catch up on anything missed.
    socket.on('connect', () => {
      if (connectedBefore) refresh();
      connectedBefore = true;
    });
    socket.on('ticket:changed', refresh);
    socket.on('ticket:notify', (n: Notice) => {
      if (isPushActive()) return; // the phone notification already covers it
      toast(n.title, { description: n.body, action: { label: 'View', onClick: () => router.push(n.url) } });
    });

    syncPushSubscription().catch(() => {});
    return () => {
      socket.disconnect();
    };
  }, [mutate, router]);

  return null;
}
