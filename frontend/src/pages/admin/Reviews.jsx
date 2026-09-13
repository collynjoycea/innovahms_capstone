import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Star, Trash2, Flag, Eye, EyeOff, Users, Building2 } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function Reviews() {
  const { isDarkMode } = useOutletContext();

  // Top-level category: guest ratings (travelers reviewing hotels) vs
  // system reviews (hotel owners giving feedback on the platform itself).
  const [category, setCategory] = useState('guest'); // 'guest' | 'system'

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#F4F5F7]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-all duration-500 ${theme.bg}`}>
      <div className={`flex flex-col gap-5 border-b pb-5 ${theme.border}`}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            <span className="text-[#2FA084]">Reviews</span>
          </h1>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setCategory('system')}
            className={`flex-1 flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
              category === 'system'
                ? 'border-[#2FA084] bg-[#2FA084]/10'
                : `${theme.border} ${theme.card} hover:border-[#2FA084]/40`
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${category === 'system' ? 'bg-[#2FA084] text-black' : `${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084]`}`}>
              <Building2 size={16} />
            </div>
            <div>
              <p className={`text-[11px] font-black uppercase tracking-wide ${category === 'system' ? 'text-[#2FA084]' : theme.textMain}`}>System Reviews</p>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>For Hotel Owners</p>
            </div>
          </button>

          <button
            onClick={() => setCategory('guest')}
            className={`flex-1 flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
              category === 'guest'
                ? 'border-[#2FA084] bg-[#2FA084]/10'
                : `${theme.border} ${theme.card} hover:border-[#2FA084]/40`
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${category === 'guest' ? 'bg-[#2FA084] text-black' : `${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084]`}`}>
              <Users size={16} />
            </div>
            <div>
              <p className={`text-[11px] font-black uppercase tracking-wide ${category === 'guest' ? 'text-[#2FA084]' : theme.textMain}`}>Guest Ratings</p>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>For Guests</p>
            </div>
          </button>
        </div>
      </div>

      {category === 'system' ? <SystemReviews theme={theme} isDarkMode={isDarkMode} /> : <GuestRatings theme={theme} isDarkMode={isDarkMode} />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SYSTEM REVIEWS — hotel owners rating the platform itself                */
/* ---------------------------------------------------------------------- */
function SystemReviews({ theme, isDarkMode }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
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
        setStats(d.stats || {});
        setLoading(false);
      })
      .catch(() => {
        setUnavailable(true);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reviews', val: stats.total ?? 0 },
          { label: 'Avg Rating', val: `${stats.avgRating ?? 0} ★` },
          { label: '5-Star', val: stats.fiveStar ?? 0 },
          { label: 'Flagged', val: stats.flagged ?? 0 },
        ].map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{s.label}</p>
            <h2 className={`text-2xl font-black ${theme.textMain}`}>{s.val}</h2>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${theme.border} ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Hotel Owner Feedback</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : unavailable || reviews.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Building2 size={28} className={`mx-auto mb-3 ${theme.textSub}`} />
            <p className={`text-[11px] font-black uppercase tracking-widest ${theme.textMain}`}>No system reviews yet</p>
            <p className={`mt-1 text-[10px] ${theme.textSub}`}>
              {unavailable
                ? 'This feature is wired up but the /api/admin/system-reviews endpoint isn\u2019t live yet.'
                : 'Hotel owners haven\u2019t submitted feedback on the platform yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'} border-b ${theme.border}`}>
                <tr>
                  {['Hotel Owner', 'Hotel', 'Rating', 'Feedback', 'Date', 'Status'].map((h) => (
                    <th key={h} className={`px-5 py-4 text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-[#2FA084]/5 transition-colors">
                    <td className={`px-5 py-4 text-[11px] font-black ${theme.textMain}`}>{r.ownerName}</td>
                    <td className="px-5 py-4 text-[10px] font-bold text-[#2FA084]">{r.hotelName || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} fill={s <= r.rating ? '#2FA084' : 'transparent'} className={s <= r.rating ? 'text-[#2FA084]' : 'text-gray-400'} />
                        ))}
                      </div>
                    </td>
                    <td className={`px-5 py-4 text-[10px] ${theme.textSub} max-w-[240px]`}>
                      <p className="line-clamp-2 italic">"{r.comment}"</p>
                    </td>
                    <td className={`px-5 py-4 text-[10px] ${theme.textSub}`}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[8px] font-black uppercase px-2 py-1 rounded border text-green-500 bg-green-500/10 border-green-500/20">
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
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* GUEST RATINGS — travelers rating rooms / hotels (existing behaviour)    */
/* ---------------------------------------------------------------------- */
function GuestRatings({ theme, isDarkMode }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('all');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/reviews')
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setStats(d.stats || {}); setLoading(false); })
      .catch(() => setLoading(false));
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
    if (!window.confirm('Delete this review?')) return;
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = reviews.filter(r => {
    if (statusTab === 'flagged') return r.status === 'flagged';
    if (statusTab === 'hidden') return r.status === 'hidden';
    return true;
  });

  const { paged, page, totalPages, setPage } = usePagination(filtered);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className={`flex p-1 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-200/50'}`}>
          {['all', 'flagged', 'hidden'].map(tab => (
            <button key={tab} onClick={() => setStatusTab(tab)}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${statusTab === tab ? 'bg-[#2FA084] text-black shadow-lg' : 'text-gray-500'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reviews', val: stats.total ?? 0 },
          { label: 'Avg Rating', val: `${stats.avgRating ?? 0} ★` },
          { label: '5-Star', val: stats.fiveStar ?? 0 },
          { label: 'Flagged', val: stats.flagged ?? 0 },
        ].map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{s.label}</p>
            <h2 className={`text-2xl font-black ${theme.textMain}`}>{s.val}</h2>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className={`rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${theme.border} ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>
            {statusTab === 'all' ? 'All Guest Ratings' : statusTab === 'flagged' ? 'Flagged Ratings' : 'Hidden Ratings'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'} border-b ${theme.border}`}>
                  <tr>
                    {['Guest', 'Room / Hotel', 'Rating', 'Review', 'Date', 'Status', ''].map(h => (
                      <th key={h} className={`px-5 py-4 text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.border}`}>
                  {paged.map((r) => (
                    <tr key={r.id} className="hover:bg-[#2FA084]/5 transition-colors group">
                      <td className={`px-5 py-4 text-[11px] font-black ${theme.textMain}`}>{r.guestName}</td>
                      <td className="px-5 py-4">
                        <p className="text-[10px] font-bold text-[#2FA084]">{r.roomName || '—'}</p>
                        <p className={`text-[9px] ${theme.textSub}`}>{r.hotelName || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={10} fill={s <= r.rating ? '#2FA084' : 'transparent'} className={s <= r.rating ? 'text-[#2FA084]' : 'text-gray-400'} />
                          ))}
                        </div>
                      </td>
                      <td className={`px-5 py-4 text-[10px] ${theme.textSub} max-w-[200px]`}>
                        {r.title && <p className={`font-bold ${theme.textMain} mb-0.5`}>{r.title}</p>}
                        <p className="line-clamp-2 italic">"{r.comment}"</p>
                      </td>
                      <td className={`px-5 py-4 text-[10px] ${theme.textSub}`}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded border ${
                          r.status === 'published' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                          r.status === 'flagged' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
                          'text-gray-500 bg-gray-500/10 border-gray-500/20'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {r.status !== 'flagged' && (
                            <button onClick={() => updateStatus(r.id, 'flagged')} title="Flag"
                              className={`p-1.5 rounded-lg border ${theme.border} text-orange-500 hover:bg-orange-500/10 transition-all`}>
                              <Flag size={12} />
                            </button>
                          )}
                          {r.status === 'hidden' ? (
                            <button onClick={() => updateStatus(r.id, 'published')} title="Unhide"
                              className={`p-1.5 rounded-lg border ${theme.border} text-green-500 hover:bg-green-500/10 transition-all`}>
                              <Eye size={12} />
                            </button>
                          ) : (
                            <button onClick={() => updateStatus(r.id, 'hidden')} title="Hide"
                              className={`p-1.5 rounded-lg border ${theme.border} ${theme.textSub} hover:bg-white/5 transition-all`}>
                              <EyeOff size={12} />
                            </button>
                          )}
                          <button onClick={() => deleteReview(r.id)} title="Delete"
                            className={`p-1.5 rounded-lg border ${theme.border} text-red-500 hover:bg-red-500/10 transition-all`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className={`px-6 py-10 text-center text-[11px] ${theme.textSub}`}>No reviews found.</td></tr>
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
