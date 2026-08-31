import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp,
  Activity, Play, Download, RefreshCw, AlertTriangle, Search, FileText, CheckCircle2, ArrowLeft, Filter
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

const formatSimulationMetric = (value, type = 'percent') => {
  if (value === null || value === undefined || value === '') return '--';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '--';

  if (type === 'currency') {
    const sign = numericValue > 0 ? '+' : '';
    return `${sign}${pesoFormatter.format(numericValue)}`;
  }

  const sign = numericValue > 0 ? '+' : '';
  return `${sign}${numericValue.toFixed(1)}%`;
};

const toSearchable = (value) => String(value ?? '').toLowerCase();

const Reports = () => {
  const ownerSession = (() => {
    try {
      return JSON.parse(localStorage.getItem('ownerSession') || '{}');
    } catch {
      return {};
    }
  })();
  const ownerId = ownerSession?.id;
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [simValue, setSimValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSimAlert, setShowSimAlert] = useState(false);
  
  // --- NAVIGATION & FILTERING STATES ---
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard | table-view
  const [activeCategory, setActiveCategory] = useState(null);
  const [roomTypeFilter, setRoomTypeFilter] = useState("All");

  useEffect(() => {
    fetchReportData();
    const interval = setInterval(fetchReportData, 15000);
    const onFocus = () => fetchReportData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [resStats, resLogs] = await Promise.all([
        axios.get('/api/reports/full-stats', { params: ownerId ? { owner_id: ownerId } : {} }),
        axios.get('/api/reports/transactions', { params: ownerId ? { owner_id: ownerId } : {} })
      ]);
      setData(resStats.data);
      setLogs(resLogs.data);
    } catch (err) {
      console.error("Error loading dynamic reports", err);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCTIONAL EXPORTS ---
  const exportCSV = () => {
    const headers = ["Event,Customer,Value,Status,Time\n"];
    const rows = logs.map(log => `${log.event},${log.user},${log.value},${log.status},${log.time}\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Transaction_Report_${new Date().toLocaleDateString()}.csv`);
    a.click();
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const safeLogs = logs || [];

      doc.setFillColor(13, 148, 136); // Emerald theme accent
      doc.rect(0, 0, 210, 2, 'F'); 

      doc.setTextColor(15, 23, 42); 
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("VELORA", 14, 20);
      
      doc.setFillColor(13, 148, 136);
      doc.circle(53, 18, 1, 'F');

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150, 150, 150);
      doc.text("PREMIUM ANALYTICS REPORT", 14, 28);

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`ISSUED: ${new Date().toLocaleDateString()}`, 160, 20);
      doc.text(`REF: ${new Date().getTime()}`, 160, 25);

      const tableColumn = ["EVENT TYPE", "CUSTOMER / STAFF", "VALUE", "STATUS", "TIMESTAMP"];
      const tableRows = safeLogs.map(log => [
        String(log.event || 'N/A').toUpperCase(), 
        String(log.user || 'SYSTEM'), 
        String(log.value || '-'), 
        String(log.status || 'N/A').toUpperCase(), 
        String(log.time || '---')
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
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
          cellPadding: 6
        },
        columnStyles: {
          2: { fontStyle: 'bold', textColor: [15, 23, 42] },
          3: { fontStyle: 'bold' }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const status = data.cell.raw;
            if (status === 'CONFIRMED' || status === 'SUCCESS') {
              doc.setTextColor(16, 185, 129);
            } else if (status === 'ALERT') {
              doc.setTextColor(239, 68, 68);
            }
          }
        },
        margin: { left: 14, right: 14 }
      });

      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Hotel Velora Luxury Residences - Confidential Document - Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
      }

      doc.save(`Velora_Emerald_Report_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("PDF Design Error:", err);
      alert("Technical issue with Emerald PDF styling.");
    }
  };

  const handleRunSimulation = () => {
    setShowSimAlert(true);
    axios.post('/api/reports/simulate', { delta: simValue, owner_id: ownerId })
      .then((res) => {
        setData((prev) => ({
          ...(prev || {}),
          simulation_results: res.data || {},
        }));
      })
      .catch(() => null);
    setTimeout(() => setShowSimAlert(false), 4000);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      toSearchable(log.event).includes(searchTerm.toLowerCase()) ||
      toSearchable(log.user).includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, logs]);

  const dynamicTableData = useMemo(() => {
    if (!activeCategory || !data?.details) return [];
    const list = data.details[activeCategory] || [];
    return list.filter(item => {
      const matchesSearch = [
        item.customerName,
        item.customerId,
        item.roomId,
        item.hotelId,
        item.status,
      ].some(value => toSearchable(value).includes(searchTerm.toLowerCase()));
      const matchesRoom = roomTypeFilter === "All" ? true : item.roomType === roomTypeFilter;
      return matchesSearch && matchesRoom;
    });
  }, [data, activeCategory, searchTerm, roomTypeFilter]);

  const handleCardClick = (categoryKey) => {
    setActiveCategory(categoryKey);
    setSearchTerm("");
    setCurrentView("table-view");
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 font-sans">
       <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="text-slate-500 font-mono text-[11px] uppercase tracking-[0.2em] animate-pulse">Initializing System...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-4 sm:p-8">
      
      {/* SIMULATION ALERT BANNER */}
      <AnimatePresence>
        {showSimAlert && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 z-[99] flex -translate-x-1/2 items-center gap-4 rounded border border-emerald-500 bg-emerald-950 px-6 py-3 text-white shadow-xl"
          >
            <div className="p-1.5 bg-emerald-800 rounded animate-pulse"><RefreshCw size={16} /></div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-300">Simulation Active</p>
              <p className="text-xs font-bold">Recalculating metrics for {simValue}% price delta...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            {currentView === "table-view" && (
              <button 
                onClick={() => setCurrentView("dashboard")}
                className="p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                {currentView === "dashboard" ? "Establishment Analytics & Reports" : activeCategory?.replace(/_/g, ' ')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-600 rounded-full inline-block animate-pulse" />
                {currentView === "dashboard" ? "Live system performance monitoring and projections." : "Detailed property records view."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV} className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5">
              <Download size={13}/> Export CSV
            </button>
            <button onClick={exportPDF} className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5">
              <FileText size={13}/> Export PDF
            </button>
            <button onClick={fetchReportData} className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-bold shadow-sm flex items-center gap-1.5">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""}/> Refresh Data
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentView === "dashboard" ? (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              
              {/* SECTION 1: METRICS STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Reservations" value={data?.summary?.total_res} change={data?.summary?.res_change} isUp={true} onClick={() => handleCardClick("total_reservations")} />
                <StatCard title="Today's Check-ins" value={data?.summary?.today_checkins} sub={`${data?.summary?.pending || 0} pending arrivals`} onClick={() => handleCardClick("today_checkins")} />
                <StatCard title="Available Rooms" value={data?.summary?.available} sub={`${data?.summary?.occupancy || 0}% Occupancy`} highlight onClick={() => handleCardClick("available_rooms")} />
                <StatCard title="Today's Check-outs" value={data?.summary?.today_checkouts} live onClick={() => handleCardClick("today_checkouts")} />
              </div>

              {/* SECTION 2: LOGS & OPERATIONAL CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Real-time Logs Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity size={16} className="text-emerald-700"/> Real-time Transaction Logs
                    </h3>
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search event or user..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded focus:outline-none" 
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                          <th className="text-left pb-3">Event Type</th>
                          <th className="text-left pb-3">Staff / User</th>
                          <th className="text-left pb-3">Value</th>
                          <th className="text-left pb-3">Status</th>
                          <th className="text-right pb-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredLogs.map((log, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 font-semibold text-slate-800 dark:text-white">{log.event}</td>
                            <td className="py-3 text-emerald-700 dark:text-emerald-400 font-medium">{log.user}</td>
                            <td className="py-3 font-bold text-slate-900 dark:text-slate-100">{log.value}</td>
                            <td className="py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                log.status === 'CONFIRMED' || log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 
                                log.status === 'ALERT' || log.status === 'STOCK OUT' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>{log.status}</span>
                            </td>
                            <td className="py-3 text-right text-slate-400 font-mono text-[11px]">{log.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Operational Sidebar Cards */}
                <div className="space-y-4">
                  <OperationalCard 
                    title="Inventory Alert" 
                    alert={data?.operational?.inventory?.stock} 
                    alertItem={data?.operational?.inventory?.item} 
                  />
                  <OperationalCard 
                    title="Payroll & Attendance" 
                    sub={data?.operational?.staff?.next_date ? `Next Distribution: ${data.operational.staff.next_date}` : "Next Distribution: --"} 
                    val={formatPeso(data?.operational?.staff?.payroll)} 
                    percentage={data?.operational?.staff?.attendance ?? null} 
                    label="Attendance Rate" 
                  />
                </div>
              </div>

              {/* SECTION 3: SIMULATION ENGINE */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded"><Play size={16} fill="currentColor"/></div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">System Simulation Engine</h3>
                    <p className="text-[11px] text-slate-500">Run price adjustment "what-if" impact analysis models.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-4">Parameters</p>
                    <div className="mb-6">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Price Delta: ({simValue}%)</label>
                      <input 
                        type="range" min="-50" max="50" value={simValue}
                        className="w-full accent-emerald-700 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                        onChange={(e) => setSimValue(parseInt(e.target.value))}
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                        <span>-50%</span><span>BASE</span><span>+50%</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleRunSimulation}
                      className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded text-xs shadow-sm"
                    >
                      Run Simulation
                    </button>
                  </div>

                  <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SimBox title="Revenue Impact" value={formatSimulationMetric(data?.simulation_results?.revenue, "currency")} status="Forecasted Delta" />
                    <SimBox title="Occupancy" value={formatSimulationMetric(data?.simulation_results?.occupancy)} status="Predicted Volume" />
                    <SimBox title="Workload" value={formatSimulationMetric(data?.simulation_results?.workload)} status="Staffing Needs" />
                    <SimBox title="Supply Chain" value={formatSimulationMetric(data?.simulation_results?.velocity)} status="Stock Burn Rate" />
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            
            /* TABLE VIEW FOR CARDS */
            <motion.div key="table" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input 
                      type="text" 
                      placeholder="Search record by name or ID..." 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded focus:outline-none" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded">
                    <Filter size={13} className="text-slate-400" />
                    <select 
                      onChange={(e) => setRoomTypeFilter(e.target.value)}
                      className="bg-transparent text-xs font-semibold uppercase outline-none cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <option value="All">All Room Types</option>
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="Suite">Suite</option>
                      <option value="Deluxe">Deluxe</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                        <th className="pb-3">Hotel ID</th>
                        <th className="pb-3">Room ID</th>
                        <th className="pb-3">Customer ID</th>
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Check-in</th>
                        <th className="pb-3">Check-out</th>
                        <th className="pb-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {dynamicTableData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 font-mono text-slate-500">{row.hotelId}</td>
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">{row.roomId}</td>
                          <td className="py-3 font-mono text-emerald-700 dark:text-emerald-400">{row.customerId ?? '--'}</td>
                          <td className="py-3 font-bold uppercase text-slate-800 dark:text-slate-200">{row.customerName}</td>
                          <td className="py-3 font-medium text-slate-600 dark:text-slate-400">{row.status || '--'}</td>
                          <td className="py-3 font-mono text-[11px] text-slate-500">{row.checkInDate || '--'}</td>
                          <td className="py-3 font-mono text-[11px] text-slate-500">{row.checkOutDate || '--'}</td>
                          <td className="py-3 text-right font-bold text-slate-900 dark:text-white">{formatPeso(row.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dynamicTableData.length === 0 && (
                    <div className="py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400">No records found for this category</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const StatCard = ({ title, value, change, sub, isUp, live, highlight, onClick }) => (
  <div 
    onClick={onClick}
    className={`cursor-pointer rounded-lg border p-4 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-emerald-600 ${highlight ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}
  >
    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">{title}</p>
    <div className="flex items-center gap-3">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value ?? 0}</h2>
      {change && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isUp ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'}`}>
          <TrendingUp size={10} /> {change}
        </span>
      )}
      {live && (
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-emerald-600 uppercase">Live</span>
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
    {sub && <p className="mt-2 text-[11px] font-medium text-slate-500">{sub}</p>}
  </div>
);

const OperationalCard = ({ title, alert, alertItem, sub, val, percentage, label }) => {
  const isInventory = title === "Inventory Alert";
  const numericAlert = Number(alert ?? 0);
  const numericPercentage = Number.isFinite(Number(percentage)) ? Number(percentage) : null;
  
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
      <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-4">{title}</h4>
      {isInventory ? (
        <div className={`rounded border p-3.5 ${numericAlert > 0 && numericAlert < 30 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-bold uppercase ${numericAlert > 0 && numericAlert < 30 ? 'text-red-700 dark:text-red-400' : 'text-slate-500'}`}>
              {numericAlert > 0 && numericAlert < 30 ? 'Critical Stock' : 'Stock Level'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${numericAlert > 0 && numericAlert < 30 ? 'bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {alert ?? '--'} LEFT
            </span>
          </div>
          <p className="text-xs font-bold uppercase text-slate-800 dark:text-white">{alertItem || 'No Alerts'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400">{label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{numericPercentage === null ? '--' : `${numericPercentage}%`}</p>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{val}</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${numericPercentage ?? 0}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-emerald-700"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
        </div>
      )}
    </div>
  );
};

const SimBox = ({ title, value, status }) => {
  return (
    <div className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{title}</p>
        <CheckCircle2 size={14} className="text-emerald-700" />
      </div>
      <h4 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{value || '--'}</h4>
      <p className="text-[10px] font-mono mt-1 uppercase tracking-wider text-slate-500">{status}</p>
    </div>
  );
};

export default Reports;