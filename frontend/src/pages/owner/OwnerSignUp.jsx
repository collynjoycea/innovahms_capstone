import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Copy,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  Upload,
  User,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import {
  getPasswordStrengthMessage,
  isValidEmail,
  isValidHotelCode,
  isValidName,
  isValidPhone,
  normalizeEmail,
} from "../../utils/authValidation";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  contactNumber: "",
  password: "",
  hotelCode: "",
  hotelName: "",
  hotelAddress: "",
  otpCode: "",
};

const REQUIRED_DOCUMENTS = [
  { key: "businessPermit", label: "Business Permit / Mayor's Permit", code: "BP-DOC" },
  { key: "birCertificate", label: "BIR Certificate of Registration (Form 2303)", code: "BIR-2303" },
  { key: "fireSafetyCertificate", label: "Fire Safety Inspection Certificate", code: "FSIC-DOC" },
  { key: "validId", label: "Government Issued ID of Property Owner", code: "GOV-ID" },
];

const STEPS = [
  { id: 1, title: "Account Details" },
  { id: 2, title: "Property Info" },
  { id: 3, title: "Legal Documents" },
  { id: 4, title: "Email Verification" },
];

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const formatFileMeta = (file) => {
  if (!file) return "No file selected (.pdf, .jpg, .png, .webp)";
  const sizeInKb = file.size / 1024;
  return `${file.name} (${sizeInKb >= 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeInKb))} KB`})`;
};

export default function OwnerSignUp() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [signupMode, setSignupMode] = useState("create");
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [documents, setDocuments] = useState({
    businessPermit: null,
    birCertificate: null,
    fireSafetyCertificate: null,
    validId: null,
  });
  
  // Validation & Touched States
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // OTP States
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Completion States
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Timer Countdown Effect para sa OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Single-Field Validation Helper for Immediate Feedback
  const validateSingleField = (key, value, currentFormData = formData) => {
    let error = null;

    if (key === "firstName") {
      if (!value.trim()) error = "First name is required.";
      else if (value.trim().length < 2) error = "First name must be at least 2 characters.";
      else if (!isValidName(value)) error = "Enter a valid name (alphabetic characters only).";
    }

    if (key === "lastName") {
      if (!value.trim()) error = "Last name is required.";
      else if (value.trim().length < 2) error = "Last name must be at least 2 characters.";
      else if (!isValidName(value)) error = "Enter a valid last name (alphabetic characters only).";
    }

    if (key === "email") {
      if (!value.trim()) error = "Business email address is required.";
      else if (!isValidEmail(value)) error = "Enter a valid email address";
    }

    if (key === "contactNumber") {
      if (!value.trim()) error = "Contact number is required.";
      else if (value.length !== 11 || !value.startsWith("09")) {
        error = "Must be a valid 11-digit PH mobile number starting with 09.";
      } else if (!isValidPhone(value)) {
        error = "Invalid contact number format.";
      }
    }

    if (key === "password") {
      if (!value) {
        error = "Password is required.";
      } else {
        error = getPasswordStrengthMessage(value);
      }
    }

    if (key === "hotelName" && signupMode === "create") {
      if (!value.trim()) error = "Property name is required.";
      else if (value.trim().length < 3) error = "Hotel name must be at least 3 characters.";
    }

    if (key === "hotelAddress" && signupMode === "create") {
      if (!value.trim()) error = "Complete property address is required.";
      else if (value.trim().length < 10) error = "Please provide a more detailed address.";
    }

    if (key === "hotelCode" && signupMode === "claim") {
      if (!value.trim()) error = "Hotel code is required.";
      else if (!isValidHotelCode(value)) error = "Must strictly follow format: INNOVAHMS-123.";
    }

    if (key === "otpCode") {
      if (!value.trim()) error = "Enter the 6-digit confirmation code.";
      else if (value.trim().length !== 6) error = "OTP must be exactly 6 digits.";
    }

    return error;
  };

  const updateField = (key, value) => {
    let sanitizedValue = value;

    // Strict Real-time Formatting & Masking
    if (key === "firstName" || key === "lastName") {
      sanitizedValue = value.replace(/[^a-zA-Z\sñÑ-]/g, "");
    } else if (key === "contactNumber") {
      sanitizedValue = value.replace(/[^0-9]/g, "").slice(0, 11);
    } else if (key === "otpCode") {
      sanitizedValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    } else if (key === "hotelCode") {
      sanitizedValue = value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
    }

    const updatedFormData = { ...formData, [key]: sanitizedValue };
    setFormData(updatedFormData);

    // Dynamic error checking on input change if field has already been touched
    if (touchedFields[key]) {
      const err = validateSingleField(key, sanitizedValue, updatedFormData);
      setFieldErrors((prev) => ({ ...prev, [key]: err }));
    }
  };

  const handleBlur = (key) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    const err = validateSingleField(key, formData[key]);
    setFieldErrors((prev) => ({ ...prev, [key]: err }));
  };

  const updateDocument = (key, file) => {
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    let error = null;

    if (!file) {
      const docLabel = REQUIRED_DOCUMENTS.find(d => d.key === key)?.label || "Document";
      error = `${docLabel} attachment is required.`;
    } else {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        error = `File size exceeds limit (${MAX_FILE_SIZE_MB}MB max allowed).`;
      } else if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        error = "Invalid file format. Upload PDF, JPG, PNG, or WEBP only.";
      }
    }

    setFieldErrors((prev) => ({ ...prev, [key]: error }));
    setDocuments((current) => ({ ...current, [key]: error ? null : file }));
  };

  const selectedCount = useMemo(
    () => REQUIRED_DOCUMENTS.filter(({ key }) => Boolean(documents[key])).length,
    [documents]
  );

  // Full validation per step (Triggers on Proceed / Submit)
  const validateCurrentStep = (step) => {
    const errors = {};
    const newTouched = { ...touchedFields };

    if (step === 1) {
      ["firstName", "lastName", "email", "contactNumber", "password"].forEach((field) => {
        newTouched[field] = true;
        const err = validateSingleField(field, formData[field]);
        if (err) errors[field] = err;
      });
    }

    if (step === 2) {
      if (signupMode === "create") {
        ["hotelName", "hotelAddress"].forEach((field) => {
          newTouched[field] = true;
          const err = validateSingleField(field, formData[field]);
          if (err) errors[field] = err;
        });
      } else {
        newTouched.hotelCode = true;
        const err = validateSingleField("hotelCode", formData.hotelCode);
        if (err) errors.hotelCode = err;
      }
    }

    if (step === 3) {
      REQUIRED_DOCUMENTS.forEach(({ key, label }) => {
        newTouched[key] = true;
        if (!documents[key]) {
          errors[key] = `${label} attachment is required.`;
        }
      });
    }

    if (step === 4) {
      newTouched.otpCode = true;
      const err = validateSingleField("otpCode", formData.otpCode);
      if (err) errors.otpCode = err;
    }

    setTouchedFields(newTouched);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(formData.email) }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.error || "Failed to send verification code. Please try again.");
        return false;
      }

      setOtpSent(true);
      setResendTimer(60);
      return true;
    } catch {
      setOtpSent(true);
      setResendTimer(60);
      return true;
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleNextStep = async () => {
    if (!validateCurrentStep(currentStep)) {
      setErrorMessage("Please resolve the highlighted validation errors before proceeding.");
      return;
    }

    if (currentStep === 3) {
      const sent = await handleSendOtp();
      if (sent) {
        setCurrentStep(4);
      }
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setErrorMessage("");
    setCurrentStep((prev) => prev - 1);
  };

  const handleCopyCode = async () => {
    if (!successData?.hotelCode || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(successData.hotelCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessData(null);
    setCopied(false);
    navigate("/owner/login");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateCurrentStep(4)) return;

    const payload = {
      ...formData,
      email: normalizeEmail(formData.email),
      hotelCode: signupMode === "claim" ? formData.hotelCode.trim().toUpperCase() : "",
      hotelName: signupMode === "create" ? formData.hotelName.trim() : "",
      hotelAddress: signupMode === "create" ? formData.hotelAddress.trim() : "",
    };

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const formPayload = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formPayload.append(key, value ?? "");
      });
      REQUIRED_DOCUMENTS.forEach(({ key }) => {
        if (documents[key]) formPayload.append(key, documents[key]);
      });

      const response = await fetch("/api/owner/signup", {
        method: "POST",
        body: formPayload,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error || "Verification failed or registration rejected. Check your OTP code.");
        return;
      }

      setSuccessData({
        ...data,
        email: payload.email,
      });
      setFormData(INITIAL_FORM);
      setDocuments({
        businessPermit: null,
        birCertificate: null,
        fireSafetyCertificate: null,
        validId: null,
      });
      setTouchedFields({});
      setSignupMode("create");
      setCurrentStep(1);
    } catch {
      setErrorMessage("Server connection error during activation. Please verify your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">

      {/* Main Registration Area */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Title & Progress Tracker */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Property Owner Registration Form</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Complete all fields and email verification for administrative review and account deployment.
          </p>

          {/* Steps Indicator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {STEPS.map((s) => {
              const isActive = currentStep === s.id;
              const isDone = currentStep > s.id;
              return (
                <div
                  key={s.id}
                  className={`p-2.5 rounded border text-left text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200"
                      : isDone
                      ? "border-slate-300 bg-slate-200/60 dark:border-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-400"
                  }`}
                >
                  <span className="block text-[10px] font-mono uppercase text-slate-400">Step 0{s.id}</span>
                  <span className="truncate block">{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-600 rounded-r text-red-800 dark:text-red-200 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Alert</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: ACCOUNT DETAILS */}
          {currentStep === 1 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 bg-emerald-800 text-white rounded-full inline-flex items-center justify-center text-[11px] font-bold">1</span>
                  Account Credentials
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Provide account administrator contact and login details.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Juan"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      onBlur={() => handleBlur("firstName")}
                      className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                        touchedFields.firstName && fieldErrors.firstName
                          ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                          : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                  {touchedFields.firstName && fieldErrors.firstName && (
                    <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                      {fieldErrors.firstName}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Dela Cruz"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      onBlur={() => handleBlur("lastName")}
                      className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                        touchedFields.lastName && fieldErrors.lastName
                          ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                          : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                  {touchedFields.lastName && fieldErrors.lastName && (
                    <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                      {fieldErrors.lastName}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="owner@gmail.com"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                        touchedFields.email && fieldErrors.email
                          ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                          : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                  {touchedFields.email && fieldErrors.email && (
                    <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact / Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      maxLength={11}
                      placeholder="09171234567"
                      value={formData.contactNumber}
                      onChange={(e) => updateField("contactNumber", e.target.value)}
                      onBlur={() => handleBlur("contactNumber")}
                      className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                        touchedFields.contactNumber && fieldErrors.contactNumber
                          ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                          : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                  {touchedFields.contactNumber && fieldErrors.contactNumber && (
                    <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                      {fieldErrors.contactNumber}
                    </span>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="At least 8 characters, with letters and numbers"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                        touchedFields.password && fieldErrors.password
                          ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                          : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                  {touchedFields.password && fieldErrors.password && (
                    <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                      {fieldErrors.password}
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* STEP 2: PROPERTY INFO */}
          {currentStep === 2 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 bg-emerald-800 text-white rounded-full inline-flex items-center justify-center text-[11px] font-bold">2</span>
                  Hotel Property Details
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Select property registration type and specify location info.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <label className={`p-3 border rounded cursor-pointer flex items-start gap-3 ${signupMode === "create" ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800"}`}>
                  <input
                    type="radio"
                    name="signupMode"
                    checked={signupMode === "create"}
                    onChange={() => setSignupMode("create")}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Register New Establishment</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Generates a new property code upon administration approval.</span>
                  </div>
                </label>

                <label className={`p-3 border rounded cursor-pointer flex items-start gap-3 ${signupMode === "claim" ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800"}`}>
                  <input
                    type="radio"
                    name="signupMode"
                    checked={signupMode === "claim"}
                    onChange={() => setSignupMode("claim")}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Claim Existing Hotel Code</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Link account to a pre-generated hotel system code.</span>
                  </div>
                </label>
              </div>

              {signupMode === "create" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hotel / Property Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Grand Vista Hotel"
                        value={formData.hotelName}
                        onChange={(e) => updateField("hotelName", e.target.value)}
                        onBlur={() => handleBlur("hotelName")}
                        className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                          touchedFields.hotelName && fieldErrors.hotelName
                            ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                            : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                        }`}
                      />
                    </div>
                    {touchedFields.hotelName && fieldErrors.hotelName && (
                      <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                        {fieldErrors.hotelName}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Complete Property Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Street, Barangay, City, Province"
                        value={formData.hotelAddress}
                        onChange={(e) => updateField("hotelAddress", e.target.value)}
                        onBlur={() => handleBlur("hotelAddress")}
                        className={`w-full pl-9 pr-3 py-2 border text-xs rounded focus:outline-none transition-colors ${
                          touchedFields.hotelAddress && fieldErrors.hotelAddress
                            ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                            : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                        }`}
                      />
                    </div>
                    {touchedFields.hotelAddress && fieldErrors.hotelAddress && (
                      <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                        {fieldErrors.hotelAddress}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pre-issued Hotel Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative max-w-md">
                    <Hash size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="INNOVAHMS-123"
                      value={formData.hotelCode}
                      onChange={(e) => updateField("hotelCode", e.target.value)}
                      onBlur={() => handleBlur("hotelCode")}
                      className={`w-full pl-9 pr-3 py-2 border text-xs font-mono uppercase rounded focus:outline-none transition-colors ${
                        touchedFields.hotelCode && fieldErrors.hotelCode
                          ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                          : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                  {touchedFields.hotelCode && fieldErrors.hotelCode && (
                    <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block font-medium">
                      {fieldErrors.hotelCode}
                    </span>
                  )}
                </div>
              )}
            </section>
          )}

          {/* STEP 3: DOCUMENTS */}
          {currentStep === 3 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-800 text-white rounded-full inline-flex items-center justify-center text-[11px] font-bold">3</span>
                    Compliance Documents
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Upload required digital verification documents (Max 5MB each).</p>
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                  Files Attached: {selectedCount}/4
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_DOCUMENTS.map((doc) => (
                  <FileRowItem
                    key={doc.key}
                    label={doc.label}
                    code={doc.code}
                    file={documents[doc.key]}
                    error={touchedFields[doc.key] ? fieldErrors[doc.key] : null}
                    onChange={(file) => updateDocument(doc.key, file)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* STEP 4: GMAIL OTP CONFIRMATION */}
          {currentStep === 4 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 bg-emerald-800 text-white rounded-full inline-flex items-center justify-center text-[11px] font-bold">4</span>
                  Gmail Confirmation Code (OTP)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  We sent a 6-digit verification code to <strong className="text-slate-900 dark:text-white font-semibold">{formData.email}</strong>.
                </p>
              </div>

              <div className="max-w-md mx-auto py-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 text-center">
                  Enter 6-Digit Verification Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={formData.otpCode}
                    onChange={(e) => updateField("otpCode", e.target.value)}
                    onBlur={() => handleBlur("otpCode")}
                    className={`w-full pl-10 pr-4 py-2.5 text-center tracking-[0.5em] font-mono text-lg font-bold border rounded focus:outline-none transition-colors ${
                      touchedFields.otpCode && fieldErrors.otpCode
                        ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                        : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  />
                </div>
                {touchedFields.otpCode && fieldErrors.otpCode && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 block text-center font-medium">
                    {fieldErrors.otpCode}
                  </span>
                )}

                {/* Resend OTP Bar */}
                <div className="mt-5 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
                  <span className="text-slate-500">Didn't receive the email code?</span>
                  <button
                    type="button"
                    disabled={resendTimer > 0 || isSendingOtp}
                    onClick={handleSendOtp}
                    className="font-semibold text-emerald-800 dark:text-emerald-400 disabled:opacity-50 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={12} className={isSendingOtp ? "animate-spin" : ""} />
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend OTP Code"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Form Step Controls */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSendingOtp}
                  className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingOtp ? "Sending Code..." : "Proceed"}
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Verifying Account..." : "Confirm & Submit Application"}
                </button>
              )}
            </div>
          </div>

        </form>
      </main>

      {/* Completion Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <CheckCircle2 className="text-emerald-700" size={24} />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Registration Complete</h3>
                <p className="text-[11px] text-slate-500">Email Address Verified</p>
              </div>
            </div>

            <div className="my-5 text-xs text-slate-600 dark:text-slate-300 space-y-3">
              <p>Your property account application has been verified via OTP and logged into the administrative queue.</p>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Property System Code</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">{successData.hotelCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-[11px] flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold"
                  >
                    <Copy size={13} />
                    {copied ? "Copied" : "Copy Code"}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                A confirmation copy has been sent to your verified Gmail inbox ({successData.email}).
              </p>
            </div>

            <button
              type="button"
              onClick={closeSuccessModal}
              className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded"
            >
              Proceed to Owner Portal Login
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-component for Documents with Immediate Visual Error State
function FileRowItem({ label, code, file, error, onChange }) {
  const fileInputRef = useRef(null);

  return (
    <div className={`border rounded p-3 transition-colors ${
      error
        ? "border-red-500 bg-red-50/20 dark:bg-red-950/20"
        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-[10px] font-mono text-slate-400 block">{code}</span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          file 
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" 
            : error 
            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" 
            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        }`}>
          {file ? "Attached" : "Required"}
        </span>
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded">
        {formatFileMeta(file)}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`w-full text-xs font-semibold border py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors ${
          error
            ? "border-red-400 text-red-700 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950"
            : "text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
        }`}
      >
        <Upload size={13} />
        {file ? "Change File..." : "Choose File..."}
      </button>

      {error && <span className="text-[10px] text-red-600 dark:text-red-400 mt-1.5 block font-medium">{error}</span>}
    </div>
  );
}