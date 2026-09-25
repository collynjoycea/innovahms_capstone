import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Loader2, RefreshCw, X, Info } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const STATUS_COLORS = {
  CHECKED_IN: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  CONFIRMED: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  PENDING: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  CHECKED_OUT: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  CANCELLED: 'text-red-500 bg-red-500/10 border-red-500/20',
};

export default function GuestProfile() {
  const { qs } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGuests = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/guests${qs}`);
      const data = await res.json();
      if (res.ok) {
        setGuests(data.guests || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  const fetchHistory = useCallback(async (id) => {
    setHistLoading(true);
    try {
      const res = await fetch(`/api/staff/guests/${id}/history`);
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } catch { /* ignore */ }
    finally { setHistLoading(false); }
  }, []);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  const handleOpenInfo = (guest) => {
    setSelected(guest);
    setIsModalOpen(true);
    fetchHistory(guest.id);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setHistory([]);
  };

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    return !q || `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
  });

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin text-[#2FA084]" size={40} /></div>;

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Guest <span className="text-[#2FA084]">Profiles</span></h1>
          <p className={`text-[9px] font-bold uppercase tracking-[0.3em] mt-1 ${sub}`}>{guests.length} registered guests</p>
        </div>
        <button onClick={fetchGuests} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border mb-6 ${card}`}>
        <Search size={16} className={sub} />
        <input 
          type="text" 
          placeholder="Search guest name or email..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className={`bg-transparent outline-none text-xs font-bold flex-1 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} 
        />
      </div>

      {/* TABLE */}
      <div className={`rounded-3xl border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'border-zinc-800 text-zinc-500 bg-white/5' : 'border-zinc-200 text-zinc-400 bg-zinc-50'}`}>
                <th className="p-4">Guest Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Contact</th>
                <th className="p-4 text-center">Total Stays</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filtered.map(g => (
                <tr key={g.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-zinc-50'}`}>
                  <td className="p-4 font-bold">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2FA084]/10 text-[#2FA084] font-black flex items-center justify-center text-xs">
                        {g.firstName[0]}{g.lastName[0]}
                      </div>
                      <span className={text}>{g.firstName} {g.lastName}</span>
                    </div>
                  </td>
                  <td className={`p-4 font-bold ${sub}`}>{g.email || '—'}</td>
                  <td className={`p-4 font-bold ${sub}`}>{g.contact || '—'}</td>
                  <td className={`p-4 text-center font-bold ${text}`}>{g.totalStays}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleOpenInfo(g)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2FA084]/10 text-[#2FA084] border border-[#2FA084]/30 hover:bg-[#2FA084] hover:text-black font-black uppercase text-[10px] transition-all"
                    >
                      <Info size={12} /> Info
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className={`text-center py-10 font-bold uppercase tracking-widest ${sub}`}>No guests found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GUEST INFO MODAL */}
      {isModalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-[2.5rem] border p-8 relative shadow-2xl ${card}`}>
            {/* CLOSE BUTTON */}
            <button 
              onClick={handleCloseModal}
              className={`absolute top-6 right-6 p-2 rounded-xl border ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white' : 'border-zinc-200 text-zinc-400 hover:text-zinc-900'}`}
            >
              <X size={16} />
            </button>

            {/* HEADER */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#2FA084]/10 text-[#2FA084] font-black flex items-center justify-center text-xl">
                {selected.firstName[0]}{selected.lastName[0]}
              </div>
              <div>
                <h2 className={`text-xl font-black uppercase tracking-tighter ${text}`}>{selected.firstName} {selected.lastName}</h2>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>{selected.totalStays} total stays</p>
              </div>
            </div>

            {/* CONTACT DETAILS */}
            <div className={`mb-6 p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${sub}`}>Contact Information</p>
              <div className="space-y-1">
                <p className={`text-xs font-bold ${text}`}><span className={sub}>Email:</span> {selected.email || '—'}</p>
                <p className={`text-xs font-bold ${text}`}><span className={sub}>Contact:</span> {selected.contact || '—'}</p>
                <p className={`text-xs font-bold ${text}`}><span className={sub}>Last Stay:</span> {selected.lastStay || 'N/A'}</p>
              </div>
            </div>

            {/* STAY HISTORY */}
            <div>
              <h4 className={`text-[9px] font-black uppercase tracking-[0.3em] mb-3 ${sub}`}>Stay History</h4>
              {histLoading ? (
                <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-[#2FA084]" /></div>
              ) : history.length === 0 ? (
                <p className={`text-[10px] ${sub}`}>No stay history found.</p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {history.map(h => (
                    <div key={h.id} className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-[#2FA084]">{h.bookingNumber}</p>
                          <p className={`text-[10px] font-bold uppercase ${text}`}>{h.roomName} · Room {h.roomNumber}</p>
                          <p className={`text-[9px] ${sub}`}>{h.checkIn} → {h.checkOut} · {h.nights} night(s)</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[10px] font-black ${text}`}>₱{Number(h.amount).toLocaleString()}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase border ${STATUS_COLORS[h.status] || 'text-zinc-400 border-zinc-400/20'}`}>
                            {h.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}