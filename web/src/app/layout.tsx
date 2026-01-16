import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { LifeProvider } from '@/state/LifeStore';
import { ReminderProvider } from '@/components/ReminderProvider';
import { CryptoUUIDShim } from '@/components/CryptoUUIDShim';
import { LayoutHeader } from '@/components/LayoutHeader';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'HelpEm - Life Management',
  description: 'Capture, classify, and conquer your day',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0077CC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen bg-gray-50 text-brandText antialiased">
        <CryptoUUIDShim />
        <LifeProvider>
          <ReminderProvider>
            <div className="min-h-screen pb-20 md:pb-0">
              <LayoutHeader />
              
              {/* Main content */}
              <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
                {children}
              </main>
            </div>
          </ReminderProvider>
        </LifeProvider>
      </body>
    </html>
  );
}
