import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building2, CheckSquare, Search, Download, Mail, Phone, Eye, BadgeCheck, X } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';
import { confirmAdminAction, showAdminResult } from '../../utils/adminDialogs';

export default function HotelOwners() {
  const { isDarkMode = false } = useOutletContext() || {};
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  const loadOwners = () => {
    setLoading(true);
    fetch('/api/admin/owners')
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload?.error || 'Unable to load owner records.');
        const nextOwners = Array.isArray(payload.owners) ? payload.owners : [];
        setOwners(nextOwners);
        setTotal(Number.isFinite(Number(payload.total)) ? Number(payload.total) : nextOwners.length);
      })
      .catch(() => {
        setOwners([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOwners();
  }, []);

  const filtered = owners.filter((o) => {
    if (!o || typeof o !== 'object') return false;
    return `${o.firstName || ''} ${o.lastName || ''} ${o.email || ''} ${o.hotelName || ''} ${o.hotelCode || ''} ${o.approvalStatus || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });
  const { paged, page, totalPages, setPage } = usePagination(filtered);

  const approveOwner = async (ownerId) => {
    const confirmation = await confirmAdminAction({
      title: 'Approve this owner?',
      text: 'The owner will be able to access their hotel account.',
      confirmButtonText: 'Approve owner',
      icon: 'question',
    });
    if (!confirmation.isConfirmed) return;

    setActionLoading(String(ownerId));
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to approve owner.');
      loadOwners();
      if (selectedOwner?.id === ownerId) {
        setSelectedOwner((current) => current ? { ...current, approvalStatus: 'APPROVED' } : current);
      }
      await showAdminResult({
        title: 'Owner approved',
        text: data.message || 'The owner was approved successfully.',
      });
    } catch (error) {
      await showAdminResult({
        title: 'Unable to approve owner',
        text: error.message || 'Please try again.',
        icon: 'error',
      });
    } finally {
      setActionLoading('');
    }
  };

  const statusBadge = (status) => {
    const normalized = String(status || 'APPROVED').toUpperCase();
    if (normalized === 'APPROVED') return 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
    if (normalized === 'REJECTED') return 'text-rose-800 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
    return 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
  };

  const escapeCsvCell = (value) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      showAdminResult({
        title: 'No owners to export',
        text: 'There are no owner records matching the current search.',
        icon: 'info',
      });
      return;
    }

    const headers = ['Owner', 'Email', 'Contact', 'Hotel', 'Hotel Code', 'Status', 'Rooms', 'Joined'];
    const rows = filtered.map((o) => [
      `${o.firstName || ''} ${o.lastName || ''}`.trim(),
      o.email || '',
      o.contactNumber || '',
      o.hotelName || '',
      o.hotelCode || '',
      o.approvalStatus || 'APPROVED',
      o.totalRooms ?? 0,
      o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hotel-owners-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans dark:bg-slate-950 dark:text-slate-100 space-y-6">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Admin Control Panel</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Hotel Owners Management</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Manage partner registrations, verify hotel credentials, and monitor account approvals.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="self-start sm:self-auto px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Partners', value: total, icon: <Building2 size={18} /> },
          { label: 'Approved Owners', value: owners.filter((o) => o.approvalStatus === 'APPROVED').length, icon: <CheckSquare size={18} />, color: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Pending Review', value: owners.filter((o) => o.approvalStatus === 'PENDING').length, icon: <CheckSquare size={18} />, color: 'text-amber-700 dark:text-amber-400' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                {kpi.icon}
              </div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Live</span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{kpi.label}</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpi.value}</h2>
          </div>
        ))}
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Partner Registry</h3>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search owner or hotel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded focus:outline-none text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    {['Owner', 'Contact', 'Hotel', 'Hotel Code', 'Status', 'Rooms', 'Actions'].map((h) => (
                      <th key={h} className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paged.map((o, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                            {(o.firstName?.[0] || '') + (o.lastName?.[0] || '')}
                          </div>
                          <span className="font-bold uppercase text-slate-900 dark:text-white">{o.firstName} {o.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <Mail size={12} className="text-emerald-700 dark:text-emerald-400 shrink-0" /> {o.email}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            <Phone size={12} className="shrink-0" /> {o.contactNumber || '—'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-emerald-700 dark:text-emerald-400">{o.hotelName}</td>
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">{o.hotelCode || 'No Code Yet'}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${statusBadge(o.approvalStatus)}`}>
                          {o.approvalStatus || 'APPROVED'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{o.totalRooms}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button" 
                            onClick={() => setSelectedOwner(o)} 
                            className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye size={13} /> Review
                          </button>
                          {o.approvalStatus !== 'APPROVED' ? (
                            <button 
                              type="button" 
                              onClick={() => approveOwner(o.id)} 
                              disabled={actionLoading === String(o.id)} 
                              className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              <BadgeCheck size={13} /> {actionLoading === String(o.id) ? 'Approving...' : 'Approve'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400">No owners found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} isDarkMode={isDarkMode} />
          </>
        )}
      </div>

      {/* MODAL REVIEW OWNER */}
      {selectedOwner ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Owner Review</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{selectedOwner.firstName} {selectedOwner.lastName}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedOwner(null)} 
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-2 text-xs">
              <div className="space-y-4">
                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Review Status</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${statusBadge(selectedOwner.approvalStatus)}`}>{selectedOwner.approvalStatus || 'APPROVED'}</span>
                    <span className="text-slate-500 font-medium">Joined {selectedOwner.createdAt ? new Date(selectedOwner.createdAt).toLocaleDateString() : '—'}</span>
                  </div>
                  {selectedOwner.reviewNotes ? <p className="text-slate-600 dark:text-slate-300 italic">{selectedOwner.reviewNotes}</p> : null}
                  {selectedOwner.approvalStatus !== 'APPROVED' ? (
                    <button 
                      type="button" 
                      onClick={() => approveOwner(selectedOwner.id)} 
                      disabled={actionLoading === String(selectedOwner.id)} 
                      className="w-full mt-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <BadgeCheck size={14} /> {actionLoading === String(selectedOwner.id) ? 'Approving...' : 'Approve Owner'}
                    </button>
                  ) : null}
                </section>

                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">Bank Details</p>
                  <p className="text-slate-800 dark:text-slate-200"><strong className="text-slate-500">Bank:</strong> {selectedOwner.bankName || '—'}</p>
                  <p className="text-slate-800 dark:text-slate-200"><strong className="text-slate-500">Account Name:</strong> {selectedOwner.bankAccountName || '—'}</p>
                  <p className="text-slate-800 dark:text-slate-200"><strong className="text-slate-500">Account Number:</strong> {selectedOwner.bankAccountNumber || '—'}</p>
                </section>

                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Uploaded Documents</p>
                  <div className="space-y-2">
                    {[
                      ['Business Permit', selectedOwner.businessPermitPath],
                      ['BIR Certificate', selectedOwner.birCertificatePath],
                      ['Fire Safety Certificate', selectedOwner.fireSafetyCertificatePath],
                      ['Valid ID', selectedOwner.validIdPath],
                    ].map(([label, href]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{label}</span>
                        {href ? <a href={href} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider underline">Open File</a> : <span className="text-[10px] text-slate-400 uppercase">Missing</span>}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Hotel Profile</p>
                  {selectedOwner.hotelBuildingImage || selectedOwner.hotelLogo ? (
                    <img src={selectedOwner.hotelBuildingImage || selectedOwner.hotelLogo} alt={selectedOwner.hotelName} className="h-44 w-full rounded object-cover border border-slate-200 dark:border-slate-700" />
                  ) : null}
                  <div className="space-y-2 pt-1">
                    <p className="text-slate-800 dark:text-slate-200"><strong className="text-slate-500">Hotel:</strong> {selectedOwner.hotelName || '—'}</p>
                    <p className="text-slate-800 dark:text-slate-200"><strong className="text-slate-500">Code:</strong> {selectedOwner.hotelCode || '—'}</p>
                    <p className="text-slate-800 dark:text-slate-200"><strong className="text-slate-500">Address:</strong> {selectedOwner.hotelAddress || '—'}</p>
                    <p className="text-slate-800 dark:text-slate-200"><strong className="text-slate-500">Description:</strong> {selectedOwner.hotelDescription || '—'}</p>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Policies</p>
                  <div className="space-y-2">
                    <div><span className="text-[10px] font-mono font-bold uppercase text-slate-400">Check-in:</span><p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedOwner.checkInPolicy || '—'}</p></div>
                    <div><span className="text-[10px] font-mono font-bold uppercase text-slate-400">Check-out:</span><p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedOwner.checkOutPolicy || '—'}</p></div>
                    <div><span className="text-[10px] font-mono font-bold uppercase text-slate-400">Cancellation:</span><p className="text-slate-800 dark:text-slate-200 mt-0.5">{selectedOwner.cancellationPolicy || '—'}</p></div>
                  </div>
                </section>
              </div>
            </div>

          </div>
        </div>
      ) : null}

    </div>
  );
}