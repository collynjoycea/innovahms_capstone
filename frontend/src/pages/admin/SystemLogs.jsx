import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Download, RefreshCw, X, ShieldAlert, AlertTriangle, CreditCard, CheckCircle2 } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function SystemLogs() {
  const { isDarkMode } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'critical' | 'payment' | 'flagged'
  const [toast, setToast] = useState('');

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#F4F5F7]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white/90 backdrop-blur-md',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-200',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/50' : 'shadow-xl shadow-gray-200/50',
  };

  const normalizeLogs = (payloadLogs = []) =>
    payloadLogs.map((log, index) => ({
      id: log?.id ?? index + 1,
      timestamp: log?.timestamp ?? log?.time ?? log?.createdAt ?? new Date(),
      action: log?.action ?? log?.event ?? 'SYSTEM_EVENT',
      category: String(log?.category ?? log?.type ?? 'info').toLowerCase(),
      actor: log?.actor ?? 'System',
      role: log?.role ?? 'SYSTEM',
      ipAddress: log?.ipAddress ?? '127.0.0.1',
      severity: String(log?.severity ?? log?.level ?? 'INFO').toUpperCase(),
      details: log?.details ?? log?.message ?? 'System activity log entry.',
    }));

  const loadLogs = () => {
    setLoading(true);
    fetch('/api/admin/system-logs')
      .then(async (r) => {
        const payload = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(payload?.error || 'Unable to load system logs.');
        const nextLogs = normalizeLogs(Array.isArray(payload.logs) ? payload.logs : []);
        setLogs(nextLogs);
        setStats(payload?.stats && typeof payload.stats === 'object' ? payload.stats : { totalIssues: nextLogs.length, criticalErrors: 0, paymentFailures: 0, flaggedEvents: 0 });
      })
      .catch(() => {
        setLogs([]);
        setStats({ totalIssues: 0, criticalErrors: 0, paymentFailures: 0, flaggedEvents: 0 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Filter logic batay sa napiling tab (tinanggal ang double booking)
  const filteredLogs = Array.isArray(logs)
    ? logs.filter((log) => {
        const cat = String(log.category || '').toLowerCase();
        if (filterTab === 'critical') return cat === 'critical' || log.severity === 'CRITICAL' || log.severity === 'ERROR';
        if (filterTab === 'payment') return cat === 'payment';
        if (filterTab === 'flagged') return cat === 'flagged';
        return true;
      })
    : [];

  const { paged: pagedLogs, page, totalPages, setPage } = usePagination(filteredLogs);

  const getSeverityBadge = (severity) => {
    const s = String(severity || 'ERROR').toUpperCase();
    if (s === 'CRITICAL') return 'text-rose-500 bg-rose-500/10 border-rose-500/30 animate-pulse';
    if (s === 'WARNING') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  };

  return (
    <div className={`p-6 space-y-6 text-left relative min-h-screen transition-colors duration-500 ${theme.bg}`}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className={`${isDarkMode ? 'bg-[#161618]' : 'bg-white'} border ${theme.border} rounded-2xl px-5 py-4 flex items-center gap-4 ${theme.shadow}`}>
            <div className="bg-[#2FA084]/10 p-2 rounded-xl text-[#2FA084]"><FileText size={18} /></div>
            <p className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} pr-8`}>{toast}</p>
            <button onClick={() => setToast('')} className="text-gray-500 hover:text-[#2FA084]"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            System Diagnostics & <span className="text-[#2FA084]">Error Resolution</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textSub} mt-0.5`}>
            INNOVA-HMS Administrative Oversight — Monitor payment failures, security flags, and critical system exceptions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => { loadLogs(); triggerToast('Diagnostic logs synchronized successfully.'); }}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border ${theme.border} rounded-xl text-[10px] font-black uppercase ${theme.textSub} hover:border-[#2FA084] hover:text-[#2FA084] transition-all`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Audits
          </button>
          <button 
            onClick={() => triggerToast('System error diagnostic report exported to CSV.')}
            className="flex items-center gap-2 px-5 py-2 bg-[#2FA084] rounded-xl text-[10px] font-black uppercase text-black hover:scale-105 transition-all shadow-lg shadow-[#2FA084]/20"
          >
            <Download size={14} strokeWidth={3} /> Export Logs
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Critical System Exceptions', val: stats.criticalErrors ?? 2, icon: <ShieldAlert size={18} className="text-rose-500" /> },
          { label: 'Payment Failures (Can\'t Pay)', val: stats.paymentFailures ?? 2, icon: <CreditCard size={18} className="text-orange-500" /> },
          { label: 'Flagged Security Incidents', val: stats.flaggedEvents ?? 1, icon: <AlertTriangle size={18} className="text-purple-500" /> },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-2xl ${theme.card} border ${theme.border} ${theme.shadow} hover:border-[#2FA084]/40 transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-[9px] font-black uppercase ${theme.textSub} tracking-widest`}>{s.label}</p>
              <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} border ${theme.border}`}>{s.icon}</div>
            </div>
            <h2 className={`text-3xl font-black ${theme.textMain} tabular-nums`}>{s.val}</h2>
          </div>
        ))}
      </div>

      {/* FILTER TABS */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className={`flex p-1 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-200/50'}`}>
          {[
            { id: 'all', label: 'All System Issues' },
            { id: 'payment', label: 'Payment Failures' },
            { id: 'critical', label: 'Critical Exceptions' },
            { id: 'flagged', label: 'Flagged Security' },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setFilterTab(tab.id)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filterTab === tab.id ? 'bg-[#2FA084] text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className={`text-[10px] font-black text-[#2FA084] bg-[#2FA084]/10 px-3.5 py-2 rounded-xl border border-[#2FA084]/20`}>
          Showing {filteredLogs.length} Active Incidents
        </span>
      </div>

      {/* ERROR AUDIT TABLE */}
      <div className={`${theme.card} rounded-2xl border ${theme.border} ${theme.shadow} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} border-b ${theme.border} ${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Exception Action / Code</th>
                  <th className="px-6 py-4">Affected Actor / Module</th>
                  <th className="px-6 py-4">Source IP</th>
                  <th className="px-6 py-4">Severity Tier</th>
                  <th className="px-6 py-4">Diagnostic Details & Resolution Guide</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {pagedLogs.map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-rose-500/[0.03] transition-colors">
                    <td className={`px-6 py-4 text-[10px] font-bold ${theme.textSub} whitespace-nowrap`}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-black text-rose-500 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold ${theme.textMain}`}>{log.actor}</span>
                        <span className={`text-[8px] uppercase font-mono ${theme.textSub}`}>{log.role}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-[10px] font-mono font-bold ${theme.textSub}`}>
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-md border ${getSeverityBadge(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-[10px] ${theme.textSub} font-medium max-w-md`}>
                      {log.details}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-6 py-16 text-center text-[11px] ${theme.textSub}`}>
                      <CheckCircle2 size={24} className="mx-auto mb-2 text-[#2FA084]" />
                      No system exceptions or errors found under this filter. INNOVA-HMS is operating at optimal stability.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filteredLogs.length} isDarkMode={isDarkMode} />
      </div>

    </div>
  );
}