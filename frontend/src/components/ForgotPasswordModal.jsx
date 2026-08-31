import React, { useEffect, useState } from "react";
import { AlertCircle, KeyRound, Mail, ShieldCheck, X, ArrowRight, ArrowLeft } from "lucide-react";
import { getPasswordStrengthMessage, isValidEmail, isValidHotelCode } from "../utils/authValidation";

const ForgotPasswordModal = ({ isOpen, onClose, userType, title, initialEmail = "", initialHotelCode = "" }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(initialEmail);
  const [hotelCode, setHotelCode] = useState(initialHotelCode);
  const channel = "email";
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation & Error States (similar to OwnerSignUp)
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setEmail(initialEmail);
    setHotelCode(initialHotelCode);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setDevOtp("");
    setLoading(false);
    setResendSeconds(0);
    setFieldErrors({});
    setTouchedFields({});
  }, [isOpen, initialEmail, initialHotelCode]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  if (!isOpen) return null;

  const validateField = (key, value) => {
    let err = null;
    if (key === "email") {
      if (!value.trim()) err = "Email address is required.";
      else if (!isValidEmail(value)) err = "Enter a valid email address.";
    } else if (key === "hotelCode") {
      if (!value.trim()) err = "Hotel code is required.";
      else if (!isValidHotelCode(value)) err = "Must strictly follow format: INNOVAHMS-123.";
    } else if (key === "otp") {
      if (!value.trim()) err = "OTP code is required.";
      else if (!/^\d{6}$/.test(value)) err = "OTP must be exactly 6 digits.";
    } else if (key === "newPassword") {
      if (!value) err = "New password is required.";
      else err = getPasswordStrengthMessage(value);
    } else if (key === "confirmPassword") {
      if (!value) err = "Please confirm your password.";
      else if (value !== newPassword) err = "Passwords do not match.";
    }
    return err;
  };

  const handleBlur = (key, value) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    const err = validateField(key, value);
    setFieldErrors((prev) => ({ ...prev, [key]: err }));
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const errors = {
      email: validateField("email", email),
      ...(userType === "staff" ? { hotelCode: validateField("hotelCode", hotelCode) } : {})
    };
    setFieldErrors(errors);
    setTouchedFields({ email: true, hotelCode: true });

    if (errors.email || errors.hotelCode) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType,
          email,
          hotelCode: hotelCode.trim().toUpperCase(),
          channel,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Failed to send OTP.");
        return;
      }
      setDevOtp(data.devOtp || "");
      setSuccess(data.message || "OTP sent successfully.");
      setStep(2);
      setResendSeconds(30);
    } catch {
      setError("Unable to reach the server right now.");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const errors = {
      otp: validateField("otp", otp),
      newPassword: validateField("newPassword", newPassword),
      confirmPassword: validateField("confirmPassword", confirmPassword),
    };
    setFieldErrors(errors);
    setTouchedFields({ otp: true, newPassword: true, confirmPassword: true });

    if (errors.otp || errors.newPassword || errors.confirmPassword) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType,
          email,
          hotelCode: hotelCode.trim().toUpperCase(),
          otp,
          newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }
      setSuccess(data.message || "Password updated successfully.");
      window.setTimeout(() => onClose?.(), 1200);
    } catch {
      setError("Unable to reach the server right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xl text-slate-800 dark:text-slate-100 font-sans">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Account Recovery</span>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{title || "Forgot Password"}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {step === 1 ? "Request a secure one-time verification password." : "Enter the OTP code and your new credentials."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* ERROR ALERT */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS ALERT */}
        {success && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-600 rounded-r text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{success}</p>
              {devOtp ? <p className="mt-1 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-300">Dev OTP: {devOtp}</p> : null}
            </div>
          </div>
        )}

        {/* STEP 1 FORM */}
        {step === 1 ? (
          <form onSubmit={submitRequest} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touchedFields.email) {
                      setFieldErrors(prev => ({ ...prev, email: validateField("email", e.target.value) }));
                    }
                  }}
                  onBlur={() => handleBlur("email", email)}
                  className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                    touchedFields.email && fieldErrors.email
                      ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                      : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                  placeholder="name@hotel.com"
                />
              </div>
              {touchedFields.email && fieldErrors.email && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">{fieldErrors.email}</span>
              )}
            </div>

            {userType === "staff" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hotel Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hotelCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setHotelCode(val);
                    if (touchedFields.hotelCode) {
                      setFieldErrors(prev => ({ ...prev, hotelCode: validateField("hotelCode", val) }));
                    }
                  }}
                  onBlur={() => handleBlur("hotelCode", hotelCode)}
                  className={`w-full px-3 py-2 border text-xs font-mono uppercase rounded focus:outline-none transition-colors ${
                    touchedFields.hotelCode && fieldErrors.hotelCode
                      ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                      : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                  placeholder="INNOVAHMS-1"
                />
                {touchedFields.hotelCode && fieldErrors.hotelCode && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">{fieldErrors.hotelCode}</span>
                )}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
            >
              <span>{loading ? "Sending OTP..." : "Send Verification OTP"}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          /* STEP 2 FORM */
          <form onSubmit={submitReset} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                OTP Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtp(val);
                    if (touchedFields.otp) {
                      setFieldErrors(prev => ({ ...prev, otp: validateField("otp", val) }));
                    }
                  }}
                  onBlur={() => handleBlur("otp", otp)}
                  className={`w-full pl-9 pr-3 py-2 text-center font-mono tracking-[0.3em] text-sm font-bold border rounded focus:outline-none transition-colors ${
                    touchedFields.otp && fieldErrors.otp
                      ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                      : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                  placeholder="123456"
                />
              </div>
              {touchedFields.otp && fieldErrors.otp && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium text-center">{fieldErrors.otp}</span>
              )}
              <button
                type="button"
                disabled={loading || resendSeconds > 0}
                onClick={() => submitRequest({ preventDefault: () => {} })}
                className="mt-2 w-full text-center text-[11px] font-bold text-emerald-700 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (touchedFields.newPassword) {
                    setFieldErrors(prev => ({ ...prev, newPassword: validateField("newPassword", e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur("newPassword", newPassword)}
                className={`w-full px-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                  touchedFields.newPassword && fieldErrors.newPassword
                    ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                    : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                }`}
                placeholder="Create stronger password"
              />
              {touchedFields.newPassword && fieldErrors.newPassword && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">{fieldErrors.newPassword}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (touchedFields.confirmPassword) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: validateField("confirmPassword", e.target.value) }));
                  }
                }}
                onBlur={() => handleBlur("confirmPassword", confirmPassword)}
                className={`w-full px-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                  touchedFields.confirmPassword && fieldErrors.confirmPassword
                    ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                    : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                }`}
                placeholder="Repeat new password"
              />
              {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">{fieldErrors.confirmPassword}</span>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded shadow-sm disabled:opacity-50"
              >
                {loading ? "Updating Password..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} /> Request New OTP Code
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordModal;
