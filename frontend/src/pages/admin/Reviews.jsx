import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Star, Trash2, Flag, Eye, EyeOff, Users, Building2 } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';
import { confirmAdminAction, showAdminResult } from '../../utils/adminDialogs';

export default function Reviews() {
  const { isDarkMode = false } = useOutletContext() || {};

  // Top-level category: guest ratings vs system reviews
  const [category, setCategory] = useState('guest'); // 'guest' | 'system'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans dark:bg-slate-950 dark:text-slate-100 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Admin Control Panel</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Reputation & Reviews Management</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Monitor and moderate guest feedback and hotel owner platform reviews.
            </p>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => setCategory('system')}
            className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all cursor-pointer ${
              category === 'system'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600/40'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${category === 'system' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'}`}>
              <Building2 size={16} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${category === 'system' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>System Reviews</p>
              <p className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mt-0.5">For Hotel Owners</p>
            </div>
          </button>

          <button
            onClick={() => setCategory('guest')}
            className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all cursor-pointer ${
              category === 'guest'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-600/40'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${category === 'guest' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'}`}>
              <Users size={16} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${category === 'guest' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>Guest Ratings</p>
              <p className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 mt-0.5">For Guests & Rooms</p>
            </div>
          </button>
        </div>
      </div>

      {category === 'system' ? <SystemReviews isDarkMode={isDarkMode} /> : <GuestRatings isDarkMode={isDarkMode} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SYSTEM REVIEWS — hotel owners rating the platform itself                */
/* ---------------------------------------------------------------------- */
function SystemReviews({ isDarkMode }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const load = () => {
    setLoading(true);
    setUnavailable(false);
    fetch('/api/admin/system-reviews')
      .then((r) => {
        if (!r.ok) throw new Error('not available');
        return r.json();
      })
      .then((d) => {
        setReviews(d.reviews || []);
        setLoading(false);
      })
      .catch(() => {
        setUnavailable(true);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Hotel Owner Feedback</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : unavailable || reviews.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Building2 size={28} className="mx-auto mb-3 text-slate-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">No system reviews yet</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {unavailable
              ? 'This feature is wired up but the endpoint isn\u2019t live yet.'
              : 'Hotel owners haven\u2019t submitted feedback on the platform yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <tr>
                {['Hotel Owner', 'Hotel', 'Rating', 'Feedback', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{r.ownerName}</td>
                  <td className="px-6 py-3.5 font-semibold text-emerald-700 dark:text-emerald-400">{r.hotelName || '—'}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} fill={s <= r.rating ? '#047857' : 'transparent'} className={s <= r.rating ? 'text-emerald-700 dark:text-emerald-500' : 'text-slate-300 dark:text-slate-700'} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 max-w-[280px]">
                    <p className="line-clamp-2 italic">"{r.comment}"</p>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                      {r.status || 'published'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* GUEST RATINGS — travelers rating rooms / hotels                         */
/* ---------------------------------------------------------------------- */
function GuestRatings({ isDarkMode }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('all');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/reviews')
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload?.error || 'Unable to load reviews.');
        setReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const deleteReview = async (id) => {
    const confirmation = await confirmAdminAction({
      title: 'Delete this review?',
      text: 'This action cannot be undone.',
      confirmButtonText: 'Delete review',
    });
    if (!confirmation.isConfirmed) return;
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to delete review.');
      load();
      await showAdminResult({
        title: 'Review deleted',
        text: data.message || 'The review was deleted.',
      });
    } catch (error) {
      await showAdminResult({
        title: 'Unable to delete review',
        text: error.message || 'Please try again.',
        icon: 'error',
      });
    }
  };

  const filtered = reviews.filter(r => {
    if (statusTab === 'flagged') return r.status === 'flagged';
    if (statusTab === 'hidden') return r.status === 'hidden';
    return true;
  });

  const { paged, page, totalPages, setPage } = usePagination(filtered);

  return (
    <div className="space-y-6">
      
      {/* FILTER TABS */}
      <div className="flex justify-end">
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
          {['all', 'flagged', 'hidden'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer ${
                statusTab === tab 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            {statusTab === 'all' ? 'All Guest Ratings' : statusTab === 'flagged' ? 'Flagged Ratings' : 'Hidden Ratings'}
          </h3>
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
                    {['Guest Code', 'Room / Hotel', 'Rating', 'Review', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paged.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-3.5 font-bold font-mono text-slate-700 dark:text-slate-300">
                        {r.guestCode || r.guestId || `#GUEST-${r.id}`}
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-bold text-emerald-700 dark:text-emerald-400">{r.roomName || '—'}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{r.hotelName || '—'}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={13} fill={s <= r.rating ? '#047857' : 'transparent'} className={s <= r.rating ? 'text-emerald-700 dark:text-emerald-500' : 'text-slate-300 dark:text-slate-700'} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 max-w-[240px]">
                        {r.title && <p className="font-bold text-slate-900 dark:text-white mb-0.5">{r.title}</p>}
                        <p className="line-clamp-2 italic">"{r.comment}"</p>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${
                          r.status === 'published' ? 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' :
                          r.status === 'flagged' ? 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50' :
                          'text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 opacity-75 group-hover:opacity-100 transition-opacity">
                          {r.status !== 'flagged' && (
                            <button onClick={() => updateStatus(r.id, 'flagged')} title="Flag Review"
                              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer">
                              <Flag size={13} />
                            </button>
                          )}
                          {r.status === 'hidden' ? (
                            <button onClick={() => updateStatus(r.id, 'published')} title="Unhide Review"
                              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer">
                              <Eye size={13} />
                            </button>
                          ) : (
                            <button onClick={() => updateStatus(r.id, 'hidden')} title="Hide Review"
                              className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer">
                              <EyeOff size={13} />
                            </button>
                          )}
                          <button onClick={() => deleteReview(r.id)} title="Delete Review"
                            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400">No reviews found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} isDarkMode={isDarkMode} />
          </>
        )}
      </div>
    </div>
  );
}