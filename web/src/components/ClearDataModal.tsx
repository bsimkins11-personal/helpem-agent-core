"use client";

import { useEffect, useState } from "react";
import { useLife } from "@/state/LifeStore";

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DataType = {
  key: string;
  label: string;
  description: string;
  icon: string;
};

const DATA_TYPES: DataType[] = [
  {
    key: 'todos',
    label: 'Todos',
    description: 'All your tasks and to-do items',
    icon: '✓',
  },
  {
    key: 'groceries',
    label: 'Grocery List',
    description: 'All grocery items',
    icon: '🛒',
  },
  {
    key: 'appointments',
    label: 'Appointments',
    description: 'All scheduled appointments and events',
    icon: '📅',
  },
  {
    key: 'habits',
    label: 'Habits',
    description: 'All habit trackers and logs',
    icon: '🎯',
  },
  {
    key: 'routines',
    label: 'Routines',
    description: 'All routine checklists',
    icon: '📋',
  },
  {
    key: 'chat',
    label: 'Chat History',
    description: 'All chat messages and conversation history',
    icon: '💬',
  },
];

export default function ClearDataModal({ isOpen, onClose }: ClearDataModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(DATA_TYPES.map(dt => dt.key))
  );
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { clearAllData } = useLife();

  useEffect(() => {
    if (isOpen) {
      setSelectedTypes(new Set(DATA_TYPES.map(dt => dt.key)));
      setShowConfirmation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDataType = (key: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedTypes(newSelected);
  };

  const handleClearData = async () => {
    if (selectedTypes.size === 0) {
      alert('Please select at least one data type to clear.');
      return;
    }

    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsClearing(true);

    try {
      const response = await fetch('/api/clear-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataTypes: Array.from(selectedTypes),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Data cleared successfully:', result);

        // Clear chat from sessionStorage if selected
        if (selectedTypes.has('chat')) {
          sessionStorage.removeItem('helpem-chat-session');
          sessionStorage.removeItem('helpem_chat_history');
          console.log('✅ Cleared chat from sessionStorage');
        }

        // Refresh state after clearing data
        if (selectedTypes.size === DATA_TYPES.length) {
          await clearAllData();
        } else if (selectedTypes.size > 0) {
          window.location.reload();
        }

        alert('✅ Selected data has been cleared successfully!');
        onClose();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Failed to clear data'}`);
      }
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      alert('❌ An error occurred while clearing data. Please try again.');
    } finally {
      setIsClearing(false);
      setShowConfirmation(false);
      setSelectedTypes(new Set(DATA_TYPES.map(dt => dt.key)));
    }
  };

  const handleClose = () => {
    if (!isClearing) {
      setShowConfirmation(false);
      setSelectedTypes(new Set(DATA_TYPES.map(dt => dt.key)));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Clear App Data</h2>
            <button
              onClick={handleClose}
              disabled={isClearing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Select which data you want to delete from your account. This action cannot be undone.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Data type checkboxes */}
          <div className="space-y-2">
            {DATA_TYPES.map((dataType) => (
              <label
                key={dataType.key}
                className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedTypes.has(dataType.key)
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                } ${isClearing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.has(dataType.key)}
                  onChange={() => toggleDataType(dataType.key)}
                  disabled={isClearing}
                  className="mt-1 w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{dataType.icon}</span>
                    <span className="font-semibold text-gray-900">{dataType.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{dataType.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Confirmation warning */}
          {showConfirmation && (
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-red-900">Are you absolutely sure?</p>
                  <p className="text-sm text-red-800 mt-1">
                    This will permanently delete the selected data from your account. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              disabled={isClearing}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {!showConfirmation ? (
              <button
                onClick={handleClearData}
                disabled={isClearing || selectedTypes.size === 0}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedTypes.size === 0 ? 'Select Data Types' : `Clear ${selectedTypes.size} Data Type${selectedTypes.size > 1 ? 's' : ''}`}
              </button>
            ) : (
              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Clearing...
                  </>
                ) : (
                  'Yes, Delete Permanently'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
