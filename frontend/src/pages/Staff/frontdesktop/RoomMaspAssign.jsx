import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutGrid, Crown, RefreshCw, Loader2 } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const STATUS_STYLES = {
 available: { color: 'text-emerald-500', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', dot: 'bg-emerald-500' },
 occupied: { color: 'text-red-500', border: 'border-red-500/30', bg: 'bg-red-500/5', dot: 'bg-red-500' },
 cleaning: { color: 'text-orange-500', border: 'border-orange-500/30', bg: 'bg-orange-500/5', dot: 'bg-orange-500' },
 dirty: { color: 'text-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/5', dot: 'bg-amber-500' },
 reserved: { color: 'text-blue-500', border: 'border-blue-500/30', bg: 'bg-blue-500/5', dot: 'bg-blue-500' },
};
const getStyle = (s) => STATUS_STYLES[(s || '').toLowerCase()] || STATUS_STYLES.available;

export default function RoomMapAssign() {
 const { qs } = useStaffSession();
 const { isDarkMode } = useOutletContext();
 const [rooms, setRooms] = useState([]);
 const [counts, setCounts] = useState({});
 const [loading, setLoading] = useState(true);
 const [statusFilter, setStatusFilter] = useState('All');

 const fetchRooms = useCallback(async () => {
   try {
     const res = await fetch(`/api/staff/room-map${qs}`);
     const data = await res.json();
     if (res.ok) { setRooms(data.rooms || []); setCounts(data.counts || {}); }
   } catch { /* ignore */ }
   finally { setLoading(false); }
 }, [qs]);

 useEffect(() => {
   fetchRooms();
   const t = setInterval(() => { fetchRooms(); }, 30000);
   return () => clearInterval(t);
 }, [fetchRooms]);

 const filteredRooms = rooms.filter(r => {
   const matchStatus = statusFilter === 'All' || r.status?.toLowerCase() === statusFilter.toLowerCase();
   return matchStatus;
 });

 const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
 const text = isDarkMode ? 'text-white' : 'text-zinc-900';
 const sub = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

 return (
   <div className={`p-8 min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
       <div>
         <h1 className={`text-4xl font-black uppercase tracking-tighter ${text}`}>
           Room Map & <span className="text-[#2FA084]">Smart Assignment</span>
         </h1>
         <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 ${sub}`}>
           {rooms.length} rooms · {counts.available || 0} available
         </p>
       </div>
       <div className="flex items-center gap-3">
         <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
           className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}>
           {['All','Available','Occupied','Dirty','Cleaning','Reserved'].map(s => <option key={s} value={s}>{s}</option>)}
         </select>
         <button onClick={() => { fetchRooms(); }}
           className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-[#2FA084]' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'} transition-all`}>
           <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
         </button>
       </div>
     </div>

     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
       {/* ROOM MAP */}
       <div className={`lg:col-span-7 p-8 rounded-[2.5rem] border ${card}`}>
         <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
           <h2 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${text}`}>
             <LayoutGrid size={18} className="text-[#2FA084]" /> Live Room Map
           </h2>
           <div className="flex flex-wrap justify-center gap-3">
             {Object.entries(STATUS_STYLES).map(([s, st]) => (
               <div key={s} className="flex items-center gap-1.5">
                 <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                 <span className={`text-[8px] font-black uppercase tracking-tighter ${sub}`}>{s}</span>
               </div>
             ))}
           </div>
         </div>

         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
           {loading ? (
             <div className="col-span-full py-20 text-center">
               <Loader2 size={32} className="animate-spin text-[#2FA084] mx-auto" />
             </div>
           ) : filteredRooms.map(room => {
             const st = getStyle(room.status);
             const isVIP = ['suite','presidential','deluxe'].some(t => room.roomType?.toLowerCase().includes(t));
             return (
               <div key={room.id} className={`relative p-4 rounded-2xl border transition-all hover:scale-105 cursor-pointer group ${st.border} ${isDarkMode ? st.bg : 'bg-white'}`}>
                 {isVIP && <Crown size={11} className="absolute top-2 right-2 text-orange-400 group-hover:animate-bounce" />}
                 <p className={`text-xl font-black text-center mb-0.5 ${text}`}>{room.roomNumber}</p>
                 <p className={`text-[7px] font-bold text-center uppercase tracking-tighter mb-1.5 ${sub}`}>{room.roomType}</p>
                 <div className={`text-[7px] font-black text-center uppercase tracking-[0.15em] py-1 rounded-lg ${st.color} ${isDarkMode ? 'bg-white/5' : 'bg-zinc-100'}`}>
                   {room.status}
                 </div>
               </div>
             );
           })}
           {!loading && filteredRooms.length === 0 && (
             <div className={`col-span-full py-10 text-center text-[10px] font-bold uppercase tracking-widest ${sub}`}>No rooms match filter.</div>
           )}
         </div>
       </div>

       {/* RIGHT PANEL */}
       <div className="lg:col-span-5 flex flex-col gap-6">
         {/* ROOM COUNTS */}
         <div className={`p-6 rounded-[2.5rem] border ${card}`}>
           <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${sub}`}>Room Status Summary</h2>
           <div className="grid grid-cols-2 gap-3">
             {Object.entries(counts)
               .filter(([status]) => !['maintenance', 'inprogress', 'clean'].includes(status.toLowerCase()))
               .map(([status, count]) => {
                 const st = getStyle(status);
                 return (
                   <div key={status} className={`p-3 rounded-xl border ${st.border} ${isDarkMode ? st.bg : 'bg-white'} text-center`}>
                     <p className={`text-2xl font-black ${st.color}`}>{count}</p>
                     <p className={`text-[8px] font-black uppercase tracking-widest ${sub}`}>{status}</p>
                   </div>
                 );
               })}
           </div>
         </div>
       </div>
     </div>
   </div>
 );
}