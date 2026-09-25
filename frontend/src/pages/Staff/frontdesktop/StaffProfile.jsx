import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Building2, Camera, Check, Clock3, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function StaffProfile() {
  const { isDarkMode } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useStaffSession();
  const fileInputRef = useRef(null);
  const profileRoot = location.pathname.startsWith('/housekeeping') ? '/housekeeping' : '/staff';
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({ firstName: '', lastName: '', email: '', contactNumber: '' });
  const [pendingImage, setPendingImage] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f4f4f7]',
    card: isDarkMode ? 'bg-[#111111] border-white/5' : 'bg-white border-gray-200 shadow-sm',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    sub: isDarkMode ? 'text-zinc-500' : 'text-gray-500',
    muted: isDarkMode ? 'text-zinc-300' : 'text-gray-700',
    input: isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900',
  };

  const syncLocalSession = (next) => {
    const stored = JSON.parse(localStorage.getItem('staffUser') || '{}');
    localStorage.setItem('staffUser', JSON.stringify({ ...stored, ...next }));
    window.dispatchEvent(new Event('staffSessionChanged'));
  };

  const loadProfile = async () => {
    if (!session.staffId) {
      setLoading(false);
      setError('No staff session found. Please log in again.');
      return;
    }
    try {
      const res = await fetch(`/api/staff/profile/${session.staffId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to load staff profile.');
      setProfile(data);
      syncLocalSession(data);
    } catch (err) {
      setError(err.message || 'Unable to load staff profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [session.staffId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = () => {
    setDraft({
      firstName: profile?.firstName || session.firstName || '',
      lastName: profile?.lastName || session.lastName || '',
      email: profile?.email || session.email || '',
      contactNumber: profile?.contactNumber || session.contactNumber || '',
    });
    setPendingImage(null);
    setError('');
    setMessage('');
    setEditing(true);
  };

  const handlePhotoPick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please select an image file.');
    if (file.size > 3 * 1024 * 1024) return setError('Image must be under 3MB.');
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    const values = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]));
    if (!values.firstName || !values.email || !values.contactNumber) return setError('First name, email, and contact number are required.');
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/staff/profile/${session.staffId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, ...(pendingImage ? { profileImage: pendingImage } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to update profile.');
      setProfile(data);
      syncLocalSession(data);
      setEditing(false);
      setPendingImage(null);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const current = profile || session;
  const name = `${current.firstName || ''} ${current.lastName || ''}`.trim() || 'Staff';
  const photo = pendingImage || current.profileImage || '';
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const details = [
    { label: 'Email', value: current.email || '—', icon: Mail },
    { label: 'Contact Number', value: current.contactNumber || '—', icon: Phone },
    { label: 'Role', value: current.role || 'Staff', icon: ShieldCheck },
    { label: 'Hotel', value: current.hotelName || 'Assigned hotel unavailable', icon: Building2 },
  ];

  if (loading) return <div className={`min-h-screen flex items-center justify-center ${theme.bg}`}><div className="w-9 h-9 rounded-full border-2 border-[#2FA084] border-t-transparent animate-spin" /></div>;

  return (
    <div className={`p-8 min-h-screen ${theme.bg}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className={`flex items-center justify-between border-b pb-6 ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
          <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2FA084]">{current.role || 'Staff Operations'}</p><h1 className={`mt-2 text-3xl font-black uppercase tracking-tighter ${theme.text}`}>My <span className="text-[#2FA084]">Profile</span></h1><p className={`mt-1 text-[11px] font-bold uppercase tracking-widest ${theme.sub}`}>Your staff identity and hotel assignment</p></div>
          {!editing ? <button onClick={startEdit} className="rounded-xl bg-[#2FA084] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black hover:brightness-110">Edit Profile</button> : <div className="flex gap-2"><button onClick={() => { setEditing(false); setPendingImage(null); setError(''); }} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest ${theme.muted}`}><X size={14} /> Cancel</button><button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2FA084] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-50"><Check size={14} /> {saving ? 'Saving...' : 'Save Changes'}</button></div>}
        </div>

        {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-500"><Check size={16} /> {message}</div>}
        {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-500">{error}</div>}

        <section className={`rounded-[2rem] border p-8 ${theme.card}`}><div className="flex flex-col sm:flex-row sm:items-center gap-5"><div className="relative shrink-0"><div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6FCF97] to-[#2FA084] flex items-center justify-center text-2xl font-black text-[#173F35] shadow-lg overflow-hidden">{photo ? <img src={photo} alt={name} className="w-full h-full object-cover" /> : initials}</div>{editing && <button onClick={() => fileInputRef.current?.click()} className="absolute -right-2 -bottom-2 rounded-xl bg-[#2FA084] p-2 text-black shadow-lg" title="Change photo"><Camera size={15} /></button>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoPick} className="hidden" /></div><div className="flex-1 text-left"><p className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>{name}</p><p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#2FA084]">{current.role || 'Staff'}</p><p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${theme.sub}`}>{current.hotelName || 'Assigned hotel unavailable'}</p></div><button type="button" onClick={() => navigate(`${profileRoot}/my-shift`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2FA084]/30 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#2FA084] hover:bg-[#2FA084]/10"><Clock3 size={15} /> My Shift</button></div></section>

        {editing && <section className={`grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border p-6 ${theme.card}`}>{[['firstName', 'First Name'], ['lastName', 'Last Name'], ['email', 'Email'], ['contactNumber', 'Contact Number']].map(([key, label]) => <label key={key} className="space-y-2"><span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.sub}`}>{label}</span><input value={draft[key]} onChange={(event) => setDraft((old) => ({ ...old, [key]: event.target.value }))} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#2FA084] ${theme.input}`} /></label>)}</section>}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">{details.map(({ label, value, icon: Icon }) => <div key={label} className={`rounded-2xl border p-5 ${theme.card}`}><div className="flex items-center gap-3 mb-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2FA084]/10 text-[#2FA084]"><Icon size={17} /></span><p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.sub}`}>{label}</p></div><p className={`text-sm font-bold break-words ${theme.muted}`}>{value}</p></div>)}</section>
      </div>
    </div>
  );
}