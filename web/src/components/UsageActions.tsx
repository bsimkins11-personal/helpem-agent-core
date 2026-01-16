/**
 * UsageActions Component
 * Action buttons for upgrade and add-usage (Alpha: Opens info modals only)
 */

import { getPlanDisplayName, getUpgradeOptions, type UsageData } from "@/lib/mockUsageService";

type UsageActionsProps = {
  plan: UsageData["plan"];
  canUpgrade: boolean;
  canAddUsage: boolean;
  addUsageOptions: Array<{ amount: number; price: number }>;
  onUpgradeClick: (planName: string, limit: number, price: number) => void;
  onAddUsageClick: (amount: number, price: number) => void;
};

export function UsageActions({
  plan,
  canUpgrade,
  canAddUsage,
  addUsageOptions,
  onUpgradeClick,
  onAddUsageClick,
}: UsageActionsProps) {
  const upgradeOptions = getUpgradeOptions(plan);
  const hasUpgradeOptions = canUpgrade && upgradeOptions.length > 0;
  const firstAddUsageOption = addUsageOptions[0];
  
  return (
    <div className="space-y-3">
      {/* Plan Details */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Current Plan
        </h4>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium text-brandText">{getPlanDisplayName(plan)}</span>
          <button className="text-xs text-brandBlue hover:underline">
            View Details
          </button>
        </div>
      </div>
      
      {/* Actions */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Actions
        </h4>
        <div className="space-y-2">
          {/* Upgrade Button */}
          {hasUpgradeOptions && (
            <button
              onClick={() => {
                const option = upgradeOptions[0];
                onUpgradeClick(option.name, option.limit, option.price);
              }}
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-brandBlue to-brandGreen text-white font-semibold hover:shadow-lg transition-all flex items-center justify-between group"
            >
              <span>Upgrade to {upgradeOptions[0].name}</span>
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}
          
          {/* Add Usage Button */}
          {canAddUsage && firstAddUsageOption && (
            <button
              onClick={() => onAddUsageClick(firstAddUsageOption.amount, firstAddUsageOption.price)}
              className="w-full px-4 py-3 rounded-lg border-2 border-brandBlue text-brandBlue font-semibold hover:bg-brandBlue hover:text-white transition-all flex items-center justify-between group"
            >
              <span>Add {firstAddUsageOption.amount} runs for ${firstAddUsageOption.price}</span>
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Alpha Notice */}
      <div className="text-xs text-gray-500 text-center pt-2">
        💡 Actions available in beta with payment
      </div>
    </div>
  );
}
