"use client";

type TrialOfferCardProps = {
  onGetStarted?: () => void;
  buttonText?: string;
  isLoading?: boolean;
  showButton?: boolean;
};

export function TrialOfferCard({
  onGetStarted,
  buttonText = "Get Started Free",
  isLoading = false,
  showButton = true,
}: TrialOfferCardProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-3xl p-1">
      <div className="bg-white rounded-[22px] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">🎁</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                FREE TRIAL
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              30 days free
            </h2>
            <p className="text-gray-600 text-lg mb-1">
              Up to <span className="font-bold text-blue-600">3,000 AI interactions</span> included
            </p>
            <p className="text-gray-400 text-sm">
              No credit card required. Try everything, decide later.
            </p>
          </div>
          {showButton && onGetStarted && (
            <div className="hidden md:block">
              <button
                onClick={onGetStarted}
                disabled={isLoading}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 whitespace-nowrap"
              >
                {isLoading ? "Loading..." : buttonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
