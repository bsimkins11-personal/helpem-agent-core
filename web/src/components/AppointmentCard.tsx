'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Appointment } from '@/types/appointment';
import { useLife } from '@/state/LifeStore';
import { getClientSessionToken } from '@/lib/clientSession';

interface AppointmentCardProps {
  appointment: Appointment;
  onExternalDelete?: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, onExternalDelete }: AppointmentCardProps) {
  const { deleteAppointment, updateAppointment } = useLife();
  const isExternal = appointment.source === 'google_calendar' || appointment.source === 'apple_calendar';
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    if (!showEdit && !showConfirm) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showEdit, showConfirm]);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [editForm, setEditForm] = useState({
    title: appointment.title,
    datetime: new Date(appointment.datetime).toISOString().slice(0, 16),
    durationMinutes: appointment.durationMinutes || 30,
    withWhom: appointment.withWhom || 'Just me',
    topic: appointment.topic || '',
    location: appointment.location || '',
  });
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

  const handleDelete = async () => {
    if (isExternal) {
      try {
        const token = getClientSessionToken();
        if (!token) return;
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

        if (appointment.source === 'google_calendar') {
          await fetch(`/api/google/calendar/events/${appointment.externalEventId}`, {
            method: 'DELETE', headers,
          });
        } else if (appointment.source === 'apple_calendar') {
          await fetch(`/api/apple/calendar/events/${appointment.externalEventId}`, {
            method: 'DELETE', headers,
          });
        }
        onExternalDelete?.(appointment);
      } catch (err) {
        console.error('Failed to delete external event:', err);
      }
    } else {
      deleteAppointment(appointment.id);
    }
    setShowConfirm(false);
  };

  const handleSaveEdit = async () => {
    const trimmedWithWhom = editForm.withWhom.trim() || 'Just me';
    const updates: Partial<Appointment> = {
      title: editForm.title,
      datetime: new Date(editForm.datetime),
      durationMinutes: editForm.durationMinutes,
      withWhom: trimmedWithWhom,
      topic: editForm.topic || null,
      location: editForm.location || null,
    };

    if (isExternal) {
      // Update external calendar event
      try {
        const token = getClientSessionToken();
        if (!token) return;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        const body = JSON.stringify({
          title: updates.title,
          datetime: updates.datetime?.toISOString(),
          durationMinutes: updates.durationMinutes,
          location: updates.location,
          description: editForm.topic || undefined,
        });

        if (appointment.source === 'google_calendar') {
          await fetch(`/api/google/calendar/events/${appointment.externalEventId}`, {
            method: 'PATCH', headers, body,
          });
        } else if (appointment.source === 'apple_calendar') {
          await fetch(`/api/apple/calendar/events/${appointment.externalEventId}`, {
            method: 'PATCH', headers, body,
          });
        }
      } catch (err) {
        console.error('Failed to update external event:', err);
      }
    } else {
      const apiPayload = {
        id: appointment.id,
        title: updates.title,
        datetime: updates.datetime?.toISOString(),
        durationMinutes: updates.durationMinutes,
        withWhom: updates.withWhom,
        topic: updates.topic,
        location: updates.location,
      };

      updateAppointment(appointment.id, updates);

      try {
        const response = await fetch('/api/appointments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to update appointment:', response.status, errorText);
          if (response.status === 404) {
            const createResponse = await fetch('/api/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: updates.title,
                datetime: updates.datetime?.toISOString(),
                durationMinutes: updates.durationMinutes,
                withWhom: updates.withWhom,
                topic: updates.topic,
                location: updates.location,
              }),
            });
            if (!createResponse.ok) {
              const createErrorText = await createResponse.text();
              console.error('Failed to create appointment after 404:', createResponse.status, createErrorText);
            }
          }
        }
      } catch (error) {
        console.error('Error updating appointment:', error);
      }
    }

    setShowEdit(false);
  };

  return (
    <>
      <div
        onClick={() => setShowEdit(true)}
        className={`group relative p-3 bg-violet-50 border border-violet-200 rounded-xl 
                    border-l-4 border-l-violet-500 hover:bg-violet-100 transition-all duration-200
                    cursor-pointer ${isPast() ? 'opacity-50' : ''}`}
      >
        {/* Source / Tribe indicator badges */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {appointment.source === 'google_calendar' && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-semibold">
              G Cal
            </span>
          )}
          {appointment.source === 'apple_calendar' && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-semibold">
              iCal
            </span>
          )}
          {appointment.addedByTribeName && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {appointment.addedByTribeName}
            </span>
          )}
        </div>
        
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 bg-violet-100 rounded-lg">
            <span className="text-xs text-violet-600 font-semibold">
              {formatTime(appointment.datetime)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-brandText text-sm">{appointment.title}</h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-brandTextLight">
              <span className="flex items-center gap-1">
                📅 {isToday() ? 'Today' : formatDate(appointment.datetime)}
              </span>
              {appointment.withWhom && (
                <span className="flex items-center gap-1">
                  👤 {appointment.withWhom}
                </span>
              )}
              {appointment.topic && (
                <span className="flex items-center gap-1">
                  💬 {appointment.topic}
                </span>
              )}
              {appointment.location && (
                <span className="flex items-center gap-1">
                  📍 {appointment.location}
                </span>
              )}
              {formatDuration(appointment.durationMinutes) && (
                <span className="flex items-center gap-1">
                  ⏱️ {formatDuration(appointment.durationMinutes)}
                </span>
              )}
              {appointment.description && !appointment.topic && (
                <span className="flex items-center gap-1">
                  💬 {appointment.description.length > 40 ? appointment.description.slice(0, 40) + '...' : appointment.description}
                </span>
              )}
            </div>
            {appointment.htmlLink && (
              <a
                href={appointment.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] text-blue-500 hover:underline mt-1 inline-block"
              >
                Open in Google Calendar
              </a>
            )}
          </div>

          {/* Delete button - always visible on mobile, shows on hover on desktop */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(true);
            }}
            className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
            aria-label="Delete appointment"
          >
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && isMounted && createPortal(
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-white"
          style={{ backgroundColor: '#ffffff', opacity: 1 }}
        >
          <div className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-200 bg-white">
            <h3 className="text-lg font-semibold text-brandText mb-4">Edit Appointment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brandText mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brandText mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={editForm.datetime}
                  onChange={(e) => setEditForm({ ...editForm, datetime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brandText mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={editForm.durationMinutes}
                  onChange={(e) => setEditForm({ ...editForm, durationMinutes: parseInt(e.target.value) || 30 })}
                  min="5"
                  step="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brandText mb-1">With Whom</label>
                <input
                  type="text"
                  value={editForm.withWhom}
                  onChange={(e) => setEditForm({ ...editForm, withWhom: e.target.value })}
                  placeholder="e.g., John, AMS team"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brandText mb-1">Topic (optional)</label>
                <input
                  type="text"
                  value={editForm.topic}
                  onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                  placeholder="e.g., Budget review, Taxonomies"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brandText mb-1">Location (optional)</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g., Conference Room A, Google HQ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-brandText hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      {showConfirm && isMounted && createPortal(
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-white">
          <div className="rounded-xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-200 bg-white">
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
        </div>,
        document.body
      )}
    </>
  );
}
