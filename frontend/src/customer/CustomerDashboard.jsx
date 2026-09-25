import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Gift,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  extractCustomerSession,
  formatBookingDate,
  formatCurrency,
  normalizeRoomType,
  resolveCustomerId,
  serializeBookingStatus,
} from "./customerHelpers";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [itemForm, setItemForm] = useState({ inventoryId: "", quantity: 1, notes: "" });
  const [itemLoading, setItemLoading] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemMessage, setItemMessage] = useState("");
  const [itemError, setItemError] = useState("");
  const [confirmItemRequest, setConfirmItemRequest] = useState(false);

  const requestStatusLabel = {
    RECEIVED: "Pending",
    RELAYED: "In progress",
    IN_PROGRESS: "In progress",
    DELIVERED: "Delivered",
    UNAVAILABLE: "Unavailable",
    CANCELLED: "Cancelled",
  };

  const requestStatusStyle = {
    RECEIVED: "bg-amber-100 text-amber-800",
    RELAYED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-sky-100 text-sky-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    UNAVAILABLE: "bg-rose-100 text-rose-700",
    CANCELLED: "bg-zinc-100 text-zinc-600",
  };
  const selectedItemForRequest = inventoryItems.find((item) => String(item.id) === String(itemForm.inventoryId));

  const handleSessionReset = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("customerSession");
    navigate("/login", { replace: true });
  };

  const fetchDashboard = async (silent = false) => {
    try {
      setLoadError("");
      if (silent) setIsRefreshing(true);
      else setLoading(true);

      const savedUser = extractCustomerSession();
      if (!savedUser) {
        throw new Error("No saved customer session found.");
      }

      const cleanId = await resolveCustomerId(savedUser);
      const response = await fetch(`/api/customer/dashboard/${cleanId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Dashboard data is temporarily unavailable.");
      }

      const normalizedUser = payload?.user || {};
      setUser({
        ...normalizedUser,
        bookings: (normalizedUser.bookings || []).map((booking) => ({
          ...booking,
          status: serializeBookingStatus(booking.status),
          roomType: normalizeRoomType(booking.roomType),
          totalPrice: Number(booking.totalPrice || 0),
        })),
        guestRequests: normalizedUser.guestRequests || [],
      });
    } catch (error) {
      setLoadError(error.message || "Failed to load customer dashboard.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const bookingSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = user?.bookings || [];
    const isUnpaidOnline = (booking) =>
      String(booking.status || '').toUpperCase() === 'PENDING' &&
      ['card', 'gcash', 'maya', 'qrph', 'online'].includes(String(booking.paymentMethod || '').toLowerCase());
    const nextStay =
      bookings
        .filter((booking) => {
          const checkIn = booking.checkInDate ? new Date(`${booking.checkInDate}T00:00:00`) : null;
          return checkIn && checkIn >= today && booking.status !== "CANCELLED" && !isUnpaidOnline(booking);
        })
        .sort((a, b) => String(a.checkInDate || "").localeCompare(String(b.checkInDate || "")))[0] || null;

    const upcomingCount = bookings.filter((booking) => {
      const checkIn = booking.checkInDate ? new Date(`${booking.checkInDate}T00:00:00`) : null;
      return checkIn && checkIn >= today && booking.status !== "CANCELLED" && !isUnpaidOnline(booking);
    }).length;

    const activeCount = bookings.filter((booking) => {
      const checkIn = booking.checkInDate ? new Date(`${booking.checkInDate}T00:00:00`) : null;
      const checkOut = booking.checkOutDate ? new Date(`${booking.checkOutDate}T00:00:00`) : null;
      return checkIn && checkOut && checkIn <= today && checkOut >= today && booking.status !== "CANCELLED" && !isUnpaidOnline(booking);
    }).length;

    const totalSpend = bookings
      .filter((booking) => ['COMPLETED', 'CHECKED_OUT'].includes(String(booking.status || '').toUpperCase()))
      .reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);

    return {
      nextStay,
      activeStay: bookings.find((booking) => booking.status === "CHECKED_IN") || null,
      upcomingCount,
      activeCount,
      totalSpend,
    };
  }, [user]);

  const openItemModal = async () => {
    const activeStay = bookingSummary.activeStay;
    if (!activeStay) return;
    setItemModalOpen(true);
    setItemMessage("");
    setItemError("");
    setConfirmItemRequest(false);
    setItemLoading(true);
    try {
      const response = await fetch(`/api/staff/inventory-options?hotel_id=${activeStay.hotelId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to load room items.");
      const availableItems = (payload.inventory || []).filter((item) => Number(item.current_qty) > 0);
      setInventoryItems(availableItems);
      setItemForm((previous) => ({
        ...previous,
        inventoryId: previous.inventoryId || String(availableItems[0]?.id || ""),
      }));
    } catch (error) {
      setItemError(error.message || "Unable to load room items.");
    } finally {
      setItemLoading(false);
    }
  };

  const closeItemModal = () => {
    if (itemSubmitting) return;
    setItemModalOpen(false);
    setItemMessage("");
    setItemError("");
    setConfirmItemRequest(false);
  };

  const submitItemRequest = async () => {
    const activeStay = bookingSummary.activeStay;
    const selectedItem = inventoryItems.find((item) => String(item.id) === String(itemForm.inventoryId));
    if (!activeStay || !selectedItem) return;
    setItemSubmitting(true);
    setItemMessage("");
    setItemError("");
    try {
      const response = await fetch("/api/staff/guest-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: activeStay.hotelId,
          reservation_id: activeStay.bookingId,
          inventory_id: selectedItem.id,
          item_name: selectedItem.item_name,
          quantity: Number(itemForm.quantity),
          notes: itemForm.notes.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to send request.");
      setItemMessage("Request sent. Housekeeping will deliver it to your room.");
      setItemForm({ inventoryId: selectedItem.id, quantity: 1, notes: "" });
      setConfirmItemRequest(false);
      await fetchDashboard(true);
      setItemModalOpen(false);
    } catch (error) {
      setItemError(error.message || "Unable to send request.");
    } finally {
      setItemSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-950/5 flex items-center justify-center font-sans">
        <div className="rounded-2xl border border-emerald-900/10 bg-white px-10 py-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="mt-4 text-xs font-medium text-zinc-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-950/5 flex flex-col items-center justify-center p-6 text-center font-sans">
        <ShieldCheck size={48} className="text-emerald-700/60" />
        <h2 className="mt-5 text-2xl font-bold text-zinc-900">Access Denied</h2>
        <p className="mt-2 text-xs text-zinc-500">{loadError || "Invalid customer session."}</p>
        <button
          onClick={handleSessionReset}
          className="mt-6 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950/5 text-zinc-800 font-sans">
      {itemModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Room {bookingSummary.activeStay?.roomNumber || "request"}</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Order room items</h2>
              </div>
              <button type="button" onClick={closeItemModal} className="text-zinc-400 hover:text-zinc-800" aria-label="Close item request"><span className="text-2xl leading-none">&times;</span></button>
            </div>

            {itemLoading ? <p className="mt-8 text-center text-xs text-zinc-500">Loading available items...</p> : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setItemError("");
                  setConfirmItemRequest(true);
                }}
                className="mt-6 space-y-4"
              >
                <label className="block text-xs font-semibold text-zinc-700">
                  Item
                  <select
                    required
                    value={itemForm.inventoryId}
                    onChange={(event) => setItemForm((previous) => ({ ...previous, inventoryId: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">Select an item</option>
                    {inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.item_name} ({item.current_qty} available)</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-zinc-700">
                  Quantity
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={itemForm.quantity}
                    onChange={(event) => setItemForm((previous) => ({ ...previous, quantity: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>
                <label className="block text-xs font-semibold text-zinc-700">
                  Note (optional)
                  <textarea
                    rows="3"
                    value={itemForm.notes}
                    onChange={(event) => setItemForm((previous) => ({ ...previous, notes: event.target.value }))}
                    placeholder="e.g. Please deliver after 7 PM"
                    className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none focus:border-emerald-600"
                  />
                </label>
                {itemError ? <p className="text-xs text-rose-600">{itemError}</p> : null}
                {itemMessage ? <p className="text-xs text-emerald-700">{itemMessage}</p> : null}
                {!inventoryItems.length && !itemError ? <p className="text-xs text-zinc-500">No room items are currently available.</p> : null}
                {confirmItemRequest ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Are you sure?</p>
                    <p className="mt-1 text-xs text-amber-800">
                      Request {itemForm.quantity} {selectedItemForRequest?.item_name || "item"} for Room {bookingSummary.activeStay?.roomNumber || "your room"}?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmItemRequest(false)}
                        disabled={itemSubmitting}
                        className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={submitItemRequest}
                        disabled={itemSubmitting}
                        className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {itemSubmitting ? "Sending..." : "Yes, request it"}
                      </button>
                    </div>
                  </div>
                ) : null}
                <button type="submit" disabled={itemSubmitting || !inventoryItems.length || confirmItemRequest} className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {itemSubmitting ? "Sending request..." : "Request to my room"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 border-b border-zinc-200/80 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <Sparkles size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Customer Portal</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Welcome back, <span className="text-emerald-800">{user.firstName || "Guest"}</span>
            </h1>
            <p className="mt-2 text-xs text-zinc-500">Overview of your stay status, points, and account actions</p>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 transition-colors hover:text-emerald-950"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            Refresh data
          </button>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-700">
            {loadError}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Upcoming Stays</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{bookingSummary.upcomingCount}</p>
            <p className="mt-1 text-xs text-zinc-500">Scheduled for future dates</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Active Stays</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{bookingSummary.activeCount}</p>
            <p className="mt-1 text-xs text-zinc-500">Currently in-house</p>
            {bookingSummary.activeStay ? (
              <button
                type="button"
                onClick={openItemModal}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
              >
                <Package size={14} />
                Order room items
              </button>
            ) : null}
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Total Spend</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">{formatCurrency(bookingSummary.totalSpend)}</p>
            <p className="mt-1 text-xs text-zinc-500">Lifetime reservation value</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              {bookingSummary.activeStay ? "Current Stay" : "Next Stay"}
            </p>
            {bookingSummary.nextStay ? (
              <>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
                  {bookingSummary.nextStay.roomType}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">{bookingSummary.nextStay.hotelName || "Innova HMS"}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-950/5 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Check In</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                      <CalendarDays size={14} className="text-emerald-700" />
                      {formatBookingDate(bookingSummary.nextStay.checkInDate)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-950/5 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Total Charged</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                      <Wallet size={14} className="text-emerald-700" />
                      {formatCurrency(bookingSummary.nextStay.totalPrice)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Manage Stays
                  <ArrowRight size={14} />
                </button>
                {bookingSummary.activeStay ? (
                  <button
                    type="button"
                    onClick={openItemModal}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
                  >
                    <Package size={14} />
                    Order items for this stay
                  </button>
                ) : null}
                {bookingSummary.activeStay && user.guestRequests?.length ? (
                  <div className="mt-6 border-t border-zinc-100 pt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Room item requests</p>
                    <div className="mt-3 space-y-2">
                      {user.guestRequests.slice(0, 3).map((request) => {
                        const status = String(request.status || "RECEIVED").toUpperCase();
                        return (
                          <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-zinc-800">{request.itemName} x{request.quantity}</p>
                              <p className="text-[10px] text-zinc-400">Request #{request.id}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${requestStatusStyle[status] || requestStatusStyle.RECEIVED}`}>
                              {requestStatusLabel[status] || status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
                <h3 className="text-sm font-semibold text-zinc-800">No upcoming stay scheduled</h3>
                <p className="mt-1 text-xs text-zinc-500">Explore available suites and reserve your next visit.</p>
                <button
                  type="button"
                  onClick={() => navigate("/vision-suites?viewMode=room")}
                  className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Explore Suites
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800">
                  <Gift size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Booking Points</p>
                  <h3 className="mt-0.5 text-xl font-bold text-zinc-900">{Number(user.loyaltyPoints || 0).toLocaleString()}</h3>
                </div>
              </div>
              <p className="mt-4 text-xs text-zinc-500">Earned from your reservations and completed stays.</p>
            </div>

            <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Quick Actions</p>
              <div className="mt-4 grid gap-2">
                {bookingSummary.activeStay ? (
                  <button
                    type="button"
                    onClick={openItemModal}
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition-colors hover:bg-emerald-100"
                  >
                    <span className="flex items-center gap-2.5 text-xs font-semibold text-emerald-900">
                      <Package size={15} className="text-emerald-700" />
                      Order Room Items
                    </span>
                    <ArrowRight size={13} className="text-emerald-700" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition-colors hover:bg-emerald-50 hover:border-emerald-100"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-zinc-800">
                    <BedDouble size={15} className="text-emerald-700" />
                    Manage Stays
                  </span>
                  <ArrowRight size={13} className="text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/vision-suites?viewMode=room")}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition-colors hover:bg-emerald-50 hover:border-emerald-100"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-zinc-800">
                    <BedDouble size={15} className="text-emerald-700" />
                    Browse Available Rooms
                  </span>
                  <ArrowRight size={13} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
