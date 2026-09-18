import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Phone, User, Eye, EyeOff, UserPlus, AlertCircle, FileText, X } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
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

const CUSTOMER_TERMS = `INNOVA-HMS

Terms and Conditions for Customers

These Terms and Conditions govern your access to and use of INNOVA-HMS as a customer. By creating an account, viewing available rooms, making a reservation, or using INNOVA-HMS, you acknowledge that you have read, understood, and agreed to these Terms.

1. Use of INNOVA-HMS
INNOVA-HMS allows customers to access information provided by participating hotels, view room availability, make reservations, and receive booking-related information.

2. Customer Account
You agree to provide accurate, complete, and current information when registering or making a reservation. You are responsible for protecting your account credentials and for activities conducted through your account.

3. Hotel and Room Information
Hotel and room information is provided by participating hotels. Review room descriptions, rates, availability, policies, and booking conditions before completing a reservation.

4. Making a Reservation
Customers are responsible for accurate booking information, including name, contact information, check-in and check-out dates, number of guests, selected room, and other required information.

5. Booking Confirmation
Review the reservation details provided after booking, including hotel, room type, dates, guests, payment information, and reservation status. Report incorrect information to the hotel or INNOVA-HMS support promptly.

6. Cancellation and Modification
Cancellation, modification, no-show, and refund conditions vary by hotel and reservation. Review the applicable conditions before booking.

7. Payments
Online payments may be completed through the designated payment gateway. PayMongo may be used for supported transactions and its applicable terms and policies may apply.

8. Customer Information
Provide accurate information and do not submit false, misleading, fraudulent, or unnecessary information.

9. Artificial Intelligence and Recommendations
AI recommendations are provided for convenience and are not guarantees of availability, pricing, booking outcomes, or other conditions. Rely on official reservation information displayed or confirmed through the platform.

10. Automated Notifications
INNOVA-HMS may send notifications regarding reservations, confirmations, cancellations, payment status, and other system information. Keep your contact information current.

11. Customer Conduct
Do not provide false information, create fraudulent reservations, use another person's account, access information without authorization, bypass security, upload harmful content, interfere with the platform, manipulate records, or use the platform unlawfully.

12. System Availability
Temporary interruptions may occur because of maintenance, technical issues, network interruptions, security measures, or circumstances beyond the administrator's control.

13. Reservation Information
Customers are responsible for reviewing reservation details before completing a booking. Incorrect customer information may result in modification, cancellation, or other consequences under the applicable booking conditions.

14. Account Suspension or Termination
INNOVA-HMS administrators may suspend or terminate accounts for violating these Terms, fraud, misuse, unauthorized access, security compromise, or unlawful activity.

15. System-Generated Information
Analytics, recommendations, forecasts, and other generated information may contain errors and are not guarantees of future conditions or outcomes.

16. Acceptance of Terms
By creating an account, making a reservation, or using INNOVA-HMS, you acknowledge that you have read, understood, and agreed to these Terms. If you do not agree, do not register for or use the platform.`;

