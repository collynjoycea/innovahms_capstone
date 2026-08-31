import React, { useEffect, useMemo, useState } from 'react';
import { Users, Star, AlertCircle, TrendingUp, Search, ChevronRight, Download, X, BarChart3, Filter } from 'lucide-react';

const peso = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

const Customers = () => {
  const [payload, setPayload] = useState({ customers: [], topGuests: [], atRiskGuests: [], stats: {}, trends: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegment, setActiveSegment] = useState('ALL');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [behaviorFilter, setBehaviorFilter] = useState('monthly');

  const ownerId = (() => {
    try {
      return JSON.parse(localStorage.getItem('ownerSession') || '{}')?.id || null;
    } catch {
      return null;
    }
  })();

  const period = behaviorFilter === 'weekly' ? 'daily' : 'monthly';

  const fetchGuests = async () => {
    if (!ownerId) return setLoading(false);
    try {
      const res = await fetch(`/api/owner/customers/${ownerId}?period=${period}`);
      const data = await res.json();
      if (res.ok) setPayload(data);
    } catch (err) {
      console.error('Error fetching owner customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
    const interval = setInterval(fetchGuests, 15000);
    const onFocus = () => fetchGuests();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [ownerId, period]);

  const guests = payload?.customers || [];

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const haystack = `${guest.name || ''} ${guest.customerId || ''} ${guest.email || ''}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesSegment = activeSegment === 'ALL' || activeSegment === 'ACV' || guest.segment === activeSegment;
      return matchesSearch && matchesSegment;
    });
  }, [guests, searchTerm, activeSegment]);

  const stats = useMemo(() => ({
    vip: guests.filter((g) => g.segment === 'VIP').length,
    standard: guests.filter((g) => g.segment === 'STANDARD' || g.segment === 'LOYAL').length,
    risk: guests.filter((g) => g.riskLevel === 'High' || g.segment === 'RISK').length,
    avgValue: payload?.stats?.averageGuestSpendPhp || 0,
  }), [guests, payload]);

  const trendBars = (payload?.trends?.bookings || []).slice(-6);
  const maxTrend = Math.max(...trendBars.map((v) => Number(v || 0)), 1);

  const exportCSV = () => {
    const rows = [['Customer', 'Segment', 'Spend', 'Bookings', 'Cancel Rate', 'Risk Score', 'Preferred Room']];
    filteredGuests.forEach((guest) => rows.push([
      guest.name,
      guest.segment,
      guest.totalSpend,
      guest.bookingCount,
      guest.cancellationRate,
      guest.riskScore,
      guest.preferredRoom,
    ]));
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `owner_customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950 font-sans">
      <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-4 md:p-8">
      
      {/* Header Area */}
      <main className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customer CRM & Insights</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Behavioral analytics and guest profile database connected to owner reservations data.
            </p>
          </div>
          <button 
            onClick={exportCSV} 
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} /> Export Report
          </button>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'VIP / PREMIUM', val: stats.vip, icon: <Star size={15}/>, type: 'VIP' },
            { label: 'STANDARD', val: stats.standard, icon: <Users size={15}/>, type: 'STANDARD' },
            { label: 'AT RISK', val: stats.risk, icon: <AlertCircle size={15}/>, type: 'RISK' },
            { label: 'AVG. CUSTOMER VALUE', val: peso(stats.avgValue), icon: <TrendingUp size={15}/>, type: 'ACV' },
          ].map((card) => {
            const isActive = activeSegment === card.type;
            return (
              <div 
                key={card.label} 
                onClick={() => setActiveSegment(card.type)} 
                className={`cursor-pointer bg-white dark:bg-slate-900 border rounded-lg p-5 shadow-sm transition-all ${
                  isActive 
                    ? 'border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</span>
                  <span className={isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}>{card.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{card.val}</h3>
              </div>
            );
          })}
        </div>

        {/* Analytics & Top Guests Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Behavioral Analytics Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Behavioral Analytics</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded">
                {['weekly', 'monthly', 'yearly'].map((filterKey) => (
                  <button 
                    key={filterKey} 
                    onClick={() => setBehaviorFilter(filterKey)} 
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                      behaviorFilter === filterKey 
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded p-4 flex flex-col justify-end">
              <div className="flex items-end gap-3 h-full">
                {trendBars.length ? trendBars.map((value, index) => (
                  <div key={`${value}-${index}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t h-full flex items-end overflow-hidden">
                      <div 
                        className="w-full bg-emerald-700 dark:bg-emerald-600 rounded-t transition-all" 
                        style={{ height: `${Math.max(10, (Number(value || 0) / maxTrend) * 100)}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {(payload?.trends?.labels || []).slice(-6)[index]?.slice(-2) || '--'}
                    </span>
                  </div>
                )) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
                    <div className="text-center">
                      <BarChart3 className="mx-auto mb-1 opacity-40" size={28}/>
                      <span>No behavior trends recorded yet</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Guests List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
              Top Value Guests
            </h3>
            <div className="space-y-3.5">
              {(payload?.topGuests || []).slice(0, 4).map((guest) => (
                <div key={`${guest.name}-${guest.customerId || guest.email}`} className="flex items-center gap-3">
                  <img 
                    src={guest.imageUrl || '/images/deluxe-room.jpg'} 
                    alt={guest.name} 
                    className="w-10 h-10 rounded object-cover border border-slate-200 dark:border-slate-800" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{guest.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase truncate">{guest.segment} • {guest.preferredRoom}</p>
                  </div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">{peso(guest.totalSpend)}</p>
                </div>
              ))}
              {!(payload?.topGuests || []).length && (
                <p className="text-xs text-slate-400 text-center py-6">No top guest data available.</p>
              )}
            </div>
          </div>

        </div>

        {/* Customer Directory Table Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 p-6 gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {activeSegment === 'ALL' ? 'Customer Directory' : `${activeSegment} Segment Analysis`}
              </h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                Showing {filteredGuests.length} live profiles
              </p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15}/>
              <input 
                type="text" 
                placeholder="Search name or email..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-600 transition-colors" 
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="py-4 px-3">Bookings</th>
                  <th className="py-4 px-3">Spend</th>
                  <th className="py-4 px-3">Cancel %</th>
                  <th className="py-4 px-3">Preferred Room</th>
                  <th className="py-4 px-3">Segment</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredGuests.map((guest) => (
                  <tr key={`${guest.name}-${guest.customerId || guest.email}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{guest.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{guest.email || `#${guest.customerId || 'guest'}`}</div>
                    </td>
                    <td className="py-4 px-3 text-slate-600 dark:text-slate-300">{guest.bookingCount || 0} stays</td>
                    <td className="py-4 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{peso(guest.totalSpend)}</td>
                    <td className="py-4 px-3 font-semibold text-red-600">{Math.round(guest.cancellationRate || 0)}%</td>
                    <td className="py-4 px-3 text-slate-500">{guest.preferredRoom || 'N/A'}</td>
                    <td className="py-4 px-3">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {guest.segment}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedGuest(guest)} 
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Details <ChevronRight size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredGuests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No customer records found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Guest Details Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in duration-150">
            <button 
              onClick={() => setSelectedGuest(null)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded"
            >
              <X size={18}/>
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
              <img 
                src={selectedGuest.imageUrl || '/images/deluxe-room.jpg'} 
                alt={selectedGuest.name} 
                className="w-12 h-12 rounded object-cover border border-slate-200 dark:border-slate-800" 
              />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedGuest.name}</h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Segment: {selectedGuest.segment}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3.5 rounded">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Revenue Contribution</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{peso(selectedGuest.totalSpend)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3.5 rounded">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Risk Score</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{selectedGuest.riskScore || 0}/100</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedGuest(null)}
              className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded transition-colors shadow-sm"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;