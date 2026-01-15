'use client';

import { useMemo } from 'react';
import { AppointmentCard } from '@/components/AppointmentCard';
import { useLife } from '@/state/LifeStore';

export default function AppointmentsPage() {
  const { appointments } = useLife();

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
              <div className="space-y-2 md:space-y-3">
                {apts.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
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
