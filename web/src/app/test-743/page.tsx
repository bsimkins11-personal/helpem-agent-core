"use client";

import { useEffect, useState } from "react";

export default function Test743() {
  const [status, setStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runTests() {
      const results: any = {
        timestamp: new Date().toISOString(),
        tests: {}
      };

      // Test 1: Can we reach backend?
      try {
        const backendRes = await fetch("https://api-production-2989.up.railway.app/health");
        results.tests.backendHealth = {
          status: backendRes.status,
          ok: backendRes.ok,
          data: await backendRes.json()
        };
      } catch (err: any) {
        results.tests.backendHealth = {
          error: err.message
        };
      }

      // Test 2: Can we create a token?
      try {
        const tokenRes = await fetch("/api/create-test-token");
        const tokenData = await tokenRes.json();
        results.tests.tokenCreation = {
          status: tokenRes.status,
          hasToken: !!tokenData.token,
          tokenLength: tokenData.token?.length || 0
        };
        results.token = tokenData.token;
      } catch (err: any) {
        results.tests.tokenCreation = {
          error: err.message
        };
      }

      // Test 3: Can we verify the token?
      if (results.token) {
        try {
          const verifyRes = await fetch("/api/debug-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: results.token })
          });
          results.tests.tokenVerification = await verifyRes.json();
        } catch (err: any) {
          results.tests.tokenVerification = {
            error: err.message
          };
        }
      }

      // Test 4: Can we call backend tribes directly?
      if (results.token) {
        try {
          const backendTribesRes = await fetch("https://api-production-2989.up.railway.app/tribes", {
            headers: { "Authorization": `Bearer ${results.token}` }
          });
          results.tests.backendTribes = {
            status: backendTribesRes.status,
            data: await backendTribesRes.json()
          };
        } catch (err: any) {
          results.tests.backendTribes = {
            error: err.message
          };
        }
      }

      // Test 5: Can we call Vercel tribes proxy?
      if (results.token) {
        try {
          const vercelTribesRes = await fetch("/api/tribes", {
            headers: { "Authorization": `Bearer ${results.token}` }
          });
          results.tests.vercelTribes = {
            status: vercelTribesRes.status,
            data: await vercelTribesRes.json()
          };
        } catch (err: any) {
          results.tests.vercelTribes = {
            error: err.message
          };
        }
      }

      setStatus(results);
      setLoading(false);
    }

    runTests();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Test 743 - Running Diagnostics...</h1>
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Test 743 - Tribes Diagnostics</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <div className="space-y-4">
            {Object.entries(status.tests || {}).map(([testName, result]: [string, any]) => (
              <div key={testName} className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-lg capitalize">
                  {testName.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto mt-2">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <div className="space-y-2">
            <p>
              <strong>Backend Health:</strong>{" "}
              {status.tests?.backendHealth?.ok ? (
                <span className="text-green-600">✅ OK</span>
              ) : (
                <span className="text-red-600">❌ Failed</span>
              )}
            </p>
            <p>
              <strong>Token Creation:</strong>{" "}
              {status.tests?.tokenCreation?.hasToken ? (
                <span className="text-green-600">✅ OK</span>
              ) : (
                <span className="text-red-600">❌ Failed</span>
              )}
            </p>
            <p>
              <strong>Token Verification:</strong>{" "}
              {status.tests?.tokenVerification?.success ? (
                <span className="text-green-600">✅ OK</span>
              ) : (
                <span className="text-red-600">❌ Failed</span>
              )}
            </p>
            <p>
              <strong>Backend Tribes:</strong>{" "}
              {status.tests?.backendTribes?.data?.tribes ? (
                <span className="text-green-600">
                  ✅ {status.tests.backendTribes.data.tribes.length} tribes found
                </span>
              ) : (
                <span className="text-red-600">❌ No tribes</span>
              )}
            </p>
            <p>
              <strong>Vercel Tribes:</strong>{" "}
              {status.tests?.vercelTribes?.data?.tribes ? (
                <span className="text-green-600">
                  ✅ {status.tests.vercelTribes.data.tribes.length} tribes found
                </span>
              ) : (
                <span className="text-red-600">
                  ❌ Error: {status.tests?.vercelTribes?.data?.error || "No tribes"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>Timestamp: {status.timestamp}</p>
          <p>Test ID: 743</p>
        </div>
      </div>
    </div>
  );
}
