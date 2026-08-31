import React, { useState, useEffect } from 'react';
import { 
  Users, Timer, Star, Plus, Search, 
  Filter, Download, AlertCircle, CheckCircle2, X, Upload, Briefcase, Mail, User
} from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

const Staff = () => {
  const [staffData, setStaffData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [analytics, setAnalytics] = useState({
    activeCount: 0,
    totalCount: 0,
    avgCleaningSpeed: '0m',
    avgRating: 0,
    payrollProjection: 0,
    baseSalary: 0,
    bonuses: 0,
    tardinessCount: 0,
    overtimeHours: 0,
    cleaningProgress: [] 
  });
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Adding Staff
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'Housekeeping',
    salary: ''
  });

  const ownerId = JSON.parse(localStorage.getItem('ownerUser'))?.id || 1;
  const resolvedOwnerId = JSON.parse(localStorage.getItem('ownerSession'))?.id || ownerId;

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/owner/staff/${resolvedOwnerId}`);
      setStaffData(res.data.staff || []);
      setAnalytics(res.data.analytics || {
        activeCount: 0,
        totalCount: 0,
        avgCleaningSpeed: '0m',
        avgRating: 0,
        payrollProjection: 0,
        baseSalary: 0,
        bonuses: 0,
        tardinessCount: 0,
        overtimeHours: 0,
        cleaningProgress: []
      });
      setLoading(false);
    } catch (err) {
      console.error("Error fetching staff data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/owner/staff/${resolvedOwnerId}`, {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        salary: newStaff.salary
      });
      Swal.fire({
        title: 'Success!',
        text: 'New staff member has been added.',
        icon: 'success',
        confirmButtonColor: '#047857',
        customClass: { popup: 'rounded-lg' }
      });
      setIsAddModalOpen(false);
      setNewStaff({ name: '', email: '', role: 'Housekeeping', salary: '' });
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Failed',
        text: 'Unable to save staff member.',
        icon: 'error',
        confirmButtonColor: '#047857',
        customClass: { popup: 'rounded-lg' }
      });
    }
  };

  const handleGeneratePayslips = async () => {
    Swal.fire({
      title: 'Generate Payslips?',
      text: "This will process digital payslips for the current cycle and notify staff.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#047857',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Generate',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900',
        title: 'font-bold text-slate-900 dark:text-white text-base',
        confirmButton: 'rounded px-4 py-2 font-bold text-xs',
        cancelButton: 'rounded px-4 py-2 font-bold text-xs'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Processing...',
          html: 'Generating payroll data and sending emails.',
          timer: 2000,
          timerProgressBar: true,
          didOpen: () => { Swal.showLoading() }
        }).then(() => {
          Swal.fire({
            title: 'Success!',
            text: 'Payslips have been generated and sent to staff emails.',
            icon: 'success',
            confirmButtonColor: '#047857',
            customClass: { popup: 'rounded-lg' }
          });
        });
      }
    });
  };

  const filteredStaff = staffData.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-800 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans p-6">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Management</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Monitor performance, attendance, and payroll operations.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={15} /> Add New Staff
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Staff Today" val={`${analytics.activeCount} / ${analytics.totalCount}`} sub="Attendance" badgeColor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" />
          <StatCard label="Avg Cleaning Speed" val={analytics.avgCleaningSpeed || '0m'} sub="Efficiency" badgeColor="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" />
          <StatCard label="Guest Rating Avg" val={`${analytics.avgRating?.toFixed(1) || '0.0'} / 5.0`} sub="Performance" badgeColor="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" />
          <StatCard label="Payroll Projection" val={`PHP ${analytics.payrollProjection?.toLocaleString() || '0'}`} sub="Current Cycle" badgeColor="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" borderLeft />
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

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="pb-3 font-semibold">Employee ID</th>
                    <th className="pb-3 font-semibold">Full Name</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Performance</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredStaff.length > 0 ? filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono text-slate-500">#EMP-{staff.id}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                            {staff.image ? <img src={staff.image} alt="" className="w-full h-full rounded-full object-cover" /> : staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{staff.name}</p>
                            <p className="text-[10px] text-slate-500">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{staff.role}</td>
                      <td className="py-3 font-semibold text-emerald-800 dark:text-emerald-400">
                        <div className="flex items-center gap-1">{staff.rating || '0.0'} <Star size={12} fill="currentColor" /></div>
                      </td>
                      <td className="py-3"><StatusBadge status={staff.status} /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="py-8 text-center text-xs italic text-slate-500">No staff records found.</td></tr>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cleaning Progress */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center mb-5 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Cleaning Operations Progress</h3>
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Live Tracking</span>
            </div>
            <div className="space-y-4">
              {analytics.cleaningProgress?.length > 0 ? analytics.cleaningProgress.map((wing, idx) => (
                <ProgressBar key={idx} label={wing.name} progress={wing.percentage} />
              )) : (
                <div className="py-8 text-center text-xs italic text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded">Waiting for real-time task data...</div>
              )}
            </div>
          </div>

          {/* Financial & Payroll Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-5 border-b border-slate-200 dark:border-slate-800 pb-3">Financial & Payroll Summary</h3>
            <div className="space-y-3 mb-5">
              <AlertItem icon={<AlertCircle className="text-red-600" size={15}/>} label={`${analytics.tardinessCount || 0} Tardiness Recorded`} action="Review" color="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" />
              <AlertItem icon={<Timer className="text-amber-600" size={15}/>} label={`${analytics.overtimeHours || 0}h Overtime Logged`} action="Details" color="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" />
            </div>
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4 mb-5">
              <div className="flex justify-between text-xs"><span className="text-slate-500">Base Salary:</span><span className="font-bold text-slate-700 dark:text-slate-300">PHP {analytics.baseSalary?.toLocaleString() || '0.00'}</span></div>
              <div className="flex items-center justify-between pt-1"><span className="text-sm font-bold text-slate-900 dark:text-white">Estimated Total:</span><span className="text-lg font-bold text-emerald-800 dark:text-emerald-400">PHP {analytics.payrollProjection?.toLocaleString() || '0.00'}</span></div>
            </div>
            <button onClick={handleGeneratePayslips} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded font-bold text-xs shadow-sm transition-colors">
              Generate Current Cycle Payslips
            </button>
          </div>
        </div>

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
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddStaffSubmit} className="p-5 space-y-4">
                {/* Name Input */}
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

                {/* Email Input */}
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
                  {/* Role Selection */}
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

                  {/* Salary Input */}
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

                {/* Submit Button */}
                <button 
                  type="submit"
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded font-bold text-xs shadow-sm transition-colors mt-2"
                >
                  Confirm Registration
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

const ProgressBar = ({ label, progress }) => (
  <div>
    <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
      <span>{label}</span><span>{progress}%</span>
    </div>
    <div className="h-1.5 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="h-full bg-emerald-800 transition-all duration-1000" style={{ width: `${progress}%` }} />
    </div>
  </div>
);

const AlertItem = ({ icon, label, action, color }) => (
  <div className={`flex justify-between items-center p-3 rounded text-xs ${color}`}>
    <div className="flex items-center gap-2">{icon}<span className="font-semibold">{label}</span></div>
    <button className="text-[10px] font-bold underline uppercase hover:opacity-80">{action}</button>
  </div>
);

export default Staff;