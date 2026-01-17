"use client";

import { useEffect, useState } from "react";
import { getUsageStatus, getPlanDisplayName, type UsageData } from "@/lib/mockUsageService";

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageModal({ isOpen, onClose }: UsageModalProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("UsageModal isOpen:", isOpen);
    if (isOpen) {
      loadUsageData();
    }
  }, [isOpen]);

  async function loadUsageData() {
    setIsLoading(true);
    try {
      const data = await getUsageStatus();
      setUsageData(data);
    } catch (error) {
      console.error("Failed to load usage data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const percentage = usageData ? Math.round((usageData.used / usageData.limit) * 100) : 0;
  const resetDate = usageData
    ? new Date(usageData.resetAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[80vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-brandText">Monthly Usage</h2>
          {usageData && (
            <p className="text-sm text-gray-600 mt-1">
              {getPlanDisplayName(usageData.plan)} Plan • Resets {resetDate}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : usageData ? (
          <div className="space-y-6">
            {/* Usage Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {usageData.used} / {usageData.limit} runs used
                </span>
                <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    percentage >= 90
                      ? "bg-red-500"
                      : percentage >= 70
                      ? "bg-amber-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Pace Indicator */}
            {usageData.pace && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Usage Pace</h3>
                <div className="text-sm text-gray-600">
                  <p>
                    At your current pace, you'll use approximately{" "}
                    <strong className="text-brandText">{usageData.pace.projectedTotal}</strong> runs this
                    month
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {usageData.pace.daysRemaining} days remaining in billing period
                  </p>
                </div>
              </div>
            )}

            {/* Plan Info */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Plan Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Plan</span>
                  <span className="font-medium text-brandText">
                    {getPlanDisplayName(usageData.plan)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Limit</span>
                  <span className="font-medium text-brandText">{usageData.limit} runs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining</span>
                  <span className="font-medium text-green-600">
                    {usageData.limit - usageData.used} runs
                  </span>
                </div>
              </div>
            </div>

            {/* Upgrade CTA (if applicable) */}
            {usageData.actions.canUpgrade && percentage >= 70 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚡</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">Need more runs?</h3>
                    <p className="text-sm text-blue-800 mt-1">
                      Upgrade to get more capacity and additional features.
                    </p>
                    <button
                      onClick={() => {
                        window.location.href = "/pricing";
                      }}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      View Plans
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Unable to load usage data</p>
          </div>
        )}
      </div>
    </div>
  );
}
