import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { LifeProvider } from '@/state/LifeStore';
import { ReminderProvider } from '@/components/ReminderProvider';
import { CryptoUUIDShim } from '@/components/CryptoUUIDShim';
import { LayoutHeader } from '@/components/LayoutHeader';
import { UsageDrawer } from '@/components/UsageDrawer';
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
            <div className="min-h-screen pb-24 md:pb-16">
              <LayoutHeader />
              
              {/* Main content - no container constraints to allow pages full control */}
              <main>
                {children}
              </main>
              
              {/* Usage Drawer - Fixed to bottom */}
              <UsageDrawer />
            </div>
          </ReminderProvider>
        </LifeProvider>
      </body>
    </html>
  );
}
