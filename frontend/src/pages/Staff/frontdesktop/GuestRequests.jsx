import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Plus, RefreshCw, Send, X, Loader2, Package, AlertTriangle, CheckCircle2, Clock, Ban } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';


const STATUS_STYLES = {
  RECEIVED:    'bg-amber-500/10 text-amber-500 border-amber-500/20',
  RELAYED:     'bg-blue-500/10 text-blue-500 border-blue-500/20',
  IN_PROGRESS: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  DELIVERED:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  UNAVAILABLE: 'bg-red-500/10 text-red-500 border-red-500/20',
  CANCELLED:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_LABEL = {
  RECEIVED: 'Received', RELAYED: 'Sent to HK', IN_PROGRESS: 'In Progress',
  DELIVERED: 'Delivered', UNAVAILABLE: 'Unavailable', CANCELLED: 'Cancelled',
};

const PRIORITY_STYLES = {
  URGENT: 'text-red-500',
  HIGH:   'text-orange-500',
  NORMAL: 'text-zinc-400',
};

const FILTERS = ['ALL', 'RECEIVED', 'RELAYED', 'IN_PROGRESS', 'DELIVERED', 'UNAVAILABLE'];

const EMPTY_FORM = { guestId: '', inventoryId: '', customItem: '', quantity: 1, priority: 'NORMAL', notes: '' };

const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function GuestRequests() {
  const { qs, hotelId, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };

  const [requests, setRequests] = useState([]);
  const [guests, setGuests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [actingId, setActingId] = useState(null);
  const [rowMsg, setRowMsg] = useState({});

  const fetchRequests = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/staff/guest-requests${qs}`);
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [qs]);

  useEffect(() => {
    fetchRequests();
    const t = setInterval(() => fetchRequests(true), 20000);
    return () => clearInterval(t);
  }, [fetchRequests]);

  // Load in-house guests + live inventory whenever the form opens, so stock is always fresh
  const openModal = async () => {
    setForm(EMPTY_FORM); setFormMsg(''); setModalOpen(true);
    try {
      const [gRes, iRes] = await Promise.all([
        fetch(`/api/staff/checkout-queue${qs}`),
        fetch(`/api/staff/inventory-options${qs}`),
      ]);
      const g = await gRes.json();
      const i = await iRes.json();
      if (gRes.ok) setGuests(g.guests || []);
      if (iRes.ok) setInventory(i.inventory || []);
    } catch { setFormMsg('Could not load guests or inventory.'); }
  };

  const selectedGuest = guests.find(g => String(g.id) === form.guestId);
  const selectedItem = inventory.find(i => String(i.id) === form.inventoryId);
  const isLow = (i) => i.current_qty < i.max_qty * 0.4;

  const inventoryByCategory = useMemo(() => {
    const groups = {};
    inventory.forEach(i => { (groups[i.category || 'Other'] = groups[i.category || 'Other'] || []).push(i); });
    return groups;
  }, [inventory]);

  const submit = async (relayNow) => {
    const qty = Number(form.quantity);
    if (!selectedGuest) return setFormMsg('Select a guest.');
    if (!selectedItem && !form.customItem.trim()) return setFormMsg('Pick an item from inventory or type a custom request.');
    if (!qty || qty < 1) return setFormMsg('Quantity must be at least 1.');
    if (selectedItem && qty > selectedItem.current_qty) return setFormMsg(`Only ${selectedItem.current_qty} ${selectedItem.unit || ''} left in stock.`);

    setSubmitting(true); setFormMsg('');
    try {
      const res = await fetch('/api/staff/guest-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: hotelId,
          reservation_id: selectedGuest.id,
          guest_name: selectedGuest.guestName,
          room_number: selectedGuest.roomNumber,
          inventory_id: selectedItem ? selectedItem.id : null,
          item_name: selectedItem ? selectedItem.item_name : form.customItem.trim(),
          quantity: qty,
          priority: form.priority,
          notes: form.notes.trim(),
          requested_by: staffId,
          relay: relayNow,
        }),
      });
      const data = await res.json();
      if (res.ok) { setModalOpen(false); fetchRequests(); }
      else setFormMsg(data.error || 'Failed to save request.');
    } catch { setFormMsg('Server error.'); }
    finally { setSubmitting(false); }
  };

  const act = async (r, action) => {
    setActingId(r.id); setRowMsg(p => ({ ...p, [r.id]: '' }));
    try {
      const res = await fetch(`/api/staff/guest-requests/${r.id}/${action}${qs}`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) fetchRequests();
      else setRowMsg(p => ({ ...p, [r.id]: data.error || 'Failed.' }));
    } catch { setRowMsg(p => ({ ...p, [r.id]: 'Server error.' })); }
    finally { setActingId(null); }
  };

  const counts = useMemo(() => {
    const c = { ALL: requests.length };
    FILTERS.slice(1).forEach(s => { c[s] = requests.filter(r => r.status === s).length; });
    return c;
  }, [requests]);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.guestName.toLowerCase().includes(q) || r.itemName.toLowerCase().includes(q) || String(r.roomNumber).toLowerCase().includes(q);
    return matchSearch && (filter === 'ALL' || r.status === filter);
  });

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
  const inp = isDarkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900';

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#f8f9fa] text-zinc-900'}`}>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-4xl font-black uppercase tracking-tighter ${text}`}>
            Guest <span className="text-[#2FA084]">Requests</span>
          </h1>
          
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <Search size={15} className={sub} />
            <input type="text" placeholder="Search guest, room, item..." value={search} onChange={e => setSearch(e.target.value)}
              className={`bg-transparent outline-none text-xs font-bold w-52 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
          </div>
          <button onClick={() => fetchRequests(true)} className={`p-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'}`}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={openModal} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#2FA084] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#2FA084]/20">
            <Plus size={14} strokeWidth={3} /> New Request
          </button>
        </div>
      </div>

      {/* STATUS FILTER CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-2xl border p-4 text-center transition-all hover:scale-[1.03] active:scale-95 ${card} ${filter === f ? 'ring-2 ring-[#2FA084]' : 'hover:border-[#2FA084]/40'}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${sub}`}>{f === 'ALL' ? 'All' : STATUS_LABEL[f]}</p>
            <p className={`text-2xl font-black ${f === 'ALL' ? text : STATUS_STYLES[f].split(' ')[1]}`}>{counts[f] || 0}</p>
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className={`rounded-[2rem] border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                <th className="px-6 py-5">Guest / Room</th>
                <th className="px-6 py-5">Item</th>
                <th className="px-6 py-5">Priority</th>
                <th className="px-6 py-5">Logged</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/30' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="6" className="p-16 text-center text-[#2FA084] font-black text-xs uppercase tracking-widest animate-pulse">Fetching requests...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className={`p-16 text-center text-[10px] font-bold uppercase tracking-widest ${sub}`}>
                  {requests.length === 0 ? 'No guest requests yet. Use New Request when a guest asks for something.' : 'No requests match your filters.'}
                </td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50/60'}`}>
                  <td className="px-6 py-5">
                    <p className={`text-[12px] font-black uppercase tracking-tight ${text}`}>{r.guestName}</p>
                    <p className="text-[10px] font-black text-[#2FA084]">Room {r.roomNumber}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className={`text-[11px] font-black ${text}`}>{r.quantity} × {r.itemName}</p>
                    {r.notes && <p className={`text-[9px] italic mt-0.5 max-w-[220px] truncate ${sub}`}>"{r.notes}"</p>}
                    {r.status === 'UNAVAILABLE' && r.hkNote && (
                      <p className="text-[9px] font-bold text-red-400 mt-0.5 flex items-center gap-1"><AlertTriangle size={10} /> HK: {r.hkNote}</p>
                    )}
                  </td>
                  <td className={`px-6 py-5 text-[10px] font-black uppercase ${PRIORITY_STYLES[r.priority] || sub}`}>{r.priority}</td>
                  <td className={`px-6 py-5 text-[11px] font-bold ${sub}`}>{fmtTime(r.createdAt)}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${STATUS_STYLES[r.status] || STATUS_STYLES.RECEIVED}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-2">
                        {r.status === 'RECEIVED' && (
                          <button onClick={() => act(r, 'relay')} disabled={actingId === r.id}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2FA084] text-black text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                            {actingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={3} />} Relay to HK
                          </button>
                        )}
                        {['RECEIVED', 'RELAYED', 'UNAVAILABLE'].includes(r.status) && (
                          <button onClick={() => act(r, 'cancel')} disabled={actingId === r.id} title="Cancel request"
                            className={`p-2 rounded-xl border transition-all disabled:opacity-50 ${isDarkMode ? 'border-zinc-800 text-zinc-500 hover:text-rose-500 hover:border-rose-500/30' : 'border-zinc-200 text-zinc-400 hover:text-rose-500'}`}>
                            <Ban size={14} />
                          </button>
                        )}
                        {r.status === 'DELIVERED' && <CheckCircle2 size={18} className="text-emerald-500" />}
                      </div>
                      {rowMsg[r.id] && <p className="text-[9px] font-bold text-rose-500">{rowMsg[r.id]}</p>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW REQUEST MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="p-7 border-b border-zinc-800/30 flex justify-between items-center bg-gradient-to-r from-[#2FA084]/10 to-transparent">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-[#2FA084]">New Guest Request</h2>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${sub}`}>Pick the guest, then the item from inventory</p>
              </div>
              <button onClick={() => setModalOpen(false)} className={`${sub} hover:text-red-500 transition-all`}><X size={22} strokeWidth={3} /></button>
            </div>

            <div className="p-7 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>Guest (in-house)</label>
                <select value={form.guestId} onChange={e => setForm(p => ({ ...p, guestId: e.target.value }))}
                  className={`w-full p-3 rounded-xl border outline-none text-xs font-bold ${inp}`}>
                  <option value="">Select guest...</option>
                  {guests.map(g => <option key={g.id} value={g.id}>Room {g.roomNumber} — {g.guestName}</option>)}
                </select>
              </div>

              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>Item from inventory</label>
                <select value={form.inventoryId} onChange={e => setForm(p => ({ ...p, inventoryId: e.target.value, customItem: '' }))}
                  className={`w-full p-3 rounded-xl border outline-none text-xs font-bold ${inp}`}>
                  <option value="">— none / custom request —</option>
                  {Object.entries(inventoryByCategory).map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>
                      {items.map(i => (
                        <option key={i.id} value={i.id} disabled={i.current_qty <= 0}>
                          {i.item_name} ({i.current_qty <= 0 ? 'out of stock' : `${i.current_qty} ${i.unit || ''} left`})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedItem && (
                  <p className={`mt-2 text-[10px] font-bold flex items-center gap-1.5 ${isLow(selectedItem) ? 'text-red-500' : 'text-emerald-500'}`}>
                    <Package size={12} /> {selectedItem.current_qty}/{selectedItem.max_qty} {selectedItem.unit} in stock{isLow(selectedItem) ? ' — low stock' : ''}
                  </p>
                )}
              </div>

              {!selectedItem && (
                <div>
                  <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>Custom request (not in inventory)</label>
                  <input type="text" placeholder="e.g. Baby crib, iron and board" value={form.customItem}
                    onChange={e => setForm(p => ({ ...p, customItem: e.target.value }))}
                    className={`w-full p-3 rounded-xl border outline-none text-xs font-bold ${inp}`} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>Quantity</label>
                  <input type="number" min="1" max={selectedItem?.current_qty || undefined} value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    className={`w-full p-3 rounded-xl border outline-none text-xs font-bold ${inp}`} />
                </div>
                <div>
                  <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className={`w-full p-3 rounded-xl border outline-none text-xs font-bold ${inp}`}>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>Notes for housekeeping</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Anything HK should know..." className={`w-full p-3 rounded-xl border outline-none text-xs font-medium h-20 resize-none ${inp}`} />
              </div>

              {formMsg && <p className="text-[11px] font-bold text-center text-rose-500">{formMsg}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => submit(false)} disabled={submitting}
                  className={`flex-1 py-3.5 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 ${isDarkMode ? 'border-zinc-800 text-zinc-300 hover:border-white' : 'border-zinc-300 text-zinc-600 hover:border-zinc-900'}`}>
                  Save Only
                </button>
                <button onClick={() => submit(true)} disabled={submitting}
                  className="flex-[1.4] py-3.5 rounded-2xl bg-[#2FA084] text-black font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#2FA084]/20">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={3} />} Save & Relay to HK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
