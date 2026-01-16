/**
 * UsageInfoModal Component
 * Displays upgrade and add-usage information (Alpha: No actual billing)
 */

type UsageInfoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: "upgrade" | "add-usage";
  data?: {
    plan?: string;
    limit?: number;
    price?: number;
    amount?: number;
  };
};

export function UsageInfoModal({ isOpen, onClose, type, data }: UsageInfoModalProps) {
  if (!isOpen) return null;
  
  const isUpgrade = type === "upgrade";
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-brandText">
            {isUpgrade ? "Upgrade Plan" : "Add Usage"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          {isUpgrade ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Upgrade to {data?.plan}</strong>
                </p>
                <ul className="text-xs text-blue-800 mt-2 space-y-1">
                  <li>• New limit: {data?.limit?.toLocaleString()} runs/month</li>
                  <li>• Price: ${data?.price}/month</li>
                  <li>• Effective immediately</li>
                  <li>• Prorated charge applied</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <strong>Add {data?.amount} runs for ${data?.price}</strong>
                </p>
                <ul className="text-xs text-green-800 mt-2 space-y-1">
                  <li>• Applies to this billing month only</li>
                  <li>• One-time purchase (no auto-renew)</li>
                  <li>• Available immediately</li>
                </ul>
              </div>
            </>
          )}
          
          {/* Alpha Notice */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-purple-600 text-lg">ℹ️</span>
              <div className="flex-1">
                <p className="text-sm text-purple-900 font-medium">Alpha Version</p>
                <p className="text-xs text-purple-800 mt-1">
                  Billing will be enabled in beta. This is a preview of what the {isUpgrade ? 'upgrade' : 'add-usage'} flow will look like.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            disabled
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-300 text-gray-500 font-medium cursor-not-allowed"
            title="Billing available in beta"
          >
            {isUpgrade ? "Upgrade (Beta)" : "Add Usage (Beta)"}
          </button>
        </div>
      </div>
    </div>
  );
}
