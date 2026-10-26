import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Clock, Activity,
  AlertTriangle, Loader2,
  Package, ClipboardList, ChevronRight
} from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const HousekeepingMainteDashboard = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true }; 
  const { qs, firstName } = useStaffSession();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/housekeeping/dashboard-stats${qs}`);
        if (!response.ok) throw new Error('Dashboard request failed');
        const result = await response.json();
        setData(result);
      } catch (error) {
        setLoadError('Unable to load live housekeeping data.');
        setData({ pendingTasks: 0, completedToday: 0, guestRequests: 0, priorityTasks: [], roomGrid: [], supplies: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [qs]);

  // GINAYA ANG BACKGROUND AT THEME NG ROOMSTATUSMAP
  const theme = {
    bg:       isDarkMode ? 'bg-[#0c0c0e]'      : 'bg-[#f0f0f3]',
    card:     isDarkMode ? 'bg-[#111]/90'       : 'bg-white',
    border:   isDarkMode ? 'border-white/10'    : 'border-gray-200',
    textMain: isDarkMode ? 'text-white'         : 'text-gray-900',
    textSub:  isDarkMode ? 'text-gray-500'      : 'text-gray-400',
    
    // Button Styles
    btnSecondary: isDarkMode 
      ? "bg-zinc-900/50 border-zinc-800 text-zinc-100 hover:border-[#6FCF97]/50" 
      : "bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200",
    
    btnOutline: isDarkMode
      ? "border-[#6FCF97]/20 bg-[#6FCF97]/5 text-[#6FCF97] hover:bg-[#6FCF97] hover:text-black"
      : "border-[#6FCF97]/40 bg-[#6FCF97]/10 text-[#6FCF97] hover:bg-[#6FCF97] hover:text-white",

    // Progress bar track
    track: isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-200 border-zinc-300",
    
    accent: "#6FCF97",
    roomColors: {
      'Avail': isDarkMode ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-emerald-600 border-emerald-600/30 bg-emerald-50',
      'Occupied': isDarkMode ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-red-600 border-red-600/30 bg-red-50',
      'Dirty': isDarkMode ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 'text-amber-700 border-amber-700/30 bg-amber-50',
      'Clean': isDarkMode ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 'text-emerald-500 border-emerald-500/30 bg-emerald-50',
      'In Prog': isDarkMode ? 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5' : 'text-cyan-600 border-cyan-600/30 bg-cyan-50',
      'Maint.': isDarkMode ? 'text-purple-500 border-purple-500/20 bg-purple-500/5' : 'text-purple-700 border-purple-700/30 bg-purple-50',
    }
  };

  if (loading) return (
    <div className={`h-screen flex items-center justify-center ${theme.bg}`}>
      <Loader2 className="animate-spin text-[#6FCF97]" size={40} />
    </div>
  );

  return (
    <div className={`p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ${theme.bg} min-h-screen text-left`}>
      
      {/* HEADER SECTION */}
      {loadError && (
        <div className="border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 rounded">
          {loadError}
        </div>
      )}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 ${theme.border}`}>
        <div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Good shift, <span className="text-[#6FCF97]">{firstName || 'Staff'}</span>
          </h1>
          <p className={`text-[9px] font-black uppercase tracking-[0.3em] text-[#6FCF97] mt-1 opacity-90`}>
            Operations Control • INNOVA-HMS
          </p>
        </div>
        <div className="flex gap-2.5 w-full md:w-auto">
          <button onClick={() => navigate('/housekeeping/maintenance')} className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${theme.btnSecondary}`}>
            <AlertTriangle size={13} className="text-[#6FCF97]" /> Report Issue
          </button>
          <button onClick={() => navigate('/housekeeping/tasks')} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6FCF97] text-black text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-md shadow-[#6FCF97]/20">
            <ClipboardList size={13} /> My Tasks
          </button>
        </div>
      </div>

      {/* COMPACT STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Pending Tasks",    val: data.pendingTasks,       icon: <ClipboardList size={16} />, path: '/housekeeping/tasks' },
          { label: "Completed Today",  val: data.completedToday,     icon: <Clock size={16} />,         path: '/housekeeping/history' },
          { label: "Guest Requests",   val: data.guestRequests,      icon: <Package size={16} />,       path: '/housekeeping/guest-requests' },
        ].map((s, i) => (
          <div key={i} onClick={() => navigate(s.path)} className={`p-4 rounded-2xl border ${theme.border} transition-all duration-300 cursor-pointer hover:scale-[1.01] ${theme.card}`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`p-2 rounded-lg bg-[#6FCF97]/10 text-[#6FCF97] border border-[#6FCF97]/10`}>{s.icon}</span>
              <ChevronRight size={14} className={theme.textSub} />
            </div>
            <h3 className={`text-2xl font-black tracking-tighter ${theme.textMain}`}>{s.val}</h3>
            <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${theme.textSub}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PRIORITY TASKS LIST */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain} flex items-center gap-2`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6FCF97] animate-pulse"></span>
              Live Priority Queue
            </h2>
            <button onClick={() => navigate('/housekeeping/schedule')} className={`px-3.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${theme.btnOutline}`}>
              View Schedule
            </button>
          </div>
          
          {data.priorityTasks.map((task, i) => (
            <div key={i} onClick={() => navigate('/housekeeping/tasks')} className={`p-4 rounded-2xl border-l-[4px] group hover:translate-x-1 cursor-pointer transition-all border ${theme.border} ${theme.card} ${
              task.status === 'URGENT' ? 'border-l-red-500' : 'border-l-[#6FCF97]'
            }`}>
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <h3 className={`text-lg font-black uppercase tracking-tighter ${theme.textMain}`}>Unit {task.id}</h3>
                  <div className={`flex items-center gap-1.5 text-[9px] font-bold mt-0.5 ${theme.textSub}`}>
                    <Clock size={11} /> {task.time} • {task.type}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-[7px] font-black px-2.5 py-0.5 rounded-full border ${
                    task.status === 'URGENT' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>● {task.status}</span>
                </div>
              </div>
              <div className={`mt-3 p-2.5 rounded-xl border italic text-[10px] font-medium flex items-start gap-2 ${isDarkMode ? 'bg-[#6FCF97]/5 border-[#6FCF97]/10 text-[#6FCF97]' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <Activity size={13} className="mt-0.5 flex-shrink-0" />
                {task.note}
              </div>
            </div>
          ))}
        </div>

        {/* SIDEBAR: ROOM GRID & SUPPLIES */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* ROOM GRID */}
          <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card}`}>
            <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${theme.textMain}`}>Floor Monitor</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {data.roomGrid.map((room, i) => (
                <div key={i} onClick={() => navigate('/housekeeping/rooms')} className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer hover:scale-105 ${theme.roomColors[room.status] || theme.roomColors['Avail']}`}>
                  <p className="text-xs font-black">{room.id}</p>
                  <p className="text-[7px] font-bold uppercase mt-0.5 opacity-80">{room.status}</p>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/housekeeping/rooms')} className={`w-full mt-4 py-2.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${theme.btnSecondary}`}>
              Open Visual Map
            </button>
          </div>

          {/* SUPPLIES MONITOR */}
          <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card}`}>
            <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${theme.textMain}`}>Inventory Alerts</h2>
            <div className="space-y-4">
              {data.supplies.map((item, i) => (
                <div key={i} onClick={() => navigate('/housekeeping/inventory')} className="cursor-pointer">
                  <div className="flex justify-between items-center mb-1.5">
                    <p className={`text-[9px] font-black uppercase tracking-wide ${theme.textMain}`}>{item.name}</p>
                    <p className={`text-[9px] font-black ${item.alert ? 'text-red-500' : 'text-[#6FCF97]'}`}>
                      {item.current} / {item.max}
                    </p>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden border ${theme.track}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${item.alert ? 'bg-red-500' : 'bg-[#6FCF97]'}`} 
                      style={{ width: `${(item.current / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default HousekeepingMainteDashboard;