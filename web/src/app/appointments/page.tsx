'use client';

import { useMemo } from 'react';
import { useLife } from '@/state/LifeStore';

export default function AppointmentsPage() {
  const { appointments, deleteAppointment } = useLife();
  
  console.log('📅 AppointmentsPage: Rendering with', appointments.length, 'appointments');
  appointments.forEach((apt, index) => {
    console.log(`   [${index}]`, {
      id: apt.id,
      title: apt.title,
      datetime: new Date(apt.datetime).toISOString(),
    });
  });

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, typeof appointments> = {};
    
    const sortedAppointments = [...appointments].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    sortedAppointments.forEach((apt) => {
      const date = new Date(apt.datetime);
      const key = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(apt);
    });

    return groups;
  }, [appointments]);

  const isToday = (dateString: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return dateString === today;
  };

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return dateString === tomorrowString;
  };

  const getDateLabel = (dateString: string) => {
    if (isToday(dateString)) return 'Today';
    if (isTomorrow(dateString)) return 'Tomorrow';
    // On mobile, show shorter date format
    return dateString;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return '—';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isPast = (date: Date) => {
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <span className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 text-lg md:text-xl">◷</span>
          <h1 className="text-xl md:text-2xl font-bold text-brandText">Calendar</h1>
        </div>
        <p className="text-sm md:text-base text-brandTextLight">{appointments.length} appointments scheduled</p>
      </div>

      {/* Appointments by Date */}
      {Object.keys(groupedAppointments).length > 0 ? (
        <div className="space-y-4 md:space-y-6">
          {Object.entries(groupedAppointments).map(([date, apts]) => (
            <div key={date} className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
              <h2
                className={`text-base md:text-lg font-semibold mb-3 md:mb-4 ${
                  isToday(date) ? 'text-violet-600' : 'text-brandText'
                }`}
              >
                {getDateLabel(date)}
                <span className="ml-2 text-xs md:text-sm font-normal text-brandTextLight">
                  {apts.length} {apts.length === 1 ? 'event' : 'events'}
                </span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-brandTextLight">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium">Time</th>
                      <th className="pb-2 pr-3 font-medium">Duration</th>
                      <th className="pb-2 pr-3 font-medium">Who</th>
                      <th className="pb-2 pr-3 font-medium">What</th>
                      <th className="pb-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {apts.map((apt) => (
                      <tr key={apt.id} className={isPast(apt.datetime) ? 'opacity-60' : ''}>
                        <td className="py-2 pr-3 text-brandText">
                          {formatDateShort(apt.datetime)}
                        </td>
                        <td className="py-2 pr-3 text-brandText">
                          {formatTime(apt.datetime)}
                        </td>
                        <td className="py-2 pr-3 text-brandText">
                          {formatDuration(apt.durationMinutes)}
                        </td>
                        <td className="py-2 pr-3 text-brandText">
                          {apt.withWhom || '—'}
                        </td>
                        <td className="py-2 pr-3 text-brandText">
                          {apt.title || '—'}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => deleteAppointment(apt.id)}
                            className="p-1 hover:bg-red-100 rounded"
                            aria-label="Delete appointment"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
          <div className="p-8 md:p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">◷</div>
            <p className="text-sm md:text-base text-brandTextLight mb-2">No appointments scheduled</p>
            <p className="text-xs md:text-sm text-brandTextLight">
              Try saying &quot;Meeting at 3pm tomorrow&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
