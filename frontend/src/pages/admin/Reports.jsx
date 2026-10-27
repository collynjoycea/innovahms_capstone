import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp,
  Download, RefreshCw, Search, FileText, Calendar, Building2, DollarSign
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

const formatPeso = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? pesoFormatter.format(numericValue) : '--';
};

const toSearchable = (value) => String(value ?? '').toLowerCase();

const Reports = () => {
  const managerSession = (() => {
    try {
      return JSON.parse(localStorage.getItem('managerSession') || '{}');
    } catch {
      return {};
    }
  })();
  const ownerId = managerSession?.ownerId;
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRevenueReportData();
  }, []);

  const fetchRevenueReportData = async () => {
    setLoading(true);
    try {
      // Kumukuha ng data para sa mga subscription at revenue ng mga hotel
      const res = await axios.get('/api/admin/packages', { params: ownerId ? { owner_id: ownerId } : {} });
      setSubscriptions(res.data?.subscriptions || []);
    } catch (err) {
      console.error("Error loading revenue reports", err);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  // --- CSV EXPORT FUNCTION ---
  const exportCSV = () => {
    if (filteredSubscriptions.length === 0) {
      alert("Walang data na ma-export.");
      return;
    }

    const headers = ["Hotel Name,Owner Name,Plan,Billing Cycle,Amount (PHP),Status,Renewal Date\n"];
    const rows = filteredSubscriptions.map(sub => 
      `"${sub.hotelName || ''}","${sub.ownerName || ''}","${sub.plan || ''}","${sub.cycle || ''}",${sub.amount || 0},"${sub.status || ''}","${sub.renewal || ''}"\n`
    );
    
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Revenue_Subscription_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- PDF EXPORT FUNCTION ---
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const safeSubs = filteredSubscriptions || [];

      doc.setFillColor(13, 148, 136); // Emerald theme accent
      doc.rect(0, 0, 210, 2, 'F'); 

      doc.setTextColor(15, 23, 42); 
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("INNOVA-HMS", 14, 20);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150, 150, 150);
      doc.text("REVENUE & SUBSCRIPTION REPORT", 14, 26);

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`ISSUED: ${new Date().toLocaleDateString()}`, 150, 20);

      const tableColumn = ["HOTEL NAME", "OWNER", "PLAN", "CYCLE", "AMOUNT (PHP)", "STATUS", "RENEWAL"];
      const tableRows = safeSubs.map(sub => [
        String(sub.hotelName || 'N/A'),
        String(sub.ownerName || 'N/A'),
        String(sub.plan || 'N/A').toUpperCase(),
        String(sub.cycle || 'N/A').toUpperCase(),
        formatPeso(sub.amount),
        String(sub.status || 'N/A').toUpperCase(),
        String(sub.renewal ? new Date(sub.renewal).toLocaleDateString() : '---')
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'plain',
        headStyles: { 
          fillColor: [255, 255, 255],
          textColor: [13, 148, 136],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left',
          lineWidth: { bottom: 0.5 },
          lineColor: { bottom: [13, 148, 136] }
        },
        bodyStyles: { 
          fontSize: 8,
          textColor: [71, 85, 105],
          cellPadding: 5
        },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Revenue_Report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("PDF Design Error:", err);
      alert("May problema sa pag-generate ng PDF.");
    }
  };

  // --- FILTERING LOGIC ---
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => 
      toSearchable(sub.hotelName).includes(searchTerm.toLowerCase()) ||
      toSearchable(sub.ownerName).includes(searchTerm.toLowerCase()) ||
      toSearchable(sub.plan).includes(searchTerm.toLowerCase()) ||
      toSearchable(sub.status).includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, subscriptions]);

  // Total Revenue calculation
  const totalRevenue = useMemo(() => {
    return subscriptions
      .filter(sub => String(sub.status).toUpperCase() === 'ACTIVE')
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [subscriptions]);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
       <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">Loading Revenue Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans dark:bg-[#0f1117] dark:text-slate-100 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Admin Control Panel</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Revenue & Subscription Reports</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Subscribed hotels, payment statuses, subscription dates, and total revenue tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportCSV} className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer">
              <Download size={14}/> Export CSV
            </button>
            <button onClick={exportPDF} className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer">
              <FileText size={14}/> Export PDF
            </button>
            <button onClick={fetchRevenueReportData} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
              <DollarSign size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Active</span>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Total Revenue (Active)</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatPeso(totalRevenue)}</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
              <Building2 size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Subscribed</span>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Total Subscribed Hotels</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{subscriptions.length}</h2>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
              <Calendar size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Status</span>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Active Subscriptions</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {subscriptions.filter(s => String(s.status).toUpperCase() === 'ACTIVE').length}
          </h2>
        </div>
      </div>

      {/* SUBSCRIPTION & REVENUE TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Hotel Subscriptions & Revenue Logs
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              List of all hotels, subscription plans, billing cycle, amount paid, and renewal dates.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search hotel, owner, plan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded focus:outline-none text-slate-900 dark:text-slate-100" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">Hotel Name</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">Owner / Contact</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">Plan / Tier</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">Billing Cycle</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right font-bold text-slate-400 uppercase tracking-wider">Next Renewal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubscriptions.map((sub, i) => (
                <tr key={sub.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{sub.hotelName || '—'}</td>
                  <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{sub.ownerName || '—'}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                      {sub.plan || 'Standard'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-mono uppercase text-slate-600 dark:text-slate-400">{sub.cycle || 'Monthly'}</td>
                  <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{formatPeso(sub.amount)}</td>
                  <td className="px-6 py-3.5">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${
                      String(sub.status).toUpperCase() === 'ACTIVE' 
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' 
                        : 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                    }`}>
                      {sub.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-[11px] text-slate-500">
                    {sub.renewal ? new Date(sub.renewal).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}

              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400">
                    Walang nakitang data ng subscription o revenue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default Reports;