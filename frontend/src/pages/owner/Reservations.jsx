import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Download, Filter, Plus, Edit2, Trash2, 
  RefreshCw, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Building2, Layers
} from 'lucide-react';

const STATUS_BADGES = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  OCCUPIED:  'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  MAINTENANCE: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  CLEANING:  'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

const ITEMS_PER_PAGE = 15;

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const ownerSession = (() => {
    try { return JSON.parse(localStorage.getItem('ownerSession') || '{}'); } catch { return {}; }
  })();
  const ownerId = ownerSession?.id;

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const url = ownerId ? `/api/owner/rooms?owner_id=${ownerId}` : '/api/owner/rooms';
      const res = await fetch(url);
      const data = await res.json();
      setRooms(data.rooms || []);
      setStats(data.stats || {});
    } catch { 
      // Fallback or ignore for network errors
    } finally { 
      setLoading(false); 
    }
  }, [ownerId]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const showToast = (msg) => { 
    setToast(msg); 
    setTimeout(() => setToast(''), 3000); 
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this room?')) return;
    setActionLoading(id + '-delete');
    try {
      const res = await fetch(`/api/owner/rooms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Room successfully deleted.');
      loadRooms();
    } catch (e) { 
      showToast(`Error: ${e.message}`); 
    } finally { 
      setActionLoading(null); 
    }
  };

  const exportCSV = () => {
    const rows = [['Room No', 'Room Name', 'Category', 'Capacity', 'Price', 'Status']];
    filteredRooms.forEach(r => rows.push([r.roomNo, r.roomName, r.category, r.capacity, r.price, r.status]));
    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `rooms_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter Logic
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchSearch = `${r.roomNo} ${r.roomName} ${r.category}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [rooms, search, statusFilter]);

  // Pagination Logic (Up to 15 items per page)
  const totalPages = Math.ceil(filteredRooms.length / ITEMS_PER_PAGE) || 1;
  
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRooms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRooms, currentPage]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const statCards = [
    { label: 'Total Rooms', value: stats.total ?? rooms.length, filter: 'ALL', color: 'text-slate-900 dark:text-white' },
    { label: 'Available', value: stats.available ?? 0, filter: 'AVAILABLE', color: 'text-emerald-700 dark:text-emerald-400' },
    { label: 'Occupied', value: stats.occupied ?? 0, filter: 'OCCUPIED', color: 'text-blue-700 dark:text-blue-400' },
    { label: 'Maintenance', value: stats.maintenance ?? 0, filter: 'MAINTENANCE', color: 'text-amber-700 dark:text-amber-400' },
    { label: 'Cleaning', value: stats.cleaning ?? 0, filter: 'CLEANING', color: 'text-purple-700 dark:text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-6">

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white dark:bg-slate-800 px-4 py-2.5 rounded shadow-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 border border-slate-700">
          <CheckCircle2 size={15} className="text-emerald-400" />
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto space-y-6">

        {/* HEADER & ACTIONS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="text-emerald-700 dark:text-emerald-500" size={26} />
              Rooms Management
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Monitor room availability, structural categories, and active property status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadRooms} 
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button 
              onClick={exportCSV} 
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map(s => (
            <button 
              key={s.filter}
              onClick={() => setStatusFilter(s.filter)}
              className={`p-4 rounded-lg border text-left transition-all bg-white dark:bg-slate-900 shadow-sm ${
                statusFilter === s.filter 
                  ? 'border-emerald-600 ring-1 ring-emerald-600/20 dark:border-emerald-500' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">{s.label}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </button>
          ))}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex flex-1 items-center gap-2 w-full md:max-w-sm border border-slate-300 dark:border-slate-700 rounded px-3 py-2 bg-slate-50/50 dark:bg-slate-800/40">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Search room no, name, category..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400" 
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 bg-slate-50/50 dark:bg-slate-800/40">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="CLEANING">Cleaning</option>
              </select>
            </div>

            {(statusFilter !== 'ALL' || search) && (
              <button 
                onClick={() => { setStatusFilter('ALL'); setSearch(''); }}
                className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold hover:underline px-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ROOMS TABLE CONTAINER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    {['Room No', 'Room Name', 'Category', 'Capacity', 'Rate / Night', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {paginatedRooms.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800 dark:text-emerald-400">{r.roomNo}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{r.roomName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.category}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.capacity} Persons</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">₱{Number(r.price || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${STATUS_BADGES[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => showToast(`Edit modal for room ${r.roomNo} opened.`)}
                            title="Edit Room"
                            className="p-1.5 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDelete(r.id)}
                            disabled={actionLoading === r.id + '-delete'}
                            title="Delete Room"
                            className="p-1.5 border border-red-200 dark:border-red-900/50 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === r.id + '-delete' ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedRooms.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-400 uppercase tracking-widest text-[11px]">
                        No rooms match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION CONTROLS (Up to 15 items per page) */}
          {!loading && filteredRooms.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs">
              <span className="text-slate-500 mb-2 sm:mb-0">
                Showing <strong className="text-slate-800 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRooms.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredRooms.length}</strong> rooms
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-semibold"
                >
                  <ArrowLeft size={13} /> Prev
                </button>
                
                <span className="font-mono px-2 text-slate-600 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-semibold"
                >
                  Next <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}