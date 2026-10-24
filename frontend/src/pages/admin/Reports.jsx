import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DollarSign, Building2, Download, Calendar, PackageCheck, Layers, Award } from 'lucide-react';

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

export default function Analytics() {
  const { isDarkMode } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeReportsData = (payload = {}) => {
    const kpis = payload?.kpis && typeof payload.kpis === 'object' ? payload.kpis : {};
    const revenueChart = payload?.revenueChart && typeof payload.revenueChart === 'object' ? payload.revenueChart : { labels: [], values: [] };
    const labels = Array.isArray(revenueChart.labels) ? revenueChart.labels : [];
    const values = Array.isArray(revenueChart.values) ? revenueChart.values.map((v) => Number(v ?? 0)) : [];

    return {
      kpis: {
        ...kpis,
        totalPartners: Number(kpis.totalPartners ?? kpis.totalHotels ?? 0),
        totalHotels: Number(kpis.totalHotels ?? kpis.totalPartners ?? 0),
        totalRevenue: Number(kpis.totalRevenue ?? 0),
        subscriptionRevenue: Number(kpis.subscriptionRevenue ?? 0),
        totalReservations: Number(kpis.totalReservations ?? 0),
        totalCustomers: Number(kpis.totalCustomers ?? 0),
        subscribedOwners: Number(kpis.subscribedOwners ?? kpis.subscribedHotels ?? 0),
        subscribedHotels: Number(kpis.subscribedHotels ?? kpis.subscribedOwners ?? 0),
        underReviewHotels: Number(kpis.underReviewHotels ?? kpis.underReviewSubscriptions ?? 0),
        underReviewSubscriptions: Number(kpis.underReviewSubscriptions ?? kpis.underReviewHotels ?? 0),
      },
      revenueChart: { labels, values },
    };
  };

  // Date Range Filter States
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });

  const [toDate, setToDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#F4F5F7]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const loadReportsData = () => {
    fetch('/api/admin/reports')
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload?.error || 'Unable to load reports data.');
        setData(normalizeReportsData(payload));
      })
      .catch(() => setData(normalizeReportsData({})))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReportsData();
    const intervalId = setInterval(loadReportsData, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const normalizedData = normalizeReportsData(data);
  const kpis = normalizedData.kpis || {};
  const defaultLabels = getLast6MonthsLabels();
  const chartLabels = normalizedData.revenueChart.labels.length >= 6
    ? normalizedData.revenueChart.labels
    : defaultLabels;
  const rawValues = normalizedData.revenueChart.values || [];
  const chartValues = chartLabels.map((label, idx) => {
    const apiIdx = normalizedData.revenueChart.labels.indexOf(label);
    if (apiIdx >= 0) return normalizedData.revenueChart.values[apiIdx] ?? 0;
    return rawValues[idx] || 0;
  });

  const packageBreakdown = data?.packageBreakdown || [
    { name: 'Basic Starter', subscribers: 8, price: '₱2,500 / mo', totalRevenue: 20000 },
    { name: 'Pro Hotelier', subscribers: 15, price: '₱5,000 / mo', totalRevenue: 75000 },
    { name: 'Enterprise Suite', subscribers: 4, price: '₱10,000 / mo', totalRevenue: 40000 },
  ];

  const totalSubscriptionsCount = Number(kpis.subscribedHotels ?? kpis.subscribedOwners ?? packageBreakdown.reduce((acc, curr) => acc + curr.subscribers, 0));
  const maxVal = Math.max(...chartValues, 1);
  const isValidDateRange = !fromDate || !toDate || fromDate <= toDate;

  if (loading) return (
    <div className={`p-6 min-h-screen flex items-center justify-center ${theme.bg}`}>
      <div className="w-10 h-10 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`p-6 space-y-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      
      {/* HEADER WITH DATE RANGE SELECTOR & EXPORT */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Reports & <span className="text-[#2FA084]">Analytics</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSub} mt-0.5`}>
            Pagsusuri sa kita ng system, mga naka-subscribe na owners, at hotel performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-black/30' : 'bg-white'}`}>
            <Calendar size={14} className="text-[#2FA084]" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${theme.textMain}`}
            />
            <span className={`text-xs font-bold ${theme.textSub}`}>to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`bg-transparent text-xs font-bold outline-none cursor-pointer ${theme.textMain}`}
            />
          </div>

          <button className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2FA084] text-black font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all">
            <Download size={15} strokeWidth={3} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Hotel Subscriptions', 
            value: totalSubscriptionsCount, 
            subtext: 'Kabuuan ng naka-activate na hotel packages',
            icon: <Award size={20} /> 
          },
          { 
            label: 'Subscription Revenue', 
            value: `₱${(kpis.subscriptionRevenue ?? 32480).toLocaleString()}`, 
            subtext: 'Kabuuang kinita sa packages',
            icon: <DollarSign size={20} /> 
          },
          { 
            label: 'Subscribed Hotels', 
            value: kpis.subscribedHotels ?? kpis.subscribedOwners ?? 27, 
            subtext: 'Mga hotel na may aktibong subscription',
            icon: <PackageCheck size={20} /> 
          },
          { 
            label: 'Total Hotels', 
            value: kpis.totalHotels ?? kpis.totalPartners ?? 5, 
            subtext: 'Kabuuan ng nakatalang hotel listings',
            icon: <Building2 size={20} /> 
          },
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} group transition-all`}>
            <div className={`p-2.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084] inline-block mb-4`}>
              {kpi.icon}
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{kpi.label}</p>
            <h2 className={`text-2xl font-black tracking-tighter ${theme.textMain}`}>{kpi.value}</h2>
            <p className={`text-[9px] font-bold uppercase mt-1 ${theme.textSub}`}>{kpi.subtext}</p>
          </div>
        ))}
      </div>

      {/* REVENUE GRAPH & PACKAGE BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* REVENUE GRAPH (SIGURADONG LAGI AT KUMPLETO ANG 6 BUWAN) */}
        <div className={`lg:col-span-2 p-7 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2FA084]" />
              <div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Monthly Subscription Revenue</h3>
                <p className={`text-[9px] font-bold uppercase ${theme.textSub}`}>Kita mula sa package subscriptions</p>
              </div>
            </div>
            <span className={`text-[9px] font-black uppercase text-[#2FA084] bg-[#2FA084]/10 px-2.5 py-1 rounded-md`}>
              Last 6 Months
            </span>
          </div>

          <div className="h-64 flex items-end justify-between gap-3 px-2 pt-8">
{!isValidDateRange ? (
                <div className={`w-full text-center text-[11px] font-bold ${theme.textSub}`}>
                  Start date cannot be after end date.
                </div>
              ) : chartLabels.map((label, i) => {
              const rawVal = chartValues[i] || 0;
              const isZero = rawVal === 0;
              
              // Kapag higit sa 0 ay may percent height, kapag 0 naman ay nakaset sa visual indicator bar (4px)
              const heightPercent = isZero ? '4px' : `${Math.max((rawVal / maxVal) * 100, 10)}%`;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                  
                  {/* Amount Label */}
                  <div className={`text-[9px] font-black tracking-wider transition-all ${
                    isZero 
                      ? 'text-gray-400 dark:text-gray-500' 
                      : theme.textMain
                  }`}>
                    ₱{Number(rawVal).toLocaleString()}
                  </div>

                  {/* Bar Container Area */}
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

        {/* PACKAGE DISTRIBUTION SUMMARY */}
        <div className={`p-7 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 rounded-lg bg-[#2FA084]/10 text-[#2FA084]">
                <Layers size={16} />
              </div>
              <div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Package Overview</h3>
                <p className={`text-[9px] font-bold uppercase ${theme.textSub}`}>Pinakasikat na System Packages</p>
              </div>
            </div>

            <div className="space-y-4">
              {packageBreakdown.map((pkg, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[11px] font-black ${theme.textMain}`}>{pkg.name}</span>
                    <span className="text-[10px] font-black text-[#2FA084]">{pkg.price}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <span>{pkg.subscribers} Hotels Subscribed</span>
                    <span className="font-bold text-gray-300">₱{pkg.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-dashed mt-6 text-center border-gray-200 dark:border-white/10">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.textSub}`}>
              Updated sa real-time batay sa mga pumasok na kabayaran
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}