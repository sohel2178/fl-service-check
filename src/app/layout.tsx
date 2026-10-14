import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/auth-provider';
import { PwaRegister } from '@/components/pwa';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo' });

export const metadata: Metadata = {
  title: 'Service Check — GPS Tracker',
  description: 'Track GPS tracker service check requests from complaint to completion',
  applicationName: 'Service Check',
  appleWebApp: { capable: true, title: 'Service Check', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0F1A33' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'var(--font-archivo)' } }} />
      </body>
    </html>
  );
}
