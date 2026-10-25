import React, { useState, useEffect } from 'react';
import {
  Users, Timer, Star, Plus, Search, AlertCircle, X,
  Briefcase, Mail, User, Phone, Lock, ShieldCheck, Send, Eye, EyeOff
} from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

// Role values MUST match what the backend / staff login expects.
const STAFF_ROLE_OPTIONS = [
  { value: 'Hotel Manager', label: 'Manager' },
  { value: 'Front Desk Operations', label: 'Front Desk' },
  { value: 'Housekeeping & Maintenance', label: 'Housekeeper' },
];

const OTP_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  role: '',
  email: '',
  firstName: '',
  lastName: '',
  contactNumber: '',
  password: '',
};

const passwordIssues = (value) => {
  const issues = [];
  if (value.length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(value)) issues.push('one uppercase letter');
  if (!/[a-z]/.test(value)) issues.push('one lowercase letter');
  if (!/\d/.test(value)) issues.push('one number');
  if (!/[^A-Za-z0-9]/.test(value)) issues.push('one special character');
  return issues;
};

const swalBase = {
  confirmButtonColor: '#047857',
  customClass: { popup: 'rounded-lg' },
};

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

  // --- Add staff modal state ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = email & role, 2 = OTP, 3 = optional info
  const [form, setForm] = useState(EMPTY_FORM);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(''); // '', 'send', 'verify', 'create'
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const ownerId = JSON.parse(localStorage.getItem('ownerUser'))?.id || 1;
  const resolvedOwnerId = JSON.parse(localStorage.getItem('ownerSession'))?.id || ownerId;

  // Only the first load shows the full-screen spinner. Background refreshes must stay
  // silent, otherwise the modal (and the OTP the owner is typing) disappears every 15s.
  const fetchData = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
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
    } catch (err) {
      console.error('Error fetching staff data:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 15000);
    const onFocus = () => fetchData(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Resend-OTP countdown
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const updateForm = (key, value) => {
    let next = value;
    if (key === 'firstName' || key === 'lastName') next = value.replace(/[^a-zA-Z\sñÑ.'-]/g, '');
    if (key === 'contactNumber') next = value.replace(/[^0-9]/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, [key]: next }));
    setFormError('');
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setOtp('');
    setStep(1);
    setCooldown(0);
    setFormError('');
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (busy) return;
    setIsAddModalOpen(false);
  };

  // Step 1 -> sends the OTP to the STAFF's email
  const handleSendOtp = async () => {
    const email = form.email.trim().toLowerCase();
    if (!form.role) return setFormError('Select a role for the new staff.');
    if (!EMAIL_PATTERN.test(email)) return setFormError('Enter a valid email address.');

    setBusy('send');
    setFormError('');
    try {
      await axios.post(`/api/owner/staff/${resolvedOwnerId}/send-otp`, { email });
      setForm((prev) => ({ ...prev, email }));
      setOtp('');
      setCooldown(OTP_COOLDOWN_SECONDS);
      setStep(2);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to send the OTP. Please try again.');
    } finally {
      setBusy('');
    }
  };

  // Step 2 -> confirms the OTP the staff received
  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return setFormError('Enter the 6-digit code sent to the staff email.');

    setBusy('verify');
    setFormError('');
    try {
      await axios.post(`/api/owner/staff/${resolvedOwnerId}/verify-otp`, {
        email: form.email,
        otpCode: otp,
      });
      setStep(3);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to verify the code.');
    } finally {
      setBusy('');
    }
  };

  // Step 3 -> creates the account; backend then emails the hotel code + login details
  const handleCreateStaff = async (e) => {
    e.preventDefault();

    if (form.firstName.trim() && form.firstName.trim().length < 2) return setFormError('First name needs at least 2 letters.');
    if (form.lastName.trim() && form.lastName.trim().length < 2) return setFormError('Last name needs at least 2 letters.');
    if (form.contactNumber && !/^09\d{9}$/.test(form.contactNumber)) return setFormError('Contact number must be 11 digits starting with 09.');
    if (form.password) {
      const issues = passwordIssues(form.password);
      if (issues.length) return setFormError(`Password must contain ${issues.join(', ')}.`);
    }

    setBusy('create');
    setFormError('');
    try {
      const res = await axios.post(`/api/owner/staff/${resolvedOwnerId}`, {
        email: form.email,
        role: form.role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        contactNumber: form.contactNumber,
        password: form.password, // blank = backend generates a temporary password
      });

      setIsAddModalOpen(false);
      fetchData(false);

      if (res.data?.emailSent) {
        Swal.fire({
          ...swalBase,
          title: 'Staff added',
          text: `The hotel code and login details were emailed to ${form.email}.`,
          icon: 'success',
        });
      } else {
        const retry = await Swal.fire({
          ...swalBase,
          title: 'Staff added, email not sent',
          text: `The account was created but we could not email ${form.email}. Send the login details again?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Resend email',
          cancelButtonText: 'Later',
          cancelButtonColor: '#64748b',
        });
        if (retry.isConfirmed && res.data?.staffId) {
          await resendCredentials({ id: res.data.staffId, email: form.email }, true);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Unable to save the staff member.');
    } finally {
      setBusy('');
    }
  };

  // Generates a NEW temporary password and emails it with the hotel code
  const resendCredentials = async (staff, skipConfirm = false) => {
    if (!skipConfirm) {
      const confirm = await Swal.fire({
        ...swalBase,
        title: 'Resend login details?',
        text: `A new temporary password will be generated and emailed to ${staff.email}. The old password will stop working.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, resend',
        cancelButtonColor: '#64748b',
      });
      if (!confirm.isConfirmed) return;
    }
    try {
      await axios.post(`/api/owner/staff/${resolvedOwnerId}/${staff.id}/resend-credentials`);
      Swal.fire({ ...swalBase, title: 'Sent', text: `Login details emailed to ${staff.email}.`, icon: 'success' });
    } catch (err) {
      Swal.fire({
        ...swalBase,
        title: 'Failed',
        text: err.response?.data?.error || 'Unable to send the email. Check the SMTP settings.',
        icon: 'error',
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
    (staff.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (staff.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (staff.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-800 border-t-transparent"></div>
    </div>
  );

  const inputClass = 'w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-700';
  const stepTitles = ['Email & Role', 'Verify Email', 'Staff Info'];

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
            onClick={openAddModal}
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
                    <th className="pb-3 font-semibold">Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredStaff.length > 0 ? filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 font-mono text-slate-500">#EMP-{staff.id}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                            {staff.image ? <img src={staff.image} alt="" className="w-full h-full rounded-full object-cover" /> : (staff.name || '?').charAt(0).toUpperCase()}
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
                      <td className="py-3">
                        <button
                          onClick={() => resendCredentials(staff)}
                          className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 underline hover:opacity-80"
                        >
                          Resend
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

        {/* --- ADD STAFF MODAL (3 steps) --- */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Add New Staff</h2>
                  <p className="text-[11px] text-slate-500">Step {step} of 3: {stepTitles[step - 1]}</p>
                </div>
                <button
                  onClick={closeAddModal}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="grid grid-cols-3 gap-1 px-5 pt-4">
                {stepTitles.map((title, idx) => (
                  <div key={title} className={`h-1 rounded ${idx + 1 <= step ? 'bg-emerald-800' : 'bg-slate-200 dark:bg-slate-800'}`} />
                ))}
              </div>

              <div className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* STEP 1: role + email */}
                {step === 1 && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={15} />
                        <select
                          value={form.role}
                          onChange={(e) => updateForm('role', e.target.value)}
                          className={`${inputClass} cursor-pointer`}
                        >
                          <option value="" disabled>Select role</option>
                          {STAFF_ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Gmail <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 text-slate-400" size={15} />
                        <input
                          type="email"
                          placeholder="staff@gmail.com"
                          value={form.email}
                          onChange={(e) => updateForm('email', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">We will email a 6-digit code to this address to confirm it belongs to the staff.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={busy === 'send'}
                      className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Send size={14} /> {busy === 'send' ? 'Sending code...' : 'Send verification code'}
                    </button>
                  </>
                )}

                {/* STEP 2: OTP */}
                {step === 2 && (
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      A 6-digit code was sent to <span className="font-bold">{form.email}</span>. Ask the staff for the code and enter it below. It expires in 5 minutes.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Verification code <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-2.5 text-slate-400" size={15} />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setFormError(''); }}
                          className={`${inputClass} font-mono tracking-[0.4em]`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={busy === 'verify'}
                      className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
                    >
                      {busy === 'verify' ? 'Verifying...' : 'Verify email'}
                    </button>

                    <div className="flex items-center justify-between text-[11px]">
                      <button type="button" onClick={() => { setStep(1); setFormError(''); }} className="text-slate-500 hover:underline">
                        Change email
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={cooldown > 0 || busy === 'send'}
                        className="font-bold text-emerald-800 dark:text-emerald-400 hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 3: optional info */}
                {step === 3 && (
                  <form onSubmit={handleCreateStaff} className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs">
                      <ShieldCheck size={15} className="shrink-0" />
                      <span><span className="font-bold">{form.email}</span> is verified.</span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Everything below is optional. The staff can complete their own details from their profile after logging in.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 text-slate-400" size={15} />
                          <input type="text" placeholder="e.g. Juan" value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Last name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 text-slate-400" size={15} />
                          <input type="text" placeholder="e.g. Dela Cruz" value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-slate-400" size={15} />
                        <input type="tel" maxLength={11} placeholder="09171234567" value={form.contactNumber} onChange={(e) => updateForm('contactNumber', e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 text-slate-400" size={15} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Leave blank to auto-generate"
                          value={form.password}
                          onChange={(e) => updateForm('password', e.target.value)}
                          className={`${inputClass} pr-9`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">The password is emailed to the staff together with the hotel code.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={busy === 'create'}
                      className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2.5 rounded font-bold text-xs shadow-sm transition-colors mt-2 disabled:opacity-50"
                    >
                      {busy === 'create' ? 'Adding staff...' : 'Add staff & email login details'}
                    </button>
                  </form>
                )}
              </div>
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