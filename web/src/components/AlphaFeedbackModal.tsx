"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

interface AlphaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AlphaFeedbackModal({ isOpen, onClose }: AlphaFeedbackModalProps) {
  const pathname = usePathname();
  const [category, setCategory] = useState("general");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/alpha-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          feedback,
          pageUrl: pathname,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      // Show success state
      setShowSuccess(true);
      setFeedback("");
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {showSuccess ? (
          // Success state
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-brandText mb-2">Thank you!</h3>
            <p className="text-brandTextLight">
              Your feedback helps us build a better helpem.
            </p>
          </div>
        ) : (
          // Feedback form
          <>
            <h2 className="text-2xl font-bold text-brandText mb-2">📝 Alpha Feedback</h2>
            <p className="text-sm text-brandTextLight mb-6">
              Help us improve helpem by sharing your thoughts, bugs, or feature ideas.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-brandText mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brandBlue focus:border-brandBlue"
                >
                  <option value="bug">🐛 Bug Report</option>
                  <option value="feature">✨ Feature Request</option>
                  <option value="ui">🎨 UI/UX Feedback</option>
                  <option value="general">💬 General Feedback</option>
                  <option value="other">📌 Other</option>
                </select>
              </div>

              {/* Feedback */}
              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-brandText mb-2">
                  Your Feedback
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={6}
                  maxLength={2000}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brandBlue focus:border-brandBlue resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {feedback.length}/2000 characters
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-brandText rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !feedback.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-brandBlue to-brandGreen text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
