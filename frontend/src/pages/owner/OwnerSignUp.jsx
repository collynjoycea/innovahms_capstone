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
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  X
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
  middleName: "",
  lastName: "",
  suffix: "",
  email: "",
  contactNumber: "",
  password: "",
  hotelCode: "",
  hotelName: "",
  hotelAddress: "",
  addressCategory: "",
  latitude: "",
  longitude: "",
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

const TERMS_AND_CONDITIONS = `INNOVA-HMS

Terms and Conditions for Hotel Owners

These Terms and Conditions govern the registration, subscription, and use of the INNOVA-HMS platform by hotel owners and their authorized representatives.

By registering, subscribing to, or using INNOVA-HMS, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.

1. Use of INNOVA-HMS

INNOVA-HMS is a web-based Smart Hotel Operations Information System designed to help participating hotels manage reservations, guest information, room availability, room assignments, housekeeping activities, inventory records, staff access, analytics, forecasting, and other operational information through a centralized platform.

INNOVA-HMS provides digital tools intended to support hotel operations and decision-making. Hotel Owners remain responsible for verifying information and making final operational decisions.

2. Account Registration

Hotel Owners must provide accurate, complete, and current information when creating an INNOVA-HMS account.

Information provided may include:
- Hotel name;
- Hotel address;
- Contact information;
- Room information;
- Room rates;
- Room availability;
- Amenities and room descriptions;
- Check-in and check-out information;
- Cancellation and refund policies; and
- Other information required by the platform.

Hotel Owners are responsible for ensuring that information displayed through their account is accurate and updated.

3. Account Security

Hotel Owners are responsible for maintaining the confidentiality of their account credentials. Account credentials must not be shared with unauthorized persons. Hotel Owners must promptly notify the INNOVA-HMS administrator if they suspect unauthorized access to their account. All activities performed through an authorized Hotel Owner account are the responsibility of the account holder.

4. Hotel Staff Accounts

Hotel Owners may create or authorize accounts for designated hotel personnel, including front desk staff and housekeeping staff. Hotel Owners are responsible for authorizing appropriate staff members, assigning appropriate system access, ensuring legitimate use, and removing access when a staff member is no longer authorized.

5. Hotel Information and Room Listings

Hotel Owners are responsible for the accuracy of room descriptions, room rates, room availability, room status, policies, and other information presented to customers. Hotel Owners must not intentionally provide false, misleading, or fraudulent information.

6. Reservation Management

Hotel Owners and authorized front desk staff are responsible for properly managing reservations made through INNOVA-HMS. Hotel Owners must maintain accurate availability, room status, reservation records, and booking details. Reasonable care should be taken to minimize double bookings, incorrect room assignments, and other reservation-related errors.

7. Room Assignment

INNOVA-HMS may provide intelligent room assignment features based on available information such as room availability, room status, and customer preferences. AI-assisted room assignments are recommendations and should be reviewed by authorized hotel personnel before being finalized when necessary.

8. Housekeeping and Room Status

Authorized housekeeping staff may use INNOVA-HMS to record housekeeping activities and update room status. Hotel Owners are responsible for ensuring that room information and housekeeping records accurately reflect the hotel's current operational status.

9. Inventory and Supplies

INNOVA-HMS may provide tools for recording and monitoring hotel inventory and supplies. Hotel Owners and authorized personnel are responsible for entering accurate inventory information and verifying physical inventory when necessary. Inventory alerts and recommendations assist with monitoring and planning and do not guarantee that shortages will be prevented.

10. Artificial Intelligence

INNOVA-HMS may use artificial intelligence for intelligent room assignment, customer behavioral analysis, recommendations, and other decision-support functions. AI-generated results may contain inaccuracies or may not reflect all relevant circumstances. Hotel Owners and authorized personnel are responsible for reviewing AI-generated information and making final operational decisions.

11. Prophet Forecasting

INNOVA-HMS may use Prophet forecasting to analyze historical operational data and generate forecasts. Forecast results are estimates based on available data and assumptions. Actual future conditions may differ from forecasted results. Forecasting information should be used as a decision-support tool and should not be treated as a guarantee of future occupancy, demand, revenue, inventory requirements, or other business conditions.

12. Analytics and Reports

INNOVA-HMS may provide dashboards, reports, analytics, and operational insights based on information entered into the system. The accuracy of reports and analytics depends on the quality, completeness, and timeliness of the data provided. Hotel Owners should verify important information before using it for significant operational or business decisions.

13. Customer Information

Hotel Owners and authorized staff may access customer information necessary for legitimate reservation and hotel-operation purposes. Customer information must be handled responsibly and must not be sold without proper authorization, used for unauthorized purposes, disclosed unnecessarily, accessed without authorization, or used to discriminate against or harm customers.

14. Subscription and Payment

Access to INNOVA-HMS may require a subscription or other applicable payment. Where PayMongo is used as the designated payment gateway, payment transactions may be processed through PayMongo and may be subject to its applicable terms and policies. Hotel Owners are responsible for accurate billing information and required payments. INNOVA-HMS does not require Hotel Owners to provide payment-card credentials directly to the system when payment processing is handled by the designated payment gateway.

15. Prohibited Activities

Hotel Owners and authorized users must not provide false or misleading information, create fraudulent reservations, access another hotel owner's account or information without authorization, bypass system security, introduce malicious software or harmful code, misuse customer information, interfere with INNOVA-HMS, obtain unauthorized access to system data, use the platform for unlawful activities, or allow unauthorized persons to use their accounts.

16. System Availability

INNOVA-HMS is intended to provide continuous access to its features; however, temporary interruptions may occur due to maintenance, technical problems, network interruptions, security measures, or circumstances beyond the control of the system administrator. Reasonable efforts will be made to maintain and restore system availability.

17. Data Accuracy and User Responsibility

Hotel Owners acknowledge that information displayed, processed, or generated by INNOVA-HMS depends on information entered into the system. INNOVA-HMS cannot guarantee the accuracy of results when underlying information is incorrect, incomplete, outdated, or improperly entered. Hotel Owners remain responsible for verifying critical operational information.

18. Account Suspension or Termination

INNOVA-HMS administrators may suspend or terminate a Hotel Owner account due to violation of these Terms, fraudulent activity, unauthorized access, misuse of customer or system information, security threats, abuse of the platform, or unlawful use of the system.

19. Acceptance of Terms

By creating an account, subscribing to, or using INNOVA-HMS, you acknowledge that you have read, understood, and agreed to these Terms and Conditions. If you do not agree with these Terms, you should not register for or use the INNOVA-HMS platform.

For concerns regarding these Terms and Conditions, contact the INNOVA-HMS administrator through the official contact information provided on the platform.`;

