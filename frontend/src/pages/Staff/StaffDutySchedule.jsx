import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import useStaffSession from '../../hooks/useStaffSession';

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date) => {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const displayTime = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
};

export default function StaffDutySchedule() {
  const { isDarkMode = false } = useOutletContext() || {};
  const { staffId } = useStaffSession();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  }), [weekStart]);
  const selectedDateKey = toLocalDateString(selectedDate);

  useEffect(() => {
    if (!staffId) {
      setLoading(false);
      setError('Please log in again to view your duty schedule.');
      return undefined;
    }

    const throughDate = new Date(weekStart);
    throughDate.setDate(throughDate.getDate() + 6);
    const controller = new AbortController();
    const query = new URLSearchParams({
      from: toLocalDateString(weekStart),
      to: toLocalDateString(throughDate)
    });

    setLoading(true);
    setSchedules([]);
    fetch(`/api/staff/${staffId}/duty-schedules?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load your schedule.');
        setSchedules(data.schedules || []);
        setError('');
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Could not load your schedule.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [staffId, weekStart]);

  const selectedSchedules = schedules.filter((schedule) => schedule.shiftDate === selectedDateKey);
  const card = isDarkMode ? 'border-white/10 bg-[#111111] text-white' : 'border-gray-200 bg-white text-slate-900';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const selected = isDarkMode ? 'border-[#2FA084] bg-[#2FA084] text-black' : 'border-[#2FA084] bg-[#2FA084] text-white';

  const changeWeek = (amount) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  };

  return (
    <div className={`min-h-screen p-6 md:p-8 ${isDarkMode ? 'bg-[#0c0c0e]' : 'bg-slate-50'}`}>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2FA084]">Staff Portal</p>
          <h1 className={`mt-2 text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Duty Schedule</h1>
          <p className={`mt-1 text-sm ${muted}`}>Check the dates and working hours assigned by your manager.</p>
        </header>

        <section className={`rounded-2xl border p-5 shadow-sm ${card}`}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-[#2FA084]" />
              <h2 className="text-sm font-bold">
                {weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous week" onClick={() => changeWeek(-1)}
                className={`rounded-lg border p-2 ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => setSelectedDate(new Date())}
                className={`rounded-lg border px-3 text-xs font-bold ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                Today
              </button>
              <button type="button" aria-label="Next week" onClick={() => changeWeek(1)}
                className={`rounded-lg border p-2 ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((day) => {
              const key = toLocalDateString(day);
              const isSelected = key === selectedDateKey;
              const hasSchedule = schedules.some((schedule) => schedule.shiftDate === key);
              return (
                <button key={key} type="button" onClick={() => setSelectedDate(day)}
                  className={`flex min-h-20 flex-col items-center justify-center rounded-xl border transition-colors ${
                    isSelected ? selected : isDarkMode
                      ? 'border-white/10 hover:bg-white/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                  <span className={`text-[10px] font-bold uppercase ${isSelected ? '' : muted}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="mt-1 text-lg font-black">{day.getDate()}</span>
                  {hasSchedule && <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#2FA084]'}`} />}
                </button>
              );
            })}
          </div>
        </section>

        <section className={`rounded-2xl border p-5 shadow-sm ${card}`}>
          <h2 className="mb-4 text-sm font-bold">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          {error && <p role="alert" className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
          {loading ? (
            <p className={`py-8 text-center text-sm ${muted}`}>Loading your schedule…</p>
          ) : selectedSchedules.length ? (
            <div className="space-y-3">
              {selectedSchedules.map((schedule) => (
                <article key={schedule.id} className={`rounded-xl border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-[#2FA084]/10 p-2 text-[#2FA084]"><Clock3 size={18} /></span>
                    <div>
                      <p className="text-sm font-bold">{schedule.taskDescription}</p>
                      <p className={`mt-1 text-xs ${muted}`}>
                        {displayTime(schedule.shiftStart)} – {displayTime(schedule.shiftEnd)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={`py-8 text-center text-sm ${muted}`}>
              {error ? '' : 'No duty scheduled for this date.'}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
