import type { Metadata } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';

export const metadata: Metadata = {
  title: 'Price Action Pro – Trading Journal',
  description: 'Bitácora personal de trading, gestión de riesgo y análisis estadístico.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Price Action Pro', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><ServiceWorkerRegister />{children}</body>
    </html>
  );
}
