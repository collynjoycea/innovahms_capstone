import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, Boxes, Plus, RefreshCcw, Trash2, TrendingUp, Truck, X } from "lucide-react";

const INVENTORY_CATEGORIES = ["Cleaning", "Consumables", "F&B", "General", "Guest Supplies", "Linen", "Linens", "Maintenance", "Paper", "Safety", "Toiletries"];

const getManagerSession = () => {
  try {
    return JSON.parse(localStorage.getItem("managerSession") || "{}");
  } catch {
    return {};
  }
};

const Inventory = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: false };
  const managerSession = useMemo(() => getManagerSession(), []);
  const ownerId = managerSession?.ownerId || 0;
  const hotelId = managerSession?.hotelId || managerSession?.hotel_id || 0;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventoryData, setInventoryData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [overview, setOverview] = useState({ totalSkus: 0, lowStock: 0, consumRate: 0, pending: 0 });
  const [dashboard, setDashboard] = useState({ stats: {} });
  const inventoryCategories = useMemo(() => [...new Set([
    ...INVENTORY_CATEGORIES,
    ...inventoryData.map((item) => String(item.category || "").trim()).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b)), [inventoryData]);

  // Modal State para sa Add Item
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    sku_id: "",
    category: "General",
    supplier_id: "",
    stock_level: "",
    max_stock: "",
    reorder_point: "10",
  });

  const refreshInventory = async () => {
    if (!hotelId && !ownerId) {
      setError("Manager hotel is not linked to this session.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [overviewRes, dashboardRes, suppliersRes] = await Promise.all([
        fetch(`/api/manager/inventory?owner_id=${ownerId}`),
        fetch(`/api/manager/inventory/dashboard?hotel_id=${hotelId}`),
        fetch(`/api/manager/inventory/suppliers?hotel_id=${hotelId}`),
      ]);

      const overviewData = await overviewRes.json().catch(() => ({}));
      const dashboardData = await dashboardRes.json().catch(() => ({}));
      const suppliersData = await suppliersRes.json().catch(() => ({}));

      if (!overviewRes.ok || !dashboardRes.ok || !suppliersRes.ok) {
        throw new Error(overviewData.error || dashboardData.error || suppliersData.error || "Failed to load inventory data.");
      }

      setInventoryData(Array.isArray(overviewData.items) ? overviewData.items : []);
      setOverview(overviewData.summary || { totalSkus: 0, lowStock: 0, consumRate: 0, pending: 0 });
      setDashboard(dashboardData || { stats: {} });
      setSuppliers(suppliersData.suppliers || []);
    } catch (requestError) {
      setInventoryData([]);
      setError(requestError.message || "Unable to load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshInventory();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/manager/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          name: formData.item_name,
          skuId: formData.sku_id,
          category: formData.category || "General",
          supplierId: formData.supplier_id ? Number(formData.supplier_id) : null,
          stockLevel: Number(formData.stock_level || 0),
          maxStock: Number(formData.max_stock || 0),
          reorderPoint: Number(formData.reorder_point || 0),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to add inventory item.");
      }

      // Reset Form & Close Modal
      setFormData({
        item_name: "",
        sku_id: "",
        category: "General",
        supplier_id: "",
        stock_level: "",
        max_stock: "",
        reorder_point: "10",
      });
      setIsAddModalOpen(false);
      refreshInventory();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Sigurado ka bang gusto mong tanggalin ang item na ito?")) return;

    try {
      const response = await fetch(`/api/manager/inventory/items/${itemId}?hotel_id=${encodeURIComponent(hotelId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete item.");
      }
      refreshInventory();
    } catch (err) {
      alert(err.message);
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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Live Stock Ledger</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Mag-add, mag-monitor, at mag-manage ng stock levels ng iyong hotel inventory.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus size={15} /> Add Item
              </button>
              <button
                type="button"
                onClick={refreshInventory}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded transition-colors flex items-center gap-1.5"
              >
                <RefreshCcw size={14} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            Error: {error}
          </div>
        ) : null}

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

        {/* Inventory Ledger Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Inventory Stock Table</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Listahan ng lahat ng naka-record na items at quantity.</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
              Total Items: {inventoryData.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="px-6 py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                Loading inventory records...
              </div>
            ) : inventoryData.length === 0 ? (
              <div className="px-6 py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                Walang inventory items na nahanap. I-click ang "Add Item" para magdagdag.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    <th className="p-3.5 font-semibold">Item & Supplier</th>
                    <th className="p-3.5 font-semibold">SKU ID</th>
                    <th className="p-3.5 font-semibold">Category</th>
                    <th className="p-3.5 font-semibold">Stock Level</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {inventoryData.map((item) => {
                    const ratio = Math.max(0, Math.min(100, Math.round((Number(item.stock_level || 0) / Math.max(Number(item.max_stock || 1), 1)) * 100)));
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900 dark:text-white uppercase">{item.item_name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Supplier: {item.supplier || "N/A"}</p>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                          {item.sku_id || "N/A"}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">
                          {item.category || "General"}
                        </td>
                        <td className="p-3.5 w-48">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-400">Level</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{item.stock_level}/{item.max_stock}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className={`h-full rounded-full ${ratio <= 30 ? "bg-red-500" : ratio <= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${ratio}%` }} />
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.status === "LOW" || item.stock_level <= (item.reorder_point || 10)
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}>
                            {item.status || (item.stock_level <= (item.reorder_point || 10) ? "LOW" : "OK")}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Add Inventory Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Inventory Item</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  name="item_name"
                  required
                  value={formData.item_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Bath Towel"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU ID *</label>
                  <input
                    type="text"
                    name="sku_id"
                    required
                    value={formData.sku_id}
                    onChange={handleInputChange}
                    placeholder="e.g. TWL-001"
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none"
                  >
                    {inventoryCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier</label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleInputChange}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="">No supplier linked</option>
                  {suppliers.filter((supplier) => supplier.is_active).map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Stock *</label>
                  <input
                    type="number"
                    name="stock_level"
                    required
                    min="0"
                    value={formData.stock_level}
                    onChange={handleInputChange}
                    placeholder="50"
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Stock *</label>
                  <input
                    type="number"
                    name="max_stock"
                    required
                    min="1"
                    value={formData.max_stock}
                    onChange={handleInputChange}
                    placeholder="100"
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;