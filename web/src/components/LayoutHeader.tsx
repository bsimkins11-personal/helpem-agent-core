"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlphaFeedbackModal } from './AlphaFeedbackModal';
import { UsageModal } from './UsageModal';
import SupportModal from './SupportModal';
import ClearDataModal from './ClearDataModal';
import { useConnectionQuality } from '@/hooks/useConnectionQuality';

const WEB_CTA_URL = "/app/onboarding";

const navItems = [
  { href: '/app', label: 'Today', icon: '◐' },
  { href: '/appointments', label: 'Appts', icon: '◷' },
  { href: '/todos', label: 'Todos', icon: '✓' },
  { href: '/habits', label: 'Routines', icon: '↻' },
  { href: '/analytics', label: 'Analytics', icon: '▤' },
];

export function LayoutHeader() {
  const pathname = usePathname();
  const [isDemo] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasSessionToken =
      document.cookie.includes("session_token") ||
      !!window.localStorage?.getItem("helpem_session");
    return !hasSessionToken;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const connectionInfo = useConnectionQuality();

  // Debug state changes
  useEffect(() => {
    console.log("showUsageModal state changed:", showUsageModal);
  }, [showUsageModal]);
  
  useEffect(() => {
    type HeaderWindow = Window & {
      showFeedbackModal?: () => void;
      showUsageModal?: () => void;
      showSupportModal?: () => void;
      showClearDataModal?: () => void;
      __clearAllData?: () => void;
      __connectionInfo?: ReturnType<typeof useConnectionQuality>;
    };
    const headerWindow = window as HeaderWindow;

    // Expose functions globally for web shell integrations
    console.log('📱 Web: Exposing header modal functions');
    headerWindow.showFeedbackModal = () => {
      console.log('🌐 Web: showFeedbackModal called');
      setShowFeedbackModal(true);
    };
    headerWindow.showUsageModal = () => {
      console.log('🌐 Web: showUsageModal called');
      setShowUsageModal(true);
    };
    headerWindow.showSupportModal = () => {
      console.log('🌐 Web: showSupportModal called');
      setShowSupportModal(true);
    };
    headerWindow.showClearDataModal = () => {
      console.log('🌐 Web: showClearDataModal called');
      setShowClearDataModal(true);
    };
    headerWindow.__clearAllData = () => {
      console.log('🌐 Web: __clearAllData called from window (deprecated)');
      // Redirect to new modal
      setShowClearDataModal(true);
    };
    console.log('✅ Web: Functions exposed globally');

    // Listen for external modal triggers (backup method)
    const handleShowFeedback = () => {
      console.log('🌐 Web: showFeedbackModal event received');
      setShowFeedbackModal(true);
    };
    const handleShowUsage = () => {
      console.log('🌐 Web: showUsageModal event received');
      setShowUsageModal(true);
    };
    const handleShowSupport = () => {
      console.log('🌐 Web: showSupportModal event received');
      setShowSupportModal(true);
    };
    const handleShowClearData = () => {
      console.log('🌐 Web: showClearDataModal event received');
      setShowClearDataModal(true);
    };
    
    console.log('🎧 Web: Setting up event listeners');
    window.addEventListener('showFeedbackModal', handleShowFeedback);
    window.addEventListener('showUsageModal', handleShowUsage);
    window.addEventListener('showSupportModal', handleShowSupport);
    window.addEventListener('showClearDataModal', handleShowClearData);
    
    return () => {
      console.log('🧹 Web: Cleaning up');
      window.removeEventListener('showFeedbackModal', handleShowFeedback);
      window.removeEventListener('showUsageModal', handleShowUsage);
      window.removeEventListener('showSupportModal', handleShowSupport);
      window.removeEventListener('showClearDataModal', handleShowClearData);
      delete headerWindow.showFeedbackModal;
      delete headerWindow.showUsageModal;
      delete headerWindow.showSupportModal;
      delete headerWindow.showClearDataModal;
      delete headerWindow.__clearAllData;
    };
  }, []);

  useEffect(() => {
    type ConnectionWindow = Window & { __connectionInfo?: ReturnType<typeof useConnectionQuality> };
    const connectionWindow = window as ConnectionWindow;
    connectionWindow.__connectionInfo = connectionInfo;
    document.documentElement.dataset.connection = connectionInfo.isSlow ? "slow" : "normal";
    window.dispatchEvent(new CustomEvent("connectionInfo", { detail: connectionInfo }));
  }, [connectionInfo]);

  const isAppRoute = pathname?.startsWith('/app') || 
                     pathname?.startsWith('/appointments') || 
                     pathname?.startsWith('/todos') || 
                     pathname?.startsWith('/habits');
  
  const showDemoNav = isDemo && isAppRoute;

  return (
    <>
      {/* Global Header - Desktop */}
      <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-1">
          <div className="flex items-center justify-between">
            {/* Logo + Tagline */}
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-1.5">
                <Image
                  src="/helpem-logo.png"
                  alt="helpem"
                  width={256}
                  height={96}
                  className="h-16 w-auto"
                  priority
                />
                <p className="text-[12.5px] text-brandTextLight font-medium">Built for you.</p>
              </div>
            </Link>

            {/* Global Navigation - ALWAYS SHOW ON ALL PAGES */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/#features" className="text-[11px] text-brandTextLight hover:text-brandBlue transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-[11px] text-brandTextLight hover:text-brandBlue transition-colors">
                Pricing
              </Link>
              <Link href="/referrals" className="text-[11px] text-brandTextLight hover:text-brandBlue transition-colors">
                Referrals
              </Link>
              <Link href="/#about" className="text-[11px] text-brandTextLight hover:text-brandBlue transition-colors">
                About
              </Link>
              <Link href="/support" className="text-[11px] text-brandTextLight hover:text-brandBlue transition-colors">
                Support
              </Link>
              {!isAppRoute && (
                <Link
                  href={WEB_CTA_URL}
                  className="px-2.5 py-1 rounded-md bg-gradient-to-r from-brandBlue to-brandGreen text-white text-[11px] font-semibold hover:shadow-lg transition-all"
                >
                  Start Free
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

      {/* Global Header - Mobile */}
      <header className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-3 py-1">
          <div className="flex items-center justify-between">
            {/* Logo + Tagline */}
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-1">
                <Image
                  src="/helpem-logo.png"
                  alt="helpem"
                  width={192}
                  height={72}
                  className="h-12 w-auto"
                  priority
                />
                <p className="text-[11.25px] text-brandTextLight font-medium">Built for you.</p>
              </div>
            </Link>

            {/* Right Side - Menu + CTA */}
            <div className="flex items-center gap-1.5">
              {/* Hamburger Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Menu"
              >
                <svg className="w-4 h-4 text-brandText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  href={WEB_CTA_URL}
                  className="px-2.5 py-1 rounded-md bg-gradient-to-r from-brandBlue to-brandGreen text-white text-[10px] font-semibold hover:shadow-lg transition-all"
                >
                  Start Free
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
                href="/referrals"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-brandText hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                🤝 Referrals
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
                  <Link
                    href="/analytics"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-brandText hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    Personal Analytics
                  </Link>
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
              <Link
                href="/connections"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
              >
                🔌 Connectors
              </Link>
              <Link
                href="/tribe/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                👥 My Tribes
              </Link>
              <button
                    onClick={() => {
                      console.log("Get Support clicked");
                      setMobileMenuOpen(false);
                      setShowSupportModal(true);
                    }}
                    className="px-4 py-3 text-left text-green-600 hover:bg-green-50 rounded-lg transition-colors font-medium"
                  >
                    Get Support
                  </button>
                  <button
                    onClick={() => {
                      console.log('🗑️ Opening Clear Data modal');
                      setMobileMenuOpen(false);
                      setShowClearDataModal(true);
                    }}
                    className="px-4 py-3 text-left text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-medium"
                  >
                    Clear App Data
                  </button>
                  <button
                    onClick={() => {
                      console.log("🚪 Logout clicked");
                      // Clear all session data
                      document.cookie.split(";").forEach(c => {
                        const name = c.trim().split("=")[0];
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.helpem.ai`;
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
                      });
                      localStorage.clear();
                      sessionStorage.clear();
                      setMobileMenuOpen(false);
                      // Redirect to auth gate with logout flag
                      window.location.href = "/app?logout=true";
                    }}
                    className="px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    🚪 Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
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

      {/* Support Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* Clear Data Modal */}
      <ClearDataModal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
      />
    </>
  );
}
