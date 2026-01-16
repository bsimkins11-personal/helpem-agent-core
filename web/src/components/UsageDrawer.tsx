"use client";

/**
 * UsageDrawer Component (Main)
 * Collapsible bottom module showing monthly usage, pace, and actions
 * 
 * Alpha: UI only, no billing
 * Beta Ready: Contract locked, trivial to wire
 */

import { useState, useEffect } from "react";
import { UsageProgressBar } from "./UsageProgressBar";
import { UsagePaceIndicator } from "./UsagePaceIndicator";
import { UsageActions } from "./UsageActions";
import { UsageInfoModal } from "./UsageInfoModal";
import { getUsageStatus, getPlanDisplayName, type UsageData } from "@/lib/mockUsageService";

export function UsageDrawer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [modalType, setModalType] = useState<"upgrade" | "add-usage" | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  
  // Load usage data on mount
  useEffect(() => {
    loadUsageData();
  }, []);
  
  async function loadUsageData() {
    setIsLoading(true);
    try {
      // TODO (Beta): Replace with real API call
      const data = await getUsageStatus();
      setUsageData(data);
    } catch (error) {
      console.error("Failed to load usage data:", error);
    } finally {
      setIsLoading(false);
    }
  }
  
  function handleUpgradeClick(planName: string, limit: number, price: number) {
    setModalType("upgrade");
    setModalData({ plan: planName, limit, price });
  }
  
  function handleAddUsageClick(amount: number, price: number) {
    setModalType("add-usage");
    setModalData({ amount, price });
  }
  
  function closeModal() {
    setModalType(null);
    setModalData(null);
  }
  
  if (isLoading || !usageData) {
    return null; // Or loading skeleton
  }
  
  const percentage = Math.round((usageData.used / usageData.limit) * 100);
  const resetDate = new Date(usageData.resetAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  
  return (
    <>
      {/* Drawer Container */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl transition-all duration-300 ease-in-out z-50 ${
          isExpanded ? "h-[70vh] md:h-[60vh]" : "h-auto"
        }`}
      >
        {/* Collapsed State (Always Visible) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brandText">
                {getPlanDisplayName(usageData.plan)} Plan
              </span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-600">
                {usageData.used} / {usageData.limit} this month
              </span>
            </div>
            <div className="flex-1 max-w-[200px] hidden sm:block">
              <UsageProgressBar used={usageData.used} limit={usageData.limit} size="sm" />
            </div>
          </div>
          
          {/* Chevron */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        
        {/* Expanded State */}
        {isExpanded && (
          <div className="overflow-y-auto h-[calc(100%-60px)] px-4 pb-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Section 1: Usage Overview */}
              <div>
                <h3 className="text-lg font-bold text-brandText mb-3">Monthly Usage</h3>
                <div className="space-y-3">
                  <UsageProgressBar used={usageData.used} limit={usageData.limit} size="lg" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      <strong className="text-brandText">{usageData.used}</strong> of{" "}
                      <strong className="text-brandText">{usageData.limit}</strong> runs used
                    </span>
                    <span className="text-gray-500">
                      {percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Resets on {resetDate}
                  </div>
                </div>
              </div>
              
              {/* Section 2: Pace Indicator */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Usage Pace</h3>
                <UsagePaceIndicator pace={usageData.pace} limit={usageData.limit} />
              </div>
              
              {/* Section 3: Actions */}
              <div>
                <UsageActions
                  plan={usageData.plan}
                  canUpgrade={usageData.actions.canUpgrade}
                  canAddUsage={usageData.actions.canAddUsage}
                  addUsageOptions={usageData.actions.addUsageOptions}
                  onUpgradeClick={handleUpgradeClick}
                  onAddUsageClick={handleAddUsageClick}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Info Modal */}
      <UsageInfoModal
        isOpen={modalType !== null}
        onClose={closeModal}
        type={modalType || "upgrade"}
        data={modalData}
      />
    </>
  );
}
