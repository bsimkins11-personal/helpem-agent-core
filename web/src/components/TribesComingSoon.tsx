"use client";

/**
 * Tribes Coming Soon Teaser
 * 
 * Shows exciting preview of tribes feature without exposing buggy implementation.
 * Builds anticipation for v1.1 launch.
 */
export function TribesComingSoon() {
  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-xl md:rounded-2xl p-6 md:p-8 shadow-sm border border-purple-100">
      {/* Header with Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Tribes
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm animate-pulse">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="space-y-4 mb-6">
        <p className="text-brandText font-medium">
          Coordinate with family, roommates, and teams
        </p>
        
        <div className="grid grid-cols-1 gap-3">
          {/* Feature 1 */}
          <div className="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-brandText">Shared Tasks</h4>
              <p className="text-xs text-brandTextLight">Propose todos, appointments, and groceries to your tribe</p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-brandText">Group Chat</h4>
              <p className="text-xs text-brandTextLight">Stay in sync with real-time messages and updates</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-brandText">Privacy First</h4>
              <p className="text-xs text-brandTextLight">Accept or decline proposals—full control over your list</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm mb-0.5">Be the first to know</p>
            <p className="text-xs text-purple-100">We'll notify you when Tribes launches</p>
          </div>
          <svg className="w-6 h-6 flex-shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </div>

      {/* Optional: Waitlist hint */}
      <p className="text-center text-xs text-brandTextLight mt-4">
        Expected early February 2026
      </p>
    </div>
  );
}
