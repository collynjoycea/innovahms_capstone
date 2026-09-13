import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, Globe, AlertCircle, ShieldCheck } from 'lucide-react';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import { isValidEmail, normalizeEmail } from '../../utils/authValidation';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setLoaded(true); }, []);

  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') navigate('/admin');
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFeedback('');

    const normalizedEmail = normalizeEmail(formData.email);
    if (!isValidEmail(normalizedEmail)) {
      setFeedback('Enter a valid admin email address');
      return;
    }
    if (!formData.password) {
      setFeedback('Invalid Entry: Credentials Required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email: normalizedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminSession', 'true');
        localStorage.setItem('adminData', JSON.stringify({
          ...data.admin,
          loginTime: new Date().toISOString()
        }));
        window.dispatchEvent(new Event("userUpdated"));
        navigate('/admin');
      } else {
        setFeedback(data.error || 'Identity Verification Failed');
      }
    } catch {
      setFeedback('Link Failure: Cannot reach main server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
      
      {/* MAIN CONTAINER */}
      <main className="max-w-xl mx-auto px-4 py-12">
        
        {/* TITLE HEADER */}
        <div className={`mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 transition-all duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 mb-1">
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Administration Sign In
          </h2>
        </div>

        {/* ERROR ALERT */}
        {feedback && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Alert</strong>
              <span>{feedback}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          
          {/* CARD CONTAINER */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-800 text-white rounded-full inline-flex items-center justify-center text-[11px] font-bold">1</span>
                Identification Protocol
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Provide your authorized administrative email and secure access key.
              </p>
            </div>

            <div className="space-y-4">
              
              {/* System Identifier Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  System Identifier Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-700 transition-colors"
                    placeholder="admin@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {/* Secure Access Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Secure Access Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    style={{ WebkitTextSecurity: showPassword ? "none" : "disc" }}
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-700 transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    placeholder="••••••••••••"
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
                  Forgot Password?
                </button>
              </div>

            </div>
          </section>

          {/* ACTION CONTROLS */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <Link 
              to="/"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors"
            >
            </Link>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Verifying Node..." : "Sign In"} <ArrowRight size={14} />
            </button>
          </div>

        </form>
      </main>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        userType="admin"
        title="Admin Password Reset"
        initialEmail={formData.email}
      />
    </div>
  );
};

export default AdminLogin;