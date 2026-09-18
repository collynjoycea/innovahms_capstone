import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Clock, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import useStaffSession from '../hooks/useStaffSession';

/**
 * ShiftClockWidget — shows live clock status + Time In / Time Out buttons.
 * Drop this into any staff header.
 */
export default function ShiftClockWidget({ isDarkMode }) {
  const { staffId } = useStaffSession();
  const [shift, setShift] = useState(null);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [now, setNow] = useState(new Date());
  const [showConfirm, setShowConfirm] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchShift = useCallback(async () => {
    if (!staffId) return;
    try {
      const res = await fetch(`/api/staff/shift-status/${staffId}`);
      const d = await res.json();
      if (res.ok) setShift(d);
    } catch { /* ignore */ }
  }, [staffId]);

  useEffect(() => {
    fetchShift();
    const t = setInterval(fetchShift, 30000);
    return () => clearInterval(t);
  }, [fetchShift]);

  // Geofencing — Time In / Time Out require the device's current GPS
  // coordinates, which the backend checks against the hotel's location.
  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device/browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const handleTimeIn = async () => {
    setActing(true); setMsg('');
    try {
      let coords;
      try {
        coords = await getLocation();
      } catch {
        setMsg('Location access is required to time in.'); setMsgType('error');
        return;
      }
      const res = await fetch('/api/staff/time-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, ...coords }),
      });
      const d = await res.json();
      if (res.ok) { setMsg(`In ${d.clockIn}`); setMsgType('success'); fetchShift(); }
      else {
        const detail = d.distanceMeters != null ? ` (${d.distanceMeters}m away, limit ${d.allowedRadiusMeters}m)` : '';
        setMsg((d.error || 'Failed') + detail); setMsgType('error');
      }
    } catch { setMsg('Error'); setMsgType('error'); }
    finally { setActing(false); setTimeout(() => setMsg(''), 5000); }
  };

  // Time Out button no longer fires the request directly — it opens a
  // centered confirmation modal first, so an accidental click can't clock
  // someone out early.
  const openTimeOutConfirm = () => setShowConfirm(true);

  const confirmTimeOut = async () => {
    setShowConfirm(false);
    setActing(true); setMsg('');
    try {
      let coords;
      try {
        coords = await getLocation();
      } catch {
        setMsg('Location access is required to time out.'); setMsgType('error');
        return;
      }
      const res = await fetch('/api/staff/time-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, ...coords }),
      });
      const d = await res.json();
      if (res.ok) { setMsg(`Out ${d.clockOut} · ${d.hoursWorked}h`); setMsgType('success'); fetchShift(); }
      else {
        const detail = d.distanceMeters != null ? ` (${d.distanceMeters}m away, limit ${d.allowedRadiusMeters}m)` : '';
        setMsg((d.error || 'Failed') + detail); setMsgType('error');
      }
    } catch { setMsg('Error'); setMsgType('error'); }
    finally { setActing(false); setTimeout(() => setMsg(''), 5000); }
  };

  const isIn   = shift?.clockIn && !shift?.clockOut;
  const isDone = shift?.clockIn && shift?.clockOut;

  // Elapsed time while on shift
  const elapsed = (() => {
    if (!shift?.clockIn) return null;
    const [h, m, s] = shift.clockIn.split(':').map(Number);
    const start = new Date(); start.setHours(h, m, s, 0);
    const end = shift?.clockOut
      ? (() => { const [hh, mm, ss] = shift.clockOut.split(':').map(Number); const d = new Date(); d.setHours(hh, mm, ss, 0); return d; })()
      : now;
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const hh = Math.floor(diff / 3600);
    const mm = Math.floor((diff % 3600) / 60);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  })();

  if (!staffId) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Status pill */}
      <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black tracking-widest uppercase transition-all ${
        isIn   ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600') :
        isDone ? (isDarkMode ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'   : 'bg-slate-50 border-slate-200 text-slate-500') :
                 (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'   : 'bg-amber-50 border-amber-200 text-amber-600')
      }`}>
        <Clock size={12} className={isIn ? 'animate-pulse' : ''} />
        {isIn ? (elapsed ? `${elapsed}` : 'On Duty') : isDone ? 'Shift Done' : 'Not Started'}
      </div>

      {/* Time In button */}
      {!isIn && !isDone && (
        <button onClick={handleTimeIn} disabled={acting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
          {acting ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} strokeWidth={3} />}
          Time In
        </button>
      )}

      {/* Time Out button */}
      {isIn && (
        <button onClick={openTimeOutConfirm} disabled={acting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20">
          {acting ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} strokeWidth={3} />}
          Time Out
        </button>
      )}

      {/* Feedback toast */}
      {msg && (
        <span className={`text-[9px] font-black hidden sm:block ${msgType === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {msg}
        </span>
      )}

      {/* CENTERED CONFIRMATION MODAL — not a toast/alert, sits in the middle of the screen */}
      {showConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className={`relative w-full max-w-sm rounded-[2rem] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>

            {/* Header */}
            <div className="p-6 border-b border-rose-500/20 flex justify-between items-center bg-gradient-to-r from-rose-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <AlertCircle size={20} />
                </div>
                <h2 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                  Confirm Time Out
                </h2>
              </div>
              <button onClick={() => setShowConfirm(false)} className={`${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'} hover:text-rose-500 transition-all`}>
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Sigurado ka bang mag-Time Out ka na? Ma-record kaagad ang oras na ito bilang katapusan ng shift mo{elapsed ? ` (${elapsed} on duty so far)` : ''}.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)}
                  className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${isDarkMode ? 'border-zinc-700 text-zinc-400 hover:border-white hover:text-white' : 'border-zinc-300 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'}`}>
                  Kanselahin
                </button>
                <button onClick={confirmTimeOut} disabled={acting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500 text-white font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20">
                  {acting ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} strokeWidth={3} />}
                  Oo, Time Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
