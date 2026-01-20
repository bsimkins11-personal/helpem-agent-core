'use client';

import { useState } from 'react';
import { Appointment } from '@/types/appointment';
import { useLife } from '@/state/LifeStore';

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const { deleteAppointment } = useLife();
  const [showConfirm, setShowConfirm] = useState(false);
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = () => {
    const today = new Date();
    const aptDate = new Date(appointment.datetime);
    return (
      today.getFullYear() === aptDate.getFullYear() &&
      today.getMonth() === aptDate.getMonth() &&
      today.getDate() === aptDate.getDate()
    );
  };

  const isPast = () => {
    return new Date(appointment.datetime) < new Date();
  };

  const handleDelete = () => {
    deleteAppointment(appointment.id);
    setShowConfirm(false);
  };

  return (
    <>
      <div
        className={`group relative p-3 bg-violet-50 border border-violet-200 rounded-xl 
                    border-l-4 border-l-violet-500 hover:bg-violet-100 transition-all duration-200
                    ${isPast() ? 'opacity-50' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 bg-violet-100 rounded-lg">
            <span className="text-xs text-violet-600 font-semibold">
              {formatTime(appointment.datetime)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-brandText text-sm">{appointment.title}</h3>

            <div className="mt-1.5 flex items-center gap-2 text-xs text-brandTextLight">
              <span className="flex items-center gap-1">
                📅 {isToday() ? 'Today' : formatDate(appointment.datetime)}
              </span>
              {appointment.withWhom && (
                <span className="flex items-center gap-1">
                  👤 {appointment.withWhom}
                </span>
              )}
              {formatDuration(appointment.durationMinutes) && (
                <span className="flex items-center gap-1">
                  ⏱️ {formatDuration(appointment.durationMinutes)}
                </span>
              )}
            </div>
          </div>

          {/* Delete button - always visible on mobile, shows on hover on desktop */}
          <button
            onClick={() => setShowConfirm(true)}
            className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
            aria-label="Delete appointment"
          >
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-brandText mb-2">Delete Appointment</h3>
            <p className="text-brandTextLight mb-6">
              Confirm you want to remove <span className="font-semibold text-brandText">{appointment.title}</span> from your calendar?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-brandText hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
