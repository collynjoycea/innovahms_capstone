import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import useStaffSession from '../../../hooks/useStaffSession';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, 
  ChevronRight, Sun, Moon, 
  Coffee, Star, Info, CheckCircle2
} from 'lucide-react';

const HKSchedule = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: false };
  const { qs, staffId } = useStaffSession();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [shifts, setShifts] = useState([]);
  const [dutySchedules, setDutySchedules] = useState([]);
  const [weeklyDutySchedules, setWeeklyDutySchedules] = useState([]);
  const [dutyScheduleError, setDutyScheduleError] = useState('');

  // 1. Kunin ang 7 araw ng kasalukuyang linggo para sa buod at kalendaryo
  const getWeeklyDatesArray = (dateStr) => {
    const [year, month, date] = dateStr.split('-').map(Number);
    const baseDate = new Date(year, month - 1, date);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(baseDate);
      day.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7) + i);
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      return {
        day: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        date: String(day.getDate()),
        iso,
        status: iso < dateStr ? 'completed' : iso === dateStr ? 'active' : 'upcoming'
      };
    });
  };

  const weeklyDates = getWeeklyDatesArray(selectedDate);
  const weekStartIso = weeklyDates[0].iso;
  const weekEndIso = weeklyDates[6].iso;

  useEffect(() => {
    axios.get(`/api/housekeeping/schedule${qs}&date=${selectedDate}`)
      .then(res => setShifts(res.data.schedules || []))
      .catch(() => {});
  }, [qs, selectedDate]);

  // Kunin ang duty schedules para sa buong linggo para sa Weekly Summary
  useEffect(() => {
    if (!staffId) return;
    axios.get(`/api/staff/${staffId}/duty-schedules?from=${weekStartIso}&to=${weekEndIso}`)
      .then(res => {
        setWeeklyDutySchedules(res.data.schedules || []);
      })
      .catch(() => setWeeklyDutySchedules([]));
  }, [staffId, weekStartIso, weekEndIso]);

  // Kunin ang duty schedules para sa napiling araw
  useEffect(() => {
    if (!staffId) {
      setDutySchedules([]);
      setDutyScheduleError('Please log in again to view your duty schedule.');
      return;
    }
    axios.get(`/api/staff/${staffId}/duty-schedules?from=${selectedDate}&to=${selectedDate}`)
      .then(res => {
        setDutySchedules(res.data.schedules || []);
        setDutyScheduleError('');
      })
      .catch((error) => {
        setDutySchedules([]);
        setDutyScheduleError(error.response?.data?.error || 'Could not load manager-assigned duty schedule.');
      });
  }, [staffId, selectedDate]);

  const displayShifts = [
    ...dutySchedules.map((s) => ({
      time: `${s.shiftStart} - ${s.shiftEnd}`,
      task: s.taskDescription,
      zone: 'Manager-assigned duty',
      type: 'Assigned',
      icon: <Clock size={16} />,
    })),
    ...shifts.map(s => ({
      time: `${s.shift_start} - ${s.shift_end}`,
      task: s.task_label || 'Shift',
      zone: s.zone || '',
      type: s.task_label?.toLowerCase().includes('break') ? 'Break' : 'Morning',
      icon: s.task_label?.toLowerCase().includes('break') ? <Coffee size={16}/> : <Sun size={16}/>,
    })),
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Staff Portal</span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">My Work Schedule</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                View your assigned shifts and weekly duty timeline.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded flex items-center gap-1.5">
                <Clock size={14} /> {weeklyDutySchedules.length} Shifts This Week
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
              {weeklyDates[0].formattedDate} — {weeklyDates[6].formattedDate}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weeklyDates.map((item, idx) => {
              const hasShift = weeklyDutySchedules.some(s => s.shiftDate === item.iso);
              const isSelected = item.iso === selectedDate;
              return (
                <div 
                  key={idx}
                  className={`p-3 rounded border text-center transition-all ${
                    isSelected 
                      ? 'bg-emerald-700 border-emerald-700 text-white font-bold shadow-sm' 
                      : hasShift 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-slate-800 dark:text-slate-100' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <p className={`text-[10px] font-mono uppercase tracking-wider ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {item.day} {item.date}
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
          
          {/* Calendar Navigator & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Calendar Navigator (View Only) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
              <div className="flex justify-between items-center mb-5 border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      const previous = new Date(year, month - 1, day - 7);
                      setSelectedDate(`${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`);
                    }}
                    aria-label="Previous week"
                    className="p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={15}/>
                  </button>
                  <button
                    onClick={() => {
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      const next = new Date(year, month - 1, day + 7);
                      setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
                    }}
                    aria-label="Next week"
                    className="p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    <ChevronRight size={15}/>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weeklyDates.map((item, i) => {
                  const isSelected = item.iso === selectedDate;
                  return (
                    <div 
                      key={i}
                      className={`flex flex-col items-center p-3 rounded border transition-all ${
                        isSelected 
                          ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`text-[10px] font-mono uppercase ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {item.day}
                      </span>
                      <span className="text-base font-bold mt-1">
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Shift Timeline */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Shift Details & Timeline</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Assigned working hours for selected date.</p>
              </div>

              {dutyScheduleError && (
                <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {dutyScheduleError}
                </div>
              )}

              <div className="space-y-3">
                {displayShifts.map((shift, i) => (
                  <div key={i} className="border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        {shift.icon}
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold font-mono mb-1">
                          {shift.time}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase">{shift.task}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{shift.zone}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded">
                      Assigned
                    </span>
                  </div>
                ))}
                {displayShifts.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 font-mono uppercase tracking-wider">
                    No shifts scheduled for this date.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar - Stats & Memo */}
          <div className="space-y-6">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">Performance Stats</h3>
              <div className="space-y-4 text-xs">
                {[
                  { label: "Weekly Efficiency", value: "94%" },
                  { label: "Rooms Cleaned", value: "128" },
                  { label: "Performance Rating", value: "4.9 / 5.0" }
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500 font-medium">{stat.label}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{stat.value}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-700 rounded-full" style={{ width: stat.value.includes('%') ? stat.value : '85%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-1">Shift Memo</h5>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                    All cleaning logs must be synchronized via INNOVA-HMS before your shift ends. Check suite supplies on Level 4.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default HKSchedule;