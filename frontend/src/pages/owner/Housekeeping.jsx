import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertCircle, BedDouble, CheckCircle2, Clock3, RefreshCcw, Sparkles, Filter, Search } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All Tasks" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const formatStamp = (value) => {
  if (!value) return "No timestamp";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const getStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (normalized === "in_progress") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
};

export default function Housekeeping() {
  const { isDarkMode } = useOutletContext() || { isDarkMode: false };
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRooms: 0, cleanedToday: 0, pending: 0, inProgress: 0 });
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const ownerSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("ownerSession") || "{}");
    } catch {
      return {};
    }
  }, []);

  const fetchHousekeepingData = async () => {
    const hotelId = ownerSession?.hotelId || ownerSession?.hotel_id;
    if (!hotelId) {
      setTasks([]);
      setSummary({ totalRooms: 0, cleanedToday: 0, pending: 0, inProgress: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [statsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/housekeeping/dashboard-stats?hotel_id=${hotelId}`),
        fetch(`/api/housekeeping/tasks?hotel_id=${hotelId}`),
      ]);
      const statsData = await statsResponse.json().catch(() => ({}));
      const tasksData = await tasksResponse.json().catch(() => ({}));
      const nextTasks = Array.isArray(tasksData.tasks) ? tasksData.tasks : [];

      setSummary({
        totalRooms: Array.isArray(statsData.roomGrid) ? statsData.roomGrid.length : 0,
        cleanedToday: Number(statsData.completedToday || 0),
        pending: Number(statsData.pendingTasks || 0),
        inProgress: Number(statsData.inProgress || 0),
      });
      setTasks(
        nextTasks.map((task) => ({
          id: task.id,
          room: task.room_label || "--",
          type: task.task_type || "General cleaning",
          status: String(task.status || "pending").toLowerCase().replace(/\s+/g, "_"),
          assignedTo: task.staff_name || "Unassigned",
          priority: task.priority || "NORMAL",
          notes: task.notes || "No notes added.",
          updatedAt: task.completed_at || task.scheduled_time || task.created_at || "",
        }))
      );
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeepingData();
    const timer = window.setInterval(fetchHousekeepingData, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesFilter = activeFilter === "all" || task.status === activeFilter;
      const matchesSearch = `${task.room} ${task.type} ${task.assignedTo}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [tasks, activeFilter, searchTerm]);

  const cards = [
    { label: "Total Rooms", value: summary.totalRooms, icon: BedDouble },
    { label: "Cleaned Today", value: summary.cleanedToday, icon: CheckCircle2 },
    { label: "In Progress", value: summary.inProgress, icon: Clock3 },
    { label: "Pending", value: summary.pending, icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-4 md:p-8">
      <main className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Housekeeping Command Center</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Live task statuses, room turnaround, and staff assignments connected to housekeeping database endpoints.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchHousekeepingData}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <RefreshCcw size={14} /> Refresh Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                <span className="text-emerald-700 dark:text-emerald-400"><Icon size={16} /></span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{value}</h3>
            </div>
          ))}
        </div>

        {/* Task Queue Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 p-6 gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Housekeeping Workload</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                Showing {filteredTasks.length} active tasks
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Search input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search room, staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                      activeFilter === filter.key
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Task List / Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading housekeeping data...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No tasks matched the current filter or search criteria.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Room & Details</th>
                    <th className="py-4 px-3">Assigned Staff</th>
                    <th className="py-4 px-3">Status</th>
                    <th className="py-4 px-3">Priority / Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{task.room}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{task.type}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{task.notes}</div>
                      </td>
                      <td className="py-4 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {task.assignedTo}
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-flex rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusTone(task.status)}`}>
                          {task.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{formatStamp(task.updatedAt)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">Priority: {task.priority}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}