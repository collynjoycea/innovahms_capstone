import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Package } from "lucide-react";

const MANAGER_SESSION_KEY = "managerSession";

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const StatCard = ({ title, value, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-emerald-600 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900"
  >
    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</p>
    <div className="mt-2 flex items-end justify-between gap-3">
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {subtitle ? <span className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{subtitle}</span> : null}
    </div>
    </button>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [inventoryStats, setInventoryStats] = useState(null);
  const [inventoryError, setInventoryError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(MANAGER_SESSION_KEY);
    if (!raw) return navigate("/staff/login", { replace: true });

    let ownerId = null;
    let hotelId = null;
    try {
      const session = JSON.parse(raw);
      ownerId = session?.ownerId ?? null;
      hotelId = session?.hotelId ?? session?.hotel_id ?? null;
    } catch {
      ownerId = null;
    }
    if (!ownerId) {
      localStorage.removeItem(MANAGER_SESSION_KEY);
      return navigate("/staff/login", { replace: true });
    }

    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [dashRes, inventoryRes] = await Promise.all([
          fetch(`/api/manager/dashboard/${ownerId}?period=${period}`, { signal: controller.signal }),
          hotelId
            ? fetch(`/api/manager/inventory/dashboard?hotel_id=${encodeURIComponent(hotelId)}`, { signal: controller.signal })
            : Promise.resolve(null),
        ]);
        const [dash, inventory] = await Promise.all([
          dashRes.json().catch(() => ({})),
          inventoryRes ? inventoryRes.json().catch(() => ({})) : Promise.resolve({}),
        ]);
        if (!dashRes.ok) {
          setError(dash?.error || `Failed to load dashboard (HTTP ${dashRes.status}).`);
          setData(null);
          return;
        }
        setData(dash);
        if (!inventoryRes) {
          setInventoryStats(null);
          setInventoryError("This manager account does not have a hotel linked to it.");
        } else if (!inventoryRes.ok) {
          setInventoryStats(null);
          setInventoryError(inventory?.error || `Failed to load supply inventory (HTTP ${inventoryRes.status}).`);
        } else {
          setInventoryStats(inventory?.stats || {});
          setInventoryError("");
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError("Unable to reach the server. Please try again.");
        setData(null);
        setInventoryStats(null);
        setInventoryError("Unable to load supply inventory. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [navigate, period]);

  const kpis = data?.kpis || {};

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Header and period filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4 bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold">Manager Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Property Dashboard</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Overview for <span className="font-semibold text-slate-800 dark:text-slate-200">{data?.hotelName || "your property"}</span>
            </p>
          </div>

          {/* Period filter buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
            {[
              { key: "daily", label: "Daily" },
              { key: "monthly", label: "Monthly" },
              { key: "quarterly", label: "Quarterly" },
              { key: "yearly", label: "Yearly" }
            ].map((item) => (
              <button 
                key={item.key}
                type="button" 
                aria-pressed={period === item.key}
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

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Error</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* KPI cards reflect the selected period. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Reservations" value={(kpis.totalReservations ?? 0).toLocaleString()} onClick={() => navigate("/manager/reservations")} />
          <StatCard title="Occupancy Rate" value={`${Math.round(kpis.occupancyRate ?? 0)}%`} subtitle="Selected period" onClick={() => navigate("/manager/rooms")} />
          <StatCard title="Total Revenue" value={formatPhp(kpis.totalRevenuePhp)} onClick={() => navigate("/manager/revenue")} />
          <StatCard title="Available Rooms" value={(kpis.availableRooms ?? 0).toLocaleString()} subtitle={kpis.inventoryNote || "Ready"} onClick={() => navigate("/manager/rooms")} />
        </div>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Package size={16} className="text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-[10px] font-mono uppercase tracking-widest">Supply Inventory</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/manager/inventory")}
                className="rounded border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                Open Inventory
              </button>
            </div>
            {inventoryError ? (
              <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">{inventoryError}</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Tracked Items", inventoryStats?.totalSkus],
                  ["Low Stock", inventoryStats?.lowStock],
                  ["Out Today", inventoryStats?.itemsOutToday],
                  ["Pending Orders", inventoryStats?.pendingPos],
                ].map(([label, value]) => (
                  <div key={label} className="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {inventoryStats ? Number(value || 0).toLocaleString() : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </section>

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
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-xs bg-slate-700" />Maint ({data?.roomStatus?.counts?.maintenance ?? 0})</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Recent Bookings</p>
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
                {(!data?.recentBookings || data.recentBookings.length === 0) && !loading ? <p className="text-xs text-slate-500">No bookings yet.</p> : null}
              </div>
            </div>
            <button type="button" onClick={() => navigate("/manager/reservations")} className="mt-4 w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">View All Transactions</button>
          </div>
        </div>

        {loading ? <div className="text-xs font-medium text-slate-500 text-center py-2 font-mono">Loading dashboard...</div> : null}
      </main>
    </div>
  );
}