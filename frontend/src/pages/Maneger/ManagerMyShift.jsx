import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';
import { readManagerSession } from './managerSession';

const getCurrentLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) { reject(new Error('Geolocation is not supported.')); return; }
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
    reject,
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

export default function ManagerMyShift() {
  const { isDarkMode } = useOutletContext();
  const session = readManagerSession() || {};
  const staffId = session.id || null;

  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchShift = useCallback(async () => {
    if (!staffId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/staff/shift-status/${staffId}`);
      const data = await res.json();
      if (res.ok) setShift(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [staffId]);

  useEffect(() => {
    fetchShift();
    const t = setInterval(fetchShift, 30000);
    return () => clearInterval(t);
  }, [fetchShift]);

  const handleTimeIn = async () => {
    setActing(true); setMsg('');
    try {
      let coords;
      try { coords = await getCurrentLocation(); }
      catch { setMsg('Location access is required to time in.'); setMsgType('error'); return; }
      const res = await fetch('/api/staff/time-in', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, ...coords }),
      });
      const data = await res.json();
      if (res.ok) { setMsg(`Clocked in at ${data.clockIn} — ${data.status}`); setMsgType('success'); fetchShift(); }
      else { setMsg(data.error || 'Failed to clock in.'); setMsgType('error'); }
    } catch { setMsg('Server error.'); setMsgType('error'); }
    finally { setActing(false); }
  };

  const handleTimeOut = async () => {
    setActing(true); setMsg('');
    try {
      let coords;
      try { coords = await getCurrentLocation(); }
      catch { setMsg('Location access is required to time out.'); setMsgType('error'); return; }
      const res = await fetch('/api/staff/time-out', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, ...coords }),
      });
      const data = await res.json();
      if (res.ok) { setMsg(`Clocked out at ${data.clockOut} — ${data.hoursWorked}h worked`); setMsgType('success'); fetchShift(); }
      else { setMsg(data.error || 'Failed to clock out.'); setMsgType('error'); }
    } catch { setMsg('Server error.'); setMsgType('error'); }
    finally { setActing(false); }
  };

  const card = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const text = isDarkMode ? 'text-white' : 'text-slate-900';
  const sub  = isDarkMode ? 'text-slate-500' : 'text-slate-400';

  const isIn   = shift?.clockIn && !shift?.clockOut;
  const isDone = shift?.clockIn && shift?.clockOut;

  const elapsed = (() => {
    if (!shift?.clockIn) return null;
    const [h, m, s] = shift.clockIn.split(':').map(Number);
    const start = new Date(); start.setHours(h, m, s, 0);
    const end = shift.clockOut
      ? (() => { const [hh, mm, ss] = shift.clockOut.split(':').map(Number); const d = new Date(); d.setHours(hh, mm, ss, 0); return d; })()
      : now;
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const hh = Math.floor(diff / 3600), mm2 = Math.floor((diff % 3600) / 60), ss2 = diff % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm2).padStart(2,'0')}:${String(ss2).padStart(2,'0')}`;
  })();

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className={`text-2xl font-bold ${text}`}>My Shift</h1>
          <p className={`text-xs mt-0.5 ${sub}`}>
            {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Live Clock */}
        <div className={`rounded-lg border p-6 text-center shadow-sm ${card}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${sub}`}>Current Time</p>
          <p className={`text-5xl font-bold tabular-nums ${text}`}>
            {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          {isIn && elapsed && <p className="mt-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">⏱ {elapsed} on shift</p>}
        </div>

        {/* Staff Info */}
        {!loading && shift && (
          <div className={`rounded-lg border p-5 flex items-center gap-4 shadow-sm ${card}`}>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <User size={22} />
            </div>
            <div className="flex-1">
              <p className={`font-bold text-sm ${text}`}>{shift.name}</p>
              <p className={`text-xs ${sub}`}>{shift.role} · {shift.hotelName}</p>
            </div>
            <span className={`px-3 py-1 rounded text-[10px] font-bold ${
              isIn  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
              isDone ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                       'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {isIn ? 'On Duty' : isDone ? 'Shift Done' : 'Not Started'}
            </span>
          </div>
        )}

        {/* Shift Details */}
        {!loading && shift && (
          <div className={`rounded-lg border p-5 grid grid-cols-3 gap-4 shadow-sm ${card}`}>
            {[
              { label: 'Clock In',  val: shift.clockIn  || '—' },
              { label: 'Clock Out', val: shift.clockOut || '—' },
              { label: 'Hours',     val: shift.clockOut && shift.hoursWorked != null ? `${shift.hoursWorked}h` : '—' },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${sub}`}>{label}</p>
                <p className={`text-xl font-bold tabular-nums ${text}`}>{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        {!loading && staffId && (
          <div className="flex gap-3">
            <button
              onClick={handleTimeIn}
              disabled={acting || isIn || isDone}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {acting ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Time In
            </button>
            <button
              onClick={handleTimeOut}
              disabled={acting || !isIn}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {acting ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />} Time Out
            </button>
          </div>
        )}

        {!staffId && !loading && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} /> No manager session found. Please log in again.
          </div>
        )}

        {msg && (
          <div className={`rounded-lg border p-4 text-xs font-semibold flex items-center gap-2 ${
            msgType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'
          }`}>
            {msgType === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {msg}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={28} className="animate-spin text-emerald-700" />
          </div>
        )}
      </div>
    </div>
  );
}
