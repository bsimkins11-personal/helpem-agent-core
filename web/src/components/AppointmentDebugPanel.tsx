"use client";

import { useState } from "react";
import { useLife } from "@/state/LifeStore";
import { v4 as uuidv4 } from "uuid";

/**
 * DEBUG PANEL - Appointment Creation Diagnostics
 * 
 * This component provides a simple UI to test appointment creation
 * and diagnose why appointments aren't showing in the calendar.
 */
export function AppointmentDebugPanel() {
  const { appointments, addAppointment } = useLife();
  const [testTitle, setTestTitle] = useState("Test Appointment");
  const [testDatetime, setTestDatetime] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const handleTestCreate = () => {
    addLog("🧪 TEST: Starting manual appointment creation...");
    
    // Use tomorrow at 3pm if no datetime provided
    const datetime = testDatetime 
      ? new Date(testDatetime)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(15, 0, 0, 0);
          return d;
        })();
    
    addLog(`📅 Creating appointment: "${testTitle}"`);
    addLog(`📅 Datetime: ${datetime.toISOString()}`);
    addLog(`📅 Date only: ${datetime.toLocaleDateString()}`);
    addLog(`📅 Time only: ${datetime.toLocaleTimeString()}`);
    
    const id = uuidv4();
    const createdAt = new Date();
    
    addLog(`🆔 Generated ID: ${id}`);
    addLog(`⏰ Created at: ${createdAt.toISOString()}`);
    
    addLog("🔄 Calling addAppointment()...");
    
    try {
      addAppointment({
        id,
        title: testTitle,
        withWhom: null,
        topic: null,
        datetime,
        durationMinutes: 30,
        createdAt,
      });
      
      addLog("✅ addAppointment() call completed successfully");
      addLog(`📊 Current appointments count: ${appointments.length + 1}`);
      
      // Check after a brief delay
      setTimeout(() => {
        addLog(`⏳ Checking state after 100ms...`);
        addLog(`📊 Appointments in state: ${appointments.length}`);
      }, 100);
      
    } catch (error) {
      addLog(`❌ ERROR: ${error}`);
      console.error("Appointment creation error:", error);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const getDefaultDatetime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    // Format for datetime-local input
    return tomorrow.toISOString().slice(0, 16);
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🧪</span>
        <div>
          <h3 className="font-bold text-lg text-yellow-900">Appointment Debug Panel</h3>
          <p className="text-sm text-yellow-700">Test appointment creation and view diagnostics</p>
        </div>
      </div>

      {/* Current State */}
      <div className="bg-white rounded-lg p-3 space-y-2">
        <h4 className="font-semibold text-sm text-gray-900">Current State</h4>
        <div className="text-sm space-y-1">
          <p><span className="font-medium">Appointments in state:</span> {appointments.length}</p>
          {appointments.length > 0 && (
            <div className="mt-2">
              <p className="font-medium mb-1">List:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {appointments.map((apt, idx) => (
                  <li key={apt.id}>
                    <span className="font-medium">{apt.title}</span> at{" "}
                    {apt.datetime instanceof Date 
                      ? apt.datetime.toLocaleString() 
                      : new Date(apt.datetime).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-white rounded-lg p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-900">Create Test Appointment</h4>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder="Test Appointment"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Date & Time (leave empty for tomorrow 3pm)
          </label>
          <input
            type="datetime-local"
            value={testDatetime}
            onChange={(e) => setTestDatetime(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder={getDefaultDatetime()}
          />
        </div>

        <button
          onClick={handleTestCreate}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 rounded-lg text-sm transition-colors"
        >
          🧪 Create Test Appointment
        </button>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-gray-900">Diagnostic Logs</h4>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-xs text-gray-600 hover:text-gray-800 underline"
            >
              Clear
            </button>
          )}
        </div>
        
        {logs.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No logs yet. Create a test appointment to see diagnostics.</p>
        ) : (
          <div className="bg-gray-900 text-green-400 rounded p-2 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="font-semibold text-sm text-blue-900 mb-2">📋 How to Use</h4>
        <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
          <li>Open browser console (F12)</li>
          <li>Click "Create Test Appointment"</li>
          <li>Watch both the logs here AND browser console</li>
          <li>Check if appointment appears in "Current State" above</li>
          <li>Navigate to tomorrow's date in calendar and verify it shows</li>
          <li>Share console output if appointment doesn't appear</li>
        </ol>
      </div>
    </div>
  );
}
