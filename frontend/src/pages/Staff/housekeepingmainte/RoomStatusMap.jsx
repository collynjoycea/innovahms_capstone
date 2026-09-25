import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import useStaffSession from '../../../hooks/useStaffSession';
import { Search, Filter, CheckCircle2, Clock, RefreshCw, Loader2, Camera, X, ArrowRight } from 'lucide-react';

const STATUS_COLORS = {
  Available:   { border: 'border-emerald-500/50', text: 'text-emerald-500', bg: 'bg-emerald-500/5',  dot: 'bg-emerald-500',  label: 'Available' },
  Occupied:    { border: 'border-red-500/50',     text: 'text-red-500',     bg: 'bg-red-500/5',      dot: 'bg-red-500',      label: 'Occupied' },
  Dirty:       { border: 'border-amber-500/50',   text: 'text-amber-500',   bg: 'bg-amber-500/5',    dot: 'bg-amber-500',    label: 'Dirty' },
  Clean:       { border: 'border-emerald-400/50', text: 'text-emerald-400', bg: 'bg-emerald-400/5',  dot: 'bg-emerald-400',  label: 'Clean ✓' },
  InProgress:  { border: 'border-cyan-500/50',    text: 'text-cyan-500',    bg: 'bg-cyan-500/5',     dot: 'bg-cyan-500',     label: 'In Prog' },
  Maintenance: { border: 'border-purple-500/50',  text: 'text-purple-500',  bg: 'bg-purple-500/5',   dot: 'bg-purple-500',   label: 'Maint.' },
  Cleaning:    { border: 'border-orange-500/50',  text: 'text-orange-500',  bg: 'bg-orange-500/5',   dot: 'bg-orange-500',   label: 'Cleaning' },
};

// Cleaning flow first: Dirty -> InProgress -> Clean -> Available (then Occupied / Maintenance)
const STATUS_CYCLE = ['Dirty', 'InProgress', 'Clean', 'Available', 'Occupied', 'Maintenance'];
const getStyle = (s) => STATUS_COLORS[s] || { border: 'border-zinc-700', text: 'text-zinc-400', bg: '', dot: 'bg-zinc-500', label: s || '—' };
const nextStatus = (current) => STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];

