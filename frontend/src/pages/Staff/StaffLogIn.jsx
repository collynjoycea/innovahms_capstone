import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Key, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import ForgotPasswordModal from "../../components/ForgotPasswordModal";
import { isValidEmail, isValidHotelCode, normalizeEmail } from "../../utils/authValidation";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", hotelCode: "" });

  // --- LOGIC HANDLERS ---
  const handleVerifyCode = () => {
    if (isValidHotelCode(formData.hotelCode)) {
      setIsVerified(true);
      setError("");
    } else {
      setError("Hotel code must strictly follow format: INNOVAHMS-123.");
      setIsVerified(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    
    if (!isVerified) {
      setError("Please verify your Hotel Owner Code first.");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError("Enter a valid staff email address.");
      return;
    }
    if (!formData.password) {
      setError("Password is required.");
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
    } catch {
      setError("Server connection error. Ensure Flask is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
      
      {/* MAIN CONTAINER (Katulad ng StaffSignUp structure) */}
      <main className="max-w-xl mx-auto px-4 py-12">
        
        {/* TITLE HEADER */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 mb-1">
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Staff Member Sign In
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Provide your verified credentials and hotel code to initialize your shift session.
          </p>
        </div>

        {/* ERROR ALERT */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Alert</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* SUCCESS ALERT */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-600 rounded-r text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-3">
            <ShieldCheck size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Success</strong>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          
          {/* CARD CONTAINER */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-800 text-white rounded-full inline-flex items-center justify-center text-[11px] font-bold">1</span>
                Security Authentication
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Enter your registered business email, security password, and hotel code.
              </p>
            </div>

            <div className="space-y-4">
              
              {/* Hotel Code Verification Section */}
              <div className={`p-4 rounded border transition-all ${isVerified ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Key size={14} className={isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'} />
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Hotel Code <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold uppercase outline-none focus:border-emerald-700"
                    placeholder="INNOVAHMS-123"
                    value={formData.hotelCode}
                    onChange={(e) => setFormData({...formData, hotelCode: e.target.value.toUpperCase()})}
                  />
                  <button 
                    type="button" 
                    onClick={handleVerifyCode} 
                    className={`px-4 rounded text-xs font-bold uppercase transition-all ${isVerified ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600'}`}
                  >
                    {isVerified ? 'Verified' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Business Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-700 transition-colors"
                    placeholder="staff@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-700 transition-colors"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Trigger */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>

            </div>
          </section>

          {/* ACTION CONTROLS */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No account yet?{' '}
              <Link to="/staff/signup" className="font-bold text-emerald-800 dark:text-emerald-400 hover:underline">
                Request access
              </Link>
            </p>

            <button 
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Validating..." : "Sign In"} <ArrowRight size={14} />
            </button>
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