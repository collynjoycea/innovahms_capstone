import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, CheckSquare, Building2, Search, Trash2, Tag, X, Plus } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';
import { confirmAdminAction, showAdminResult } from '../../utils/adminDialogs';

const STAFF_ROLES = [
  'Front Desk Operations',
  'Housekeeping & Maintenance',
];

export default function Staff() {
  const { isDarkMode } = useOutletContext();
  const [staff, setStaff] = useState([]);
  const [hotelOptions, setHotelOptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('hotel'); // 'hotel' | 'role'
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', contactNumber: '', password: '', role: STAFF_ROLES[0], hotelId: '' });

  const cardBg = isDarkMode ? 'bg-[#163C34]' : 'bg-white';
  const borderStyle = isDarkMode ? 'border-white/10' : 'border-gray-200';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSub = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDarkMode ? 'bg-white/5' : 'bg-gray-100';
  const chipBg = isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100';

  const load = () => {
    setLoading(true);
    fetch('/api/admin/staff')
      .then(r => r.json())
      .then(d => { setStaff(d.staff || []); setHotelOptions(d.hotels || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    const confirmation = await confirmAdminAction({
      title: 'Remove this staff member?',
      text: 'The staff member will be removed from the database.',
      confirmButtonText: 'Remove staff',
    });
    if (!confirmation.isConfirmed) return;
    try {
      const response = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to remove staff member.');
      load();
      await showAdminResult({
        title: 'Staff member removed',
        text: data.message || 'The staff record was removed.',
      });
    } catch (error) {
      await showAdminResult({
        title: 'Unable to remove staff member',
        text: error.message || 'Please try again.',
        icon: 'error',
      });
    }
  };

  const switchView = (mode) => {
    setViewMode(mode);
    setSelectedHotel(null);
    setSelectedRole(null);
  };

  // Hotels derived from the staff list itself (name + how many staff there)
  const hotels = useMemo(() => {
    const hotelsById = {};
    staff.forEach(s => {
      const key = s.hotelId || `name:${s.hotelName}`;
      if (!hotelsById[key]) hotelsById[key] = { id: s.hotelId || '', name: s.hotelName || 'Unassigned', count: 0 };
      hotelsById[key].count += 1;
    });
    return Object.values(hotelsById)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff]);

  // Roles: the 5 fixed roles, each with how many staff currently hold it
  const roles = useMemo(() => {
    const counts = {};
    staff.forEach(s => { counts[s.role] = (counts[s.role] || 0) + 1; });
    return STAFF_ROLES.map(role => ({ name: role, count: counts[role] || 0 }));
  }, [staff]);

  const filtered = staff.filter(s => {
    const matchesSearch = `${s.firstName} ${s.lastName} ${s.role} ${s.hotelName}`.toLowerCase().includes(search.toLowerCase());
    const matchesHotel = viewMode !== 'hotel' || !selectedHotel || s.hotelName === selectedHotel;
    const matchesRole = viewMode !== 'role' || !selectedRole || s.role === selectedRole;
    return matchesSearch && matchesHotel && matchesRole;
  });

  const { paged, page, totalPages, setPage } = usePagination(filtered);
  const active = staff.filter(s => String(s.status || '').toLowerCase() === 'active').length;

  const validateStaffForm = () => {
    const nextErrors = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const contactNumber = form.contactNumber.trim();
    const password = form.password;

    if (!firstName || !/^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(firstName)) {
      nextErrors.firstName = 'Enter a valid first name.';
    }
    if (!lastName || !/^[A-Za-z][A-Za-z\s'.-]{1,49}$/.test(lastName)) {
      nextErrors.lastName = 'Enter a valid last name.';
    }
    if (!email || !/^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!contactNumber || !/^\+?[0-9\s-]{10,15}$/.test(contactNumber)) {
      nextErrors.contactNumber = 'Enter a valid contact number.';
    }
    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      nextErrors.password = 'Password must be at least 8 chars with uppercase, lowercase, number, and symbol.';
    }
    if (!form.hotelId) {
      nextErrors.hotelId = 'Please select a hotel.';
    }
    return nextErrors;
  };

  const submitStaff = async (event) => {
    event.preventDefault();
    const validationErrors = validateStaffForm();
    if (Object.keys(validationErrors).length > 0) {
      setAddError(Object.values(validationErrors)[0]);
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to create staff account.');
      setShowAdd(false);
      setForm({ firstName: '', lastName: '', email: '', contactNumber: '', password: '', role: STAFF_ROLES[0], hotelId: '' });
      load();
    } catch (error) {
      setAddError(error.message);
    } finally {
      setAddLoading(false);
    }
  };

  const roleColor = (role) => {
    const r = String(role || '').toLowerCase();
    if (r.includes('manager') || r.includes('lead')) return 'bg-purple-500/10 text-purple-400';
    if (r.includes('front') || r.includes('desk')) return 'bg-blue-500/10 text-blue-400';
    if (r.includes('house') || r.includes('clean')) return 'bg-cyan-500/10 text-cyan-400';
    return 'bg-[#2FA084]/10 text-[#2FA084]';
  };

  const hasSelection = viewMode === 'hotel' ? Boolean(selectedHotel) : Boolean(selectedRole);

  return (
    <div className={`p-6 space-y-8 transition-colors duration-300 ${isDarkMode ? 'bg-[#0F2B25]' : 'bg-[#F4F5F7]'}`}>
      <div className={`flex flex-col md:flex-row justify-between items-center gap-4 border-b ${borderStyle} pb-6`}>
        <div className="text-left">
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${textMain}`}>
            Staff <span className="text-[#2FA084]">Management</span>
          </h1>
        </div>
        <button type="button" onClick={() => { setAddError(''); setShowAdd(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#2FA084] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#24866f]">
          <Plus size={15} /> Add Front Desk / Housekeeping
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={submitStaff} className={`w-full max-w-lg rounded-2xl border ${cardBg} ${borderStyle} p-6 shadow-2xl`}>
            <div className="mb-5 flex items-center justify-between"><h2 className={`text-sm font-black uppercase tracking-widest ${textMain}`}>Create Staff Account</h2><button type="button" onClick={() => setShowAdd(false)} className={textSub}><X size={18} /></button></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {['firstName', 'lastName', 'email', 'contactNumber', 'password'].map((field) => (
                <div key={field} className={field === 'email' || field === 'contactNumber' || field === 'password' ? 'sm:col-span-2' : ''}>
                  <input
                    required
                    type={field === 'email' ? 'email' : field === 'password' ? 'password' : 'text'}
                    value={form[field]}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    placeholder={field.replace(/([A-Z])/g, ' $1')}
                    className={`w-full rounded-lg border ${borderStyle} ${inputBg} px-3 py-2.5 text-xs ${textMain} outline-none ${addError && (field === 'firstName' || field === 'lastName' || field === 'email' || field === 'contactNumber' || field === 'password') ? 'border-red-500' : ''}`}
                  />
                </div>
              ))}
              <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={`rounded-lg border ${borderStyle} ${inputBg} px-3 py-2.5 text-xs ${textMain} outline-none`}>
                {STAFF_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <select required value={form.hotelId} onChange={e => setForm({ ...form, hotelId: e.target.value })} className={`rounded-lg border ${borderStyle} ${inputBg} px-3 py-2.5 text-xs ${textMain} outline-none ${addError && !form.hotelId ? 'border-red-500' : ''}`}>
                <option value="">Select hotel</option>
                {hotelOptions.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            {addError && <p className="mt-3 text-xs font-semibold text-red-500">{addError}</p>}
            <button disabled={addLoading} className="mt-5 w-full rounded-lg bg-[#2FA084] py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">{addLoading ? 'Creating...' : 'Create Account'}</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Staff', value: total, icon: <Users size={20} /> },
          { label: 'Active', value: active, icon: <CheckSquare size={20} />, color: 'text-green-500' },
          { label: 'Hotels Covered', value: hotels.length, icon: <Building2 size={20} />, color: 'text-[#2FA084]' },
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${cardBg} ${borderStyle} shadow-sm`}>
            <div className="p-2.5 rounded-xl bg-white/5 text-[#2FA084] border border-white/5 inline-block mb-4">{kpi.icon}</div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">{kpi.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${textMain}`}>{kpi.value}</h2>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border ${cardBg} ${borderStyle} shadow-xl overflow-hidden`}>
        <div className={`p-5 border-b ${borderStyle} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <div className="flex items-center gap-3">
            <Users className="text-[#2FA084]" size={18} />
            <h3 className={`text-xs font-black uppercase tracking-widest ${textMain}`}>Staff Registry</h3>
          </div>
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${borderStyle} ${inputBg} w-full md:w-64`}>
            <Search size={14} className="text-gray-500" />
            <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
              className={`bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full ${textMain} placeholder:text-gray-600`} />
          </div>
        </div>

        {/* VIEW MODE TABS */}
        <div className={`px-5 pt-4 flex items-center gap-6 border-b ${borderStyle}`}>
          <button
            onClick={() => switchView('hotel')}
            className={`flex items-center gap-2 pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
              viewMode === 'hotel' ? 'border-[#2FA084] text-[#2FA084]' : `border-transparent ${textSub} hover:${textMain}`
            }`}
          >
            <Building2 size={14} /> By Hotel
          </button>
          <button
            onClick={() => switchView('role')}
            className={`flex items-center gap-2 pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
              viewMode === 'role' ? 'border-[#2FA084] text-[#2FA084]' : `border-transparent ${textSub} hover:${textMain}`
            }`}
          >
            <Tag size={14} /> By Role
          </button>
        </div>

        {/* SELECTOR CARDS */}
        <div className={`p-5 border-b ${borderStyle}`}>
          <p className={`text-[9px] font-bold uppercase tracking-widest mb-3 ${textSub}`}>
            {hasSelection
              ? `Showing staff for: ${viewMode === 'hotel' ? selectedHotel : selectedRole}`
              : `Select a ${viewMode === 'hotel' ? 'hotel' : 'role'} to view its staff`}
          </p>

          {viewMode === 'hotel' ? (
            <div className="flex flex-wrap gap-3">
              {hotels.map((h) => (
                <button
                  key={h.name}
                  onClick={() => setSelectedHotel(selectedHotel === h.name ? null : h.name)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                    selectedHotel === h.name
                      ? 'border-[#2FA084] bg-[#2FA084]/10'
                      : `${borderStyle} ${chipBg}`
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedHotel === h.name ? 'bg-[#2FA084]/20 text-[#2FA084]' : `${isDarkMode ? 'bg-white/10' : 'bg-white'} ${textSub}`}`}>
                    <Building2 size={14} />
                  </div>
                  <span className={`text-[11px] font-bold ${selectedHotel === h.name ? 'text-[#2FA084]' : textMain}`}>{h.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-black/30' : 'bg-gray-200'} ${textSub}`}>{h.count}</span>
                </button>
              ))}
              {hotels.length === 0 && <p className={`text-[10px] ${textSub}`}>No hotels found.</p>}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {roles.map((r) => (
                <button
                  key={r.name}
                  onClick={() => setSelectedRole(selectedRole === r.name ? null : r.name)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                    selectedRole === r.name
                      ? 'border-[#2FA084] bg-[#2FA084]/10'
                      : `${borderStyle} ${chipBg}`
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedRole === r.name ? 'bg-[#2FA084]/20 text-[#2FA084]' : `${isDarkMode ? 'bg-white/10' : 'bg-white'} ${textSub}`}`}>
                    <Tag size={14} />
                  </div>
                  <span className={`text-[11px] font-bold ${selectedRole === r.name ? 'text-[#2FA084]' : textMain}`}>{r.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-black/30' : 'bg-gray-200'} ${textSub}`}>{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {hasSelection && (
            <button
              onClick={() => (viewMode === 'hotel' ? setSelectedHotel(null) : setSelectedRole(null))}
              className={`mt-3 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${textSub} hover:text-red-500 transition-all`}
            >
              <X size={12} /> Clear selection
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'} border-b ${borderStyle}`}>
                <tr>
                  {['Name', 'Role', 'Hotel', 'Status', 'Date Hired', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {paged.map((s, i) => (
                  <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2FA084]/20 flex items-center justify-center text-[#2FA084] font-black text-[9px] border border-[#2FA084]/30">
                          {(s.firstName[0] || '') + (s.lastName[0] || '')}
                        </div>
                        <span className={`text-[11px] font-black uppercase ${textMain}`}>{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${roleColor(s.role)} border border-white/5`}>
                        {s.role}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-[10px] font-bold ${textSub} uppercase tracking-tight`}>{s.hotelName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                        String(s.status || '').toLowerCase() === 'active'
                          ? 'text-green-500 bg-green-500/10 border-green-500/20'
                          : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
                      }`}>{s.status || 'Active'}</span>
                    </td>
                    <td className={`px-6 py-4 text-[10px] font-bold ${textSub}`}>
                      {s.dateHired ? new Date(s.dateHired).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleDelete(s.id)} className={`p-1.5 rounded-lg border ${borderStyle} text-red-500 hover:bg-red-500/10 transition-all opacity-60 group-hover:opacity-100`}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className={`px-6 py-10 text-center text-[11px] text-gray-500`}>No staff found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
