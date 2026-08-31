import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  Key,
  Lock,
  Mail,
  Phone,
  User,
  AlertCircle
} from 'lucide-react';
import {
  normalizeEmail,
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidHotelCode,
  getPasswordStrengthMessage
} from '../../utils/authValidation';

const STAFF_ROLES = [
  'Hotel Manager',
  'Front Desk Operations',
  'Housekeeping & Maintenance',
  'Inventory & Supplies',
  'HR/Payroll Staff Management',
];

const STEPS = [
  { id: 1, title: "Staff Credentials" },
  { id: 2, title: "Hotel Verification" },
];

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  contactNumber: '',
  password: '',
  confirmPassword: '',
  role: '',
  hotelCode: '',
};

export default function StaffSignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const validateSingleField = (key, value, currentFormData = formData) => {
    let error = null;

    if (key === 'firstName') {
      if (!value.trim()) error = 'First name is required.';
      else if (value.trim().length < 2) error = 'Min 2 characters required.';
      else if (!isValidName(value)) error = 'Alphabetic characters only.';
    }

    if (key === 'lastName') {
      if (!value.trim()) error = 'Last name is required.';
      else if (value.trim().length < 2) error = 'Min 2 characters required.';
      else if (!isValidName(value)) error = 'Alphabetic characters only.';
    }

    if (key === 'role') {
      if (!value) error = 'Please select a role.';
    }

    if (key === 'email') {
      if (!value.trim()) error = 'Email address is required.';
      else if (!isValidEmail(value)) error = 'Enter a valid email address';
    }

    if (key === 'contactNumber') {
      if (!value.trim()) error = 'Contact number is required.';
      else if (value.length !== 11 || !value.startsWith('09')) {
        error = 'Must be 11 digits starting with 09.';
      } else if (!isValidPhone(value)) {
        error = 'Invalid contact number format.';
      }
    }

    if (key === 'hotelCode') {
      if (!value.trim()) error = 'Hotel verification code is required.';
      else if (!isValidHotelCode(value)) error = 'Invalid format (e.g. INNOVAHMS-123).';
    }

    if (key === 'password') {
      if (!value) {
        error = 'Password is required.';
      } else {
        error = getPasswordStrengthMessage(value);
      }
    }

    if (key === 'confirmPassword') {
      if (!value) {
        error = 'Please confirm your password.';
      } else if (value !== currentFormData.password) {
        error = 'Passwords do not match.';
      }
    }

    return error;
  };

  const updateField = (key, value) => {
    let sanitizedValue = value;

    if (key === 'firstName' || key === 'lastName') {
      sanitizedValue = value.replace(/[^a-zA-Z\sÃ±Ã‘-]/g, '');
    } else if (key === 'contactNumber') {
      sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 11);
    } else if (key === 'hotelCode') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    }

    const updatedFormData = { ...formData, [key]: sanitizedValue };
    setFormData(updatedFormData);

    if (touchedFields[key]) {
      const err = validateSingleField(key, sanitizedValue, updatedFormData);
      setFieldErrors((prev) => ({ ...prev, [key]: err }));
    }

    if (key === 'password' && touchedFields.confirmPassword) {
      const confirmErr = validateSingleField('confirmPassword', updatedFormData.confirmPassword, updatedFormData);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleBlur = (key) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    const err = validateSingleField(key, formData[key]);
    setFieldErrors((prev) => ({ ...prev, [key]: err }));
  };

  const validateAllFields = () => {
    const errors = {};
    const allTouched = {};
    const keys = ['firstName', 'lastName', 'role', 'email', 'contactNumber', 'hotelCode', 'password', 'confirmPassword'];

    keys.forEach((key) => {
      allTouched[key] = true;
      const err = validateSingleField(key, formData[key]);
      if (err) errors[key] = err;
    });

    setTouchedFields(allTouched);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!validateAllFields()) {
      setErrorMessage('Please fix all highlighted input errors.');
      return;
    }

    setIsSubmitting(true);
    const normalizedForm = {
      ...formData,
      email: normalizeEmail(formData.email),
      hotelCode: formData.hotelCode.trim().toUpperCase(),
      otpCode,
    };

    try {
      if (!otpSent) {
        const otpResponse = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userType: 'staff', email: normalizedForm.email }),
        });
        const otpResult = await otpResponse.json().catch(() => ({}));
        if (!otpResponse.ok) {
          setErrorMessage(otpResult.error || 'Unable to send Gmail verification OTP.');
          return;
        }
        setOtpSent(true);
        setErrorMessage('OTP sent to your Gmail. Enter it below, then submit again.');
        return;
      }
      if (!/^\d{6}$/.test(otpCode)) {
        setErrorMessage('Enter the 6-digit Gmail verification OTP.');
        return;
      }
      const response = await fetch('/api/staff/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(normalizedForm),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(result.error || 'Failed to register staff account.');
        return;
      }

      navigate('/staff/login');
    } catch {
      setErrorMessage('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
      
      {/* Main Registration Area */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Title & Progress Tracker */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Staff Member Registration Form
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Complete all required staff details and hotel verification code for account activation.
          </p>

          {/* Steps Indicator Bar (Kagaya sa Owner SignUp) */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {STEPS.map((s, idx) => {
              const isActive = idx === 0; // Highlight first step as active
              return (
                <div
                  key={s.id}
                  className={`p-2.5 rounded border text-left text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400"
                  }`}
                >
                  <span className="block text-[10px] font-mono uppercase text-slate-400">Step 0{s.id}</span>
                  <span className="truncate block">{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Alert</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          
          {/* Main Card Container */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-800 text-white rounded-full inline-flex items-center justify-center text-[11px] font-bold">1</span>
                Account Details & Verification
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Provide your employee information, role assignment, and hotel code.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* First Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Juan"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                      touchedFields.firstName && fieldErrors.firstName
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.firstName && fieldErrors.firstName && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.firstName}
                  </span>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Dela Cruz"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                      touchedFields.lastName && fieldErrors.lastName
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.lastName && fieldErrors.lastName && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.lastName}
                  </span>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Business Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="staff@hoteldomain.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                      touchedFields.email && fieldErrors.email
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.email && fieldErrors.email && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact / Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    maxLength={11}
                    placeholder="09171234567"
                    value={formData.contactNumber}
                    onChange={(e) => updateField('contactNumber', e.target.value)}
                    onBlur={() => handleBlur('contactNumber')}
                    className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                      touchedFields.contactNumber && fieldErrors.contactNumber
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.contactNumber && fieldErrors.contactNumber && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.contactNumber}
                  </span>
                )}
              </div>

              {/* Assigned Staff Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Staff Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <select
                    value={formData.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    onBlur={() => handleBlur('role')}
                    className={`w-full pl-9 pr-8 py-2 border text-xs rounded appearance-none focus:outline-none transition-colors ${
                      touchedFields.role && fieldErrors.role
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <option value="" disabled>
                      Select role assignment
                    </option>
                    {STAFF_ROLES.map((role) => (
                      <option key={role} value={role} className="dark:bg-slate-800 dark:text-white">
                        {role}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3 top-2.5 text-slate-400" />
                </div>
                {touchedFields.role && fieldErrors.role && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.role}
                  </span>
                )}
              </div>

              {/* Hotel Verification Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hotel Verification Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Key size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. INNOVAHMS-123"
                    value={formData.hotelCode}
                    onChange={(e) => updateField('hotelCode', e.target.value)}
                    onBlur={() => handleBlur('hotelCode')}
                    className={`w-full pl-9 pr-3 py-2 border text-xs font-mono uppercase rounded focus:outline-none transition-colors ${
                      touchedFields.hotelCode && fieldErrors.hotelCode
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.hotelCode && fieldErrors.hotelCode && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.hotelCode}
                  </span>
                )}
              </div>

              {otpSent && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gmail Verification OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
                    className="w-full rounded border border-emerald-500 bg-emerald-50 px-3 py-2 text-center text-sm font-black tracking-[0.35em] outline-none dark:bg-emerald-950/30"
                    placeholder="123456"
                  />
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">Check your Gmail inbox for the 6-digit code.</p>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="At least 8 characters, with letters and numbers"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                      touchedFields.password && fieldErrors.password
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.password && fieldErrors.password && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                      touchedFields.confirmPassword && fieldErrors.confirmPassword
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>

            </div>
          </section>

          {/* Form Bottom Action Controls */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already registered?{' '}
              <Link to="/staff/login" className="font-bold text-emerald-800 dark:text-emerald-400 hover:underline">
                Sign in here
              </Link>
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Registering Account...' : 'Continue Registration'}
              <ArrowRight size={14} />
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
