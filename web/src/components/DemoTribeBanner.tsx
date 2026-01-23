"use client";

/**
 * Demo Tribe Banner
 * Shows on all tribe pages to indicate this is a preview with synthetic data
 */
export function DemoTribeBanner() {
  return (
    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 text-white px-4 py-3 rounded-lg shadow-lg mb-4 animate-gradient">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-1 flex items-center gap-2">
            🎬 Preview Mode
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-normal">Demo Data</span>
          </p>
          <p className="text-xs text-purple-100 leading-relaxed">
            You're exploring <strong>synthetic tribes</strong> to see how collaboration works. 
            <span className="block mt-1">
              ✨ <strong>Real tribes</strong> launch in early February—invite your actual family, roommates, or team!
            </span>
          </p>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
