import React, { useEffect, useState } from 'react';
import { Star, TrendingUp, MessageSquare, Download } from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const raw = localStorage.getItem('ownerSession');
    let ownerId = null;
    try { ownerId = JSON.parse(raw)?.id || null; } catch {}

    const url = ownerId ? `/api/owner/reviews?owner_id=${ownerId}` : '/api/owner/reviews';
    fetch(url)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setStats(d.stats || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = reviews.filter(r => {
    if (filter === '5') return r.rating === 5;
    if (filter === 'low') return r.rating <= 2;
    return true;
  });

  const exportCSV = () => {
    const rows = [['Guest', 'Room', 'Hotel', 'Rating', 'Title', 'Comment', 'Date']];
    reviews.forEach(r => rows.push([r.guestName, r.roomName, r.hotelName, r.rating, r.title, r.comment, r.createdAt]));
    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `reviews_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-6 md:p-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reputation Management</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Monitor and analyze guest satisfaction for your hotel property.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Reviews', val: stats.total ?? 0, icon: <MessageSquare size={16} /> },
          { label: 'Avg Rating', val: `${stats.avgRating ?? 0} ★`, icon: <Star size={16} /> },
          { label: '5-Star', val: reviews.filter(r => r.rating === 5).length, icon: <TrendingUp size={16} /> },
          { label: 'This Month', val: reviews.filter(r => r.createdAt && new Date(r.createdAt).getMonth() === new Date().getMonth()).length, icon: <TrendingUp size={16} /> },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">{s.icon}</div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{s.label}</p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{s.val}</h2>
          </div>
        ))}
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 mb-6">
        {[['all', 'All Reviews'], ['5', '5 Star Ratings'], ['low', 'Low Ratings (≤2)']].map(([val, label]) => (
          <button 
            key={val} 
            onClick={() => setFilter(val)}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-all ${
              filter === val 
                ? 'bg-emerald-800 text-white shadow-sm dark:bg-emerald-700' 
                : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* REVIEWS LIST CONTAINER */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Guest Feedback Records</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-emerald-800 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 opacity-55">
            <MessageSquare className="w-10 h-10 mb-2 text-slate-400" />
            <p className="text-xs font-medium italic text-slate-500 dark:text-slate-400">No reviews found matching criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((r) => (
              <div key={r.id} className="p-4 md:p-5 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <div className="flex justify-between items-start mb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                      {r.guestName?.[0] || 'G'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{r.guestName}</h4>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold uppercase">
                        {r.roomName || r.hotelName || 'Innova HMS Property'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={12} fill={s <= r.rating ? '#047857' : 'transparent'} className={s <= r.rating ? 'text-emerald-700 dark:text-emerald-500' : 'text-slate-300 dark:text-slate-700'} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
                {r.title && <p className="mb-1 text-xs font-bold text-slate-800 dark:text-slate-200">{r.title}</p>}
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">"{r.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}