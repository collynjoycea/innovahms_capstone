import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import useStaffSession from '../../../hooks/useStaffSession';
import { Download, FileText } from 'lucide-react';

const columns = ['Completed', 'Room', 'Task', 'Staff', 'Status', 'Notes'];
const exportValues = (item) => [
  item.completed_at ? new Date(item.completed_at).toLocaleString() : '',
  item.room_label || '',
  item.task_type || '',
  item.staff_name || '',
  item.status || '',
  item.notes || '',
];

const HKHistory = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs } = useStaffSession();
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios.get(`/api/housekeeping/history${qs}`)
      .then(res => {
        if (!active) return;
        setHistoryData(res.data.history || []);
        setError('');
      })
      .catch(e => {
        if (active) setError(e.response?.data?.error || 'Could not load task history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [qs]);

  const downloadCsv = () => {
    const rows = [columns, ...historyData.map(exportValues)];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `housekeeping-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Housekeeping Task History', 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [columns],
      body: historyData.map(exportValues),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [47, 160, 132] },
    });
    doc.save(`housekeeping-history-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f4f4f7]',
    card: isDarkMode ? 'bg-[#111111]/90 backdrop-blur-xl border-white/5' : 'bg-white border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
    textMain: isDarkMode ? 'text-white' : 'text-zinc-900',
    textSub: isDarkMode ? 'text-zinc-500' : 'text-zinc-500',
    border: isDarkMode ? 'border-white/5' : 'border-zinc-200',
  };

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-8 ${theme.border} mb-8`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Task <span className="text-[#6FCF97]">History</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-2`}>
            Completed housekeeping assignments
          </p>
        </div>
        <div className="flex gap-3 mt-6 md:mt-0">
          <button type="button" onClick={downloadCsv} disabled={!historyData.length}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${theme.border} ${theme.card} ${theme.textMain} text-[10px] font-black uppercase tracking-widest hover:border-[#6FCF97]/50 disabled:opacity-40`}>
            <Download size={16} /> CSV
          </button>
          <button type="button" onClick={downloadPdf} disabled={!historyData.length}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${theme.border} ${theme.card} ${theme.textMain} text-[10px] font-black uppercase tracking-widest hover:border-[#6FCF97]/50 disabled:opacity-40`}>
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      <div className={`${theme.card} border rounded-3xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} border-b ${theme.border}`}>
                {columns.map(column => <th key={column} className="px-6 py-5">{column}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={columns.length} className={`px-6 py-12 text-center text-sm ${theme.textSub}`}>Loading history...</td></tr>
              ) : error ? (
                <tr><td colSpan={columns.length} role="alert" className="px-6 py-12 text-center text-sm text-red-500">{error}</td></tr>
              ) : historyData.length === 0 ? (
                <tr><td colSpan={columns.length} className={`px-6 py-12 text-center text-sm ${theme.textSub}`}>No completed tasks yet.</td></tr>
              ) : historyData.map(item => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className={`px-6 py-4 text-xs ${theme.textSub}`}>{exportValues(item)[0] || '—'}</td>
                  <td className={`px-6 py-4 text-xs font-black ${theme.textMain}`}>{item.room_label || '—'}</td>
                  <td className={`px-6 py-4 text-xs font-bold ${theme.textMain}`}>{item.task_type || '—'}</td>
                  <td className={`px-6 py-4 text-xs ${theme.textSub}`}>{item.staff_name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                      {item.status || 'Completed'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-xs ${theme.textSub}`}>{item.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className={`mt-4 text-right text-[10px] font-bold ${theme.textSub}`}>{historyData.length} records</p>
    </div>
  );
};

export default HKHistory;