export default function RoomStatusMap() {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs, hotelId, staffId } = useStaffSession();
  const [rooms, setRooms] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState('');

  // Capture-before-status-change modal
  const [captureRoom, setCaptureRoom] = useState(null); // room object currently pending a photo
  const [capturePhoto, setCapturePhoto] = useState(null);
  const [capturePreview, setCapturePreview] = useState(null);
  const [captureError, setCaptureError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef(null);

  const fetchRooms = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`/api/housekeeping/room-status${qs}`);
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
        setCounts(data.counts || {});
        setLastSync(new Date());
      } else {
        setError(data.error || 'Failed to load rooms.');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    fetchRooms();
    const t = setInterval(fetchRooms, 30000);
    return () => clearInterval(t);
  }, [fetchRooms]);

  // Revoke the object URL when it's replaced or the component unmounts, to avoid leaking memory.
  useEffect(() => () => { if (capturePreview) URL.revokeObjectURL(capturePreview); }, [capturePreview]);

  const openCaptureModal = (room) => {
    setCaptureError('');
    setCaptureRoom(room);
  };

  const closeCaptureModal = () => {
    if (capturePreview) URL.revokeObjectURL(capturePreview);
    setCaptureRoom(null);
    setCapturePhoto(null);
    setCapturePreview(null);
    setCaptureError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (capturePreview) URL.revokeObjectURL(capturePreview);
    setCapturePhoto(file);
    setCapturePreview(URL.createObjectURL(file));
    setCaptureError('');
  };

  const clearPhoto = () => {
    if (capturePreview) URL.revokeObjectURL(capturePreview);
    setCapturePhoto(null);
    setCapturePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmStatusChange = async () => {
    if (!captureRoom) return;
    if (!capturePhoto) {
      setCaptureError('Capture a photo of the room before you can update its status.');
      return;
    }
    const room = captureRoom;
    const next = nextStatus(room.status);
    setConfirming(true);
    setCaptureError('');
    try {
      const fd = new FormData();
      fd.append('status', next);
      fd.append('require_photo', 'true');
      if (hotelId) fd.append('hotel_id', hotelId);
      if (staffId) fd.append('staff_id', staffId);
      fd.append('photo', capturePhoto);

      const res = await fetch(`/api/housekeeping/room-status/${room.room_label}`, {
        method: 'PATCH',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: next } : r));
        setCounts(prev => {
          const n = { ...prev };
          n[room.status] = Math.max(0, (n[room.status] || 1) - 1);
          n[next] = (n[next] || 0) + 1;
          return n;
        });
        closeCaptureModal();
      } else {
        setCaptureError(data.error || 'Unable to update room status.');
      }
    } catch {
      setCaptureError('Cannot connect to server.');
    } finally {
      setConfirming(false);
    }
  };

  const filtered = rooms.filter(r => {
    const matchSearch = !search || r.room_label?.toLowerCase().includes(search.toLowerCase()) || r.room_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const theme = {
    bg:       isDarkMode ? 'bg-[#0c0c0e]'      : 'bg-[#f0f0f3]',
    card:     isDarkMode ? 'bg-[#111]/90'       : 'bg-white',
    border:   isDarkMode ? 'border-white/10'    : 'border-gray-200',
    textMain: isDarkMode ? 'text-white'         : 'text-gray-900',
    textSub:  isDarkMode ? 'text-gray-500'      : 'text-gray-400',
    input:    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400',
  };

  const currentStyle = captureRoom ? getStyle(captureRoom.status) : null;
  const nextStyle = captureRoom ? getStyle(nextStatus(captureRoom.status)) : null;

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>

      {/* CAPTURE-BEFORE-CHANGE MODAL */}
      {captureRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className={`${theme.card} border ${theme.border} w-full max-w-md rounded-2xl overflow-hidden shadow-2xl`}>
            <div className={`px-6 py-4 border-b ${theme.border} flex justify-between items-center bg-white/5`}>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#6FCF97]">Verify Room {captureRoom.room_label}</h2>
              <button onClick={closeCaptureModal} className={`${theme.textSub} hover:text-white transition-colors`}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5 text-left">
              <div className="flex items-center justify-center gap-3">
                <span className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${currentStyle.border} ${currentStyle.text} ${currentStyle.bg}`}>
                  {currentStyle.label}
                </span>
                <ArrowRight size={16} className={theme.textSub} />
                <span className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${nextStyle.border} ${nextStyle.text} ${nextStyle.bg}`}>
                  {nextStyle.label}
                </span>
              </div>
              <p className={`text-[11px] font-bold text-center ${theme.textSub}`}>
                Capture a photo of the room to confirm its condition before the status changes.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {capturePreview ? (
                <div className={`relative rounded-2xl border ${theme.border} overflow-hidden`}>
                  <img src={capturePreview} alt={`Room ${captureRoom.room_label}`} className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-red-500 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-8 rounded-2xl border-2 border-dashed ${theme.border} text-[#6FCF97] flex flex-col items-center justify-center gap-3 hover:bg-[#6FCF97]/5 transition-all`}
                >
                  <Camera size={28} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Capture Photo</span>
                </button>
              )}

              {captureError && <p className="text-[10px] font-bold text-red-500 text-center">{captureError}</p>}

              <div className="flex gap-3">
                <button onClick={closeCaptureModal} disabled={confirming} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border ${theme.border} ${theme.textMain} disabled:opacity-50`}>Cancel</button>
                <button
                  onClick={confirmStatusChange}
                  disabled={!capturePhoto || confirming}
                  className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#6FCF97] text-black disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirming ? <Loader2 size={14} className="animate-spin" /> : null}
                  {confirming ? 'Saving...' : 'Confirm & Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-8`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Room Status <span className="text-[#6FCF97]">Map</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>
            Live Room Status · Click a room to cycle status
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${theme.input}`}>
            <Search size={14} className="text-[#6FCF97] shrink-0" />
            <input type="text" placeholder="Search room..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest w-28" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer ${theme.input}`}>
            <option value="All">All Status</option>
            {STATUS_CYCLE.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={fetchRooms}
            className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'}`}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* LEGEND */}
      <div className={`${theme.card} border ${theme.border} p-4 rounded-2xl mb-6 flex flex-wrap gap-4 items-center`}>
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
              {key} <span className="text-[#6FCF97]">({counts[key] || 0})</span>
            </span>
          </div>
        ))}
        <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
          {filtered.length} / {rooms.length} rooms
        </span>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-400 text-[11px] font-bold">
          {error}
        </div>
      )}

      {/* ROOM GRID */}
      <div className={`${theme.card} border ${theme.border} p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)]`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-[#6FCF97]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className={`text-center py-16 text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
            {rooms.length === 0 ? 'No rooms found. Add rooms via the Owner panel.' : 'No rooms match your filter.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filtered.map((room) => {
              const sc = getStyle(room.status);
              return (
                <button
                  key={room.id}
                  onClick={() => openCaptureModal(room)}
                  className={`relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 active:scale-95 group ${sc.border} ${sc.bg}`}
                >
                  <div className="text-center space-y-1">
                    <h4 className={`text-xl font-black uppercase tracking-tighter ${theme.textMain} group-hover:text-[#6FCF97] transition-colors`}>
                      {room.room_label}
                    </h4>
                    <p className={`text-[8px] font-black uppercase tracking-[0.15em] ${theme.textSub}`}>
                      {room.room_type}
                    </p>
                  </div>
                  <div className={`mt-3 py-1 rounded-lg border ${sc.border}`}>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity border-[#6FCF97]" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-[#6FCF97] text-black shrink-0">
            <Clock size={18} strokeWidth={3} />
          </div>
          <div className="text-left">
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Last Sync</p>
            <p className={`text-[11px] font-bold ${theme.textMain}`}>
              {lastSync ? lastSync.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Not synced'}
            </p>
          </div>
        </div>
        <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-emerald-500 text-black shrink-0">
            <CheckCircle2 size={18} strokeWidth={3} />
          </div>
          <div className="text-left">
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Available</p>
            <p className={`text-[11px] font-bold text-emerald-500`}>{counts['Available'] || 0} rooms ready</p>
          </div>
        </div>
        <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-red-500 text-white shrink-0">
            <RefreshCw size={18} strokeWidth={3} />
          </div>
          <div className="text-left">
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Needs Attention</p>
            <p className={`text-[11px] font-bold text-red-400`}>
              {(counts['Dirty'] || 0) + (counts['Maintenance'] || 0)} rooms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
