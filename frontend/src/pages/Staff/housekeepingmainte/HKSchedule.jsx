import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import useStaffSession from '../../../hooks/useStaffSession';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, 
  ChevronRight, MoreHorizontal, Sun, Moon, 
  Coffee, Star, Info
} from 'lucide-react';

const HKSchedule = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs, staffId } = useStaffSession();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [shifts, setShifts] = useState([]);
  const [dutySchedules, setDutySchedules] = useState([]);
  const [dutyScheduleError, setDutyScheduleError] = useState('');

  useEffect(() => {
    axios.get(`/api/housekeeping/schedule${qs}&date=${selectedDate}`)
      .then(res => setShifts(res.data.schedules || []))
      .catch(() => {});
  }, [qs, selectedDate]);

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

  // Build week dates around selectedDate
  const weeklyDates = Array.from({ length: 7 }, (_, i) => {
    const [year, month, date] = selectedDate.split('-').map(Number);
    const day = new Date(year, month - 1, date);
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7) + i);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: String(day.getDate()),
      iso,
      status: iso < selectedDate ? 'completed' : iso === selectedDate ? 'active' : 'upcoming'
    };
  });

  const shiftIcons = { Morning: <Sun size={14}/>, Break: <Coffee size={14}/>, Afternoon: <Moon size={14}/> };
  const displayShifts = [
    ...dutySchedules.map((s) => ({
      time: `${s.shiftStart} - ${s.shiftEnd}`,
      task: s.taskDescription,
      zone: 'Manager-assigned duty',
      type: 'Assigned',
      icon: <Clock size={14} />,
    })),
    ...shifts.map(s => ({
    time: `${s.shift_start} - ${s.shift_end}`,
    task: s.task_label || 'Shift',
    zone: s.zone || '',
    type: s.task_label?.toLowerCase().includes('break') ? 'Break' : 'Morning',
    icon: s.task_label?.toLowerCase().includes('break') ? <Coffee size={14}/> : <Sun size={14}/>,
    })),
  ];

  const theme = {
    bg: isDarkMode ? "bg-[#0c0c0e]" : "bg-[#f0f0f3]",
    card: isDarkMode ? "bg-[#111111]/90 backdrop-blur-xl" : "bg-white",
    border: isDarkMode ? "border-white/10" : "border-gray-300",
    textMain: isDarkMode ? "text-white" : "text-gray-900",
    textSub: isDarkMode ? "text-gray-500" : "text-gray-400",
    gold: "#6FCF97",
    accent: "text-[#6FCF97]",
    shadow: "shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
  };

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      
      {/* 1. HEADER SECTION */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-10`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Work <span className={theme.accent}>Schedule</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>
            Housekeeping Operations • Obsidian Sanctuary
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className={`px-4 py-2 rounded-xl border ${theme.border} ${theme.card} flex items-center gap-3`}>
              <Clock size={16} className={theme.accent} />
              <span className={`text-[11px] font-black ${theme.textMain}`}>{dutySchedules.length} manager-assigned shift{dutySchedules.length === 1 ? '' : 's'}</span>
              <span className="text-[9px] font-bold text-[#6FCF97] bg-[#6FCF97]/10 px-2 py-0.5 rounded uppercase">Manager schedule</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* 2. CALENDAR NAVIGATOR */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 ${theme.shadow}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const previous = new Date(year, month - 1, day - 7);
                    setSelectedDate(`${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`);
                  }}
                  aria-label="Previous week"
                  className={`p-2 rounded-lg border ${theme.border} hover:bg-white/5`}><ChevronLeft size={16}/></button>
                <button
                  onClick={() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const next = new Date(year, month - 1, day + 7);
                    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
                  }}
                  aria-label="Next week"
                  className={`p-2 rounded-lg border ${theme.border} hover:bg-white/5`}><ChevronRight size={16}/></button>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2">
              {weeklyDates.map((item, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedDate(item.iso)}
                  className={`flex-1 flex flex-col items-center p-4 rounded-2xl transition-all border ${
                    item.status === 'active' 
                    ? 'bg-[#6FCF97] border-[#6FCF97] scale-110 shadow-lg shadow-[#6FCF97]/20' 
                    : `hover:bg-white/5 ${theme.border}`
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-2 ${item.status === 'active' ? 'text-black' : theme.textSub}`}>
                    {item.day}
                  </span>
                  <span className={`text-xl font-black ${item.status === 'active' ? 'text-black' : theme.textMain}`}>
                    {item.date}
                  </span>
                  {item.status === 'completed' && <div className="w-1 h-1 rounded-full bg-green-500 mt-2" />}
                </button>
              ))}
            </div>
          </div>

          {/* 3. DAILY TIMELINE */}
          <div className="space-y-4">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] pl-2 ${theme.textSub}`}>Shift Timeline</h3>
            {dutyScheduleError && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-xs text-red-500">{dutyScheduleError}</p>}
            {displayShifts.map((shift, i) => (
              <div key={i} className={`${theme.card} border ${theme.border} p-6 rounded-2xl flex items-center justify-between group hover:border-[#6FCF97]/50 transition-all`}>
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${theme.border} bg-white/5 ${theme.accent}`}>
                    {shift.icon}
                  </div>
                  <div className="text-left">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.accent}`}>{shift.time}</p>
                    <h4 className={`text-lg font-black uppercase tracking-tighter ${theme.textMain}`}>{shift.task}</h4>
                    <p className={`text-[9px] font-bold ${theme.textSub} uppercase`}>{shift.zone}</p>
                  </div>
                </div>
                <MoreHorizontal size={18} className={theme.textSub} />
              </div>
            ))}
            {displayShifts.length === 0 && (
              <div className={`${theme.card} border ${theme.border} rounded-lg p-8 text-center`}>
                <p className={`text-xs font-semibold ${theme.textSub}`}>No shifts scheduled for this date.</p>
              </div>
            )}
          </div>
        </div>

        {/* 4. SIDEBAR - PERFORMANCE & INFO */}
        <div className="space-y-8 text-left">
          <div className={`${theme.card} border ${theme.border} p-8 rounded-3xl ${theme.shadow} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Star size={80} fill={theme.gold} />
            </div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${theme.textMain}`}>Personal Stats</h3>
            <div className="space-y-6">
              {[
                { label: "Weekly Efficiency", value: "94%" },
                { label: "Rooms Cleaned", value: "128" },
                { label: "Perfect Ratings", value: "42" }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{stat.label}</span>
                    <span className={`text-[11px] font-black ${theme.textMain}`}>{stat.value}</span>
                  </div>
                  <div className={`w-full h-1 rounded-full bg-white/5`}>
                    <div className="h-full bg-[#6FCF97] rounded-full" style={{ width: stat.value }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${theme.border} bg-[#6FCF97]/5`}>
            <div className="flex items-start gap-4">
              <Info size={20} className={theme.accent} />
              <div>
                <h5 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMain} mb-1`}>Shift Memo</h5>
                <p className={`text-[10px] font-medium leading-relaxed ${theme.textSub}`}>
                  All cleaning logs must be synced via INNOVA-HMS before end of shift. Check suite supplies on Level 4.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HKSchedule;
