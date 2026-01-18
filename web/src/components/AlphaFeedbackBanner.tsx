"use client";

import { useState, useEffect } from "react";
import { AlphaFeedbackModal } from "./AlphaFeedbackModal";

export function AlphaFeedbackBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem("alphaFeedbackBannerDismissed");
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("alphaFeedbackBannerDismissed", "true");
  };

  const handleFeedbackClick = () => {
    setShowModal(true);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-1 px-2 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-sm">⚠️</span>
          <p className="text-[10px] font-medium leading-tight">
            <span className="font-bold">helpem is in alpha.</span> Provide feedback to help us improve!
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFeedbackClick}
            className="px-2 py-0.5 bg-white text-purple-600 rounded text-[10px] font-semibold hover:bg-purple-50 transition-colors"
          >
            Feedback
          </button>
          <button
            onClick={handleDismiss}
            className="p-0 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showModal && (
        <AlphaFeedbackModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
