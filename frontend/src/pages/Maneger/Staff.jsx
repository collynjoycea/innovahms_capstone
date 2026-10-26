import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Timer, Star, Plus, Search, 
  Filter, Download, AlertCircle, CheckCircle2, X, Upload, Briefcase, Mail, User, Trash2, Calendar, Pencil, ChevronLeft, ChevronRight, Clock
} from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

const MANAGER_SESSION_KEY = 'managerSession';
const getLocalDateString = (value = new Date()) => {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};
const isSchedulableStaff = (staff) => {
  const role = String(staff.role || '').toLowerCase().replace(/[^a-z]/g, '');
  return role.includes('frontdesk') || role.includes('housekeeping') || role.includes('manager');
};
const WEEK_DAYS = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
];
const newDutySchedule = () => ({
  scheduleId: null,
  staffId: '',
  shiftDate: getLocalDateString(),
  shiftPreset: 'morning',
  shiftStart: '06:00',
  shiftEnd: '14:00',
  taskDescription: '',
  repeatDays: []
});

const Staff = () => {
  const navigate = useNavigate();
  const [staffData, setStaffData] = useState([]);
  const [dutySchedules, setDutySchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [analytics, setAnalytics] = useState({
    activeCount: 0,
    totalCount: 0,
    morningShiftCount: 0,
    afternoonShiftCount: 0,
    nightShiftCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [staffLoadError, setStaffLoadError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
  });

  // Form State for Adding Staff
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'Housekeeping',
    salary: ''
  });

  // Form State for Assigning Duty
  const [assignDuty, setAssignDuty] = useState(newDutySchedule);

  // Session Validation
  const getManagerSession = () => {
    const raw = localStorage.getItem(MANAGER_SESSION_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  };

  const managerSession = getManagerSession();
  const resolvedOwnerId = managerSession.ownerId ?? null;
  const resolvedManagerId = managerSession.id ?? null;

  const fetchData = async () => {
    if (!resolvedManagerId) {
      navigate('/staff/login', { replace: true });
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`/api/manager/staff/${resolvedManagerId}/directory`);
      setStaffData(res.data.staff || []);
      setDutySchedules(res.data.schedules || []);
      setStaffLoadError('');
      setAnalytics(res.data.analytics || {
        activeCount: 0,
        totalCount: 0,
        morningShiftCount: 0,
        afternoonShiftCount: 0,
        nightShiftCount: 0
      });
    } catch (err) {
      console.error("Error fetching staff data:", err);
      setStaffLoadError(err.response?.data?.error || 'Unable to load staff for this hotel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!resolvedManagerId) {
      navigate('/staff/login', { replace: true });
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [resolvedManagerId, navigate]);

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/manager/staff/${resolvedOwnerId}`, {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        salary: newStaff.salary
      });
      Swal.fire({
        title: 'Tagumpay!',
        text: 'Naidagdag na ang bagong staff member.',
        icon: 'success',
        confirmButtonColor: '#047857',
        customClass: { popup: 'rounded-lg' }
      });
      setIsAddModalOpen(false);
      setNewStaff({ name: '', email: '', role: 'Housekeeping', salary: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Nabigo',
        text: 'Hindi ma-save ang staff member.',
        icon: 'error',
        confirmButtonColor: '#047857',
        customClass: { popup: 'rounded-lg' }
      });
    }
  };

  const handleAssignDutySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        staffId: assignDuty.staffId,
        shiftDate: assignDuty.shiftDate,
        shiftStart: assignDuty.shiftStart,
        shiftEnd: assignDuty.shiftEnd,
        taskDescription: assignDuty.taskDescription,
        repeatDays: assignDuty.repeatDays || []
      };
      const response = assignDuty.scheduleId
        ? await axios.put(`/api/manager/staff/${resolvedManagerId}/duty-schedules/${assignDuty.scheduleId}`, payload)
        : await axios.post(`/api/manager/staff/${resolvedManagerId}/duty-schedules`, payload);
      Swal.fire({
        title: assignDuty.scheduleId ? 'Na-update ang Schedule' : 'Na-assign ang Schedule',
        text: response.data.notificationSent
          ? 'Naabisuhan na ang staff member.'
          : 'Na-save ang schedule, ngunit may problema sa abiso.',
        icon: response.data.notificationSent ? 'success' : 'warning',
        confirmButtonColor: '#047857',
        customClass: { popup: 'rounded-lg' }
      });
      setIsAssignModalOpen(false);
      setAssignDuty(newDutySchedule());
      fetchData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Nabigo',
        text: err.response?.data?.error || 'Hindi ma-save ang duty schedule. Subukan muli.',
        icon: 'error',
        confirmButtonColor: '#047857',
        customClass: { popup: 'rounded-lg' }
      });
    }
  };

  const openDutySchedule = (schedule = null) => {
    setAssignDuty(schedule ? {
      scheduleId: schedule.id,
      staffId: String(schedule.staffId),
      shiftDate: schedule.shiftDate,
      shiftPreset: 'custom',
      shiftStart: schedule.shiftStart,
      shiftEnd: schedule.shiftEnd,
      taskDescription: schedule.taskDescription,
      repeatDays: []
    } : newDutySchedule());
    setIsAssignModalOpen(true);
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    Swal.fire({
      title: `Tanggalin si ${staffName}?`,
      text: "Hindi na ito maibabalik. Ang staff member ay aalisin sa direktoryo.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Oo, Tanggalin',
      cancelButtonText: 'Kanselahin',
      customClass: {
        popup: 'rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900',
        title: 'font-bold text-slate-900 dark:text-white text-base',
        confirmButton: 'rounded px-4 py-2 font-bold text-xs',
        cancelButton: 'rounded px-4 py-2 font-bold text-xs'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`/api/manager/staff/${resolvedOwnerId}/${staffId}`);
          Swal.fire({
            title: 'Tanggal!',
            text: 'Naalis na ang staff member.',
            icon: 'success',
            confirmButtonColor: '#047857',
            customClass: { popup: 'rounded-lg' }
          });
          fetchData();
        } catch (err) {
          console.error(err);
          Swal.fire({
            title: 'Nabigo',
            text: 'Hindi matanggal ang staff member.',
            icon: 'error',
            confirmButtonColor: '#047857',
            customClass: { popup: 'rounded-lg' }
          });
        }
      }
    });
  };

  const filteredStaff = staffData.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper para makuha ang 7 araw ng kasalukuyang linggo simula Lunes
  const getWeekDaysArray = (startDate) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push({
        dateString: getLocalDateString(d),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    return days;
  };

  const currentWeekDays = getWeekDaysArray(currentWeekStart);

  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-800 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-6">
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Management</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Monitor performance, attendance, and shift assignments.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openDutySchedule()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Calendar size={15} /> Assign Duty
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus size={15} /> Add New Staff
            </button>
          </div>
        </div>

        {/* Analytics Card - Active Staff Only */}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-6">
          <StatCard label="Active Staff Today" val={`${analytics.activeCount} / ${analytics.totalCount}`} sub="Attendance Overview" badgeColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" borderLeft />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Staff Directory */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="text-emerald-800" size={18} /> Staff Directory
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input 
                  type="text" 
                  placeholder="Search staff..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none" 
                />
              </div>
            </div>

            {staffLoadError && (
              <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {staffLoadError}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="pb-3 font-semibold">Employee ID</th>
                    <th className="pb-3 font-semibold">Full Name</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Assigned Duty / Task</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredStaff.length > 0 ? filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono text-slate-500">#EMP-{staff.id}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {staff.image ? <img src={staff.image} alt="" className="w-full h-full rounded-full object-cover" /> : staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{staff.name}</p>
                            <p className="text-[10px] text-slate-500">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{staff.role}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {staff.assignedDuty || <span className="text-slate-400 italic">No duty assigned</span>}
                      </td>
                      <td className="py-3"><StatusBadge status={staff.status} /></td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="Remove Staff"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="py-8 text-center text-xs italic text-slate-500">No staff records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Today's Duty Roster */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-5 border-b border-slate-200 dark:border-slate-800 pb-3">Today's Duty Roster</h3>
            <div className="space-y-4">
              <ShiftBlock label="Morning Shift" time="06:00 - 14:00" count={analytics.morningShiftCount || 0} active={new Date().getHours() >= 6 && new Date().getHours() < 14} />
              <ShiftBlock label="Afternoon Shift" time="14:00 - 22:00" count={analytics.afternoonShiftCount || 0} active={new Date().getHours() >= 14 && new Date().getHours() < 22} />
              <ShiftBlock label="Night Shift" time="22:00 - 06:00" count={analytics.nightShiftCount || 0} active={new Date().getHours() >= 22 || new Date().getHours() < 6} />
            </div>
          </div>
        </div>

        {/* --- MALAKING WEEKLY CALENDAR VIEW PARA SA UPCOMING DUTY SCHEDULES --- */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-emerald-700 dark:text-emerald-400" size={20} /> Weekly Duty Schedule Calendar
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Kitang-kita ang iskedyul ng bawat staff para sa linggong ito.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded border border-emerald-200 dark:border-emerald-900">
                {currentWeekDays[0].formattedDate} – {currentWeekDays[6].formattedDate}, {currentWeekStart.getFullYear()}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
                <button
                  onClick={handlePrevWeek}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Nakaraang Linggo"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentWeekStart(new Date())}
                  className="px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Ngayon
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Susunod na Linggo"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid - 7 Columns para sa Lunes hanggang Linggo */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {currentWeekDays.map(({ dayName, formattedDate, dateString }) => {
              const daySchedules = dutySchedules.filter(s => s.shiftDate === dateString);
              const isToday = dateString === getLocalDateString();

              return (
                <div 
                  key={dateString}
                  className={`rounded-lg border p-3 flex flex-col min-h-[220px] transition-all ${
                    isToday 
                      ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-600' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{dayName}</span>
                      <p className="text-[10px] font-mono text-slate-500">{formattedDate}</p>
                    </div>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-800 text-white text-[9px] font-bold uppercase">Ngayon</span>
                    )}
                  </div>

                  {/* Shifts Cards List sa bawat araw */}
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {daySchedules.length > 0 ? (
                      daySchedules.map((schedule) => (
                        <div 
                          key={schedule.id}
                          onClick={() => openDutySchedule(schedule)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2.5 shadow-xs hover:border-emerald-600 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={schedule.staffName}>
                              {schedule.staffName}
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              {schedule.staffRole || 'Staff'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                            <Clock size={12} /> {schedule.shiftStart} - {schedule.shiftEnd}
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800 p-1 rounded">
                            {schedule.taskDescription || 'Duty'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center py-8 text-center">
                        <span className="text-[11px] italic text-slate-400">Walang naka-schedule</span>
                      </div>
                    )}
                  </div>

                  {/* Mabilis na button para magdagdag ng duty sa araw na ito */}
                  <button
                    onClick={() => {
                      setAssignDuty({ ...newDutySchedule(), shiftDate: dateString });
                      setIsAssignModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-600 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={13} /> Magdagdag
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- ADD STAFF MODAL --- */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Staff</h2>
                  <p className="text-[11px] text-slate-500">Personnel Onboarding</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddStaffSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Abby Conda"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input 
                      required
                      type="email" 
                      placeholder="abby@innova.com"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <select 
                        value={newStaff.role}
                        onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none cursor-pointer"
                      >
                        <option>Housekeeping</option>
                        <option>Maintenance</option>
                        <option>Front Desk</option>
                        <option>Manager</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Salary <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₱</span>
                      <input 
                        required
                        type="number" 
                        placeholder="0.00"
                        value={newStaff.salary}
                        onChange={(e) => setNewStaff({...newStaff, salary: e.target.value})}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded font-bold text-xs shadow-sm transition-colors mt-2 cursor-pointer"
                >
                  Confirm Registration
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- ASSIGN DUTY MODAL --- */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {assignDuty.scheduleId ? 'Update Duty Schedule' : 'Assign Duty Schedule'}
                  </h2>
                  <p className="text-[11px] text-slate-500">Choose the staff member, date, and working hours.</p>
                </div>
                <button
                  onClick={() => { setIsAssignModalOpen(false); setAssignDuty(newDutySchedule()); }}
                  className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssignDutySubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Staff Member <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={assignDuty.staffId}
                    onChange={(e) => setAssignDuty({...assignDuty, staffId: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Staff --</option>
                    {staffData.filter(isSchedulableStaff).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                  {!staffLoadError && staffData.filter(isSchedulableStaff).length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      {staffData.length > 0
                        ? 'No Front Desk or Housekeeping staff found for this hotel.'
                        : 'No staff accounts were returned for this hotel. Check the hotel staff directory.'}
                    </p>
                  )}
                  {staffLoadError && (
                    <p role="alert" className="mt-1 text-[11px] text-red-600">
                      Staff could not be loaded. Refresh the page or check the manager’s hotel assignment.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duty Date <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="date"
                    min={getLocalDateString()}
                    value={assignDuty.shiftDate}
                    onChange={(e) => setAssignDuty({...assignDuty, shiftDate: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Shift Template</label>
                  <select
                    value={assignDuty.shiftPreset}
                    onChange={(e) => {
                      const presets = {
                        morning: ['06:00', '14:00'],
                        afternoon: ['14:00', '22:00'],
                        night: ['22:00', '06:00']
                      };
                      const times = presets[e.target.value];
                      setAssignDuty({
                        ...assignDuty,
                        shiftPreset: e.target.value,
                        ...(times ? { shiftStart: times[0], shiftEnd: times[1] } : {})
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none cursor-pointer"
                  >
                    <option value="morning">Morning (06:00–14:00)</option>
                    <option value="afternoon">Afternoon (14:00–22:00)</option>
                    <option value="night">Night (22:00–06:00)</option>
                    <option value="custom">Custom hours</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Time <span className="text-red-500">*</span></label>
                    <input required type="time" value={assignDuty.shiftStart}
                      onChange={(e) => setAssignDuty({...assignDuty, shiftPreset: 'custom', shiftStart: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Time <span className="text-red-500">*</span></label>
                    <input required type="time" value={assignDuty.shiftEnd}
                      onChange={(e) => setAssignDuty({...assignDuty, shiftPreset: 'custom', shiftEnd: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duty / Assignment <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="text"
                    maxLength={500}
                    placeholder="e.g. Front desk coverage / Room 205 housekeeping"
                    value={assignDuty.taskDescription}
                    onChange={(e) => setAssignDuty({...assignDuty, taskDescription: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none"
                  />
                </div>

                {!assignDuty.scheduleId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Repeat on days of the week</label>
                    <div className="flex flex-wrap gap-2">
                      {WEEK_DAYS.map(({ label, value }) => {
                        const checked = (assignDuty.repeatDays || []).includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              const days = assignDuty.repeatDays || [];
                              setAssignDuty({
                                ...assignDuty,
                                repeatDays: checked ? days.filter(d => d !== value) : [...days, value]
                              });
                            }}
                            className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                              checked
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {(assignDuty.repeatDays || []).length > 0 && (
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Will assign for the selected days within the same week as the chosen date.
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-2.5 rounded font-bold text-xs shadow-sm transition-colors mt-2 cursor-pointer"
                >
                  {assignDuty.scheduleId ? 'Save Schedule Changes' : 'Assign Schedule & Notify Staff'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---
const StatCard = ({ label, val, sub, badgeColor, borderLeft }) => (
  <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm ${borderLeft ? 'border-l-4 border-l-emerald-800' : ''}`}>
    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">{label}</p>
    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{val}</h2>
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>{sub}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    'On Shift': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    'Delayed': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    'default': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${styles[status] || styles.default}`}>{status || 'Offline'}</span>;
};

const ShiftBlock = ({ label, time, count, active }) => (
  <div className={`border-l-2 pl-3 py-1 ${active ? 'border-emerald-800' : 'border-slate-200 dark:border-slate-800'}`}>
    <p className={`text-[10px] font-mono uppercase tracking-wider mb-0.5 ${active ? 'text-emerald-800 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
      {label} ({time}) {active && "| NOW"}
    </p>
    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{count} Staff Members</p>
  </div>
);

export default Staff;