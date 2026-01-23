"use client";

import { useState, useEffect } from "react";
import { getClientSessionToken } from "@/lib/clientSession";

export default function DebugTribesPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [tribesData, setTribesData] = useState<any>(null);
  const [userState, setUserState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)} - ${message}`]);
  };

  const testFlow = async () => {
    setLogs([]);
    setLoading(true);
    
    try {
      const token = getClientSessionToken();
      addLog(`Token exists: ${!!token}`);
      
      if (!token) {
        addLog("❌ No session token - please sign in");
        setLoading(false);
        return;
      }

      // Step 1: Get current tribes
      addLog("1️⃣  Fetching current tribes...");
      const tribesRes = await fetch("/api/tribes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      addLog(`   Response status: ${tribesRes.status}`);
      
      if (!tribesRes.ok) {
        const error = await tribesRes.text();
        addLog(`   ❌ Error: ${error}`);
        setLoading(false);
        return;
      }
      
      const tribesData = await tribesRes.json();
      addLog(`   ✅ Tribes count: ${tribesData.tribes?.length || 0}`);
      setTribesData(tribesData);
      
      // Step 2: Check user state
      addLog("2️⃣  Checking user state...");
      const stateRes = await fetch("https://api-production-2989.up.railway.app/debug/user-state", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (stateRes.ok) {
        const state = await stateRes.json();
        addLog(`   User ID: ${state.user?.id}`);
        addLog(`   Active tribes: ${state.tribes?.active}`);
        addLog(`   Synthetic users: ${state.syntheticUsers?.count}`);
        addLog(`   Ready for auto-seed: ${state.readyForAutoSeed ? 'YES ✅' : 'NO ❌'}`);
        setUserState(state);
      } else {
        addLog(`   ⚠️  Could not check user state`);
      }
      
      // Step 3: Trigger seed if needed
      if ((tribesData.tribes?.length || 0) === 0) {
        addLog("3️⃣  No tribes found, triggering auto-seed...");
        
        const seedRes = await fetch("/api/tribes/demo/seed", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        
        addLog(`   Seed response status: ${seedRes.status}`);
        
        if (seedRes.ok) {
          const seedData = await seedRes.json();
          addLog(`   ✅ Seed response: ${JSON.stringify(seedData)}`);
          
          // Reload tribes
          addLog("4️⃣  Reloading tribes after seed...");
          const reloadRes = await fetch("/api/tribes", {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (reloadRes.ok) {
            const reloadData = await reloadRes.json();
            addLog(`   ✅ New tribes count: ${reloadData.tribes?.length || 0}`);
            setTribesData(reloadData);
            
            if ((reloadData.tribes?.length || 0) > 0) {
              addLog("🎉 SUCCESS! Tribes created and loaded!");
            } else {
              addLog("⚠️  Seed succeeded but tribes still not showing");
            }
          }
        } else {
          const error = await seedRes.text();
          addLog(`   ❌ Seed failed: ${error}`);
        }
      } else {
        addLog("3️⃣  User already has tribes, no seed needed");
      }
      
    } catch (error) {
      addLog(`💥 Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Debug Tribes Auto-Seed</h1>
        
        <button
          onClick={testFlow}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 mb-4"
        >
          {loading ? "Testing..." : "🧪 Test Auto-Seed Flow"}
        </button>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold mb-2">Logs:</h2>
          <div className="space-y-1 font-mono text-xs bg-black text-green-400 p-3 rounded max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click "Test Auto-Seed Flow" to start...</div>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>
        
        {tribesData && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="font-semibold mb-2">Tribes Data:</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(tribesData, null, 2)}
            </pre>
          </div>
        )}
        
        {userState && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">User State:</h2>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(userState, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Make sure you're signed in</li>
            <li>Click "Test Auto-Seed Flow"</li>
            <li>Watch the logs to see what happens</li>
            <li>If tribes are created, go back to main app to see them</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