const PRIVACY_POLICY = `INNOVA-HMS

Privacy Policy for Hotel Owners

This Privacy Policy explains how INNOVA-HMS collects, uses, stores, protects, and manages information associated with Hotel Owners and their authorized users.

By registering for and using INNOVA-HMS, you acknowledge that you have read and understood this Privacy Policy.

1. Information We Collect

Depending on how the platform is used, INNOVA-HMS may collect account information such as name, email address, contact number, username, account credentials, hotel information, and other information required for registration.

Hotel information may include hotel name and address, room information, room rates, room availability, hotel policies, inventory information, and other operational information entered into the system.

Hotel Owners may enter or authorize staff information for front desk and housekeeping accounts, including names, contact information, account identifiers, assigned roles, and system activity records.

Where applicable, INNOVA-HMS may maintain records related to subscriptions, payment status, invoices, and transaction references. Payment processing may be handled by PayMongo or another designated payment service provider.

2. How We Use Information

Information collected through INNOVA-HMS may be used to create and manage accounts, provide system features, manage hotel and reservation information, monitor housekeeping and inventory records, provide dashboards and reports, generate analytics and forecasts, support AI features, process subscriptions and payments, send system notifications, maintain security, troubleshoot technical issues, and improve the platform.

3. AI, Analytics, and Forecasting

INNOVA-HMS may process operational information to provide analytics, behavioral insights, intelligent recommendations, and forecasting features. Prophet forecasting may process historical operational data to generate estimates for planning and decision-making. AI and forecasting outputs are based on available system data and are not guaranteed results.

4. Sharing of Information

INNOVA-HMS may provide information to authorized users when necessary for legitimate system and hotel operations. Information may also be processed by authorized service providers for payment processing, hosting, security, or technical services. INNOVA-HMS does not intentionally sell personal information to third parties.

5. Payment Information

Where PayMongo is used, payment transactions are handled through the designated payment service. INNOVA-HMS does not intentionally collect or store complete payment-card credentials when processed directly by the payment provider. Payment-related information may include transaction references, payment status, amount, date, and other transaction records.

6. Data Security

INNOVA-HMS implements reasonable administrative, technical, and organizational measures intended to protect information from unauthorized access, alteration, disclosure, loss, or misuse. No electronic system can guarantee absolute security. Hotel Owners and authorized staff are also responsible for protecting account credentials and following appropriate security practices.

7. Data Retention

Information may be retained as reasonably necessary to provide the platform, maintain operational records, comply with applicable requirements, resolve disputes, maintain security, and fulfill legitimate business or system purposes. Retention periods may vary by information type and purpose.

8. Access to Information

Hotel Owners may access information associated with their hotel and authorized users based on assigned account permissions. Access to customer information should be limited to legitimate hotel and reservation-related purposes.

9. User Responsibilities

Hotel Owners are responsible for ensuring that information entered into INNOVA-HMS is accurate and that authorized staff handle information appropriately. Hotel Owners must not intentionally upload unnecessary sensitive information or use the platform to collect information unrelated to legitimate hotel operations.

10. Privacy and Applicable Laws

INNOVA-HMS intends to handle personal information responsibly and in accordance with applicable Philippine privacy requirements, including transparency, legitimate purpose, and proportionality.

11. Privacy Concerns

For questions, requests, or concerns regarding this Privacy Policy or information processed through INNOVA-HMS, Hotel Owners may contact the INNOVA-HMS administrator through the official contact information provided on the platform.

12. Acknowledgment

By using INNOVA-HMS, you acknowledge that you have read and understood this Privacy Policy and understand how information may be collected, used, processed, and protected in connection with the platform.`;

