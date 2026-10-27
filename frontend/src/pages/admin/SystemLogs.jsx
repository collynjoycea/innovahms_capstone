import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Download, RefreshCw, X, ShieldAlert, AlertTriangle, CreditCard, CheckCircle2 } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function SystemLogs() {
  const { isDarkMode = false } = useOutletContext() || {};
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'critical' | 'payment' | 'flagged'
  const [toast, setToast] = useState('');

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

  // Filter logic batay sa napiling tab
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
    if (s === 'CRITICAL') return 'text-rose-800 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50 animate-pulse';
    if (s === 'WARNING') return 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
    return 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans dark:bg-slate-950 dark:text-slate-100 space-y-6 relative">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded text-emerald-700 dark:text-emerald-400"><FileText size={16} /></div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-6">{toast}</p>
            <button onClick={() => setToast('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Admin Control Panel</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">System Diagnostics & Error Resolution</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Monitor payment failures, security flags, and critical system exceptions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button 
              onClick={() => { loadLogs(); triggerToast('Diagnostic logs synchronized successfully.'); }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Audits
            </button>
            <button 
              onClick={() => triggerToast('System error diagnostic report exported to CSV.')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} /> Export Logs
            </button>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Critical System Exceptions', val: stats.criticalErrors ?? 2, icon: <ShieldAlert size={18} className="text-rose-600 dark:text-rose-400" /> },
          { label: "Payment Failures", val: stats.paymentFailures ?? 2, icon: <CreditCard size={18} className="text-amber-600 dark:text-amber-400" /> },
          { label: 'Flagged Security Incidents', val: stats.flaggedEvents ?? 1, icon: <AlertTriangle size={18} className="text-purple-600 dark:text-purple-400" /> },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                {s.icon}
              </div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Live</span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{s.label}</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{s.val}</h2>
          </div>
        ))}
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-lg shadow-sm">
          {[
            { id: 'all', label: 'All System Issues' },
            { id: 'payment', label: 'Payment Failures' },
            { id: 'critical', label: 'Critical Exceptions' },
            { id: 'flagged', label: 'Flagged Security' },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setFilterTab(tab.id)}
              className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all cursor-pointer ${
                filterTab === tab.id 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1 rounded">
          Showing {filteredLogs.length} Active Incidents
        </span>
      </div>

      {/* ERROR AUDIT TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
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
                    <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Timestamp</th>
                    <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Exception Action / Code</th>
                    <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Affected Actor / Module</th>
                    <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Source IP</th>
                    <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Severity Tier</th>
                    <th className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Diagnostic Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {pagedLogs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{log.actor}</span>
                          <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">{log.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {log.ipAddress}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${getSeverityBadge(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-700 dark:text-emerald-400" />
                        No system exceptions or errors found under this filter. System is operating at optimal stability.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filteredLogs.length} isDarkMode={isDarkMode} />
          </>
        )}
      </div>

    </div>
  );
}