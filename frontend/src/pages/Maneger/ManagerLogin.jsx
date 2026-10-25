import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Globe, AlertCircle, Building2 } from 'lucide-react';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import { isValidEmail, normalizeEmail } from '../../utils/authValidation';
import { persistManagerSession, readManagerSession } from './managerSession';

const HOTEL_CODE_PATTERN = /^(?:INNOVAHMS-\d+|DEMO-OWNER-\d+)$/i;

export default function ManagerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hotelCode, setHotelCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false, hotelCode: false });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = readManagerSession();
    if (session?.id && session?.ownerId) navigate('/manager');
  }, [navigate]);

  const validateField = (name, value) => {
    if (name === 'email') {
      const normalized = normalizeEmail(value);
      if (!normalized) return 'Manager email address is required.';
      if (!isValidEmail(normalized)) return 'Please enter a valid email address.';
    }
    if (name === 'password') {
      if (!value) return 'Password is required.';
      if (value.length < 6) return 'Password must be at least 6 characters.';
    }
    if (name === 'hotelCode') {
      if (!value.trim()) return 'Hotel code is required.';
      if (!HOTEL_CODE_PATTERN.test(value.trim())) return 'Use a valid hotel code, such as INNOVAHMS-123.';
    }
    return '';
  };

  const valuesByField = { email, password, hotelCode };

  const validateForm = () => {
    const errors = {
      email: validateField('email', email),
      password: validateField('password', password),
      hotelCode: validateField('hotelCode', hotelCode),
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password && !errors.hotelCode;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, valuesByField[field]) }));
  };

  const handleChange = (field, setter) => (e) => {
    const val = field === 'hotelCode' ? e.target.value.toUpperCase() : e.target.value;
    setter(val);
    setFeedback('');
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFeedback('');
    setTouched({ email: true, password: true, hotelCode: true });
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/manager/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizeEmail(email),
          password,
          hotelCode: hotelCode.trim().toUpperCase(),
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        try {
          persistManagerSession({ ...(data?.manager || {}), loginTime: new Date().toISOString() }, { merge: false });
          navigate('/manager');
        } catch {
          setFeedback('Unable to create browser session. Please clear site storage and try again.');
        }
      } else if (response.status === 401) {
        setFeedback(data?.error || 'Invalid email, password, or hotel code.');
      } else if (response.status === 403) {
        setFeedback(data?.error || 'This account is not allowed to use the manager portal.');
      } else if (response.status >= 500) {
        setFeedback(data?.error || 'Server error. Ensure backend service is active.');
      } else {
        setFeedback(data?.error || `Authentication failed (${response.status})`);
      }
    } catch {
      setFeedback('Cannot connect to the server. Please verify network connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field, extra = '') =>
    `w-full rounded border py-2.5 pl-10 ${extra} text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors ${
      touched[field] && fieldErrors[field]
        ? 'border-red-500 bg-red-50/20 text-red-900 dark:text-red-200'
        : 'border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
    }`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-10">
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Manager Sign In</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your manager credentials and hotel code to access management tools.
          </p>
        </div>

        {feedback && (
          <div className="mb-5 flex items-start gap-2.5 rounded-r border-l-4 border-red-600 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-800 dark:text-red-200">
            <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* HOTEL CODE */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Hotel Code</label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={hotelCode}
                onChange={handleChange('hotelCode', setHotelCode)}
                onBlur={() => handleBlur('hotelCode')}
                placeholder="INNOVAHMS-123"
                className={inputClass('hotelCode', 'pr-3 uppercase')}
              />
            </div>
            {touched.hotelCode && fieldErrors.hotelCode && (
              <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">{fieldErrors.hotelCode}</p>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Manager Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={handleChange('email', setEmail)}
                onBlur={() => handleBlur('email')}
                placeholder="manager@gmail.com"
                className={inputClass('email', 'pr-3')}
              />
            </div>
            {touched.email && fieldErrors.email && (
              <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handleChange('password', setPassword)}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                className={`${inputClass('password', 'pr-10')} [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && fieldErrors.password && (
              <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-200 dark:border-slate-800 pt-6 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            New manager?{' '}
            <button
              type="button"
              onClick={() => navigate('/manager/signup')}
              className="font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              Create a manager account
            </button>
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors"
          >
            <Globe size={14} />
            Back Home
          </button>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        userType="staff"
        title="Manager Password Reset"
        initialEmail={email}
      />
    </div>
  );
}
