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
  
  const isLandingPage = pathname === '/';
  const showDemoNav = isDemo && isAppRoute;

  return (
    <>
      {/* Global Header - Desktop */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-4">
                <img src="/helpem-logo.png" alt="HelpEm" className="h-32 w-auto" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight leading-tight">
                    <span className="text-brandBlue">help</span>
                    <span className="text-brandGreen">em</span>
                  </h1>
                  <p className="text-sm text-brandTextLight leading-tight">Built for you.</p>
                </div>
              </div>
            </Link>

            {/* Landing Page Navigation */}
            {isLandingPage && (
              <div className="flex items-center gap-4 sm:gap-6">
                <a href="#features" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                  Features
                </a>
                <Link href="/pricing" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                  Pricing
                </Link>
                <a href="#about" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                  About
                </a>
                <Link href="/support" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                  Support
                </Link>
                <Link
                  href="/app"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-brandBlue to-brandGreen text-white text-sm font-semibold hover:shadow-lg transition-all"
                >
                  Try App
                </Link>
              </div>
            )}

            {/* Back to Home - Show on all non-landing pages */}
            {!isLandingPage && (
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

      {/* Demo App Navigation - Desktop (only for app routes in demo mode) */}
      {showDemoNav && (
        <div className="hidden md:block bg-purple-50 border-b border-purple-200">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                  DEMO MODE
                </span>
                <span className="text-xs text-purple-600">Your data is session-only</span>
              </div>
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-purple-700 text-sm
                               hover:bg-purple-100 transition-all duration-200"
                  >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Global Header - Mobile */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-3">
              <img src="/helpem-logo.png" alt="HelpEm" className="h-24 w-auto" />
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-tight">
                  <span className="text-brandBlue">help</span>
                  <span className="text-brandGreen">em</span>
                </h1>
                <p className="text-xs text-brandTextLight leading-tight">Built for you.</p>
              </div>
            </Link>

            {/* Landing Page - Try App button */}
            {isLandingPage && (
              <Link
                href="/app"
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brandBlue to-brandGreen text-white text-xs font-semibold hover:shadow-lg transition-all"
              >
                Try App
              </Link>
            )}

            {/* Back to Home - Show on all non-landing pages */}
            {!isLandingPage && (
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

      {/* Demo App Navigation - Mobile Banner (only for app routes in demo mode) */}
      {showDemoNav && (
        <div className="md:hidden bg-purple-50 border-b border-purple-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                DEMO
              </span>
              <span className="text-[10px] text-purple-600">Session only</span>
            </div>
          </div>
        </div>
      )}

      {/* Demo App Bottom Navigation - Mobile (only for app routes in demo mode) */}
      {showDemoNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-purple-50 border-t-2 border-purple-200 z-50 safe-area-bottom">
          <div className="flex justify-around items-center py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-4 py-2 text-purple-700
                           active:text-purple-900 transition-colors min-w-[60px]"
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
