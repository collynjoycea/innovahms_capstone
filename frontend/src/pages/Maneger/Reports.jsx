import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  CalendarDays,
  Download,
  FileText,
  Package,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readManagerSession } from './managerSession';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

const formatPeso = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? pesoFormatter.format(amount) : null;
};

const formatDate = (value) => {
  if (!value) return null;
  const datePart = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return String(value);
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (value) => {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(String(value));
  if (!match) return String(value);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return String(value);

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${match[2]} ${period}`;
};

const formatSchedule = (date, time) => {
  const formattedDate = formatDate(date);
  if (!formattedDate) return null;
  return `${formattedDate} · ${formatTime(time) || 'Time not recorded'}`;
};

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const reportDefinitions = [
  {
    key: 'revenue',
    title: 'Revenue and Reservations',
    description: 'Revenue derived from reservation payments and downpayments recorded within the selected period.',
    columns: [
      { key: 'bookingNumber', label: 'Booking No.' },
      { key: 'guestName', label: 'Guest Name' },
      { key: 'recordDate', label: 'Booking Date', value: (row) => formatDate(row.recordDate) },
      { key: 'checkInDate', label: 'Check-in Date & Time', value: (row) => formatSchedule(row.checkInDate, row.checkInTime) },
      { key: 'checkOutDate', label: 'Check-out Date & Time', value: (row) => formatSchedule(row.checkOutDate, row.checkOutTime) },
      { key: 'reservationStatus', label: 'Booking Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'totalAmount', label: 'Total Amount', value: (row) => formatPeso(row.totalAmount) },
      { key: 'depositAmount', label: 'Downpayment', value: (row) => formatPeso(row.depositAmount) },
      { key: 'amountReceived', label: 'Collected Revenue', value: (row) => formatPeso(row.amountReceived) },
    ],
  },
  {
    key: 'inventory',
    title: 'Current Supply Inventory',
    description: 'Snapshot of stock levels at the time of loading; not restricted by the selected date range.',
    columns: [
      { key: 'sku', label: 'SKU' },
      { key: 'itemName', label: 'Item Name' },
      { key: 'category', label: 'Category' },
      { key: 'stockLevel', label: 'In Stock' },
      { key: 'unit', label: 'Unit' },
      { key: 'reorderPoint', label: 'Reorder Point' },
      { key: 'unitCost', label: 'Unit Cost', value: (row) => formatPeso(row.unitCost) },
      { key: 'supplier', label: 'Supplier' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Date Created' },
      { key: 'updatedAt', label: 'Last Updated' },
      { key: 'lastMovementAt', label: 'Last Stock Movement' },
    ],
  },
  {
    key: 'stockMovements',
    title: 'Stock Movements',
    description: 'Actual IN, OUT, and ADJUST movements recorded within the selected period.',
    columns: [
      { key: 'recordDate', label: 'Movement Date' },
      { key: 'itemName', label: 'Item' },
      { key: 'sku', label: 'SKU' },
      { key: 'movementType', label: 'Type' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'unitCost', label: 'Unit Cost', value: (row) => formatPeso(row.unitCost) },
      { key: 'department', label: 'Department' },
      { key: 'reason', label: 'Reason' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'purchaseOrderNumber', label: 'Purchase Order No.' },
      { key: 'notes', label: 'Notes' },
      { key: 'performedBy', label: 'Performed By' },
    ],
  },
  {
    key: 'purchaseOrders',
    title: 'Purchase Orders',
    description: 'Purchase orders created within the selected period, including expected and received dates.',
    columns: [
      { key: 'purchaseOrderNumber', label: 'Purchase Order No.' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'status', label: 'Status' },
      { key: 'totalAmount', label: 'Total Amount', value: (row) => formatPeso(row.totalAmount) },
      { key: 'recordDate', label: 'Creation Date' },
      { key: 'expectedDate', label: 'Expected Date' },
      { key: 'receivedDate', label: 'Received Date' },
      { key: 'notes', label: 'Notes' },
    ],
  },
];

const rawValueForColumn = (row, column) => {
  const value = column.value ? column.value(row) : row[column.key];
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  return value;
};

const valueForColumn = (row, column) => {
  const value = rawValueForColumn(row, column);
  return value === null ? 'Not recorded' : String(value);
};

const columnsWithData = (report, rows) => (
  rows.length === 0
    ? report.columns
    : report.columns.filter((column) => rows.some((row) => rawValueForColumn(row, column) !== null))
);

const exportReport = (report, rows, range, format, generatedAt) => {
  const safeTitle = report.title.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  const filename = report.key === 'inventory'
    ? `${safeTitle}_snapshot_${generatedAt?.slice(0, 10) || 'date-not-recorded'}`
    : `${safeTitle}_${range.from}_to_${range.to}`;
  const columns = columnsWithData(report, rows);

  if (format === 'csv') {
    const escapeCSV = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvRows = [
      columns.map((column) => escapeCSV(column.label)).join(','),
      ...rows.map((row) => columns
        .map((column) => escapeCSV(valueForColumn(row, column)))
        .join(',')),
    ];
    const blob = new Blob([`\uFEFF${csvRows.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return;
  }

  try {
    const doc = new jsPDF({ orientation: columns.length > 7 ? 'landscape' : 'portrait' });
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 2, 'F');
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(report.title, 14, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      report.key === 'inventory'
        ? `Inventory snapshot: ${generatedAt ? new Date(generatedAt).toLocaleString() : 'Not recorded'}`
        : `Report Date Range: ${range.from} to ${range.to}`,
      14,
      25,
    );
    doc.text(`Total Records: ${rows.length}`, 14, 31);
    autoTable(doc, {
      head: [columns.map((column) => column.label)],
      body: rows.map((row) => columns.map((column) => valueForColumn(row, column))),
      startY: 38,
      styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    });
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Unable to export manager report PDF.', error);
    window.alert('Unable to export PDF. Please try again.');
  }
};