const formatFileMeta = (file) => {
  if (!file) return "No file selected (.pdf, .jpg, .png, .webp)";
  const sizeInKb = file.size / 1024;
  return `${file.name} (${sizeInKb >= 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeInKb))} KB`})`;
};

export default function OwnerSignUp() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [policyToShow, setPolicyToShow] = useState(null);
  
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

    if (key === "middleName" && value.trim() && !isValidName(value)) {
      error = "Enter a valid middle name.";
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

    if (key === "hotelName") {
      if (!value.trim()) error = "Property name is required.";
      else if (value.trim().length < 3) error = "Hotel name must be at least 3 characters.";
    }

    if (key === "hotelAddress") {
      if (!value.trim()) error = "Complete property address is required.";
      else if (value.trim().length < 10) error = "Please provide a more detailed address.";
    }

    if (key === "addressCategory" && !value) error = "Select an address category.";

    if (key === "otpCode") {
      if (!value.trim()) error = "Enter the 6-digit confirmation code.";
      else if (value.trim().length !== 6) error = "OTP must be exactly 6 digits.";
    }

    return error;
  };

  const updateField = (key, value) => {
    let sanitizedValue = value;

    // Strict Real-time Formatting & Masking
    if (key === "firstName" || key === "middleName" || key === "lastName") {
      sanitizedValue = value.replace(/[^a-zA-Z\sÃ±Ã‘-]/g, "");
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
      } else if (Object.entries(documents).some(([otherKey, otherFile]) => otherKey !== key && otherFile && otherFile.name === file.name && otherFile.size === file.size && otherFile.lastModified === file.lastModified)) {
        error = "This file is already attached to another requirement.";
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
      ["firstName", "middleName", "lastName", "email", "contactNumber", "password"].forEach((field) => {
        newTouched[field] = true;
        const err = validateSingleField(field, formData[field]);
        if (err) errors[field] = err;
      });
    }

    if (step === 2) {
      ["hotelName", "hotelAddress", "addressCategory"].forEach((field) => {
        newTouched[field] = true;
        const err = validateSingleField(field, formData[field]);
        if (err) errors[field] = err;
      });
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
      if (!acceptedTerms) errors.acceptedTerms = "You must accept the Terms and Conditions before submitting.";
      if (!acceptedPrivacy) errors.acceptedPrivacy = "You must accept the Privacy Policy before submitting.";
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
        body: JSON.stringify({ userType: "owner", email: normalizeEmail(formData.email) }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data.error || "Failed to send verification code. Please try again.");
        return false;
      }

      setOtpSent(true);
      setResendTimer(30);
      return true;
    } catch {
      setErrorMessage("Unable to send verification code to Gmail. Please try again.");
      return false;
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
      hotelCode: "",
      hotelName: formData.hotelName.trim(),
      hotelAddress: formData.hotelAddress.trim(),
      acceptedTerms: String(acceptedTerms),
      acceptedPrivacy: String(acceptedPrivacy),
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
      setCurrentStep(1);
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Hotel Owner Registration Form
</h2>
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Middle Name</label>
                  <input type="text" placeholder="e.g. Santos" value={formData.middleName} onChange={(e) => updateField("middleName", e.target.value)} onBlur={() => handleBlur("middleName")} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded" />
                  {touchedFields.middleName && fieldErrors.middleName && <span className="text-[11px] text-red-600 mt-1 block">{fieldErrors.middleName}</span>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Suffix</label>
                  <select value={formData.suffix} onChange={(e) => updateField("suffix", e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded">
                    <option value="">None</option><option value="Jr.">Jr.</option><option value="Sr.">Sr.</option><option value="II">II</option><option value="III">III</option><option value="IV">IV</option>
                  </select>
                </div>

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
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters, with letters and numbers"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      className={`w-full pl-9 pr-10 py-2 border text-xs rounded focus:outline-none transition-colors ${
                        touchedFields.password && fieldErrors.password
                          ? "border-red-500 bg-red-50/20 text-red-900 dark:text-red-200"
                          : "border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Address Category <span className="text-red-500">*</span></label>
                    <select
                      value={formData.addressCategory}
                      onChange={(e) => updateField("addressCategory", e.target.value)}
                      onBlur={() => handleBlur("addressCategory")}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded focus:outline-none focus:border-emerald-700"
                    >
                      <option value="">Select category</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Resort">Resort</option>
                      <option value="Inn">Inn</option>
                      <option value="Bed and Breakfast">Bed and Breakfast</option>
                    </select>
                    {touchedFields.addressCategory && fieldErrors.addressCategory && <span className="text-[11px] text-red-600 mt-1 block">{fieldErrors.addressCategory}</span>}
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="number" step="any" placeholder="Map pin latitude (optional)" value={formData.latitude} onChange={(e) => updateField("latitude", e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded" />
                    <input type="number" step="any" placeholder="Map pin longitude (optional)" value={formData.longitude} onChange={(e) => updateField("longitude", e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs rounded" />
                  </div>
                </div>
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

                <div className={`mt-5 rounded border p-3 ${fieldErrors.acceptedTerms || fieldErrors.acceptedPrivacy ? "border-red-400 bg-red-50/50 dark:border-red-500/60 dark:bg-red-950/20" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"}`}>
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => {
                        setAcceptedTerms(event.target.checked);
                        setFieldErrors((current) => ({ ...current, acceptedTerms: undefined }));
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-800"
                    />
                    <span>
                      I have read and agree to the INNOVA-HMS{" "}
                      <button
                        type="button"
                        onClick={() => setPolicyToShow("terms")}
                        className="font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Terms and Conditions
                      </button>
                      .
                    </span>
                  </label>
                  {fieldErrors.acceptedTerms && (
                    <p className="mt-2 text-[11px] font-medium text-red-600 dark:text-red-400">{fieldErrors.acceptedTerms}</p>
                  )}

                  <label className="mt-3 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(event) => {
                        setAcceptedPrivacy(event.target.checked);
                        setFieldErrors((current) => ({ ...current, acceptedPrivacy: undefined }));
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-800"
                    />
                    <span>
                      I have read and agree to the INNOVA-HMS{" "}
                      <button
                        type="button"
                        onClick={() => setPolicyToShow("privacy")}
                        className="font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </label>
                  {fieldErrors.acceptedPrivacy && (
                    <p className="mt-2 text-[11px] font-medium text-red-600 dark:text-red-400">{fieldErrors.acceptedPrivacy}</p>
                  )}
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

      {policyToShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[min(720px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {policyToShow === "terms" ? "Terms and Conditions for Hotel Owners" : "Privacy Policy for Hotel Owners"}
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
              {policyToShow === "terms" ? TERMS_AND_CONDITIONS : PRIVACY_POLICY}
            </pre>
            <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPolicyToShow(null)}
                className="rounded bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
