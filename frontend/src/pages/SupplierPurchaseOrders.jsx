import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Archive, Plus, RefreshCw, Truck } from "lucide-react";
import useStaffSession from "../hooks/useStaffSession";

const EMPTY_SUPPLIER = { name: "", contactPerson: "", email: "", phone: "", address: "", notes: "" };

const sanitizeSupplierField = (field, value) => {
  if (field === "name") return value.replace(/[^a-zA-Z ]/g, "");
  if (field === "contactPerson") return value.replace(/[0-9]/g, "");
  if (field === "phone") return value.replace(/[a-zA-Z]/g, "");
  return value;
};

export default function SupplierPurchaseOrders({ audience = "staff" }) {
  const outlet = useOutletContext() || {};
  const isDarkMode = Boolean(outlet.isDarkMode);
  const staffSession = useStaffSession();
  const ownerSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("ownerSession") || "{}");
    } catch {
      return {};
    }
  }, []);
  const managerSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("managerSession") || "{}");
    } catch {
      return {};
    }
  }, []);
  const session = audience === "owner" ? ownerSession : audience === "manager" ? managerSession : staffSession;
  const hotelId = session.hotelId || session.hotel_id;
  const displayName = `${session.firstName || ""} ${session.lastName || ""}`.trim();
  const createdBy = audience === "owner"
    ? displayName || "Hotel Owner"
    : audience === "manager"
      ? displayName || "Hotel Manager"
      : session.firstName || "Inventory Staff";
  const staffId = audience === "owner" ? null : session.staffId || session.id || null;
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    expectedDate: "",
    notes: "",
    lines: [{ itemId: "", quantity: 1, unitCost: 0 }],
  });

  const theme = {
    page: isDarkMode ? "bg-[#0f1117] text-slate-100" : "bg-slate-50 text-slate-900",
    card: isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white",
    muted: isDarkMode ? "text-slate-400" : "text-slate-500",
    input: isDarkMode
      ? "border-slate-700 bg-slate-800 text-slate-100"
      : "border-slate-300 bg-white text-slate-900",
  };

  const refresh = useCallback(async () => {
    if (!hotelId) {
      setError("This account does not have a hotel linked to it.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = `?hotel_id=${encodeURIComponent(hotelId)}`;
      const [supplierResponse, itemResponse, orderResponse, lowStockResponse] = await Promise.all([
        fetch(`/api/inventory/suppliers${query}`),
        fetch(`/api/inventory/items${query}`),
        fetch(`/api/inventory/purchase-orders${query}`),
        fetch(`/api/inventory/low-stock${query}`),
      ]);
      const responses = await Promise.all([
        supplierResponse.json(),
        itemResponse.json(),
        orderResponse.json(),
        lowStockResponse.json(),
      ]);
      const failedIndex = [supplierResponse, itemResponse, orderResponse, lowStockResponse].findIndex((response) => !response.ok);
      if (failedIndex !== -1) {
        throw new Error(responses[failedIndex]?.error || "Could not load supplier and inventory data.");
      }
      setSuppliers(responses[0].suppliers || []);
      setItems(responses[1].items || []);
      setOrders(responses[2].orders || []);
    } catch (requestError) {
      setError(requestError.message || "Could not load supplier and inventory data.");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveSupplier = async (event) => {
    event.preventDefault();
    if (!/^[a-zA-Z ]+$/.test(supplierForm.name.trim())) {
      setError("Supplier name can contain letters and spaces only.");
      return;
    }
    if (/[0-9]/.test(supplierForm.contactPerson)) {
      setError("Contact person cannot contain numbers.");
      return;
    }
    if (/[a-zA-Z]/.test(supplierForm.phone)) {
      setError("Phone number cannot contain letters.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/inventory/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...supplierForm, hotelId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save supplier.");
      setSupplierForm(EMPTY_SUPPLIER);
      setMessage("Supplier added.");
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Could not save supplier.");
    } finally {
      setSaving(false);
    }
  };

  const archiveSupplier = async (supplierId) => {
    if (!window.confirm("Archive this supplier? Existing purchase orders will be kept.")) return;
    setError("");
    try {
      const response = await fetch(
        `/api/inventory/suppliers/${supplierId}?hotel_id=${encodeURIComponent(hotelId)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not archive supplier.");
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Could not archive supplier.");
    }
  };

  const changeLine = (index, field, value) => {
    setOrderForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      ),
    }));
  };

  const createOrder = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/inventory/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          supplierId: Number(orderForm.supplierId),
          expectedDate: orderForm.expectedDate || null,
          notes: orderForm.notes,
          createdBy,
          staffId,
          items: orderForm.lines.map((line) => ({
            itemId: Number(line.itemId),
            quantity: Number(line.quantity),
            unitCost: Number(line.unitCost),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create purchase order.");
      setOrderForm({
        supplierId: "",
        expectedDate: "",
        notes: "",
        lines: [{ itemId: "", quantity: 1, unitCost: 0 }],
      });
      setMessage(`Purchase order ${data.poNumber} created.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Could not create purchase order.");
    } finally {
      setSaving(false);
    }
  };

  const receiveOrder = async (order) => {
    if (!window.confirm(`Mark ${order.poNumber} as received and add its quantities to inventory?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/inventory/purchase-orders/${order.id}/receive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedBy: createdBy,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not receive purchase order.");
      setMessage(data.message || `${order.poNumber} received.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Could not receive purchase order.");
    }
  };

  return (
    <div className={`min-h-screen p-5 sm:p-8 ${theme.page}`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6 ${theme.card}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Supply Management</p>
            <h1 className="mt-1 text-2xl font-bold">Suppliers & Purchase Orders</h1>
            <p className={`mt-1 text-sm ${theme.muted}`}>Manage suppliers and receive orders directly into hotel inventory.</p>
          </div>
          <button type="button" onClick={refresh} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${theme.input}`}>
            <RefreshCw size={15} /> Refresh
          </button>
        </header>

        {error ? <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p> : null}
        {message ? <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{message}</p> : null}

        <section className={`rounded-xl border p-6 ${theme.card}`}>
          <h2 className="mb-4 text-lg font-semibold">Add a supplier</h2>
          <form onSubmit={saveSupplier} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["name", "Supplier name", true],
              ["contactPerson", "Contact person", false],
              ["email", "Email", false],
              ["phone", "Phone", false],
              ["address", "Address", false],
              ["notes", "Notes", false],
            ].map(([field, label, required]) => (
              <label key={field} className={`text-xs font-medium ${theme.muted}`}>
                {label}
                <input
                  required={required}
                  type={field === "phone" ? "tel" : "text"}
                  inputMode={field === "phone" ? "tel" : undefined}
                  value={supplierForm[field]}
                  onChange={(event) => setSupplierForm((current) => ({
                    ...current,
                    [field]: sanitizeSupplierField(field, event.target.value),
                  }))}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${theme.input}`}
                />
              </label>
            ))}
            <button disabled={saving} className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
              <Plus size={16} /> Add Supplier
            </button>
          </form>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={theme.muted}><tr><th className="p-2">Supplier</th><th className="p-2">Contact</th><th className="p-2">Phone / Email</th><th className="p-2">Action</th></tr></thead>
              <tbody>
                {suppliers.filter((supplier) => supplier.is_active).map((supplier) => (
                  <tr key={supplier.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="p-2 font-semibold">{supplier.name}</td>
                    <td className={`p-2 ${theme.muted}`}>{supplier.contact_person || "—"}</td>
                    <td className={`p-2 ${theme.muted}`}>{supplier.phone || supplier.email || "—"}</td>
                    <td className="p-2"><button type="button" onClick={() => archiveSupplier(supplier.id)} className="inline-flex items-center gap-1 text-xs text-red-600"><Archive size={13} /> Archive</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && suppliers.length === 0 ? <p className={`py-4 text-sm ${theme.muted}`}>No suppliers yet. Add one above to start a purchase order.</p> : null}
          </div>
        </section>

        <section className={`rounded-xl border p-6 ${theme.card}`}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Truck size={18} className="text-emerald-600" /> Create a purchase order</h2>
          {suppliers.filter((supplier) => supplier.is_active).length === 0 || items.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>Add an active supplier and inventory items before creating an order.</p>
          ) : (
            <form onSubmit={createOrder} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`text-xs font-medium ${theme.muted}`}>Supplier
                  <select required value={orderForm.supplierId} onChange={(event) => setOrderForm((current) => ({ ...current, supplierId: event.target.value }))} className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${theme.input}`}>
                    <option value="">Choose a supplier</option>
                    {suppliers.filter((supplier) => supplier.is_active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                </label>
                <label className={`text-xs font-medium ${theme.muted}`}>Expected delivery
                  <input type="date" value={orderForm.expectedDate} onChange={(event) => setOrderForm((current) => ({ ...current, expectedDate: event.target.value }))} className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${theme.input}`} />
                </label>
              </div>
              <div className="space-y-2">
                {orderForm.lines.map((line, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_120px_140px_auto]">
                    <select required value={line.itemId} onChange={(event) => changeLine(index, "itemId", event.target.value)} className={`rounded-lg border px-3 py-2 text-sm ${theme.input}`}>
                      <option value="">Choose inventory item</option>
                      {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stockLevel} {item.unit})</option>)}
                    </select>
                    <input aria-label="Quantity" type="number" min="1" required value={line.quantity} onChange={(event) => changeLine(index, "quantity", event.target.value)} className={`rounded-lg border px-3 py-2 text-sm ${theme.input}`} />
                    <input aria-label="Unit cost" type="number" min="0" step="0.01" required value={line.unitCost} onChange={(event) => changeLine(index, "unitCost", event.target.value)} className={`rounded-lg border px-3 py-2 text-sm ${theme.input}`} />
                    <button type="button" disabled={orderForm.lines.length === 1} onClick={() => setOrderForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))} className="rounded-lg border border-slate-300 px-3 text-xs text-red-600 disabled:opacity-40 dark:border-slate-700">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setOrderForm((current) => ({ ...current, lines: [...current.lines, { itemId: "", quantity: 1, unitCost: 0 }] }))} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Plus size={14} /> Add item</button>
              </div>
              <label className={`block text-xs font-medium ${theme.muted}`}>Notes
                <textarea rows={2} value={orderForm.notes} onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${theme.input}`} />
              </label>
              <button disabled={saving} className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Create Purchase Order</button>
            </form>
          )}
        </section>

        <section className={`overflow-hidden rounded-xl border ${theme.card}`}>
          <div className="flex items-center justify-between p-5"><h2 className="text-lg font-semibold">Purchase order history</h2><span className={`text-sm ${theme.muted}`}>{orders.length} orders</span></div>
          {loading ? <p className={`p-5 text-sm ${theme.muted}`}>Loading orders…</p> : orders.length === 0 ? <p className={`p-5 text-sm ${theme.muted}`}>No orders yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={theme.muted}><tr><th className="p-3">PO</th><th className="p-3">Supplier</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Expected</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-200 align-top dark:border-slate-800">
                      <td className="p-3 font-mono font-semibold">{order.poNumber}</td>
                      <td className="p-3">{order.supplier}</td>
                      <td className="p-3"><ul className={`space-y-1 text-xs ${theme.muted}`}>{(order.items || []).map((item) => <li key={item.itemId}>{item.name} · {item.quantity} {item.unit}</li>)}</ul></td>
                      <td className="p-3">PHP {Number(order.totalAmount || 0).toLocaleString()}</td>
                      <td className="p-3">{order.expectedDate || "—"}</td>
                      <td className="p-3"><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">{order.status}</span></td>
                      <td className="p-3">{order.status !== "RECEIVED" && order.status !== "CANCELLED" ? <button type="button" onClick={() => receiveOrder(order)} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">Receive & update stock</button> : <span className={`text-xs ${theme.muted}`}>{order.receivedDate || "Complete"}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
