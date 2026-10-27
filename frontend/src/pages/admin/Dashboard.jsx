import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, Hotel, PackageCheck, ArrowUpRight, Calendar, BedDouble, Building2 } from 'lucide-react';

// Helper function para laging gumawa ng huling 6 na buwan
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
  const { isDarkMode = false } = useOutletContext() || {};
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

  // Date Range Filter States
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

  const normalizedData = normalizeDashboardData(data);
  const kpis = normalizedData.kpis || {};
  
  // Compact Hotel Status Data
  const activeCount = kpis.activeHotels ?? 12;
  const pendingCount = kpis.pendingHotels ?? 2;
  const inactiveCount = kpis.inactiveHotels ?? 1;
  const draftCount = kpis.draftHotels ?? 0;
  const totalHotelsCount = Math.max(Number(kpis.totalHotels ?? kpis.totalOwners ?? (activeCount + pendingCount + inactiveCount + draftCount)), 1);

  const hotelStatusCompact = [
    { label: 'Active', count: activeCount, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/50' },
    { label: 'Pending', count: pendingCount, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900/50' },
    { label: 'Inactive', count: inactiveCount, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-900/50' },
    { label: 'Onboarding', count: draftCount, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-900/50' },
  ];

  const hotelBookingsRaw = normalizedData.hotelBookingsSummary.slice(0, 5);
  const top5Hotels = hotelBookingsRaw;

  // Graph Logic
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
      icon: <PackageCheck size={18} />, 
      color: 'text-emerald-700 dark:text-emerald-400' 
    },
    { 
      label: 'Total Hotels', 
      value: kpis.totalHotels ?? kpis.totalOwners ?? 0, 
      change: `${kpis.totalRooms ?? 0} rooms managed`, 
      icon: <Hotel size={18} />, 
      color: 'text-emerald-700 dark:text-emerald-400' 
    },
  ];

  if (loading) return (
    <div className="p-6 min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans dark:bg-slate-950 dark:text-slate-100 space-y-6">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Admin Control Panel</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">System Dashboard</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Monitor overall subscription analytics, hotel statuses, and booking metrics.
            </p>
          </div>
          <button className="self-start sm:self-auto bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer">
            <Download size={15} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                {stat.icon}
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase ${stat.color} flex items-center gap-1`}>
                <ArrowUpRight size={13} strokeWidth={2.5} /> Live
              </span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{stat.label}</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* GRAPH & COMPACT HOTEL STATUS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 6-MONTH SUBSCRIPTION GRAPH CHART */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                6-Month Hotel Subscriptions Trend
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 rounded uppercase">
              Past 6 Months
            </span>
          </div>

          {/* Bar Visualizations */}
          <div className="h-56 flex items-end justify-between gap-3 px-2 pt-4">
            {chartLabels.map((label, i) => {
              const rawVal = chartValues[i] || 0;
              const isZero = rawVal === 0;
              const heightPercent = isZero ? '4px' : `${Math.max((rawVal / maxChartValue) * 100, 12)}%`;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                  <div className={`text-[10px] font-mono font-bold ${isZero ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                    {rawVal}
                  </div>

                  <div className="w-full max-w-[40px] h-full flex items-end bg-slate-100 dark:bg-slate-800/50 rounded-t overflow-hidden">
                    <div
                      style={{ height: heightPercent }}
                      className={`w-full transition-all duration-500 rounded-t ${isZero ? 'bg-slate-300 dark:bg-slate-700' : 'bg-emerald-700 dark:bg-emerald-600'}`}
                    />
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* COMPACT HOTEL STATUS OVERVIEW */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Hotel Status Overview</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded uppercase">
                {totalHotelsCount} Total
              </span>
            </div>

            {/* Unified Mini Multi-Segment Progress Bar */}
            <div className="w-full h-2 rounded overflow-hidden flex my-4 bg-slate-100 dark:bg-slate-800">
              <div style={{ width: `${(activeCount / totalHotelsCount) * 100}%` }} className="bg-emerald-600 h-full" title="Active" />
              <div style={{ width: `${(pendingCount / totalHotelsCount) * 100}%` }} className="bg-amber-500 h-full" title="Pending" />
              <div style={{ width: `${(inactiveCount / totalHotelsCount) * 100}%` }} className="bg-rose-500 h-full" title="Inactive" />
              <div style={{ width: `${(draftCount / totalHotelsCount) * 100}%` }} className="bg-purple-500 h-full" title="Onboarding" />
            </div>

            {/* 2x2 Grid Badge Status Display */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {hotelStatusCompact.map((item, idx) => (
                <div key={idx} className={`p-3 rounded border ${item.border} ${item.bg} flex flex-col justify-center`}>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{item.label}</p>
                  <h4 className={`text-lg font-bold mt-0.5 ${item.color}`}>{item.count}</h4>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-4 text-center">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {Math.round((activeCount / totalHotelsCount) * 100)}% ng kabuuang hotel ay aktibo at naka-subscribe.
            </span>
          </div>
        </div>

      </div>

      {/* HOTEL BOOKINGS SUMMARY TABLE (TOP 5 HOTELS) WITH DATE RANGE FILTER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Hotel Bookings Summary (Top 5 Hotels)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Number of bookings received within the selected date range.
            </p>
          </div>

          {/* Date Range Picker Filter */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* From Date */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">From:</span>
              <Calendar size={14} className="text-emerald-700 dark:text-emerald-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              />
            </div>

            <span className="text-xs font-bold text-slate-400">to</span>

            {/* To Date */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">To:</span>
              <Calendar size={14} className="text-emerald-700 dark:text-emerald-400" />
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">#</th>
                <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Hotel Name</th>
                <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Location</th>
                <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Total Capacity</th>
                <th className="px-6 py-3 text-right text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Bookings Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {top5Hotels.map((hotel, index) => (
                <tr key={hotel.hotelId || index} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-3.5 text-slate-400 font-mono font-bold">
                    {index + 1}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                        <Hotel size={14} />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {hotel.hotelName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                    {hotel.location || 'Caloocan, Metro Manila'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                      <BedDouble size={13} className="text-emerald-700 dark:text-emerald-400" />
                      {hotel.totalRooms || 10} Rooms
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                      {hotel.bookingsCount || 0} Bookings
                    </span>
                  </td>
                </tr>
              ))}

              {top5Hotels.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-400">
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