import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, Globe, AlertCircle, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import { isValidEmail, normalizeEmail } from '../../utils/authValidation';
import { persistOwnerSession, readOwnerSession } from '../../utils/ownerSession';

const InputField = ({ label, type, icon, placeholder, value, onChange, isFocused, onFocus, onBlur, error, children }) => (
  <div className="group relative">
    <div className="flex justify-between items-center mb-1.5 px-0.5">
      <label className={`text-[11px] font-semibold tracking-wider uppercase transition-colors duration-200 ${
        error ? 'text-rose-600' : isFocused ? 'text-emerald-700' : 'text-slate-600'
      }`}>
        {label}
      </label>
    </div>
    
    <div className={`relative rounded-xl border transition-all duration-200 ${
      error
        ? 'border-rose-300 bg-rose-50/40 focus-within:ring-2 focus-within:ring-rose-500/20'
        : isFocused 
        ? 'border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-600/20' 
        : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'
    }`}>
      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
        error ? 'text-rose-500' : isFocused ? 'text-emerald-600' : 'text-slate-400'
      }`}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full py-3 pl-10 pr-10 bg-transparent text-slate-800 text-xs font-medium placeholder:text-slate-400 outline-none"
      />
      {children}
    </div>
    {error && (
      <p className="mt-1 text-[11px] font-medium text-rose-600 flex items-center gap-1">
        <span>{error}</span>
      </p>
    )}
  </div>
);

const OwnerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [focused, setFocused] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  // Validation & Submission States
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

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
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleBlur = (field) => {
    setFocused(null);
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = formData[field];
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFeedback('');
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
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
    const normalizedEmail = normalizeEmail(formData.email);

    try {
      const response = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email: normalizedEmail }),
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
    <div className="h-screen w-screen flex font-sans overflow-hidden bg-slate-50 fixed inset-0">
      
      {/* LEFT PANEL - ELEGANT DEEP FOREST GREEN BRANDING */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-14 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white relative overflow-hidden">
        
        {/* Glow ambient background elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-emerald-400 mb-10">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md shadow-inner">
              <Building2 size={24} />
            </div>
            <span className="font-extrabold tracking-widest text-xs uppercase text-emerald-300">INNOVA HMS</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold leading-tight text-white mb-4 tracking-tight">
            Property Owner & Management Access
          </h1>
          <p className="text-xs text-slate-300/80 leading-relaxed max-w-md font-normal">
            Streamlined revenue performance tracking, guest occupancy analytics, and enterprise hotel management tools.
          </p>
        </div>

        {/* Feature Highlights Card Container */}
        <div className="relative z-10 space-y-3.5 bg-slate-900/40 border border-emerald-500/10 backdrop-blur-md p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 text-xs text-slate-200">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={14} />
            </div>
            <span>Real-time financial & revenue analytics</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-200">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={14} />
            </div>
            <span>Encrypted owner session authentication</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-200">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={14} />
            </div>
            <span>Full operational oversight & room inventory control</span>
          </div>
        </div>

        {/* Security Footer */}
        <div className="relative z-10 flex items-center gap-2 text-[11px] text-emerald-400/70 pt-4">
          <ShieldCheck size={15} className="text-emerald-400" />
          <span>INNOVA Enterprise Security System</span>
        </div>
      </div>

      {/* RIGHT PANEL - CLEAN FORM */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-[400px]">
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In as Owner</h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Enter your registered corporate credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <InputField 
              label="Corporate Email" 
              type="email" 
              placeholder="owner@hotel-legacy.com"
              icon={<User size={16} />}
              value={formData.email}
              isFocused={focused === 'email'}
              onFocus={() => setFocused('email')}
              onBlur={() => handleBlur('email')}
              onChange={(e) => handleChange('email', e.target.value)}
              error={touched.email ? fieldErrors.email : ''}
            />

            <InputField 
              label="Security Key" 
              type={showPassword ? 'text' : 'password'} 
              placeholder="••••••••••••"
              icon={<Lock size={16} />}
              value={formData.password}
              isFocused={focused === 'pass'}
              onFocus={() => setFocused('pass')}
              onBlur={() => handleBlur('password')}
              onChange={(e) => handleChange('password', e.target.value)}
              error={touched.password ? fieldErrors.password : ''}
            >
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </InputField>

            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {feedback && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <span>{feedback}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 py-3 text-xs font-semibold text-white shadow-md shadow-emerald-900/10 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Authenticate & Access Portal</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 text-center border-t border-slate-100 pt-6">
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors"
            >
              <Globe size={14} /> 
              Return to Public Portal
            </button>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        userType="owner"
        title="Owner Password Reset"
        initialEmail={formData.email}
      />
    </div>
  );
};

export default OwnerLogin;