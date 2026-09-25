import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Banknote, 
  Users, 
  RefreshCw, 
  LogIn, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function StaffDashboard() {
  const { qs } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null);

  // Time Filter State: 'today', 'month', 'year'
  const [timeFilter, setTimeFilter] = useState('today');

  const fetchData = useCallback(async () => {
    try {
      const separator = qs ? '&' : '?';
      const res = await fetch(`/api/staff/dashboard${qs}${separator}period=${timeFilter}`);
      const d = await res.json();
      if (res.ok) setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs, timeFilter]);

  useEffect(() => { 
    fetchData(); 
    const t = setInterval(fetchData, 30000); 
    return () => clearInterval(t); 
  }, [fetchData]);

  const handleCheckIn = async (id) => {
    setCheckingIn(id);
    try {
      const res = await fetch(`/api/staff/check-in/${id}`, { method: 'PUT' });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
    finally { setCheckingIn(null); }
  };

  const theme = useMemo(() => ({
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f4f4f7]',
    card: isDarkMode ? 'bg-[#111111] border-white/5 shadow-xl' : 'bg-white border-gray-200 shadow-sm',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    sub: isDarkMode ? 'text-zinc-500' : 'text-gray-500',
    div: isDarkMode ? 'border-white/5' : 'border-gray-200',
  }), [isDarkMode]);

  const chartData = useMemo(() => {
    return data?.trend || [];
  }, [data]);

  const maxChartVal = Math.max(...chartData.map(d => d.value), 1);

  const stats = [
    { label: 'Expected Arrivals', val: data?.arrivalsToday ?? 0, sub: 'Check-in ready', icon: <ArrowDownRight size={20}/> },
    { label: 'Departures Today', val: data?.departuresToday ?? 0, sub: 'Pending check-out', icon: <ArrowUpRight size={20}/> },
    { label: 'Available Rooms', val: data?.availableRooms ?? 0, sub: 'Ready for guests', icon: <CheckCircle2 size={20}/> },
    { label: 'Unpaid Balance', val: data ? `₱${Number(data.pendingBalance).toLocaleString()}` : '₱0', sub: 'Total receivables', icon: <Banknote size={20}/> },
  ];

  return (
    <div className={`p-8 space-y-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      
      {/* HEADER WITH TIME FILTER */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 ${theme.div}`}>
        <div className="text-left">
          <h1 className={`text-4xl font-black uppercase tracking-tighter ${theme.text}`}>
            Dashboard
          </h1>
          <p className={`text-xs mt-1 font-bold ${theme.sub}`}>
            Overview & Analytics Performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* TODAY / THIS MONTH / THIS YEAR SWITCHER */}
          <div className={`flex p-1.5 rounded-2xl border ${theme.card}`}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTimeFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  timeFilter === tab.id
                    ? 'bg-[#2FA084] text-black shadow-lg shadow-[#2FA084]/20'
                    : `${theme.sub} hover:text-[#2FA084]`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button onClick={fetchData} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/staff/new-reservation')} className="px-6 py-3.5 rounded-2xl bg-[#2FA084] text-black text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#2FA084]/20">
            + New Booking
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className={`p-8 rounded-[2rem] border ${theme.card} relative overflow-hidden group`}>
            <div className="relative z-10 text-left">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} text-[#2FA084]`}>{s.icon}</div>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${theme.sub}`}>{s.label}</p>
              <h3 className={`text-4xl font-black tracking-tighter ${theme.text}`}>{loading ? '0' : s.val}</h3>
              <p className={`text-[9px] mt-1 ${theme.sub}`}>{s.sub}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-[#2FA084] group-hover:scale-110 transition-transform">
              {React.cloneElement(s.icon, { size: 100 })}
            </div>
          </div>
        ))}
      </div>

      {/* GRAPH & ANALYTICS SECTION */}
      <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#2FA084]" />
              <h3 className={`text-[12px] font-black uppercase tracking-widest ${theme.text}`}>
                Occupancy & Bookings Trend ({timeFilter.toUpperCase()})
              </h3>
            </div>
            <p className={`text-[10px] mt-0.5 ${theme.sub}`}>Visual breakdown based on selected timeframe</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#2FA084]" />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.sub}`}>Check-Ins & Activity</span>
          </div>
        </div>

        {/* Custom Bar Graph */}
        <div className="h-48 flex items-end justify-between gap-4 pt-6 border-b pb-4 border-dashed border-zinc-500/20">
          {chartData.map((item, index) => {
            const heightPercent = Math.round((item.value / maxChartVal) * 100);
            return (
              <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group">
                <span className={`text-[10px] font-black mb-2 opacity-0 group-hover:opacity-100 transition-all text-[#2FA084]`}>
                  {item.value}
                </span>
                <div 
                  className="w-full max-w-[48px] bg-[#2FA084]/20 hover:bg-[#2FA084] rounded-t-xl transition-all duration-500 relative overflow-hidden"
                  style={{ height: `${Math.max(heightPercent, 8)}%` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#2FA084]" />
                </div>
                <span className={`text-[9px] font-black uppercase mt-3 tracking-tight ${theme.sub}`}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ARRIVALS TABLE & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* ARRIVALS TABLE */}
        <div className={`lg:col-span-2 rounded-[2.5rem] border ${theme.card} p-2`}>
          <div className="px-8 py-6 flex justify-between items-center">
            <h3 className={`text-[11px] font-black uppercase tracking-widest ${theme.text}`}>Today's Arrival Queue</h3>
            <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
          </div>
          {loading ? (
            <div className="px-8 py-10 text-center text-[#2FA084] font-black text-xs uppercase tracking-widest animate-pulse">Syncing...</div>
          ) : (data?.arrivals || []).length === 0 ? (
            <div className={`px-8 py-10 text-center text-[10px] font-bold uppercase tracking-widest ${theme.sub}`}>No arrivals today</div>
          ) : (
            <table className="w-full">
              <tbody className={`divide-y ${theme.div}`}>
                {(data?.arrivals || []).map(r => (
                  <tr key={r.id} className="group hover:bg-[#2FA084]/5 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-[#2FA084] flex items-center justify-center text-black font-black text-sm">
                          {r.roomNumber}
                        </div>
                        <div>
                          <p className={`text-[13px] font-black ${theme.text}`}>{r.guestName}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-tighter ${theme.sub}`}>{r.roomName} · {r.bookingNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className={`mr-3 px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${r.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{r.status}</span>
                      <button onClick={() => handleCheckIn(r.id)} disabled={checkingIn === r.id}
                        className="px-5 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 inline-flex items-center gap-1">
                        <LogIn size={12} /> Check In
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PRIORITY INTEL + OCCUPANCY RATE */}
        <div className="space-y-8">
          <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
            <h3 className={`text-[11px] font-black uppercase tracking-widest mb-8 text-left ${theme.text}`}>Priority Intel</h3>
            <div className="space-y-4">
              {[
                { dot: 'bg-purple-500', text: data?.arrivalsToday > 0 ? `${data.arrivalsToday} guest(s) arriving today` : 'No arrivals today' },
                { dot: 'bg-red-500', text: data ? `Collect ₱${Number(data.pendingBalance).toLocaleString()} balance` : 'Loading...' },
                { dot: 'bg-green-500', text: `${data?.inHouse ?? 0} guest(s) currently in-house` },
              ].map((log, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl ${theme.div} border bg-white/[0.02]`}>
                  <div className={`w-2 h-2 rounded-full ${log.dot} shrink-0`} />
                  <p className={`text-[11px] font-bold text-left truncate ${theme.text}`}>{log.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-[#2FA084] text-black">
            <div className="flex justify-between items-start mb-10">
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Occupancy Rate</p>
                <h4 className="text-5xl font-black tracking-tighter">
                  {data && data.availableRooms !== undefined
                    ? `${Math.round(((data.inHouse || 0) / Math.max((data.inHouse || 0) + (data.availableRooms || 1), 1)) * 100)}%`
                    : '0%'}
                </h4>
              </div>
              <Users size={32} />
            </div>
            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
              <div className="h-full bg-black rounded-full transition-all"
                style={{ width: data ? `${Math.round(((data.inHouse || 0) / Math.max((data.inHouse || 0) + (data.availableRooms || 1), 1)) * 100)}%` : '0%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
