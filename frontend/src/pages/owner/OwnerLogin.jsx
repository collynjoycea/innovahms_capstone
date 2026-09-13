import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Globe, AlertCircle } from 'lucide-react';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import { isValidEmail, normalizeEmail } from '../../utils/authValidation';
import { persistOwnerSession, readOwnerSession } from '../../utils/ownerSession';

export default function OwnerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Validation & Submission States
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = readOwnerSession();
    if (session?.email && session?.isApproved) navigate('/owner');
  }, [navigate]);

  useEffect(() => {
    const approvalState = location.state;
    if (!approvalState?.approvalRequired) return;
    if (approvalState?.approvalStatus === 'REJECTED') {
      setFeedback('Your owner account was reviewed but not approved. Please contact the admin team.');
      return;
    }
    setFeedback('Your owner account is waiting for admin approval. Access remains restricted until authorized.');
  }, [location.state]);

  // Per-field validation logic
  const validateField = (name, value) => {
    let errorMsg = '';
    if (name === 'email') {
      const normalized = normalizeEmail(value);
      if (!normalized) {
        errorMsg = 'Corporate email address is required.';
      } else if (!isValidEmail(normalized)) {
        errorMsg = 'Please enter a valid corporate email address.';
      }
    } else if (name === 'password') {
      if (!value) {
        errorMsg = 'Security key/password is required.';
      } else if (value.length < 6) {
        errorMsg = 'Password must be at least 6 characters.';
      }
    }
    return errorMsg;
  };

  const validateForm = () => {
    const errors = {
      email: validateField('email', email),
      password: validateField('password', password),
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === 'email' ? email : password;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setFeedback('');
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateField('email', val) }));
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setFeedback('');
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validateField('password', val) }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFeedback('');
    setTouched({ email: true, password: true });

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const normalizedEmail = normalizeEmail(email);

    try {
      const response = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        try {
          persistOwnerSession(
            {
              ...(data?.owner || {}),
              loginTime: new Date().toISOString(),
            },
            { merge: false }
          );
          navigate('/owner');
        } catch {
          setFeedback('Unable to create browser session. Please clear site storage and try again.');
        }
      } else {
        if (response.status === 401) {
          setFeedback(data?.error || 'Invalid corporate email or password.');
        } else if (response.status === 403 && data?.code === 'OWNER_APPROVAL_REQUIRED') {
          setFeedback(
            data?.approvalStatus === 'REJECTED'
              ? 'Your owner account was reviewed but not approved. Please contact the admin team.'
              : (data?.error || 'Your owner account is waiting for admin approval.')
          );
        } else if (response.status >= 500) {
          setFeedback(data?.error || 'Server error. Ensure backend service is active.');
        } else {
          setFeedback(data?.error || `Authentication failed (${response.status})`);
        }
      }
    } catch {
      setFeedback('Cannot connect to the server. Please verify network connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-10">
        
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Owner Sign In
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your registered corporate credentials to access management tools.
          </p>
        </div>

        {/* FEEDBACK / ERROR ALERT */}
        {feedback && (
          <div className="mb-5 flex items-start gap-2.5 rounded-r border-l-4 border-red-600 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-800 dark:text-red-200">
            <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* EMAIL FIELD */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Corporate Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                placeholder="owner@gmail.com"
                className={`w-full rounded border py-2.5 pl-10 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors ${
                  touched.email && fieldErrors.email
                    ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                    : "border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                }`}
              />
            </div>
            {touched.email && fieldErrors.email && (
              <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* PASSWORD FIELD */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
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
                onChange={handlePasswordChange}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                style={{ WebkitTextSecurity: showPassword ? "none" : "disc" }}
                className={`w-full rounded border py-2.5 pl-10 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                  touched.password && fieldErrors.password
                    ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                    : "border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                }`}
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

          {/* SUBMIT BUTTON */}
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

        {/* FOOTER LINK */}
        <div className="mt-8 text-center border-t border-slate-200 dark:border-slate-800 pt-6">
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
        userType="owner"
        title="Owner Password Reset"
        initialEmail={email}
      />
    </div>
  );
}