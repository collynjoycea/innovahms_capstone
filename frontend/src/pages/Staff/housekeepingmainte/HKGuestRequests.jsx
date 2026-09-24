import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import useStaffSession from '../../../hooks/useStaffSession';
import { Clock, MapPin, Package, CheckCircle2, Play, AlertTriangle, RefreshCw, BellRing, X } from 'lucide-react';

// Receives requests the front desk relayed (status RELAYED), then:
//   Accept        -> IN_PROGRESS
//   Mark Delivered -> DELIVERED   (server deducts the item from inventory)
//   Can't Fulfil  -> UNAVAILABLE  (front desk sees the reason)

const HKGuestRequests = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs, staffId } = useStaffSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [declineFor, setDeclineFor] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      const res = await axios.get(`/api/housekeeping/guest-requests${qs}`);
      setRequests(res.data.requests || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => {
    fetchRequests();
    const t = setInterval(fetchRequests, 15000);
    return () => clearInterval(t);
  }, [fetchRequests]);

  const updateStatus = async (r, status, hkNote = '') => {
    setActingId(r.id);
    setErrors(p => ({ ...p, [r.id]: '' }));
    try {
      await axios.patch(`/api/housekeeping/guest-requests/${r.id}/status${qs}`, { status, staff_id: staffId, hk_note: hkNote });
      setDeclineFor(null); setDeclineReason('');
      fetchRequests();
    } catch (e) {
      setErrors(p => ({ ...p, [r.id]: e.response?.data?.error || 'Update failed.' }));
    } finally { setActingId(null); }
  };

  const pending    = requests.filter(r => r.status === 'RELAYED');
  const inProgress = requests.filter(r => r.status === 'IN_PROGRESS');
  const delivered  = requests.filter(r => r.status === 'DELIVERED').slice(0, 5);

  const theme = {
    bg:       isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card:     isDarkMode ? 'bg-[#111111]/90 backdrop-blur-xl' : 'bg-white',
    input:    isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub:  isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border:   isDarkMode ? 'border-white/10' : 'border-gray-300',
  };

  const RequestCard = ({ r, done }) => {
    const short = r.inventoryId && r.stockLeft != null && r.stockLeft < r.quantity;
    return (
      <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} hover:border-[#6FCF97]/40 transition-all relative overflow-hidden`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className={`text-xl font-black uppercase tracking-tighter ${theme.textMain}`}>Room {r.roomNumber}</h4>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>{r.guestName}</p>
          </div>
          <div className={`px-2 py-1 rounded-md border text-[7px] font-black uppercase tracking-widest ${
            r.priority === 'URGENT' ? 'border-red-500/50 text-red-500 bg-red-500/5'
            : r.priority === 'HIGH' ? 'border-orange-500/50 text-orange-500 bg-orange-500/5'
            : 'border-[#6FCF97]/30 text-[#6FCF97] bg-[#6FCF97]/5'}`}>
            {r.priority}
          </div>
        </div>

        <div className={`p-3 rounded-xl border mb-4 ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-sm font-black flex items-center gap-2 ${theme.textMain}`}>
            <Package size={14} className="text-[#6FCF97]" /> {r.quantity} × {r.itemName}
          </p>
          {r.notes && <p className="text-[10px] font-bold italic text-[#6FCF97] mt-2 leading-relaxed">"{r.notes}"</p>}
          {r.inventoryId && r.stockLeft != null && !done && (
            <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${short ? 'text-red-500' : theme.textSub}`}>
              {short && <AlertTriangle size={10} className="inline mr-1 mb-0.5" />}
              Stock: {r.stockLeft} left
            </p>
          )}
        </div>

        <div className={`flex gap-4 mb-4 text-[10px] font-bold uppercase ${theme.textSub}`}>
          <span className="flex items-center gap-1.5"><Clock size={12} className="text-[#6FCF97]" /> {r.relayedAt ? new Date(r.relayedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          <span className="flex items-center gap-1.5"><MapPin size={12} className="text-[#6FCF97]" /> Front Desk</span>
        </div>

        {!done && r.status === 'RELAYED' && (
          <div className="flex gap-2">
            <button onClick={() => updateStatus(r, 'IN_PROGRESS')} disabled={actingId === r.id}
              className="flex-[2.5] bg-[#6FCF97] text-black text-[9px] font-black py-3 rounded-xl uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50">
              <Play size={14} strokeWidth={3} /> Accept
            </button>
            <button onClick={() => { setDeclineFor(r); setDeclineReason(short ? 'Not enough stock' : ''); }} title="Can't fulfil"
              className={`flex-1 p-3 rounded-xl border ${theme.border} flex items-center justify-center text-[#6FCF97] hover:bg-[#6FCF97]/5 transition-all`}>
              <AlertTriangle size={14} />
            </button>
          </div>
        )}

        {!done && r.status === 'IN_PROGRESS' && (
          <div className="flex gap-2">
            <button onClick={() => updateStatus(r, 'DELIVERED')} disabled={actingId === r.id}
              className="flex-[2.5] bg-[#6FCF97] text-black text-[9px] font-black py-3 rounded-xl uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50">
              <CheckCircle2 size={14} strokeWidth={3} /> Mark Delivered
            </button>
            <button onClick={() => { setDeclineFor(r); setDeclineReason(short ? 'Not enough stock' : ''); }} title="Can't fulfil"
              className={`flex-1 p-3 rounded-xl border ${theme.border} flex items-center justify-center text-[#6FCF97] hover:bg-[#6FCF97]/5 transition-all`}>
              <AlertTriangle size={14} />
            </button>
          </div>
        )}

        {errors[r.id] && <p className="mt-3 text-[10px] font-bold text-rose-500">{errors[r.id]}</p>}
      </div>
    );
  };

  const Column = ({ title, items, border, done, emptyText }) => (
    <div className={`space-y-6 ${done ? 'opacity-40 hover:opacity-100 transition-opacity' : ''}`}>
      <div className={`flex items-center justify-between border-l-2 ${border} pl-4`}>
        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>{title}</h3>
        <span className="text-[10px] font-black text-[#6FCF97] bg-[#6FCF97]/10 px-2 py-0.5 rounded">{String(items.length).padStart(2, '0')}</span>
      </div>
      <div className="space-y-5">
        {items.length === 0
          ? <p className={`text-[11px] ${theme.textSub} text-center py-8`}>{emptyText}</p>
          : items.map(r => <RequestCard key={r.id} r={r} done={done} />)}
      </div>
    </div>
  );

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg} font-sans`}>

      {/* DECLINE MODAL */}
      {declineFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className={`${theme.card} border ${theme.border} w-full max-w-md rounded-2xl overflow-hidden shadow-2xl`}>
            <div className={`px-6 py-4 border-b ${theme.border} flex justify-between items-center bg-white/5`}>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#6FCF97]">Can't Fulfil Request</h2>
              <button onClick={() => setDeclineFor(null)} className={`${theme.textSub} hover:text-white transition-colors`}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-left">
              <p className={`text-[11px] font-bold ${theme.textSub}`}>
                Room {declineFor.roomNumber} · {declineFor.quantity} × {declineFor.itemName}. The front desk will see your reason.
              </p>
              <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="e.g. Out of stock, restock arriving tomorrow"
                className={`w-full p-3 rounded-xl border ${theme.input} h-24 text-xs font-medium outline-none resize-none`} />
              <div className="flex gap-3">
                <button onClick={() => setDeclineFor(null)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border ${theme.border} ${theme.textMain}`}>Back</button>
                <button onClick={() => updateStatus(declineFor, 'UNAVAILABLE', declineReason.trim())} disabled={!declineReason.trim() || actingId === declineFor.id}
                  className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#6FCF97] text-black disabled:opacity-50">Send to Front Desk</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-10`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Guest <span className="text-[#6FCF97]">Requests</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>
            Relayed by the front desk · stock is deducted on delivery
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {pending.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#6FCF97]/30 bg-[#6FCF97]/10 text-[#6FCF97] text-[10px] font-black uppercase tracking-widest">
              <BellRing size={14} /> {pending.length} new
            </div>
          )}
          <button onClick={fetchRequests} className={`p-3 rounded-xl border ${theme.border} ${theme.textMain} hover:border-[#6FCF97]/50 transition-all`}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Column title="New Requests" items={pending} border="border-orange-500" emptyText="No new guest requests" />
        <Column title="In Progress" items={inProgress} border="border-[#6FCF97]" emptyText="Nothing in progress" />
        <Column title="Delivered" items={delivered} border="border-emerald-500" done emptyText="No deliveries yet" />
      </div>
    </div>
  );
};

export default HKGuestRequests;
