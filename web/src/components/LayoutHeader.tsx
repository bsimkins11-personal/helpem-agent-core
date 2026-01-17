"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlphaFeedbackModal } from './AlphaFeedbackModal';
import { UsageModal } from './UsageModal';

const navItems = [
  { href: '/app', label: 'Today', icon: '◐' },
  { href: '/appointments', label: 'Appts', icon: '◷' },
  { href: '/todos', label: 'Todos', icon: '✓' },
  { href: '/habits', label: 'Routines', icon: '↻' },
];

export function LayoutHeader() {
  const pathname = usePathname();
  const [isDemo, setIsDemo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [isFromiOSApp, setIsFromiOSApp] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log("showUsageModal state changed:", showUsageModal);
  }, [showUsageModal]);
  
  // Check if user is in demo mode or iOS app
  useEffect(() => {
    const hasSessionToken = document.cookie.includes("session_token");
    const fromiOSApp = navigator.userAgent.includes("HelpEm");
    const isDemoMode = !hasSessionToken && !fromiOSApp;
    setIsDemo(isDemoMode);
    setIsFromiOSApp(fromiOSApp);

    // Expose functions globally for iOS to call
    if (fromiOSApp) {
      console.log('📱 Web: Exposing modal functions for iOS');
      (window as any).showFeedbackModal = () => {
        console.log('🌐 Web: showFeedbackModal called from iOS');
        setShowFeedbackModal(true);
      };
      (window as any).showUsageModal = () => {
        console.log('🌐 Web: showUsageModal called from iOS');
        setShowUsageModal(true);
      };
      console.log('✅ Web: Modal functions exposed');
    }

    // Listen for iOS native triggers (backup method)
    const handleShowFeedback = () => {
      console.log('🌐 Web: showFeedbackModal event received');
      setShowFeedbackModal(true);
    };
    const handleShowUsage = () => {
      console.log('🌐 Web: showUsageModal event received');
      setShowUsageModal(true);
    };
    
    console.log('🎧 Web: Setting up event listeners for iOS');
    window.addEventListener('showFeedbackModal', handleShowFeedback);
    window.addEventListener('showUsageModal', handleShowUsage);
    
    return () => {
      console.log('🧹 Web: Cleaning up');
      window.removeEventListener('showFeedbackModal', handleShowFeedback);
      window.removeEventListener('showUsageModal', handleShowUsage);
      if (fromiOSApp) {
        delete (window as any).showFeedbackModal;
        delete (window as any).showUsageModal;
      }
    };
  }, []);

  const isAppRoute = pathname?.startsWith('/app') || 
                     pathname?.startsWith('/appointments') || 
                     pathname?.startsWith('/todos') || 
                     pathname?.startsWith('/habits');
  
  const showDemoNav = isDemo && isAppRoute;

  return (
    <>
      {/* Global Header - Desktop (hidden for iOS) */}
      {!isFromiOSApp && (
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2">
          <div className="flex items-center justify-between">
            {/* Logo + Tagline */}
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-3">
                <img src="/helpem-logo.png" alt="HelpEm" className="h-24 w-auto" />
                <p className="text-sm text-brandTextLight font-medium">Built for you.</p>
              </div>
            </Link>

            {/* Global Navigation - ALWAYS SHOW ON ALL PAGES */}
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/#features" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                Pricing
              </Link>
              <Link href="/#about" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                About
              </Link>
              <Link href="/support" className="text-sm text-brandTextLight hover:text-brandBlue transition-colors">
                Support
              </Link>
              {!isAppRoute && (
                <Link
                  href="/app"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-brandBlue to-brandGreen text-white text-sm font-semibold hover:shadow-lg transition-all"
                >
                  Try App
                </Link>
              )}
            </div>
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

      {/* Global Header - Mobile (hidden for iOS) */}
      {!isFromiOSApp && (
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo + Tagline */}
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <img src="/helpem-logo.png" alt="HelpEm" className="h-20 w-auto" />
                <p className="text-xs text-brandTextLight font-medium">Built for you.</p>
              </div>
            </Link>

            {/* Right Side - Menu + CTA */}
            <div className="flex items-center gap-3">
              {/* Hamburger Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <svg className="w-6 h-6 text-brandText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Try App CTA - Only show on informational pages */}
              {!isAppRoute && (
                <Link
                  href="/app"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-brandBlue to-brandGreen text-white text-sm font-semibold hover:shadow-lg transition-all"
                >
                  Try App
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
            <nav className="px-4 py-3 flex flex-col gap-1">
              <Link
                href="/#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-brandText hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-brandText hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Pricing
              </Link>
              <Link
                href="/#about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-brandText hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                About
              </Link>
              {!isAppRoute ? (
                <Link
                  href="/support"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-brandText hover:bg-gray-50 rounded-lg transition-colors font-medium"
                >
                  Support
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowFeedbackModal(true);
                    }}
                    className="px-4 py-3 text-left text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                  >
                    Give Feedback
                  </button>
                  <button
                    onClick={() => {
                      console.log("View Usage clicked");
                      setMobileMenuOpen(false);
                      setShowUsageModal(true);
                      console.log("showUsageModal set to true");
                    }}
                    className="px-4 py-3 text-left text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    View Usage
                  </button>
                  <button
                    onClick={() => {
                      // Clear session
                      document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                      document.cookie = "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                      localStorage.clear();
                      setMobileMenuOpen(false);
                      // Redirect to home
                      window.location.href = "/";
                    }}
                    className="px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>
      )}

      {/* Demo App Navigation - Mobile Banner (only for app routes in demo mode) */}
      {!isFromiOSApp && showDemoNav && (
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
      {!isFromiOSApp && showDemoNav && (
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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <AlphaFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}

      {/* Usage Modal */}
      {showUsageModal && (
        <UsageModal
          isOpen={showUsageModal}
          onClose={() => setShowUsageModal(false)}
        />
      )}
    </>
  );
}
