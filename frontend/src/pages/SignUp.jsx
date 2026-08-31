import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Phone, User, Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login';
import { Facebook } from "lucide-react";
import {
  normalizeEmail,
  isValidEmail,
  isValidName,
  isValidPhone,
  getPasswordStrengthMessage
} from "../utils/authValidation";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  contactNumber: "",
  password: "",
  confirmPassword: "",
};

export default function SignUp() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
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

    if (key === 'email') {
      if (!value.trim()) error = 'Email address is required.';
      else if (!isValidEmail(value)) error = 'Enter a valid email address.';
    }

    if (key === 'contactNumber') {
      if (!value.trim()) error = 'Contact number is required.';
      else if (value.length !== 11 || !value.startsWith('09')) {
        error = 'Must be 11 digits starting with 09.';
      } else if (!isValidPhone(value)) {
        error = 'Invalid contact number format.';
      }
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
      sanitizedValue = value.replace(/[^a-zA-Z\sñÑ-]/g, '');
    } else if (key === 'contactNumber') {
      sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 11);
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
    const keys = ['firstName', 'lastName', 'email', 'contactNumber', 'password', 'confirmPassword'];

    keys.forEach((key) => {
      allTouched[key] = true;
      const err = validateSingleField(key, formData[key]);
      if (err) errors[key] = err;
    });

    setTouchedFields(allTouched);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateAllFields()) {
      setErrorMessage('Please fix all highlighted input errors before submitting.');
      return;
    }

    const normalizedForm = {
      ...formData,
      email: normalizeEmail(formData.email),
      otpCode,
    };

    setIsSubmitting(true);
    try {
      if (!otpSent) {
        const otpResponse = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userType: 'customer', email: normalizedForm.email }),
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
      const signupResponse = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm),
      });

      const signupResult = await signupResponse.json().catch(() => ({}));

      if (!signupResponse.ok) {
        setErrorMessage(signupResult.error || "Registration failed.");
        return;
      }

      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedForm.email,
          password: normalizedForm.password,
        }),
      });

      const loginResult = await loginResponse.json().catch(() => ({}));

      if (loginResponse.ok) {
        localStorage.setItem("user", JSON.stringify(loginResult.user));
        localStorage.setItem("customerSession", JSON.stringify(loginResult.user));
        window.dispatchEvent(new Event("userUpdated"));
        navigate("/");
      } else {
        navigate("/login");
      }
    } catch {
      setErrorMessage("Cannot connect to the server. Is Flask running?");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch("/api/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(result.user));
        localStorage.setItem("customerSession", JSON.stringify(result.user));
        window.dispatchEvent(new Event("userUpdated"));
        navigate("/");
      } else {
        setErrorMessage(result.error || "Google Login failed on the server.");
      }
    } catch {
      setErrorMessage("Cannot connect to the server. Is Flask running?");
    }
  };

  const responseFacebook = async (response) => {
    if (response.accessToken) {
      try {
        const res = await fetch("/api/facebook-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: response.accessToken }),
        });

        const result = await res.json();
        if (res.ok) {
          localStorage.setItem("user", JSON.stringify(result.user));
          localStorage.setItem("customerSession", JSON.stringify(result.user));
          window.dispatchEvent(new Event("userUpdated"));
          navigate("/");
        } else {
          setErrorMessage(result.error || "Facebook Login failed.");
        }
      } catch {
        setErrorMessage("Server connection error.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-slate-950 font-sans py-10 px-4 sm:px-8 lg:px-16">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-[#0d2a23] dark:text-emerald-400 tracking-tight">
            Customer Registration Form
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete all fields and email verification for account setup and booking access.
          </p>
        </div>
        {/* Main Content Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
          
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-7 h-7 rounded-full bg-[#006042] text-white flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Account Credentials
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provide account customer contact and login details.
              </p>
            </div>
          </div>

          {/* Global Alert Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSignUp} noValidate className="space-y-5">
            
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    className={`w-full rounded-md border py-2.5 pl-10 pr-3 text-xs transition-colors outline-none ${
                      touchedFields.firstName && fieldErrors.firstName
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#006042] focus:ring-1 focus:ring-[#006042]"
                    }`}
                    placeholder="e.g. Juan"
                  />
                </div>
                {touchedFields.firstName && fieldErrors.firstName && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.firstName}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    className={`w-full rounded-md border py-2.5 pl-10 pr-3 text-xs transition-colors outline-none ${
                      touchedFields.lastName && fieldErrors.lastName
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#006042] focus:ring-1 focus:ring-[#006042]"
                    }`}
                    placeholder="e.g. Dela Cruz"
                  />
                </div>
                {touchedFields.lastName && fieldErrors.lastName && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Email Address & Contact Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`w-full rounded-md border py-2.5 pl-10 pr-3 text-xs transition-colors outline-none ${
                      touchedFields.email && fieldErrors.email
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#006042] focus:ring-1 focus:ring-[#006042]"
                    }`}
                    placeholder="customer@gmail.com"
                  />
                </div>
                {touchedFields.email && fieldErrors.email && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              {otpSent && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Gmail Verification OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-center text-lg font-black tracking-[0.35em] outline-none"
                    placeholder="123456"
                  />
                  <p className="mt-1 text-xs text-emerald-700">Check your Gmail inbox for the 6-digit code.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact / Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="contactNumber"
                    type="tel"
                    maxLength={11}
                    value={formData.contactNumber}
                    onChange={(e) => updateField('contactNumber', e.target.value)}
                    onBlur={() => handleBlur('contactNumber')}
                    className={`w-full rounded-md border py-2.5 pl-10 pr-3 text-xs transition-colors outline-none ${
                      touchedFields.contactNumber && fieldErrors.contactNumber
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#006042] focus:ring-1 focus:ring-[#006042]"
                    }`}
                    placeholder="09171234567"
                  />
                </div>
                {touchedFields.contactNumber && fieldErrors.contactNumber && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.contactNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Account Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`w-full rounded-md border py-2.5 pl-10 pr-10 text-xs transition-colors outline-none ${
                      touchedFields.password && fieldErrors.password
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#006042] focus:ring-1 focus:ring-[#006042]"
                    }`}
                    placeholder="At least 8 characters, with letters and numbers"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touchedFields.password && fieldErrors.password && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={`w-full rounded-md border py-2.5 pl-10 pr-3 text-xs transition-colors outline-none ${
                      touchedFields.confirmPassword && fieldErrors.confirmPassword
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#006042] focus:ring-1 focus:ring-[#006042]"
                    }`}
                    placeholder="Re-enter password"
                  />
                </div>
                {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-md bg-[#006042] hover:bg-[#004a33] text-xs font-bold text-white px-6 py-3 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Registering Account..." : "Register Account"}
                <UserPlus size={16} />
              </button>
            </div>
          </form>

          {/* Social Sign Up Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 text-[11px] font-medium">
                Or continue with social account
              </span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <div className="flex justify-center">
              <GoogleLogin 
                onSuccess={handleGoogleSuccess} 
                onError={() => setErrorMessage("Google Login Failed")}
                theme="outline"
                shape="rectangular"
                width="240px" 
              />
            </div>
          
            <div className="signup-hidden-facebook">
              <FacebookLogin
                appId="760975413559116"
                callback={responseFacebook}
                fields="name,email,picture"
                tag={({ onClick }) => (
                  <button id="hidden-fb-btn" onClick={onClick} />
                )}
              />
            </div>

            <button 
              type="button"
              onClick={() => document.getElementById('hidden-fb-btn').click()}
              className="flex items-center justify-center gap-2 w-[240px] px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm bg-white dark:bg-slate-900 h-[40px]"
            >
              <Facebook size={18} className="text-[#1877F2] fill-[#1877F2]" />
              <span>Facebook</span>
            </button>
          </div>

          {/* Bottom Login Link */}
          <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="font-bold text-[#006042] dark:text-emerald-400 hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>

        </div>
      </div>

      <style>{`
        .signup-hidden-facebook {
          display: none;
        }
      `}</style>
    </div>
  );
}
