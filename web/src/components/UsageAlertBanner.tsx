"use client";

import { useState, useEffect, useRef } from "react";
import { getUsageStatus, type UsageData } from "@/lib/mockUsageService";

type AlertLevel = "warning" | "critical" | null;

type UsageAlertBannerProps = {
  onHeightChange?: () => void;
};

export function UsageAlertBanner({ onHeightChange }: UsageAlertBannerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [bannerHeight, setBannerHeight] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUsage = async () => {
      try {
        const data = await getUsageStatus();
        setUsageData(data);

        const usagePercent = (data.used / data.limit) * 100;
        const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
        
        // Check if we've already shown this alert for this month
        const dismissedKey = `usageAlert-${currentMonth}`;
        const dismissed = localStorage.getItem(dismissedKey);

        let shouldShow = false;
        let level: AlertLevel = null;

        // Determine alert level
        if (usagePercent >= 90 && dismissed !== "90") {
          shouldShow = true;
          level = "critical";
        } else if (usagePercent >= 50 && usagePercent < 90 && dismissed !== "50" && dismissed !== "90") {
          shouldShow = true;
          level = "warning";
        }

        if (shouldShow && level) {
          setIsMounted(true);
          setAlertLevel(level);
          requestAnimationFrame(() => setIsOpen(true));
        }
      } catch (error) {
        console.error("Failed to check usage:", error);
      }
    };

    checkUsage();
  }, []);

  const handleDismiss = () => {
    if (alertLevel && usageData) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const dismissedKey = `usageAlert-${currentMonth}`;
      
      // Store the alert level that was dismissed
      localStorage.setItem(dismissedKey, alertLevel === "critical" ? "90" : "50");
      
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    if (bannerRef.current) {
      setBannerHeight(bannerRef.current.scrollHeight);
    }
    onHeightChange?.();
  }, [isMounted, onHeightChange]);

  useEffect(() => {
    onHeightChange?.();
  }, [isOpen, onHeightChange]);

  if (!isMounted || !alertLevel || !usageData) return null;

  const usagePercent = Math.round((usageData.used / usageData.limit) * 100);
  const remaining = usageData.limit - usageData.used;

  const alertStyles = {
    warning: {
      bg: "bg-gradient-to-r from-amber-500 to-orange-500",
      icon: "⚠️",
      title: "50% Usage Alert",
      message: `You've used ${usageData.used} of ${usageData.limit} messages this month (${usagePercent}%). ${remaining} messages remaining.`,
    },
    critical: {
      bg: "bg-gradient-to-r from-red-600 to-pink-600",
      icon: "🚨",
      title: "90% Usage Alert",
      message: `You're running low! ${usageData.used} of ${usageData.limit} messages used (${usagePercent}%). Only ${remaining} messages left.`,
    },
  };

  const alert = alertStyles[alertLevel];

  return (
    <div
      className="overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-in-out"
      style={{
        maxHeight: isOpen ? `${bannerHeight}px` : "0px",
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? "translateY(0)" : "translateY(-4px)"
      }}
      onTransitionEnd={() => {
        if (!isOpen) setIsMounted(false);
        onHeightChange?.();
      }}
    >
      <div
        ref={bannerRef}
        className={`${alert.bg} text-white py-1 px-2 flex items-center justify-between shadow-lg`}
      >
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-sm">{alert.icon}</span>
          <div>
            <p className="text-[10px] font-bold leading-tight">{alert.title}</p>
            <p className="text-[10px] leading-tight">{alert.message}</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-0 hover:bg-white/20 rounded transition-colors ml-2 flex-shrink-0"
          aria-label="Dismiss alert"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
