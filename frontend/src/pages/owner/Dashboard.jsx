import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  DollarSign,
  Calendar
} from "lucide-react";

const OWNER_SESSION_KEY = "ownerSession";

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const compact = (value) => {
  try {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
  } catch {
    return String(value || 0);
  }
};

const shortLabel = (label) => {
  const raw = String(label || "");
  if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01`).toLocaleDateString("en-US", { month: "short" });
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return raw || "--";
};

const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm transition-all hover:shadow">
    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</p>
    <div className="mt-2 flex items-end justify-between gap-3">
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {subtitle ? <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{subtitle}</span> : null}
    </div>
  </div>
);

const MiniStat = ({ label, value, tone = "slate" }) => {
  const classes =
    tone === "emerald"
      ? "border-emerald-600/30 bg-emerald-50/50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200"
      : tone === "rose"
      ? "border-rose-200 bg-rose-50/50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200"
      : "border-slate-200 bg-slate-50/50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200";
  return (
    <div className={`rounded border p-3.5 shadow-sm ${classes}`}>
      <p className="text-[10px] font-mono uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1.5 text-lg font-bold">{value}</p>
    </div>
  );
};

const BarTrend = ({ labels = [], series = [], tone = "emerald", formatter = (value) => value, limit = 6 }) => {
  const displayLabels = (labels || []).slice(-limit);
  const displayValues = (series || []).slice(-limit).map((value) => Number(value || 0));
  
  const max = Math.max(...displayValues, 1);
  const barColor = tone === "emerald" ? "bg-emerald-800 dark:bg-emerald-600" : "bg-slate-700 dark:bg-slate-600";
  return (
    <div>
      <div className="flex h-32 items-end gap-2">
        {displayValues.length ? displayValues.map((value, index) => (
          <div key={`${displayLabels[index]}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded bg-slate-100 p-1 dark:bg-slate-800/60">
              <div className={`w-full rounded-sm ${barColor} transition-all duration-500`} style={{ height: `${Math.max(8, (value / max) * 88)}px` }} />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">{shortLabel(displayLabels[index])}</span>
          </div>
        )) : <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">No trend data available.</div>}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span>{formatter(displayValues[0] || 0)}</span>
        <span>{formatter(displayValues[displayValues.length - 1] || 0)}</span>
      </div>
    </div>
  );
};

