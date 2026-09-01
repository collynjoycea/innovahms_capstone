import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Mail, Lock, Key, Eye, EyeOff, ArrowRight, 
  Globe, AlertCircle, CheckCircle2 
} from "lucide-react";
import ForgotPasswordModal from "../../components/ForgotPasswordModal";
import { isValidEmail, isValidHotelCode, normalizeEmail } from "../../utils/authValidation";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", hotelCode: "" });

  // --- SINGLE FIELD VALIDATION LOGIC ---
  const validateSingleField = (key, value) => {
    let err = null;

    if (key === "email") {
      if (!value.trim()) err = "Employee email is required.";
      else if (!isValidEmail(value)) err = "Enter a valid staff email address.";
    }

    if (key === "password") {
      if (!value) err = "Security key password is required.";
      else if (value.length < 6) err = "Password must be at least 6 characters.";
    }

    if (key === "hotelCode") {
      if (!value.trim()) err = "Hotel verification code is required.";
      else if (!isValidHotelCode(value)) err = "Hotel code must follow the INNOVAHMS-123 format.";
    }

    return err;
  };

  const updateField = (key, value) => {
    let sanitizedValue = value;
    if (key === "hotelCode") {
      sanitizedValue = value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
      // Kung binago ang hotel code matapos ma-verify, i-reset ang verification status
      if (sanitizedValue !== formData.hotelCode) {
        setIsVerified(false);
      }
    }

    const updatedForm = { ...formData, [key]: sanitizedValue };
    setFormData(updatedForm);

    if (touchedFields[key]) {
      const err = validateSingleField(key, sanitizedValue);
      setFieldErrors((prev) => ({ ...prev, [key]: err }));
    }
  };

  const handleBlur = (key) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    const err = validateSingleField(key, formData[key]);
    setFieldErrors((prev) => ({ ...prev, [key]: err }));
  };

  const handleVerifyCode = () => {
    const err = validateSingleField("hotelCode", formData.hotelCode);
    setTouchedFields((prev) => ({ ...prev, hotelCode: true }));
    
    if (err) {
      setFieldErrors((prev) => ({ ...prev, hotelCode: err }));
      setIsVerified(false);
      return;
    }

    if (isValidHotelCode(formData.hotelCode)) {
      setIsVerified(true);
      setFieldErrors((prev) => ({ ...prev, hotelCode: null }));
      setError("");
    } else {
      setFieldErrors((prev) => ({ ...prev, hotelCode: "Invalid format (e.g. INNOVAHMS-123)." }));
      setIsVerified(false);
    }
  };

  const validateAllFields = () => {
    const errors = {};
    const allTouched = {};
    const keys = ["email", "password", "hotelCode"];

    keys.forEach((key) => {
      allTouched[key] = true;
      const err = validateSingleField(key, formData[key]);
      if (err) errors[key] = err;
    });

    setTouchedFields(allTouched);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateAllFields()) {
      setError("Please fix all highlighted input errors.");
      return;
    }
    
    if (!isVerified) {
      setError("Please verify your Hotel Affiliation Code first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(formData.email),
          password: formData.password,
          hotelCode: formData.hotelCode
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const rawRole = result.staff.role;
        const role = rawRole.toLowerCase();

        localStorage.setItem("staffSession", "true");
        localStorage.setItem("staffUser", JSON.stringify(result.staff));
        window.dispatchEvent(new Event('staffSessionChanged'));

        if (role.includes("manager")) {
          navigate("/manager/dashboard");
        } else if (role.includes("inventory")) {
          navigate("/inventory/dashboard");
        } else if (role.includes("housekeeping") || role.includes("maintenance")) {
          navigate("/housekeeping/dashboard");
        } else if (role.includes("hr") || role.includes("payroll")) {
          localStorage.setItem("hrSession", "true");
          navigate("/hr/dashboard");
        } else {
          navigate("/staff/dashboard");
        }
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("Server connection error. Ensure Flask is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans flex flex-col justify-between">
      
      {/* MAIN LOGIN AREA (Wala nang naka-box na fixed container sa gitna) */}
      <main className="max-w-md mx-auto px-4 py-12 w-full my-auto">
        
        {/* Title Header */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
            Staff <span className="text-[#2FA084]">Access</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Identity verification required to initialize staff shift.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Alert</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          
          {/* Main Card Container with Full Validation */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
            
            {/* Employee Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Employee Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  placeholder="staff@gmail.com"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                    touchedFields.email && fieldErrors.email
                      ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                      : "border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-white"
                  }`}
                />
              </div>
              {touchedFields.email && fieldErrors.email && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Security Key / Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`w-full pl-9 pr-10 py-2 border text-xs rounded focus:outline-none transition-colors ${
                    touchedFields.password && fieldErrors.password
                      ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                      : "border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-white"
                  }`}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {touchedFields.password && fieldErrors.password && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Hotel Code Verification Section */}
            <div className={`p-4 rounded border transition-all ${isVerified ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Key size={14} className={isVerified ? 'text-emerald-600' : 'text-[#2FA084]'} />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Hotel Affiliation Code</span>
                </div>
                {isVerified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                    <CheckCircle2 size={13} /> Verified
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className={`flex-1 px-3 py-2 bg-white dark:bg-slate-800 border text-xs font-mono uppercase rounded outline-none transition-colors ${
                    touchedFields.hotelCode && fieldErrors.hotelCode
                      ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                      : "border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                  }`}
                  placeholder="INNOVAHMS-123"
                  value={formData.hotelCode}
                  onChange={(e) => updateField('hotelCode', e.target.value)}
                  onBlur={() => handleBlur('hotelCode')}
                />
                <button 
                  type="button" 
                  onClick={handleVerifyCode} 
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${isVerified ? 'bg-emerald-600 text-white' : 'bg-[#1F6F5F] text-white hover:bg-[#173F35]'}`}
                >
                  {isVerified ? 'Re-Verify' : 'Verify'}
                </button>
              </div>
              {touchedFields.hotelCode && fieldErrors.hotelCode && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                  {fieldErrors.hotelCode}
                </span>
              )}
            </div>

          </section>

          {/* Form Bottom Action Controls */}
          <div className="space-y-4 pt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? "Validating..." : "Sign In"} <ArrowRight size={14} />
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="font-semibold text-slate-600 dark:text-slate-400 hover:text-[#2FA084] transition-colors"
              >
                Forgot Password?
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/')} 
                className="font-semibold text-slate-500 dark:text-slate-500 hover:text-[#2FA084] transition-colors flex items-center gap-1"
              >
                <Globe size={13} /> Public Terminal
              </button>
            </div>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              No account? <Link to="/staff/signup" className="font-bold text-emerald-800 dark:text-emerald-400 hover:underline">Request Access</Link>
            </div>
          </div>

        </form>
      </main>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        userType="staff"
        title="Staff Password Reset"
        initialEmail={formData.email}
        initialHotelCode={formData.hotelCode}
      />
    </div>
  );
};

export default StaffLogin;