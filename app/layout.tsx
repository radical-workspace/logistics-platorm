import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: {
    default: 'AFGHCO Logistics Platform',
    template: '%s — AFGHCO Logistics',
  },
  applicationName: 'AFGHCO Logistics',
  description: 'AFGHCO provides sovereign logistics corridors linking Afghanistan with global trade hubs through air, sea, and land freight orchestration.',
  keywords: ['AFGHCO', 'Afghanistan logistics', 'air freight', 'supply chain', 'cargo tracking'],
  openGraph: {
    title: 'AFGHCO Logistics Platform',
    description:
      'Real-time Afghanistan logistics platform delivering multimodal freight, mission-critical supply chain control, and compliance-grade visibility.',
    url: 'https://afghco.com',
    siteName: 'AFGHCO',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AFGHCO Logistics Platform',
    description:
      'Afghanistan-origin logistics with global reach, realtime telemetry, and enterprise-grade compliance.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