const RecCard = ({ item }) => (
  <div className="group relative min-h-[240px] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm">
    <img src={item?.imageUrl || "/images/deluxe-room.jpg"} alt={item?.title || "AI recommendation"} className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105" />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
    <div className="relative flex h-full flex-col justify-between p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded border border-white/20 bg-white/10 px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-widest backdrop-blur-md">{item?.priority || "AI"}</span>
        <span className="rounded bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-emerald-300 backdrop-blur-md">{item?.metricLabel || "Signal"}: {item?.metricValue || "--"}</span>
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">AI Insight Recommendation</p>
        <h3 className="mt-1.5 text-base font-bold leading-snug">{item?.title || "Recommendation"}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{item?.summary || "No information available."}</p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">{item?.action || "Waiting for more data"}</p>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("monthly"); // "today", "monthly", "quarterly", "yearly", "custom"
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(OWNER_SESSION_KEY);
    if (!raw) return navigate("/owner/login", { replace: true });

    let ownerId = null;
    try {
      ownerId = JSON.parse(raw)?.id ?? null;
    } catch {
      ownerId = null;
    }
    if (!ownerId) {
      localStorage.removeItem(OWNER_SESSION_KEY);
      return navigate("/owner/login", { replace: true });
    }

    const controller = new AbortController();
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        // Build query parameters for the selected period and date range.
        let queryParams = `period=${period}`;
        if (period === "custom" && fromDate && toDate) {
          queryParams += `&from=${fromDate}&to=${toDate}`;
        }

        const [dashRes, analyticsRes] = await Promise.all([
          fetch(`/api/owner/dashboard/${ownerId}?${queryParams}`, { signal: controller.signal }),
          fetch(`/api/owner/analytics/${ownerId}?${queryParams}`, { signal: controller.signal }),
        ]);
        const dash = await dashRes.json().catch(() => ({}));
        const analytics = await analyticsRes.json().catch(() => ({}));
        if (!dashRes.ok) {
          setError(dash?.error || `Failed to load dashboard (HTTP ${dashRes.status}).`);
          setData(null);
          setForecastData(null);
          setAnalyticsData(null);
          return;
        }
        setData(dash);
        setForecastData(analyticsRes.ok ? analytics?.forecast || null : null);
        setAnalyticsData(analyticsRes.ok ? analytics : null);
        setLastSynced(new Date());
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError("Unable to reach the server. Please try again.");
        setData(null);
        setForecastData(null);
        setAnalyticsData(null);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [navigate, period, fromDate, toDate]);

  const kpis = data?.kpis || {};
  const analytics = analyticsData || {};
  const summary = analytics?.summary || {};
  const trends = analytics?.trends || {};
  const behavior = analytics?.behavioralAnalytics || {};
  const roomMix = analytics?.roomMix || [];
  const recommendations = analytics?.aiRecommendations || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold">Owner Intelligence Portal</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Property Dashboard</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Overview for <span className="font-semibold text-slate-800 dark:text-slate-200">{data?.hotelName || "your property"}</span>
              </p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">
                {lastSynced ? `Last synced at ${lastSynced.toLocaleTimeString()}` : "Live sync ready"}
              </p>
            </div>

            {/* TIME PERIOD TABS (Today, Monthly, Quarterly, Yearly, Custom) */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
              {[
                { key: "today", label: "Today" },
                { key: "monthly", label: "Monthly" },
                { key: "quarterly", label: "Quarterly" },
                { key: "yearly", label: "Yearly" },
                { key: "custom", label: "Custom Date" },
              ].map((item) => (
                <button 
                  key={item.key} 
                  type="button" 
                  onClick={() => setPeriod(item.key)} 
                  className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    period === item.key 
                      ? "bg-emerald-800 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date range picker */}
          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">From:</span>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => setFromDate(e.target.value)} 
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">To:</span>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => setToDate(e.target.value)} 
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs" 
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Error</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Reservations" value={(kpis.totalReservations ?? 0).toLocaleString()} subtitle="Selected period" />
          <StatCard title="Occupancy Rate" value={`${Math.round(kpis.occupancyRate ?? 0)}%`} subtitle="Selected period" />
          <StatCard title="Total Revenue" value={formatPhp(kpis.totalRevenuePhp)} subtitle="Selected period" />
          <StatCard title="Available Rooms" value={(kpis.availableRooms ?? 0).toLocaleString()} subtitle={kpis.inventoryNote || "Ready"} />
        </div>

        {/* ANALYTICS & FORECASTING CENTER */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Analytics & Behavioral Insights</p>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Owner Intelligence Center</h2>
              </div>
              <div className="border border-emerald-600/30 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/30 px-3 py-1.5 rounded text-right">
                <p className="text-[9px] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Forecast Revenue</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{formatPhp(summary.forecastedRevenuePhp)}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Occupancy Trend</p>
                    <p className="text-[11px] text-slate-500">Room usage</p>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{Math.round(summary.currentOccupancyRate || 0)}%</span>
                </div>
                <BarTrend labels={trends.labels} series={trends.occupancyRate} tone="emerald" formatter={(value) => `${Math.round(value)}%`} limit={6} />
              </div>
              
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Revenue Trend</p>
                    <p className="text-[11px] text-slate-500">Revenue history</p>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{formatPhp(summary.currentRevenuePhp)}</span>
                </div>
                <BarTrend labels={trends.labels} series={trends.revenuePhp} tone="slate" formatter={(value) => formatPhp(value)} limit={6} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniStat label="Repeat Guests" value={`${Math.round(summary.repeatGuestRate || 0)}%`} tone="emerald" />
              <MiniStat label="Avg Guest Spend" value={formatPhp(summary.averageGuestSpendPhp)} />
              <MiniStat label="Cancellation" value={`${Math.round(summary.cancellationRate || 0)}%`} tone="rose" />
              <MiniStat label="High Risk" value={summary.highRiskGuests || 0} tone="rose" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Forecast Snapshot</p>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Prophet Forecasting Signals</h3>
                </div>
                <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{period}</span>
              </div>
              <div className="mt-5 space-y-3">

                {/* Revenue Signal */}
                <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Next-Period Revenue</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      summary.revenueTrend === "up" ? "text-emerald-600 dark:text-emerald-400" :
                      summary.revenueTrend === "down" ? "text-rose-500" : "text-slate-400"
                    }`}>
                      {summary.revenueTrend === "up" ? "▲ Rising" : summary.revenueTrend === "down" ? "▼ Falling" : "→ Flat"}
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatPhp(summary.forecastedRevenuePhp)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">vs {formatPhp(summary.lastRevenuePhp)} last {period === "today" ? "day" : period === "quarterly" ? "quarter" : period === "yearly" ? "year" : "month"}</p>
                </div>

                {/* Occupancy Signal */}
                <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Next-Period Occupancy</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      summary.occupancyTrend === "up" ? "text-emerald-600 dark:text-emerald-400" :
                      summary.occupancyTrend === "down" ? "text-rose-500" : "text-slate-400"
                    }`}>
                      {summary.occupancyTrend === "up" ? "▲ Rising" : summary.occupancyTrend === "down" ? "▼ Falling" : "→ Flat"}
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{Math.round(summary.forecastedOccupancyRate || 0)}%</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">vs {Math.round(summary.lastOccupancyRate || 0)}% last {period === "today" ? "day" : period === "quarterly" ? "quarter" : period === "yearly" ? "year" : "month"}</p>
                </div>

                {/* Demand + Engine */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Demand</p>
                      <span className={`text-[9px] font-bold uppercase ${
                        summary.demandTrend === "up" ? "text-emerald-500" :
                        summary.demandTrend === "down" ? "text-rose-500" : "text-slate-400"
                      }`}>
                        {summary.demandTrend === "up" ? "▲" : summary.demandTrend === "down" ? "▼" : "→"}
                      </span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{compact(summary.demandTotal ?? (trends.bookings || []).reduce((s, v) => s + Number(v || 0), 0))}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Total bookings</p>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Engine</p>
                    <p className="mt-1 text-sm font-bold capitalize text-slate-900 dark:text-white truncate">{analytics?.forecast?.engine?.mode?.replace(/-/g, " ") || "Prophet AI"}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{analytics?.forecast?.engine?.prophet ? "Prophet active" : "Linear fallback"}</p>
                  </div>
                </div>

              </div>
            </div>
            <div className="mt-4 border border-emerald-600/30 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/30 p-3.5 rounded">
              <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-bold">AI Planning Note</p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                Forecast horizon: <span className="font-bold">{summary.forecastHorizon || 0} {period === "today" ? "days" : period === "quarterly" ? "quarters" : period === "yearly" ? "years" : "months"}</span> ahead. Use {formatPhp(summary.forecastedRevenuePhp)} to optimize pricing and staffing.
              </p>
            </div>
          </div>
        </div>

        {/* CRM BEHAVIORAL ANALYTICS & ROOM MIX */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Guest Behavioral Analytics</p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Guest Behavior and Risk Watch</h3>
              </div>
              <button type="button" onClick={() => navigate("/owner/customers")} className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-1.5 text-xs font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Open CRM</button>
            </div>
            
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Top Guests</p>
                  <span className="text-[10px] font-mono uppercase text-slate-400">{behavior?.topGuests?.length || 0}</span>
                </div>
                <div className="space-y-3">
                  {(behavior?.topGuests || []).slice(0, 4).map((guest) => (
                    <div key={`${guest.name}-${guest.customerId || guest.lastBookingDate}`} className="flex items-center gap-3">
                      <img src={guest.imageUrl || "/images/deluxe-room.jpg"} alt={guest.name} className="h-9 w-9 rounded object-cover shadow-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{guest.name}</p>
                        <p className="text-[10px] text-slate-500">{guest.preferredRoom || "Standard Room"}</p>
                      </div>
                      <div className="text-right"><p className="text-xs font-bold text-slate-900 dark:text-white">{formatPhp(guest.totalSpend)}</p></div>
                    </div>
                  ))}
                  {(!behavior?.topGuests || behavior.topGuests.length === 0) && !loading ? <p className="text-xs text-slate-500">No guest data yet.</p> : null}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Risk Watch</p>
                  <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-bold">{behavior?.atRiskGuests?.length || 0} flagged</span>
                </div>
                <div className="space-y-2.5">
                  {(behavior?.atRiskGuests || []).slice(0, 4).map((guest) => (
                    <div key={`${guest.name}-${guest.riskScore}`} className="rounded border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{guest.name}</p>
                          <p className="text-[10px] text-slate-500">Cancel rate {Math.round(guest.cancellationRate || 0)}%</p>
                        </div>
                        <span className="rounded bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-rose-700 dark:text-rose-300 font-bold">Risk {guest.riskScore || 0}</span>
                      </div>
                    </div>
                  ))}
                  {(!behavior?.atRiskGuests || behavior.atRiskGuests.length === 0) && !loading ? <p className="text-xs text-slate-500">No high-risk guests flagged.</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Room Mix</p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Revenue Distribution</h3>
              </div>
              <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">DB Sync</span>
            </div>
            <div className="mt-5 space-y-3">
              {roomMix.slice(0, 5).map((room) => (
                <div key={`${room.label}-${room.revenue}`} className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded p-3">
                  <div className="flex items-center gap-3">
                    <img src={room.imageUrl || "/images/deluxe-room.jpg"} alt={room.label} className="h-10 w-10 rounded object-cover shadow-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{room.label}</p>
                      <p className="text-[10px] text-slate-500">{room.bookingCount || 0} reservations | {Math.round(room.share || 0)}% share</p>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{formatPhp(room.revenue)}</p>
                  </div>
                </div>
              ))}
              {!roomMix.length && !loading ? <p className="text-xs text-slate-500">No room mix analytics yet.</p> : null}
            </div>
          </div>
        </div>

        {/* AI RECOMMENDATION CARDS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recommendations.map((item) => <RecCard key={item.id} item={item} />)}
          {!recommendations.length && !loading ? (
            <div className="border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-8 text-xs font-semibold text-slate-500 lg:col-span-3 text-center">
              Lilitaw dito ang mga rekomendasyon ng AI kapag mayroon nang sapat na datos ng booking.
            </div>
          ) : null}
        </div>

        {/* FOOTER WIDGETS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Room Status Matrix</p>
              <span className="text-[10px] font-mono uppercase text-slate-400">Total {data?.roomStatus?.totalRooms ?? 0}</span>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {(data?.roomStatus?.rooms || []).slice(0, 30).map((room) => { 
                const status = (room.status || "vacant").toLowerCase(); 
                const color = status === "occupied" ? "bg-emerald-700" : status === "dirty" ? "bg-rose-500" : status === "maintenance" ? "bg-slate-700" : "bg-slate-200 dark:bg-slate-800"; 
                return <div key={room.id} title={`${room.roomNumber || "Room"} - ${status}`} className={`h-6 w-6 rounded-sm border border-black/5 transition-transform hover:scale-105 ${color}`} />; 
              })}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-xs bg-emerald-700" />Occupied ({data?.roomStatus?.counts?.occupied ?? 0})</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-xs bg-slate-200 dark:bg-slate-800" />Vacant ({data?.roomStatus?.counts?.vacant ?? 0})</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-xs bg-rose-500" />Dirty ({data?.roomStatus?.counts?.dirty ?? 0})</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-xs bg-slate-700" />Maintenance ({data?.roomStatus?.counts?.maintenance ?? 0})</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Recent Reservations</p>
                <span className="text-[10px] font-mono uppercase text-slate-400">Activity</span>
              </div>
              <div className="mt-4 space-y-3">
                {(data?.recentBookings || []).slice(0, 4).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-2.5 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{booking.customerName || "Customer"}</p>
                      <p className="text-[10px] text-slate-500">Room {booking.roomNumber || "--"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{formatPhp(booking.totalAmountPhp)}</p>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">{booking.status || "--"}</p>
                    </div>
                  </div>
                ))}
                {(!data?.recentBookings || data.recentBookings.length === 0) && !loading ? <p className="text-xs text-slate-500">No reservations yet.</p> : null}
              </div>
            </div>
            <button type="button" onClick={() => navigate("/owner/reservations")} className="mt-4 w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">View All Transactions</button>
          </div>
        </div>

        {loading ? <div className="text-xs font-medium text-slate-500 text-center py-2 font-mono">Updating dashboard...</div> : null}
      </main>
    </div>
  );
}