const CUSTOMER_PRIVACY = `INNOVA-HMS

Privacy Policy for Customers

This Privacy Policy explains how INNOVA-HMS collects, uses, processes, stores, and protects information provided by customers. By creating an account, making a reservation, or using INNOVA-HMS, you acknowledge that you have read and understood this Privacy Policy.

1. Information We Collect
INNOVA-HMS may collect account information such as full name, email address, contact number, username, account credentials, and other registration information. Reservation information may include selected hotel, selected room, check-in and check-out dates, number of guests, booking status, and information necessary to process the reservation. Transaction records may include payment reference, status, amount, and date. PayMongo or another authorized provider may process payments.

2. How We Use Customer Information
Information may be used to create and manage accounts, process reservations, provide confirmations and notifications, support preference analysis and recommendations, maintain security, process payment records, resolve concerns, generate analytics, and operate and improve INNOVA-HMS.

3. Customer Behavioral Analytics
INNOVA-HMS may analyze customer interactions and reservation history to identify preferences and patterns that support personalized recommendations and hotel operational decision-making. Analytics are used only for legitimate platform and reservation purposes.

4. Artificial Intelligence
AI may process relevant information for personalized recommendations, intelligent room assignment, and other decision-support functions. AI results may not always be accurate and are not guaranteed outcomes.

5. Sharing of Customer Information
Information may be made available to the participating hotel associated with a reservation when necessary to process and manage the booking. Authorized providers may process information for hosting, security, payment, communications, or technical services. INNOVA-HMS does not intentionally sell customer personal information.

6. Payment Information
Where PayMongo is used, payment processing may occur through PayMongo's systems. INNOVA-HMS does not intentionally store complete payment-card credentials when processed directly by the provider. Transaction references, status, amount, and date may be retained for records.

7. Automated Notifications
Contact information may be used for confirmations, booking updates, payment notifications, and other necessary messages. Customers are responsible for accurate contact information.

8. Data Security
INNOVA-HMS uses reasonable measures to protect information from unauthorized access, alteration, disclosure, loss, or misuse. No electronic system is completely secure. Customers are responsible for protecting their account credentials.

9. Data Retention
Information may be retained as reasonably necessary to provide the platform, maintain reservation and transaction records, address disputes, maintain security, and fulfill operational or legal requirements.

10. Customer Privacy Rights
Subject to applicable laws, customers may have rights to request access to or correction of personal information and other applicable privacy rights. Requests may be submitted through official INNOVA-HMS contact information.

11. Cookies and Similar Technologies
Cookies may be used for authentication, session management, security, functionality, and performance. Browser settings may manage cookies, though disabling them may affect features.

12. Protection of Minors
INNOVA-HMS is intended for users legally permitted to create accounts and make reservations. Do not provide another person's personal information without authorization.

13. Privacy and Applicable Laws
INNOVA-HMS intends to handle personal information responsibly and in accordance with applicable Philippine privacy requirements, including transparency, legitimate purpose, and proportionality.

14. Privacy Concerns
For questions or concerns, contact the INNOVA-HMS administrator through the official contact information provided on the platform.

15. Acknowledgment
By creating an account, making a reservation, or using INNOVA-HMS, you acknowledge how your information may be collected, used, processed, stored, and protected.`;

export default function SignUp() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [policyToShow, setPolicyToShow] = useState(null);

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

    if (!acceptedTerms || !acceptedPrivacy) {
      setErrorMessage('Please read and accept both the Customer Terms and Conditions and Privacy Policy before continuing.');
      return;
    }

    const normalizedForm = {
      ...formData,
      email: normalizeEmail(formData.email),
      otpCode,
      acceptedTerms,
      acceptedPrivacy,
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
                    type={showConfirmPassword ? "text" : "password"}
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
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>
            </div>

            <div className={`rounded-md border p-3 ${!acceptedTerms || !acceptedPrivacy ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50' : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-700/50 dark:bg-emerald-950/20'}`}>
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#006042]"
                />
                <span>
                  I have read and agree to the customer{" "}
                  <button
                    type="button"
                    onClick={() => setPolicyToShow('terms')}
                    className="font-bold text-[#006042] underline underline-offset-2 dark:text-emerald-400"
                  >
                    Terms and Conditions
                  </button>
                  .
                </span>
              </label>
              <label className="mt-3 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#006042]"
                />
                <span>
                  I have read and agree to the customer{" "}
                  <button
                    type="button"
                    onClick={() => setPolicyToShow('privacy')}
                    className="font-bold text-[#006042] underline underline-offset-2 dark:text-emerald-400"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
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
                theme={document.documentElement.classList.contains("dark") ? "filled_black" : "outline"}
                shape="rectangular"
                width="240px" 
              />
            </div>
          
            <FacebookLogin
              appId="1986409515302523"
              autoLoad={false}
              callback={responseFacebook}
              render={(renderProps) => (
                <button
                  type="button"
                  onClick={renderProps.onClick}
                  className="flex items-center justify-center gap-2 w-[240px] h-[40px] px-4 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm bg-white dark:bg-slate-900"
                >
                  <Facebook size={18} className="text-[#1877F2] fill-[#1877F2]" />
                  <span>Facebook</span>
                </button>
              )}
            />
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
      {policyToShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#006042] dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {policyToShow === 'terms' ? 'Terms and Conditions for Customers' : 'Privacy Policy for Customers'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPolicyToShow(null)}
                aria-label="Close policy"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <pre className="overflow-y-auto whitespace-pre-wrap px-5 py-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {policyToShow === 'terms' ? CUSTOMER_TERMS : CUSTOMER_PRIVACY}
            </pre>
            <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPolicyToShow(null)}
                className="rounded bg-[#006042] px-4 py-2 text-xs font-bold text-white hover:bg-[#004a33]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

    </div>
  );
}
