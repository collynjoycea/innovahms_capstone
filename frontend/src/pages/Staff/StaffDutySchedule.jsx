import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, CheckCircle2 } from 'lucide-react';
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
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const changeWeek = (amount) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  };

  const totalShiftsThisWeek = schedules.length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Staff Portal</span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">My Duty Schedule</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Check the dates and working hours assigned by your manager.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded flex items-center gap-1.5">
                <Clock3 size={14} /> {totalShiftsThisWeek} Shifts This Week
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Work Summary Overview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400" /> Weekly Work Summary
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded uppercase">
              {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekDates.map((day) => {
              const key = toLocalDateString(day);
              const hasShift = schedules.some((schedule) => schedule.shiftDate === key);
              const isSelected = key === selectedDateKey;
              return (
                <div 
                  key={key}
                  className={`p-3 rounded border text-center transition-all ${
                    isSelected 
                      ? 'bg-emerald-700 border-emerald-700 text-white font-bold shadow-sm' 
                      : hasShift 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-slate-800 dark:text-slate-100' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <p className={`text-[10px] font-mono uppercase tracking-wider ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })} {day.getDate()}
                  </p>
                  <p className={`text-xs font-bold mt-1 uppercase ${isSelected ? 'text-white' : hasShift ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-400'}`}>
                    {hasShift ? 'On Duty' : 'Off'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Calendar Navigator */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="flex gap-1.5">
                <button type="button" aria-label="Previous week" onClick={() => changeWeek(-1)}
                  className="p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={() => setSelectedDate(new Date())}
                  className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                  Today
                </button>
                <button type="button" aria-label="Next week" onClick={() => changeWeek(1)}
                  className="p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                  <ChevronRight size={15} />
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
                    className={`flex min-h-20 flex-col items-center justify-center rounded border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}>
                    <span className={`text-[10px] font-mono uppercase ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="mt-1 text-base font-bold">{day.getDate()}</span>
                    {hasSchedule && <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-600'}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Schedule Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            {error && <p role="alert" className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            {loading ? (
              <p className={`py-8 text-center text-xs ${muted}`}>Loading your schedule…</p>
            ) : selectedSchedules.length ? (
              <div className="space-y-3">
                {selectedSchedules.map((schedule) => (
                  <article key={schedule.id} className="border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 p-2 text-emerald-800 dark:text-emerald-300"><Clock3 size={16} /></span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{schedule.taskDescription}</p>
                        <p className="mt-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                          {displayTime(schedule.shiftStart)} – {displayTime(schedule.shiftEnd)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className={`py-8 text-center text-xs ${muted}`}>
                {error ? '' : 'No duty scheduled for this date.'}
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}