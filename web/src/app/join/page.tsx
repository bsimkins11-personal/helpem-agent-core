"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get("ref");

    if (refCode) {
      // Redirect to referrals page with the code
      router.replace(`/referrals?ref=${refCode}`);
    } else {
      // No referral code, redirect to main landing page
      router.replace("/");
    }
  }, [searchParams, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