const ReportTable = ({ report, rows, range, loading, generatedAt }) => {
  const columns = columnsWithData(report, rows);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">{report.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{report.description}</p>
          <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {rows.length} record{rows.length === 1 ? '' : 's'}
            {report.key !== 'inventory' && ` · ${range.from} to ${range.to}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => exportReport(report, rows, range, 'csv', generatedAt)}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={13} /> CSV
          </button>
          <button
            type="button"
            onClick={() => exportReport(report, rows, range, 'pdf', generatedAt)}
            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row, index) => (
              <tr key={row.reservationId || row.itemId || row.movementId || row.purchaseOrderId || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium">{valueForColumn(row, column)}</td>
                ))}
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400">
                  No records found in this report for the selected period.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400 animate-pulse">
                  Fetching records...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default function Reports() {
  const session = readManagerSession() || {};
  const managerId = session.id;
  const today = getLocalDate();
  const [fromDate, setFromDate] = useState(() => getLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toDate, setToDate] = useState(today);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReports = async (range = { from: fromDate, to: toDate }) => {
    if (!managerId) {
      setError('Manager session not found. Please log in again before opening reports.');
      return;
    }
    if (!range.from || !range.to || range.from > range.to) {
      setError('Please select a valid date range. The "From" date must not be later than the "To" date.');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);
    try {
      const response = await axios.get('/api/manager/reports/manager-data', {
        params: { manager_id: managerId, from: range.from, to: range.to },
      });
      setReportData(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to fetch reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [managerId]);

  const data = reportData || {};
  const summary = data.summary || {};
  const rowsByReport = {
    revenue: data.revenue || [],
    inventory: data.inventory || [],
    stockMovements: data.stockMovements || [],
    purchaseOrders: data.purchaseOrders || [],
  };
  const range = reportData?.range || { from: fromDate, to: toDate };

  if (loading && !reportData) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 font-sans">
       <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="text-slate-500 font-mono text-[11px] uppercase tracking-[0.2em] animate-pulse">Loading Reports Dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans dark:bg-slate-950 dark:text-slate-100 space-y-6">
      <main className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Manager Control Panel</span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Revenue & Supply Reports</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Actual hotel records and inventory movements for the selected period.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadReports()}
              disabled={loading}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Reports
            </button>
          </div>
        </div>

        {/* DATE RANGE FILTER CONTROLS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold"><CalendarDays size={13} /> From Date</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded text-xs outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold"><CalendarDays size={13} /> To Date</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={today}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded text-xs outline-none"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => loadReports({ from: fromDate, to: toDate })}
            disabled={loading || !fromDate || !toDate || fromDate > toDate}
            className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <TrendingUp size={14} className="text-emerald-700 dark:text-emerald-400" /> Apply Filter
          </button>
          {reportData?.generatedAt && (
            <p className="text-[10px] font-mono text-slate-400 sm:ml-auto self-center">
              Inventory snapshot: {new Date(reportData.generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 font-bold">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SUMMARY METRICS CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Collected Revenue" value={formatPeso(summary.totalRevenue)} icon={<TrendingUp size={18} />} />
          <SummaryCard title="Current Inventory Items" value={summary.inventoryItems ?? 0} icon={<Package size={18} />} />
          <SummaryCard title="Stock Movements in Range" value={summary.stockMovements ?? 0} icon={<RefreshCw size={18} />} />
          <SummaryCard title="Purchase Orders in Range" value={summary.purchaseOrders ?? 0} icon={<FileText size={18} />} detail={formatPeso(summary.purchaseOrderTotal) || 'Not recorded'} />
        </section>

        {/* DETAILED TABLES */}
        <div className="space-y-6">
          {reportDefinitions.map((report) => (
            <ReportTable
              key={report.key}
              report={report}
              rows={rowsByReport[report.key]}
              range={range}
              loading={loading}
              generatedAt={data.generatedAt}
            />
          ))}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          Note: There is no separate standalone payment timestamp column in the database. Consequently, revenue is calculated based on actual booking payments/downpayments recorded within the selected date range, clearly indicating the booking record date.
        </p>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, icon, detail }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
          {icon}
        </div>
        <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Metric Summary</span>
      </div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{title}</p>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h2>
      {detail && <p className="mt-1 text-[11px] text-slate-500 font-medium">Total PO amount: {detail}</p>}
    </div>
  );
}