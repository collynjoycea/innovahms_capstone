import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, Building2, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isValidEmail, normalizeEmail } from '../../utils/authValidation';

const HOTEL_CODE_PATTERN = /^(?:INNOVAHMS-\d+|DEMO-OWNER-\d+)$/i;
const NAME_PATTERN = /^[A-Za-zÀ-ÿ'’.\- ]{2,}$/;
const PHONE_PATTERN = /^(?:\+63|0)9\d{9}$/;

const passwordIssues = (value) => {
  const issues = [];
  if (value.length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(value)) issues.push('one uppercase letter');
  if (!/[a-z]/.test(value)) issues.push('one lowercase letter');
  if (!/\d/.test(value)) issues.push('one number');
  if (!/[^A-Za-z0-9]/.test(value)) issues.push('one special character');
  return issues;
};

const FieldBox = ({ label, icon: Icon, name, type = 'text', placeholder, right, value, error, onChange, disabled }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    <div className="relative">
      <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded border py-2.5 pl-10 ${right ? 'pr-10' : 'pr-3'} text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition-colors disabled:opacity-60 ${
          error
            ? 'border-red-500 bg-red-50/20'
            : 'border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
        }`}
      />
      {right}
    </div>
    {error && <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">{error}</p>}
  </div>
);

export default function ManagerSignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', contactNumber: '',
    hotelCode: '', password: '', confirmPassword: '', otpCode: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const id = window.setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendTimer]);

  const setField = (key) => (e) => {
    const value = key === 'hotelCode' ? e.target.value.toUpperCase() : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setFeedback({ type: '', text: '' });
  };

  const validate = ({ requireOtp }) => {
    const next = {};
    if (!NAME_PATTERN.test(form.firstName.trim())) next.firstName = 'Enter a valid first name.';
    if (!NAME_PATTERN.test(form.lastName.trim())) next.lastName = 'Enter a valid last name.';
    if (!isValidEmail(normalizeEmail(form.email))) next.email = 'Enter a valid email address.';
    if (!PHONE_PATTERN.test(form.contactNumber.trim())) next.contactNumber = 'Use a valid PH mobile number (09XXXXXXXXX).';
    if (!HOTEL_CODE_PATTERN.test(form.hotelCode.trim())) next.hotelCode = 'Use a valid hotel code, such as INNOVAHMS-123.';
    const issues = passwordIssues(form.password);
    if (issues.length) next.password = `Password must contain ${issues.join(', ')}.`;
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';
    if (requireOtp && !/^\d{6}$/.test(form.otpCode.trim())) next.otpCode = 'Enter the 6-digit verification code.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validate({ requireOtp: false })) return;
    setIsSendingOtp(true);
    setFeedback({ type: '', text: '' });
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Managers are staff accounts, so they share the staff OTP channel.
        body: JSON.stringify({ userType: 'staff', email: normalizeEmail(form.email) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ type: 'error', text: data.error || 'Failed to send verification code. Please try again.' });
        return;
      }
      setOtpSent(true);
      setResendTimer(30);
      setFeedback({ type: 'success', text: data.message || 'Verification code sent. Check your inbox.' });
    } catch {
      setFeedback({ type: 'error', text: 'Unable to send verification code. Please try again.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!otpSent) return handleSendOtp();
    if (!validate({ requireOtp: true })) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/manager/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: normalizeEmail(form.email),
          contactNumber: form.contactNumber.trim(),
          password: form.password,
          otpCode: form.otpCode.trim(),
          hotelCode: form.hotelCode.trim().toUpperCase(),
          role: 'Hotel Manager',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ type: 'error', text: data.error || `Registration failed (${response.status}).` });
        return;
      }
      setFeedback({ type: 'success', text: 'Manager account created. Redirecting to sign in...' });
      window.setTimeout(() => navigate('/manager/login'), 1200);
    } catch {
      setFeedback({ type: 'error', text: 'Cannot connect to the server. Please verify network connectivity.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fp = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: setField(name),
    disabled: otpSent && name !== 'otpCode',
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-10">
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Manager Sign Up</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Register as a Hotel Manager using the hotel code provided by the property owner.
          </p>
        </div>

        {feedback.text && (
          <div
            className={`mb-5 flex items-start gap-2.5 rounded-r border-l-4 p-3 text-xs ${
              feedback.type === 'success'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-red-600 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldBox {...fp("firstName")} label="First Name" icon={User} name="firstName" placeholder="Juan" />
            <FieldBox {...fp("lastName")} label="Last Name" icon={User} name="lastName" placeholder="Dela Cruz" />
          </div>
          <FieldBox {...fp("email")} label="Manager Email" icon={Mail} name="email" type="email" placeholder="manager@gmail.com" />
          <FieldBox {...fp("contactNumber")} label="Contact Number" icon={Phone} name="contactNumber" placeholder="09123456789" />
          <FieldBox {...fp("hotelCode")} label="Hotel Code" icon={Building2} name="hotelCode" placeholder="INNOVAHMS-123" />
          <FieldBox
            {...fp("password")}
            label="Password"
            icon={Lock}
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            right={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <FieldBox {...fp("confirmPassword")} label="Confirm Password" icon={Lock} name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" />

          {otpSent && (
            <div className="space-y-2">
              <FieldBox {...fp("otpCode")} label="Verification Code" icon={ShieldCheck} name="otpCode" placeholder="6-digit code" />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={resendTimer > 0 || isSendingOtp}
                className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : isSendingOtp ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isSendingOtp}
            className="w-full flex items-center justify-center gap-2 rounded bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 mt-2"
          >
            <span>
              {otpSent ? (isSubmitting ? 'Creating account...' : 'Create Manager Account') : isSendingOtp ? 'Sending code...' : 'Send Verification Code'}
            </span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-200 dark:border-slate-800 pt-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/manager/login')} className="font-semibold text-emerald-800 dark:text-emerald-400 hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
