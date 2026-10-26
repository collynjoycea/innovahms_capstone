import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Archive, Plus, RefreshCw, Truck, PackagePlus, FileText, CheckCircle2, Receipt, X } from "lucide-react";
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
      const [supplierResponse, itemResponse, orderResponse] = await Promise.all([
        fetch(`/api/inventory/suppliers${query}`),
        fetch(`/api/inventory/items${query}`),
        fetch(`/api/inventory/purchase-orders${query}`),
      ]);
      const responses = await Promise.all([
        supplierResponse.json(),
        itemResponse.json(),
        orderResponse.json(),
      ]);
      const failedIndex = [supplierResponse, itemResponse, orderResponse].findIndex((response) => !response.ok);
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
      setMessage("Supplier added successfully.");
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
      setMessage(`Purchase order ${data.poNumber} created successfully.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Could not create purchase order.");
    } finally {
      setSaving(false);
    }
  };

  const [receiveModal, setReceiveModal] = useState(null);
  const [itemPayments, setItemPayments] = useState({});
  const [receiptModal, setReceiptModal] = useState(null);

  const receiveOrder = (order) => {
    const payments = {};
    (order.items || []).forEach((item) => { payments[item.itemId] = String(item.unitCost * item.quantity); });
    setItemPayments(payments);
    setReceiveModal(order);
  };

  const confirmReceive = async () => {
    if (!receiveModal) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/inventory/purchase-orders/${receiveModal.id}/receive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedBy: createdBy,
          itemPayments: (receiveModal.items || []).map((item) => ({
            itemId: item.itemId,
            amountPaid: Number(itemPayments[item.itemId] || 0),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not receive purchase order.");
      setMessage(data.message || `${receiveModal.poNumber} received.`);
      setReceiveModal(null);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || "Could not receive purchase order.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold">Supply Chain Control</span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Suppliers & Purchase Orders</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Manage vendor profiles, issue purchase orders, and sync deliveries directly into hotel inventory.
              </p>
            </div>
            <button 
              type="button" 
              onClick={refresh} 
              className="inline-flex items-center gap-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer self-start lg:self-auto"
            >
              <RefreshCw size={14} /> Refresh Data
            </button>
          </div>
        </div>

        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
        {message ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</p> : null}

        {/* Suppliers Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Truck size={16} className="text-emerald-700 dark:text-emerald-400" /> Supplier Directory
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Register and oversee trusted vendors and suppliers.</p>
          </div>

          <form onSubmit={saveSupplier} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {[
              ["name", "Supplier Name *", true],
              ["contactPerson", "Contact Person", false],
              ["email", "Email Address", false],
              ["phone", "Phone Number", false],
              ["address", "Business Address", false],
              ["notes", "Notes / Terms", false],
            ].map(([field, label, required]) => (
              <label key={field} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {label}
                <input
                  required={required}
                  type={field === "phone" ? "tel" : field === "email" ? "email" : "text"}
                  inputMode={field === "phone" ? "tel" : undefined}
                  placeholder={`Enter ${label.toLowerCase().replace('*', '').trim()}`}
                  value={supplierForm[field]}
                  onChange={(event) => setSupplierForm((current) => ({
                    ...current,
                    [field]: sanitizeSupplierField(field, event.target.value),
                  }))}
                  className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600 transition-colors"
                />
              </label>
            ))}
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <button disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer">
                <Plus size={15} /> Add Supplier Profile
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                  <th className="p-3.5 font-semibold">Supplier Name</th>
                  <th className="p-3.5 font-semibold">Contact Person</th>
                  <th className="p-3.5 font-semibold">Phone / Email</th>
                  <th className="p-3.5 font-semibold">Address</th>
                  <th className="p-3.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {suppliers.filter((supplier) => supplier.is_active).map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white uppercase">{supplier.name}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{supplier.contact_person || "—"}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-mono">{supplier.phone || supplier.email || "—"}</td>
                    <td className="p-3.5 text-slate-500 truncate max-w-xs">{supplier.address || "—"}</td>
                    <td className="p-3.5 text-right">
                      <button type="button" onClick={() => archiveSupplier(supplier.id)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer">
                        <Archive size={13} /> Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && suppliers.filter((supplier) => supplier.is_active).length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No active suppliers found. Register one above to begin.</p>
            ) : null}
          </div>
        </div>

        {/* Create Purchase Order Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PackagePlus size={16} className="text-emerald-700 dark:text-emerald-400" /> Create Purchase Order
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Order items from active suppliers to restock inventory levels.</p>
          </div>

          {suppliers.filter((supplier) => supplier.is_active).length === 0 || items.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
              Please register an active supplier and ensure inventory items exist before generating a purchase order.
            </div>
          ) : (
            <form onSubmit={createOrder} className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Supplier *
                  <select required value={orderForm.supplierId} onChange={(event) => setOrderForm((current) => ({ ...current, supplierId: event.target.value }))} className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none cursor-pointer">
                    <option value="">Choose a supplier</option>
                    {suppliers.filter((supplier) => supplier.is_active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                </label>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Expected Delivery Date
                  <input type="date" value={orderForm.expectedDate} onChange={(event) => setOrderForm((current) => ({ ...current, expectedDate: event.target.value }))} className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none" />
                </label>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Order Items Line Breakdown</label>
                {orderForm.lines.map((line, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_120px_140px_auto] items-center">
                    <select required value={line.itemId} onChange={(event) => changeLine(index, "itemId", event.target.value)} className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none cursor-pointer">
                      <option value="">Choose inventory item</option>
                      {items.map((item) => <option key={item.id} value={item.id}>{item.name} (Stock: {item.stockLevel} {item.unit || 'units'})</option>)}
                    </select>
                    <input aria-label="Quantity" type="number" min="1" required placeholder="Qty" value={line.quantity} onChange={(event) => changeLine(index, "quantity", event.target.value)} className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none" />
                    <input aria-label="Unit cost" type="number" min="0" step="0.01" required placeholder="Unit Cost (₱)" value={line.unitCost} onChange={(event) => changeLine(index, "unitCost", event.target.value)} className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none" />
                    <button type="button" disabled={orderForm.lines.length === 1} onClick={() => setOrderForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))} className="rounded border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 cursor-pointer">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => setOrderForm((current) => ({ ...current, lines: [...current.lines, { itemId: "", quantity: 1, unitCost: 0 }] }))} className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer">
                  <Plus size={14} /> Add another line item
                </button>
              </div>

              <label className="block font-semibold text-slate-700 dark:text-slate-300 pt-2">Notes & Instructions
                <textarea rows={2} placeholder="Optional delivery notes or terms..." value={orderForm.notes} onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none" />
              </label>

              <div className="flex justify-end pt-2">
                <button disabled={saving} className="rounded bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 font-bold text-white transition-colors disabled:opacity-50 cursor-pointer">
                  Generate Purchase Order
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Purchase Order History Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-6">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-emerald-700 dark:text-emerald-400" /> Purchase Order History
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Track fulfillment status and process incoming shipments.</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
              Total Orders: {orders.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading purchase order records...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No purchase orders generated yet.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    <th className="p-3.5 font-semibold">PO Number</th>
                    <th className="p-3.5 font-semibold">Supplier</th>
                    <th className="p-3.5 font-semibold">Line Items</th>
                    <th className="p-3.5 font-semibold">Total Amount</th>
                    <th className="p-3.5 font-semibold">Expected Date</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold text-right">Fulfillment Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors align-top">
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">{order.poNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{order.supplier}</td>
                      <td className="p-3.5">
                        <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                          {(order.items || []).map((item) => (
                            <li key={item.itemId}>• {item.name} — <span className="font-mono font-bold">{item.quantity}</span> {item.unit || 'units'}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-700 dark:text-emerald-400">₱{Number(order.totalAmount || 0).toLocaleString()}</td>
                      <td className="p-3.5 text-slate-500">{order.expectedDate || "—"}</td>
                      <td className="p-3.5">
                        <span className={`inline-flex rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          order.status === "RECEIVED" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {order.status !== "RECEIVED" && order.status !== "CANCELLED" ? (
                          <button type="button" onClick={() => receiveOrder(order)} className="rounded bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer">
                            Receive & Sync Stock
                          </button>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-600" /> {order.receivedDate ? `Received ${order.receivedDate}` : "Completed"}
                            </span>
                            <button type="button" onClick={() => setReceiptModal(order)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer">
                              <Receipt size={13} /> View Receipt
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Receive Modal */}
      {receiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Receive {receiveModal.poNumber}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Enter the actual amount paid per item.</p>
              </div>
              <button type="button" onClick={() => setReceiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {(receiveModal.items || []).map((item) => (
                <div key={item.itemId} className="flex items-center gap-3">
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-slate-800 dark:text-white">{item.name}</p>
                    <p className="text-slate-500">{item.quantity} {item.unit || 'units'} × ₱{Number(item.unitCost).toLocaleString()} ordered</p>
                  </div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                    Amount Paid (₱)
                    <input
                      type="number" min="0" step="0.01"
                      value={itemPayments[item.itemId] ?? ''}
                      onChange={(e) => setItemPayments((p) => ({ ...p, [item.itemId]: e.target.value }))}
                      className="mt-1 block w-32 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-600"
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button type="button" onClick={() => setReceiveModal(null)} className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
              <button type="button" onClick={confirmReceive} className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold">Confirm Receive & Sync Stock</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Receipt size={15} className="text-emerald-600" /> Purchase Receipt</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{receiptModal.poNumber} — {receiptModal.supplier}</p>
              </div>
              <button type="button" onClick={() => setReceiptModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Received Date</span><span className="font-semibold text-slate-700 dark:text-slate-300">{receiptModal.receivedDate || '—'}</span>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1.5">
                {(receiptModal.items || []).map((item) => (
                  <div key={item.itemId} className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{item.quantity} × {item.name}</span>
                    <span className="font-bold text-slate-800 dark:text-white">₱{Number(item.unitCost * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-300">Total Ordered Amount</span>
                <span className="text-emerald-700 dark:text-emerald-400">₱{Number(receiptModal.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}