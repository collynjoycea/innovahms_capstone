import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, Boxes, BrainCircuit, ClipboardList, RefreshCcw, TrendingUp, Truck } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "No schedule";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

const getOwnerSession = () => {
  try {
    return JSON.parse(localStorage.getItem("ownerSession") || "{}");
  } catch {
    return {};
  }
};

const Inventory = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: false };
  const ownerSession = useMemo(() => getOwnerSession(), []);
  const ownerId = ownerSession?.id || 0;
  const hotelId = ownerSession?.hotelId || ownerSession?.hotel_id || 0;

  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState([]);
  const [overview, setOverview] = useState({ totalSkus: 0, lowStock: 0, consumRate: 0, pending: 0 });
  const [dashboard, setDashboard] = useState({ stats: {}, recentMovements: [] });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [forecastInput, setForecastInput] = useState({ event: "Weekend peak", occupancy: "92" });
  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const refreshInventory = async () => {
    if (!hotelId && !ownerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [overviewRes, dashboardRes, lowStockRes, poRes] = await Promise.all([
        fetch(`/api/inventory?owner_id=${ownerId}`),
        fetch(`/api/inventory/dashboard?hotel_id=${hotelId}`),
        fetch(`/api/inventory/low-stock?hotel_id=${hotelId}`),
        fetch(`/api/inventory/purchase-orders?hotel_id=${hotelId}`),
      ]);

      const overviewData = await overviewRes.json().catch(() => ({}));
      const dashboardData = await dashboardRes.json().catch(() => ({}));
      const lowStockData = await lowStockRes.json().catch(() => ({}));
      const poData = await poRes.json().catch(() => ({}));

      setInventoryData(Array.isArray(overviewData.items) ? overviewData.items : []);
      setOverview(overviewData.summary || { totalSkus: 0, lowStock: 0, consumRate: 0, pending: 0 });
      setDashboard(dashboardData || { stats: {}, recentMovements: [] });
      setLowStockItems(Array.isArray(lowStockData.items) ? lowStockData.items : []);
      setPurchaseOrders(Array.isArray(poData.orders) ? poData.orders : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshInventory();
    const timer = window.setInterval(refreshInventory, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const runForecast = async () => {
    setForecastLoading(true);
    setForecastResult(null);
    try {
      const response = await fetch("/api/inventory/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          event: forecastInput.event,
          occupancy: Number(forecastInput.occupancy || 0),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to run forecast.");
      }
      setForecastResult(data);
    } catch (error) {
      setForecastResult({ success: false, message: error.message || "Unable to run forecast." });
    } finally {
      setForecastLoading(false);
    }
  };

  const metricCards = [
    { label: "Tracked SKUs", value: overview.totalSkus, icon: Boxes },
    { label: "Low Stock", value: overview.lowStock, icon: AlertTriangle },
    { label: "Items Out Today", value: dashboard?.stats?.itemsOutToday || 0, icon: TrendingUp },
    { label: "Pending POs", value: dashboard?.stats?.pendingPos || 0, icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Inventory Control</span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Live Stock Intelligence</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Real-time monitoring of live inventory, low-stock alerts, purchase orders, and AI forecast analytics.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshInventory}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 transition-colors self-start lg:self-auto"
            >
              <RefreshCcw size={14} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-4">{value}</p>
            </div>
          ))}
        </div>

        {/* Main Section Grid: Inventory Ledger & AI Forecast / Low Stock */}
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          
          {/* Inventory Ledger */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Inventory Ledger
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Current item status and stock levels.</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                Consumption rate: {overview.consumRate}%
              </span>
            </div>

            <div className="overflow-hidden rounded border border-slate-200 dark:border-slate-800">
              {loading ? (
                <div className="px-6 py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                  Loading inventory records...
                </div>
              ) : inventoryData.length === 0 ? (
                <div className="px-6 py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                  No inventory items found for this hotel.
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {inventoryData.slice(0, 8).map((item) => {
                    const ratio = Math.max(0, Math.min(100, Math.round((Number(item.stock_level || 0) / Math.max(Number(item.max_stock || 1), 1)) * 100)));
                    return (
                      <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1.1fr,0.65fr,1fr,0.7fr] items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white uppercase">{item.item_name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.category} • {item.supplier || "No supplier"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block sm:hidden">SKU</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{item.sku_id}</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400">Stock Level</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{item.stock_level}/{item.max_stock}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${ratio <= 30 ? "bg-red-500" : ratio <= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                        <div>
                          <span className={`inline-flex rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.status === "LOW"
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Forecast & Low Stock Priorities */}
          <div className="space-y-6">
            
            {/* AI Forecast Planner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
                <BrainCircuit size={18} className="text-emerald-700 dark:text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Scenario Planner</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Run occupancy and demand projections.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Event / Demand Scenario</label>
                  <input
                    type="text"
                    value={forecastInput.event}
                    onChange={(event) => setForecastInput((current) => ({ ...current, event: event.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    placeholder="e.g. Weekend peak"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Projected Occupancy (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={forecastInput.occupancy}
                    onChange={(event) => setForecastInput((current) => ({ ...current, occupancy: event.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    placeholder="92"
                  />
                </div>
                <button
                  type="button"
                  onClick={runForecast}
                  disabled={forecastLoading}
                  className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded transition disabled:opacity-50"
                >
                  {forecastLoading ? "Running Forecast..." : "Run Forecast"}
                </button>
              </div>

              {forecastResult ? (
                <div className="mt-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">{forecastResult.title || "Forecast result"}</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">{forecastResult.message}</p>
                  {Array.isArray(forecastResult.recommendations) ? (
                    <div className="mt-3 space-y-2">
                      {forecastResult.recommendations.map((item) => (
                        <div key={item.item} className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5">
                          <p className="font-bold text-slate-900 dark:text-white">{item.item}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Increase by {item.recommendedIncreasePercent}% • {item.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Low Stock Priorities */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Low Stock Priorities</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Items requiring immediate reorder.</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.category} • {item.supplier || "No supplier"}</p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${item.severity === "CRITICAL" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">Stock: {item.stockLevel} / {item.maxStock} • Reorder point: {item.reorderPoint}</p>
                  </div>
                ))}
                {!lowStockItems.length ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No low-stock alerts right now.</p>
                ) : null}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Section Grid: Purchase Orders & Recent Movements */}
        <div className="grid gap-6 xl:grid-cols-2">
          
          {/* Purchase Orders Pipeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <ClipboardList size={18} className="text-emerald-700 dark:text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Supplier Pipeline (Purchase Orders)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Track pending and active orders.</p>
              </div>
            </div>

            <div className="space-y-3">
              {purchaseOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white font-mono">{order.poNumber}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{order.supplier}</p>
                    </div>
                    <span className="rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">Expected: {formatDate(order.expectedDate)} • {formatCurrency(order.totalAmount)}</p>
                </div>
              ))}
              {!purchaseOrders.length ? <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No purchase orders found.</p> : null}
            </div>
          </div>

          {/* Recent Stock Movements */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-700 dark:text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Stock Activity & Recent Movements</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Audit logs for item inflows and outflows.</p>
              </div>
            </div>

            <div className="space-y-3">
              {(dashboard?.recentMovements || []).map((movement, index) => (
                <div key={`${movement.item}-${index}`} className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{movement.item}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{movement.type} • {movement.qty} {movement.unit}</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${movement.type === "OUT" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                      {movement.type}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">By {movement.by || "Staff"} • {formatDate(movement.time)}</p>
                </div>
              ))}
              {!dashboard?.recentMovements?.length ? <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No movement logs found.</p> : null}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Inventory;