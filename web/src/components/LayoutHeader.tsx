"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/app', label: 'Today', icon: '◐' },
  { href: '/appointments', label: 'Appts', icon: '◷' },
  { href: '/todos', label: 'Todos', icon: '✓' },
  { href: '/habits', label: 'Routines', icon: '↻' },
];

export function LayoutHeader() {
  const pathname = usePathname();
  const [isDemo, setIsDemo] = useState(false);
  
  // Check if user is in demo mode
  useEffect(() => {
    const hasSessionToken = document.cookie.includes("session_token");
    const isFromiOSApp = navigator.userAgent.includes("HelpEm");
    const isDemoMode = !hasSessionToken && !isFromiOSApp;
    setIsDemo(isDemoMode);
  }, []);

  const isAppRoute = pathname?.startsWith('/app') || 
                     pathname?.startsWith('/appointments') || 
                     pathname?.startsWith('/todos') || 
                     pathname?.startsWith('/habits');
  
  const isPricingOrSupport = pathname === '/pricing' || pathname === '/support';
  
  const showNavigation = isDemo && isAppRoute;
  const showBackToHome = showNavigation || isPricingOrSupport;

  return (
    <>
      {/* Header - Desktop */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
                <span className="text-brandBlue">help</span>
                <span className="text-brandGreen">em</span>
              </h1>
            </Link>

            {/* Navigation - Only show in demo mode on app routes */}
            {showNavigation && (
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
            )}

            {/* Back to Home - Show in demo mode on app routes OR on pricing/support pages */}
            {showBackToHome && (
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-brandTextLight
                           hover:text-brandText hover:bg-gray-100 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Back to Home</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-brandBlue">help</span>
                <span className="text-brandGreen">em</span>
              </h1>
            </Link>

            {/* Back to Home - Show in demo mode on app routes OR on pricing/support pages */}
            {showBackToHome && (
              <Link
                href="/"
                className="flex items-center gap-1 text-brandTextLight hover:text-brandText text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Home</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Only show in demo mode on app routes */}
      {showNavigation && (
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
      )}
    </>
  );
}
