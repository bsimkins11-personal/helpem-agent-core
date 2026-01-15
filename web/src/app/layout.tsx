import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import Link from 'next/link';
import { LifeProvider } from '@/state/LifeStore';
import { ReminderProvider } from '@/components/ReminderProvider';
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

const navItems = [
  { href: '/', label: 'Today', icon: '◐' },
  { href: '/appointments', label: 'Appts', icon: '◷' },
  { href: '/todos', label: 'Todos', icon: '✓' },
  { href: '/habits', label: 'Routines', icon: '↻' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen bg-gray-50 text-brandText antialiased">
        <LifeProvider>
          <ReminderProvider>
            <div className="min-h-screen pb-20 md:pb-0">
              {/* Header - Desktop */}
              <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
                  <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center">
                      <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
                        <span className="text-brandBlue">help</span>
                        <span className="text-brandGreen">em</span>
                      </h1>
                    </div>

                    {/* Navigation - Desktop */}
                    <nav className="flex items-center gap-1">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-brandTextLight
                                     hover:text-brandText hover:bg-gray-100 transition-all duration-200"
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              </header>

              {/* Mobile Header */}
              <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="px-4 py-3">
                  <h1 className="text-xl font-bold tracking-tight">
                    <span className="text-brandBlue">help</span>
                    <span className="text-brandGreen">em</span>
                  </h1>
                </div>
              </header>

              {/* Main content */}
              <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
                {children}
              </main>

              {/* Mobile Bottom Navigation */}
              <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
                <div className="flex justify-around items-center py-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex flex-col items-center gap-1 px-4 py-2 text-brandTextLight
                                 active:text-brandBlue transition-colors min-w-[60px]"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-xs font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </ReminderProvider>
        </LifeProvider>
      </body>
    </html>
  );
}
