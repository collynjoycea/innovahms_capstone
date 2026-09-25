import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, LogIn, CheckCircle2, AlertCircle, AlertTriangle, Clock, RefreshCw, Loader2, Filter, XCircle, CreditCard } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const TABS = ['ALL', 'TODAY', 'PAST'];

export default function CheckIn() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('TODAY');
  const [processing, setProcessing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [msg, setMsg] = useState({ id: null, text: '', type: '' });
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    try {
      const [resRes, overdueRes] = await Promise.all([
        fetch(`/api/staff/reservations${qs}`),
        fetch(`/api/staff/overdue-count${qs}`),
      ]);
      const data = await resRes.json();
      const od = await overdueRes.json();
      if (resRes.ok) { setReservations(data.reservations || []); setStats(data.stats || {}); }
      if (overdueRes.ok) setOverdueCount(od.overdueCount || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 20000); return () => clearInterval(t); }, [fetchData]);

  const handleAutoCancel = async () => {
    setCancelling(true); setCancelResult(null);
    try {
      const res = await fetch('/api/staff/auto-cancel-overdue', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setCancelResult(data); fetchData(); }
    } catch { /* ignore */ }
    finally { setCancelling(false); }
  };

  const handleCheckIn = async (r) => {
    if (r.paymentStatus !== 'FULLY_PAID') {
      setMsg({ id: r.id, text: 'Full payment is required before check-in.', type: 'error' });
      return;
    }
    if (r.isDoubleBooked) {
      setMsg({ id: r.id, text: 'Double booking detected — resolve conflict before check-in.', type: 'error' });
      return;
    }
    setProcessing(r.id);
    setMsg({ id: null, text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/check-in/${r.id}`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ id: r.id, text: `✓ ${r.guestName} checked in — ${data.bookingNumber}`, type: 'success' });
        fetchData();
      } else {
        setMsg({ id: r.id, text: data.error || 'Check-in failed.', type: 'error' });
      }
    } catch {
      setMsg({ id: r.id, text: 'Server error.', type: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  const openPaymentConfirmation = (r) => {
    setPaymentToConfirm(r);
    setPaymentAmount(String(Number(r.balance || 0)));
    setPaymentError('');
    setMsg({ id: null, text: '', type: '' });
  };

  const handleFullPayment = async () => {
    const r = paymentToConfirm;
    if (!r) return;
    const amountReceived = Number(paymentAmount);
    const balance = Number(r.balance || 0);
    if (!Number.isFinite(amountReceived) || amountReceived < balance) {
      setPaymentError(`Enter at least ₱${balance.toLocaleString()} to fully pay the balance.`);
      return;
    }
    setPaymentError('');
    setPaying(r.id);
    try {
      const res = await fetch(`/api/staff/reservations/${r.id}/pay-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: r.paymentMethod || 'cash', amountPaid: amountReceived }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ id: r.id, text: `✓ Payment confirmed — ₱${Number(data.amountPaid).toLocaleString()} paid.`, type: 'success' });
        setPaymentToConfirm(null);
        fetchData();
      } else {
        setMsg({ id: r.id, text: data.error || 'Payment failed.', type: 'error' });
      }
    } catch {
      setMsg({ id: r.id, text: 'Server error.', type: 'error' });
    } finally {
      setPaying(null);
    }
  };

  const display = reservations.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.guestName.toLowerCase().includes(q) || r.bookingNumber.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeTab === 'TODAY') return r.checkIn === today && ['PENDING', 'CONFIRMED'].includes(r.status);
    if (activeTab === 'PAST') return r.checkIn < today && ['PENDING', 'CONFIRMED'].includes(r.status);
    return ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(r.status);
  });

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`p-6 sm:p-8 min-h-screen ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#f8f9fa] text-zinc-900'}`}>

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none ${text}`}>
            Arrivals <span className="text-[#2FA084]">Guest</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <Search size={15} className={sub} />
            <input 
              type="text" 
              placeholder="Search guest or ref..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`bg-transparent outline-none text-xs font-bold w-52 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} 
            />
          </div>
          <button onClick={fetchData} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Arrivals Today', val: stats.arrivalsToday || 0, color: 'text-[#2FA084]' },
          { label: 'Checked In', val: stats.checkedIn || 0, color: 'text-blue-500' },
          { label: 'Pending', val: stats.pending || 0, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Double Booked', val: stats.doubleBooked || 0, color: 'text-rose-500' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-5 sm:p-6 flex items-center justify-between ${card}`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${sub}`}>{s.label}</p>
              <p className={`text-2xl sm:text-3xl font-black tracking-tighter ${s.color}`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* OVERDUE AUTO-CANCEL BANNER */}
      {overdueCount > 0 && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XCircle size={18} className="text-rose-500 shrink-0" />
            <div>
              <p className="text-rose-500 font-black text-sm uppercase tracking-widest">No-Show Alert</p>
              <p className="text-rose-400 text-[11px] mt-0.5">
                {overdueCount} reservation{overdueCount > 1 ? 's' : ''} past check-in date with no arrival recorded.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoCancel}
            disabled={cancelling}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shrink-0"
          >
            {cancelling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Auto-Cancel All
          </button>
        </div>
      )}

      {cancelResult && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-emerald-400 text-[11px] font-bold">
            {cancelResult.message}
            {cancelResult.cancelled?.length > 0 && ` — ${cancelResult.cancelled.map(c => c.bookingNumber).join(', ')}`}
          </p>
        </div>
      )}

      {/* TABS */}
      <div className={`flex p-1.5 rounded-2xl border w-fit mb-6 ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
        {TABS.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-[#2FA084] text-white shadow-md shadow-[#2FA084]/20' : `${sub} hover:text-[#2FA084]`
            }`}
          >
            {tab === 'TODAY' ? `Today (${stats.arrivalsToday || 0})` : tab}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-6 sm:px-8 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-[#2FA084]" />
            <h2 className={`text-sm font-black uppercase tracking-widest ${text}`}>{activeTab} Queue</h2>
          </div>
          <span className="text-xs font-black text-[#2FA084] bg-[#2FA084]/10 px-4 py-1.5 rounded-full border border-[#2FA084]/20">
            {display.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-zinc-800/50 text-zinc-500' : 'border-zinc-100 text-zinc-400'}`}>
                <th className="px-6 sm:px-8 py-2.5">Guest</th>
                <th className="px-6 sm:px-8 py-2.5">Room</th>
                <th className="px-6 sm:px-8 py-2.5">Check-In Date</th>
                <th className="px-6 sm:px-8 py-2.5">Arrival Time</th>
                <th className="px-6 sm:px-8 py-2.5">Nights / Amount</th>
                <th className="px-6 sm:px-8 py-2.5">Status</th>
                <th className="px-6 sm:px-8 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/30' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-[#2FA084] font-black text-xs uppercase tracking-widest animate-pulse">
                    Syncing with HMS Database...
                  </td>
                </tr>
              ) : display.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <AlertCircle size={36} className="mb-3 text-[#2FA084]" />
                      <p className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>No records in queue</p>
                    </div>
                  </td>
                </tr>
              ) : display.map(r => (
                <tr key={r.id} className={`group transition-all ${r.isDoubleBooked ? 'bg-rose-500/5' : ''} ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50/50'}`}>
                  <td className="px-6 sm:px-8 py-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className={`text-xs font-black uppercase leading-tight ${text}`}>{r.guestName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-black font-mono tracking-widest text-[#2FA084]">{r.bookingNumber}</span>
                          <span className={`text-[9px] font-bold uppercase ${sub}`}>• {r.paymentMethod}</span>
                        </div>
                      </div>
                      {r.isDoubleBooked && <AlertTriangle size={14} className="text-rose-500 shrink-0" title="Double booking!" />}
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-2">
                    <p className={`text-[11px] font-black leading-tight ${text}`}>Room {r.roomNumber}</p>
                    <p className={`text-[9px] font-bold uppercase ${sub}`}>{r.roomName}</p>
                  </td>
                  <td className="px-6 sm:px-8 py-2">
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${text}`}>
                      <Clock size={11} className="text-zinc-400" />{r.checkIn}
                    </div>
                    {r.isArrivalToday && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Today</span>}
                    {r.checkIn < today && <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Overdue</span>}
                  </td>
                  <td className="px-6 sm:px-8 py-2">
                    <div className={`flex items-center gap-1.5 font-black ${r.checkInTime ? 'text-[#2FA084] text-xs' : `text-[11px] ${sub}`}`}>
                      <Clock size={12} className="text-[#2FA084] shrink-0" />
                      {r.checkInTime || '—'}
                    </div>
                    {r.checkOutTime && (
                      <div className={`text-[9px] font-bold mt-0.5 ${sub}`}>out {r.checkOutTime}</div>
                    )}
                  </td>
                  <td className="px-6 sm:px-8 py-2">
                    <p className={`text-[11px] font-black leading-tight ${text}`}>₱{Number(r.amount).toLocaleString()}</p>
                    <p className={`text-[9px] font-bold ${sub}`}>{r.nights} night{r.nights !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-6 sm:px-8 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        r.status === 'CHECKED_IN' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        r.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}>{r.status}</span>

                      {r.status !== 'CHECKED_IN' && r.paymentStatus === 'DOWNPAYMENT' && (
                        <button 
                          onClick={() => openPaymentConfirmation(r)} 
                          disabled={paying === r.id}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#2FA084]/10 text-[#2FA084] border border-[#2FA084]/20 text-[9px] font-black uppercase tracking-widest hover:bg-[#2FA084]/20 disabled:opacity-50 transition-all"
                        >
                          {paying === r.id ? <Loader2 size={11} className="animate-spin" /> : <CreditCard size={11} />}
                          Pay Balance
                        </button>
                      )}
                      {r.paymentStatus === 'FULLY_PAID' && <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Fully Paid</span>}
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-2 text-right">
                    {r.status === 'CHECKED_IN' ? (
                      <div className="flex items-center justify-end gap-1.5 text-emerald-500 opacity-80">
                        <CheckCircle2 size={15} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5">
                        <button 
                          onClick={() => handleCheckIn(r)} 
                          disabled={processing === r.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2FA084] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-[#2FA084]/10"
                        >
                          {processing === r.id ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} strokeWidth={2.5} />}
                          Check In
                        </button>
                        {msg.id === r.id && (
                          <p className={`text-[9px] font-bold ${msg.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{msg.text}</p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM PAYMENT MODAL */}
      {paymentToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl border p-6 sm:p-7 shadow-2xl ${card}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2FA084]">Confirm Payment</p>
                <h2 className={`mt-1 text-xl font-black uppercase tracking-tight ${text}`}>Pay guest balance?</h2>
              </div>
              <button 
                onClick={() => setPaymentToConfirm(null)} 
                disabled={paying === paymentToConfirm.id}
                className={`rounded-xl p-2 transition-colors ${isDarkMode ? 'text-zinc-500 hover:bg-white/5 hover:text-white' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900'}`}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className={`mt-5 space-y-2.5 rounded-2xl border p-4 ${isDarkMode ? 'border-zinc-800 bg-black/20' : 'border-zinc-200 bg-zinc-50'}`}>
              <div className="flex items-center justify-between gap-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Guest</span>
                <span className={`text-right text-xs font-black uppercase ${text}`}>{paymentToConfirm.guestName}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Booking Ref</span>
                <span className="text-xs font-black font-mono text-[#2FA084]">{paymentToConfirm.bookingNumber}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Payment Date</span>
                <span className={`text-right text-xs font-black uppercase ${text}`}>{new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Downpayment</span>
                <span className={`text-xs font-black ${text}`}>₱{Number(paymentToConfirm.deposit).toLocaleString()}</span>
              </div>
              <div className={`mt-2 flex items-center justify-between border-t pt-3 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Amount to collect</span>
                <span className="text-xl font-black text-[#2FA084]">₱{Number(paymentToConfirm.balance).toLocaleString()}</span>
              </div>
              <div className={`flex items-center justify-between border-t pt-3 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Total</span>
                <span className={`text-base font-black ${text}`}>₱{Number(paymentToConfirm.amount).toLocaleString()}</span>
              </div>
              <div className="border-t border-dashed border-zinc-300 pt-3 dark:border-zinc-700">
                <label className={`text-[10px] font-black uppercase tracking-widest ${sub}`} htmlFor="payment-amount">
                  Cash received from guest
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-lg font-black ${text}`}>₱</span>
                  <input
                    id="payment-amount"
                    type="number"
                    min={Number(paymentToConfirm.balance || 0)}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => { setPaymentAmount(event.target.value); setPaymentError(''); }}
                    disabled={paying === paymentToConfirm.id}
                    className={`w-full rounded-xl border px-3 py-2 text-right text-lg font-black outline-none focus:border-[#2FA084] ${isDarkMode ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-900'}`}
                  />
                </div>
                {Number(paymentAmount) > Number(paymentToConfirm.balance || 0) && (
                  <p className="mt-2 text-right text-[10px] font-bold text-amber-500">
                    Change: ₱{(Number(paymentAmount) - Number(paymentToConfirm.balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                )}
                {paymentError && <p className="mt-2 text-[10px] font-bold text-rose-500">{paymentError}</p>}
              </div>
            </div>

            <p className={`mt-4 text-[10px] font-bold ${sub}`}>
              Confirm that the guest has paid the remaining balance. This will mark the reservation as fully paid.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setPaymentToConfirm(null)} 
                disabled={paying === paymentToConfirm.id}
                className={`rounded-xl border px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'border-zinc-700 text-zinc-400 hover:text-white' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900'}`}
              >
                Cancel
              </button>
              <button 
                onClick={handleFullPayment} 
                disabled={paying === paymentToConfirm.id}
                className="flex items-center gap-2 rounded-xl bg-[#2FA084] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:brightness-110 disabled:opacity-50 shadow-md shadow-[#2FA084]/20"
              >
                {paying === paymentToConfirm.id && <Loader2 size={13} className="animate-spin" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}