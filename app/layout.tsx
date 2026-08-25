import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Nutrition Tracker',
  description: 'Personal nutrition tracker with AI meal parsing and goal tracking.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
