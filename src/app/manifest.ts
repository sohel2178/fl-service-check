import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Service Check — GPS Tracker',
    short_name: 'Service Check',
    description: 'Track GPS tracker service check requests from complaint to completion',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#EEF1F4',
    theme_color: '#0F1A33',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Tickets', url: '/tickets', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'New complaint', url: '/tickets/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
