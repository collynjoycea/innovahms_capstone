import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, Hotel, PackageCheck, ClockCheck, ArrowUpRight, TrendingUp, Calendar, BedDouble, Building2 } from 'lucide-react';

// Helper function para laging gumawa ng huling 6 na buwan (Gaya sa Reports)
const getLast6MonthsLabels = () => {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const result = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push(months[d.getMonth()]);
  }
  return result;
};

export default function Dashboard() {
  const { isDarkMode } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeDashboardData = (payload = {}) => {
    const safeKpis = payload?.kpis && typeof payload.kpis === 'object' ? payload.kpis : {};
    const safeRoomStatus = Array.isArray(payload?.roomStatus) ? payload.roomStatus : [];
    const safeHotelStatus = Array.isArray(payload?.hotelStatus) ? payload.hotelStatus : [];
    const safeHotelBookings = Array.isArray(payload?.hotelBookingsSummary) ? payload.hotelBookingsSummary : [];
    const safeTrends = Array.isArray(payload?.subscriptionTrends) ? payload.subscriptionTrends : [];

    return {
      kpis: {
        ...safeKpis,
        totalHotels: Number(safeKpis.totalHotels ?? safeKpis.totalOwners ?? 0),
        totalOwners: Number(safeKpis.totalOwners ?? 0),
        totalRooms: Number(safeKpis.totalRooms ?? 0),
        subscribedHotels: Number(safeKpis.subscribedHotels ?? safeKpis.subscribedOwners ?? 0),
        subscribedOwners: Number(safeKpis.subscribedOwners ?? safeKpis.subscribedHotels ?? 0),
        underReviewHotels: Number(safeKpis.underReviewHotels ?? safeKpis.underReviewSubscriptions ?? 0),
        underReviewSubscriptions: Number(safeKpis.underReviewSubscriptions ?? safeKpis.underReviewHotels ?? 0),
      },
      roomStatus: safeRoomStatus,
      hotelStatus: safeHotelStatus,
      hotelBookingsSummary: safeHotelBookings,
      subscriptionTrends: safeTrends,
    };
  };

  // Date Range Filter States (From Date at To Date)
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const loadDashboardData = () => {
    fetch('/api/admin/dashboard')
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload?.error || 'Unable to load dashboard data.');
        setData(normalizeDashboardData(payload));
      })
      .catch(() => setData(normalizeDashboardData({})))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboardData();
    const intervalId = setInterval(loadDashboardData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#F4F5F7]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const normalizedData = normalizeDashboardData(data);
  const kpis = normalizedData.kpis || {};
  
  // Compact Hotel Status Data
  const activeCount = kpis.activeHotels ?? 12;
  const pendingCount = kpis.pendingHotels ?? 2;
  const inactiveCount = kpis.inactiveHotels ?? 1;
  const draftCount = kpis.draftHotels ?? 0;
  const totalHotelsCount = Math.max(Number(kpis.totalHotels ?? kpis.totalOwners ?? (activeCount + pendingCount + inactiveCount + draftCount)), 1);

  const hotelStatusCompact = [
    { label: 'Active', count: activeCount, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { label: 'Pending', count: pendingCount, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Inactive', count: inactiveCount, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { label: 'Onboarding', count: draftCount, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  ];

  const hotelBookingsRaw = normalizedData.hotelBookingsSummary.slice(0, 5);
  const top5Hotels = hotelBookingsRaw;

  // Graph Logic - Inakma sa Reports.jsx layout
  const defaultLabels = getLast6MonthsLabels();
  const apiTrends = normalizedData.subscriptionTrends || [];
  const chartLabels = apiTrends.length >= 6 
    ? apiTrends.map(t => String(t.month).toUpperCase()) 
    : defaultLabels;

  const chartValues = chartLabels.map((label) => {
    const found = apiTrends.find(t => String(t.month).toUpperCase() === label);
    return found ? Number(found.count ?? 0) : 0;
  });

  const maxChartValue = Math.max(...chartValues, 1);
  const isValidDateRange = !fromDate || !toDate || fromDate <= toDate;

  const statCards = [
    { 
      label: 'Subscribed Hotels', 
      value: kpis.subscribedHotels ?? kpis.subscribedOwners ?? 0, 
      change: 'Active Package Subscriptions', 
      icon: <PackageCheck size={20} />, 
      color: 'text-green-500' 
    },
    { 
      label: 'Under Review Hotels', 
      value: kpis.underReviewHotels ?? kpis.underReviewSubscriptions ?? 0, 
      change: 'Pending Verification', 
      icon: <ClockCheck size={20} />, 
      color: 'text-amber-500' 
    },
    { 
      label: 'Total Hotels', 
      value: kpis.totalHotels ?? kpis.totalOwners ?? 0, 
      change: `${kpis.totalRooms ?? 0} rooms managed`, 
      icon: <Hotel size={20} />, 
      color: 'text-[#2FA084]' 
    },
  ];

  if (loading) return (
    <div className={`p-6 min-h-screen flex items-center justify-center ${theme.bg}`}>
      <div className="w-10 h-10 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`p-6 space-y-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      
      {/* HEADER */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            System <span className="text-[#2FA084]">Dashboard</span>
          </h1>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${theme.border} ${theme.card} text-[10px] font-bold uppercase ${theme.textMain} hover:border-[#2FA084] transition-all`}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} transition-all`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084]`}>
              {stat.icon}
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{stat.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${theme.textMain}`}>{stat.value}</h2>
            <p className={`text-[10px] font-bold uppercase mt-2 flex items-center gap-1 ${stat.color}`}>
              <ArrowUpRight size={12} strokeWidth={3} /> {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* GRAPH & COMPACT HOTEL STATUS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 6-MONTH SUBSCRIPTION GRAPH CHART (GINAYA SA REPORTS.JSX) */}
        <div className={`lg:col-span-2 p-7 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2FA084]" />
              <div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>
                  6-Month Hotel Subscriptions
                </h3>
                <p className={`text-[9px] font-bold uppercase ${theme.textSub}`}>Subscribed Hotels Trend</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase text-[#2FA084] bg-[#2FA084]/10 px-2.5 py-1 rounded-md">
              Past 6 Months
            </span>
          </div>

          {/* Bar Visualizations */}
          <div className="h-64 flex items-end justify-between gap-3 px-2 pt-8">
            {chartLabels.map((label, i) => {
              const rawVal = chartValues[i] || 0;
              const isZero = rawVal === 0;
              
              // Kapag 0 ay nakaset sa visual indicator bar (4px), kapag may value ay dynamic percentage
              const heightPercent = isZero ? '4px' : `${Math.max((rawVal / maxChartValue) * 100, 10)}%`;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                  
                  {/* Amount/Count Label */}
                  <div className={`text-[9px] font-black tracking-wider transition-all ${
                    isZero 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : theme.textMain
                  }`}>
                    {rawVal}
                  </div>

                  {/* Bar Container Area with Visual Track */}
                  <div className="w-full max-w-[45px] h-full flex items-end bg-gray-100/60 dark:bg-white/[0.03] rounded-t-lg overflow-hidden border-b border-[#2FA084]/30">
                    <div
                      style={{ height: heightPercent }}
                      className={`w-full transition-all duration-500 relative ${
                        isZero 
                          ? 'bg-gray-300 dark:bg-white/20 rounded-t-sm' 
                          : 'bg-[#2FA084] rounded-t-lg'
                      }`}
                    >
                      {!isZero && <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />}
                    </div>
                  </div>

                  {/* Month Label */}
                  <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* COMPACT HOTEL STATUS OVERVIEW */}
        <div className={`p-6 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[#2FA084]/10 text-[#2FA084]">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Hotel Status</h3>
                  <p className={`text-[9px] font-bold uppercase ${theme.textSub}`}>Overview Summary</p>
                </div>
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded ${theme.textMain} ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                {totalHotelsCount} Total
              </span>
            </div>

            {/* Unified Mini Multi-Segment Progress Bar */}
            <div className="w-full h-2 rounded-full overflow-hidden flex my-4 bg-gray-100 dark:bg-white/5">
              <div style={{ width: `${(activeCount / totalHotelsCount) * 100}%` }} className="bg-green-500 h-full" title="Active" />
              <div style={{ width: `${(pendingCount / totalHotelsCount) * 100}%` }} className="bg-amber-500 h-full" title="Pending" />
              <div style={{ width: `${(inactiveCount / totalHotelsCount) * 100}%` }} className="bg-rose-500 h-full" title="Inactive" />
              <div style={{ width: `${(draftCount / totalHotelsCount) * 100}%` }} className="bg-purple-500 h-full" title="Onboarding" />
            </div>

            {/* 2x2 Grid Badge Status Display */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {hotelStatusCompact.map((item, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${item.border} ${item.bg} flex flex-col justify-center`}>
                  <p className={`text-[9px] font-black uppercase tracking-wider ${theme.textSub}`}>{item.label}</p>
                  <h4 className={`text-xl font-black mt-0.5 ${item.color}`}>{item.count}</h4>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-dashed mt-4 text-center border-gray-200 dark:border-white/10">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.textSub}`}>
              {Math.round((activeCount / totalHotelsCount) * 100)}% ng kabuuang hotel ay kwalipikado at active
            </span>
          </div>
        </div>

      </div>

      {/* HOTEL BOOKINGS SUMMARY TABLE (MAX 5 HOTELS) WITH DATE RANGE FILTER */}
      <div className={`rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} overflow-hidden`}>
        
        {/* Table Header Controls */}
        <div className={`px-6 py-5 border-b ${theme.border} flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
          <div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>
              Hotel Bookings Summary (Top 5 Hotels)
            </h3>
            <p className={`text-[9px] font-bold uppercase ${theme.textSub} mt-0.5`}>
              Number of bookings received from the selected date range
            </p>
          </div>

          {/* Date Range Picker Filter */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* From Date */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-black/30' : 'bg-white'}`}>
              <span className={`text-[9px] font-black uppercase ${theme.textSub}`}>From:</span>
              <Calendar size={13} className="text-[#2FA084]" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${theme.textMain}`}
              />
            </div>

            <span className={`text-xs font-bold ${theme.textSub}`}>to</span>

            {/* To Date */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-black/30' : 'bg-white'}`}>
              <span className={`text-[9px] font-black uppercase ${theme.textSub}`}>To:</span>
              <Calendar size={13} className="text-[#2FA084]" />
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${theme.textMain}`}
              />
            </div>

          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} border-b ${theme.border}`}>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Hotel Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Total Capacity</th>
                <th className="px-6 py-4 text-right">Bookings Received</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.border}`}>
              {top5Hotels.map((hotel, index) => (
                <tr key={hotel.hotelId || index} className="hover:bg-[#2FA084]/5 transition-colors">
                  <td className={`px-6 py-4 text-[10px] font-bold ${theme.textSub}`}>
                    {index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#2FA084]/10 text-[#2FA084]">
                        <Hotel size={15} />
                      </div>
                      <span className={`text-[11px] font-black ${theme.textMain}`}>
                        {hotel.hotelName}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-[10px] font-medium ${theme.textSub}`}>
                    {hotel.location || 'Caloocan, Metro Manila'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold ${isDarkMode ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      <BedDouble size={12} className="text-[#2FA084]" />
                      {hotel.totalRooms || 10} Rooms
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#2FA084]/15 text-[#2FA084] border border-[#2FA084]/20">
                      {hotel.bookingsCount || 0} Bookings
                    </span>
                  </td>
                </tr>
              ))}

              {top5Hotels.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-6 py-8 text-center text-[11px] ${theme.textSub}`}>
                    {!isValidDateRange
                      ? 'Start date cannot be after end date.'
                      : `Walang natanggap na booking mula ${fromDate} hanggang ${toDate}.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}