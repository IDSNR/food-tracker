import './globals.css';
import type { Metadata, Viewport } from 'next';
import PwaRegister from './pwa-register';

export const metadata: Metadata = {
  title: 'AI Nutrition Tracker',
  description: 'Personal nutrition tracker with AI meal parsing and goal tracking.',
  manifest: '/food/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#2d8b57',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
