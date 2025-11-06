// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import clsx from 'clsx';
import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';

// Setup fonts based on the design PDF
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'], // Covers Body, Headline, and Display weights
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'My Business Software',
  description: 'Business OS for CRM, Projects, and Analytics',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={clsx(
          inter.variable,
          'font-sans' // 'font-sans' will default to --font-inter from globals.css
        )}
        suppressHydrationWarning
      >
        {/* ToastProvider wraps everything to make notifications global */}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}