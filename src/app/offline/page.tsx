'use client';
import { BrandMark } from '@/components/app-shell';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <BrandMark />
        <h1 className="font-wide mt-4 text-xl font-bold">You’re offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">Service Check needs a connection. Check your mobile data or Wi-Fi, then try again.</p>
        <Button size="lg" className="mt-5 w-full" onClick={() => window.location.reload()}>Try again</Button>
      </div>
    </div>
  );
}
