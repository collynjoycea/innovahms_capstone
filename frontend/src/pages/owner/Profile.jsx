import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  Building2,
  Camera,
  ExternalLink,
  FileCheck2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  X,
  User,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { persistOwnerSession, readOwnerSession } from "../../utils/ownerSession";

const parseOwnerSession = () => readOwnerSession();

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

const emptyProfile = {
  owner: {
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    profileImage: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    approvalStatus: "PENDING",
    reviewNotes: "",
    businessPermitPath: "",
    birCertificatePath: "",
    fireSafetyCertificatePath: "",
    validIdPath: "",
  },
  hotel: {
    hotelName: "",
    hotelCode: "",
    hotelAddress: "",
    hotelDescription: "",
    contactPhone: "",
    hotelProfilePicture: "",
    businessImage: "",
    hotelLogo: "",
    buildingImage: "",
    checkInPolicy: "",
    checkOutPolicy: "",
    cancellationPolicy: "",
  },
  stats: { roomCount: 0, reservationCount: 0, revenue: 0 },
};

const normalizeOwnerProfile = (data = {}) => {
  const owner = { ...emptyProfile.owner, ...(data.owner || {}) };
  const hotelSeed = { ...emptyProfile.hotel, ...(data.hotel || {}) };
  const hotelProfilePicture =
    hotelSeed.hotelProfilePicture || hotelSeed.businessImage || hotelSeed.hotelLogo || "";

  return {
    owner,
    hotel: {
      ...hotelSeed,
      hotelProfilePicture,
      businessImage: hotelProfilePicture,
      hotelLogo: hotelProfilePicture,
      buildingImage: hotelSeed.buildingImage || "",
    },
    stats: { ...emptyProfile.stats, ...(data.stats || {}) },
  };
};

const buildOwnerProfilePayload = (draft) => ({
  owner: { ...draft.owner },
  hotel: {
    ...draft.hotel,
    hotelProfilePicture: draft.hotel.hotelProfilePicture || "",
    businessImage: draft.hotel.hotelProfilePicture || "",
    hotelLogo: draft.hotel.hotelProfilePicture || "",
    buildingImage: draft.hotel.buildingImage || "",
  },
});

const documentItems = [
  { key: "businessPermitPath", label: "Business Permit", code: "BP-DOC" },
  { key: "birCertificatePath", label: "BIR Certificate", code: "BIR-2303" },
  { key: "fireSafetyCertificatePath", label: "Fire Safety Certificate", code: "FSIC-DOC" },
  { key: "validIdPath", label: "Valid ID", code: "GOV-ID" },
];

export default function OwnerProfile({ section = "owner" }) {
  const navigate = useNavigate();
  const ownerProfilePictureInputRef = useRef(null);
  const hotelProfilePictureInputRef = useRef(null);
  const buildingImageInputRef = useRef(null);
  const [session, setSession] = useState(parseOwnerSession());
  const [profile, setProfile] = useState(emptyProfile);
  const [draft, setDraft] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const ownerId = session?.id;
  const showOwnerSection = section === "owner";
  const showPropertySection = section === "property";

  useEffect(() => {
    const sync = () => setSession(parseOwnerSession());
    window.addEventListener("ownerSessionUpdated", sync);
    return () => window.removeEventListener("ownerSessionUpdated", sync);
  }, []);

  useEffect(() => {
    if (!ownerId) {
      navigate("/owner/login", { replace: true });
      return;
    }

    let dead = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/owner/profile/${ownerId}`);
        const data = await response.json().catch(() => ({}));
        if (!dead && response.ok) {
          const normalized = normalizeOwnerProfile(data);
          setProfile(normalized);
          setDraft(normalized);
        }
      } finally {
        if (!dead) setLoading(false);
      }
    };

    load();
    return () => {
      dead = true;
    };
  }, [ownerId, navigate]);

  const initials = useMemo(
    () => `${draft.owner.firstName?.[0] || ""}${draft.owner.lastName?.[0] || ""}`.trim() || "O",
    [draft.owner.firstName, draft.owner.lastName]
  );

  const approvalStatusLabel = String(draft.owner.approvalStatus || "PENDING").toUpperCase();
  const approvalTone =
    approvalStatusLabel === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300";

  const onFieldChange = (section, key, value) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const resetImageInputs = () => {
    if (ownerProfilePictureInputRef.current) ownerProfilePictureInputRef.current.value = "";
    if (hotelProfilePictureInputRef.current) hotelProfilePictureInputRef.current.value = "";
    if (buildingImageInputRef.current) buildingImageInputRef.current.value = "";
  };

  const handleImageChange = async (section, key, files) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      onFieldChange(section, key, dataUrl);
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Failed to read image file.");
    }
  };

  const cancelEdit = () => {
    setDraft(profile);
    resetImageInputs();
    setEditing(false);
    setMessage("");
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = buildOwnerProfilePayload(draft);
      const response = await fetch(`/api/owner/profile/${ownerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to update owner profile.");

      const normalized = normalizeOwnerProfile(data.profile);
      setProfile(normalized);
      setDraft(normalized);
      resetImageInputs();
      setEditing(false);

      if (data.session) {
        persistOwnerSession(data.session, { merge: true });
      }
      setMessage("Owner profile updated successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to update owner profile.");
    } finally {
      setSaving(false);
    }
  };

  const readOnly = !editing;
  const inputBase = `w-full rounded border px-3 py-2 text-xs outline-none transition-all ${
    readOnly
      ? "cursor-default bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
      : "bg-white text-slate-900 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 dark:bg-slate-800 dark:text-white"
  } border-slate-300 dark:border-slate-700`;
  const textareaBase = `${inputBase} min-h-[100px] resize-none`;
  
  const hotelName = draft.hotel.hotelName || "Your hotel name";
  const ownerName = `${draft.owner.firstName} ${draft.owner.lastName}`.trim() || "Hotel Owner";
  const ownerProfilePictureSrc = draft.owner.profileImage || "";
  const hotelProfilePictureSrc = draft.hotel.hotelProfilePicture || "/images/logo.png";
  const buildingImageSrc = draft.hotel.buildingImage || "/images/signup-img.png";
  
  const hotelProfileInitials =
    draft.hotel.hotelName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "HP";
      
  const hotelCode = draft.hotel.hotelCode || "--";
  const hotelAddress = draft.hotel.hotelAddress || "Your hotel address will appear here.";
  const hotelDescription =
    draft.hotel.hotelDescription || "Add a short hotel description so guests immediately understand your property.";
  const ownerEmail = draft.owner.email || "Add an email address for this account.";
  const ownerContactNumber = draft.owner.contactNumber || "Add a contact number for this account.";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans px-4 py-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header & Actions */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Owner Portal</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {showPropertySection ? "Property Details" : "Owner Profile"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {showPropertySection
                ? "Manage your hotel information, property media, and guest stay policies."
                : "Manage your personal details, payout preferences, and compliance records."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-60 shadow-sm"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-900 shadow-sm"
              >
                <Pencil size={14} />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Feedback Message Banner */}
        {message ? (
          <div className={`mb-6 rounded p-3 text-xs font-semibold flex items-center gap-2 ${message.toLowerCase().includes("failed") ? "border-l-4 border-red-600 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "border-l-4 border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>
            <AlertCircle size={15} />
            <span>{message}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Loading owner profile...
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Top Overview & Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Hotel Overview Card */}
              {showPropertySection && <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-emerald-700 dark:text-emerald-400" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hotel Status</h3>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${approvalTone}`}>
                    {approvalStatusLabel}
                  </span>
                </div>

                <div className="space-y-3">
                  <SummaryStrip label="Hotel Code" value={hotelCode} />
                  <SummaryStrip label="Property Name" value={hotelName} />
                  <SummaryStrip icon={MapPin} label="Address" value={hotelAddress} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <StatCard label="Rooms" value={profile.stats.roomCount} />
                  <StatCard label="Reservations" value={profile.stats.reservationCount} />
                  <StatCard label="Revenue" value={formatPhp(profile.stats.revenue)} />
                </div>
              </section>}

              {/* Owner Account Summary Card */}
              {showOwnerSection && <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                  <User size={16} className="text-emerald-700 dark:text-emerald-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Administrator Account</h3>
                </div>

                <div className="flex items-center gap-3 p-3 rounded border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 mb-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                    {ownerProfilePictureSrc ? (
                      <img src={ownerProfilePictureSrc} alt={ownerName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Owner Name</span>
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{ownerName}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <SummaryStrip icon={Mail} label="Email Address" value={ownerEmail} />
                  <SummaryStrip icon={Phone} label="Contact Number" value={ownerContactNumber} />
                </div>
              </section>}

            </div>

            {/* Editable Sections Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Personal Details */}
              {showOwnerSection && <SectionShell icon={ShieldCheck} title="Personal Details">
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name"><input value={draft.owner.firstName} onChange={(e) => onFieldChange("owner", "firstName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                    <Field label="Last Name"><input value={draft.owner.lastName} onChange={(e) => onFieldChange("owner", "lastName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  </div>
                  <Field label="Business Email"><input value={draft.owner.email} onChange={(e) => onFieldChange("owner", "email", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Contact Number"><input value={draft.owner.contactNumber} onChange={(e) => onFieldChange("owner", "contactNumber", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <ImageUploadField
                    label="Owner Profile Picture"
                    helper="Upload a clear photo of the administrator."
                    image={ownerProfilePictureSrc}
                    hasImage={Boolean(draft.owner.profileImage)}
                    alt={ownerName}
                    readOnly={readOnly}
                    inputRef={ownerProfilePictureInputRef}
                    onSelect={(event) => handleImageChange("owner", "profileImage", event.target.files)}
                    placeholder={initials}
                  />
                </div>
              </SectionShell>}

              {/* Payout Bank Details */}
              {showOwnerSection && <SectionShell icon={Banknote} title="Payout Setup">
                <div className="grid gap-3">
                  <Field label="Bank Name"><input value={draft.owner.bankName} onChange={(e) => onFieldChange("owner", "bankName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Account Name"><input value={draft.owner.bankAccountName} onChange={(e) => onFieldChange("owner", "bankAccountName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Account Number"><input value={draft.owner.bankAccountNumber} onChange={(e) => onFieldChange("owner", "bankAccountNumber", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <div className="rounded border border-dashed border-slate-300 dark:border-slate-700 p-3 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900">
                    Bank accounts are securely registered for automated booking payouts.
                  </div>
                </div>
              </SectionShell>}

              {/* Property and Media */}
              {showPropertySection && <SectionShell icon={Building2} title="Property & Media Info">
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Hotel Name"><input value={draft.hotel.hotelName} onChange={(e) => onFieldChange("hotel", "hotelName", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                    <Field label="Hotel Code"><input value={draft.hotel.hotelCode} readOnly className={`${inputBase} bg-slate-100 text-slate-500`} /></Field>
                  </div>
                  <Field label="Property Address"><input value={draft.hotel.hotelAddress} onChange={(e) => onFieldChange("hotel", "hotelAddress", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  <Field label="Business Phone"><input value={draft.hotel.contactPhone} onChange={(e) => onFieldChange("hotel", "contactPhone", e.target.value)} readOnly={readOnly} className={inputBase} /></Field>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <ImageUploadField
                      label="Hotel Logo"
                      helper="Square brand image."
                      image={hotelProfilePictureSrc}
                      hasImage={Boolean(draft.hotel.hotelProfilePicture)}
                      alt="Hotel logo"
                      readOnly={readOnly}
                      inputRef={hotelProfilePictureInputRef}
                      onSelect={(event) => handleImageChange("hotel", "hotelProfilePicture", event.target.files)}
                      placeholder={hotelProfileInitials}
                    />
                    <ImageUploadField
                      label="Building Photo"
                      helper="Wide exterior shot."
                      image={buildingImageSrc}
                      hasImage={Boolean(draft.hotel.buildingImage)}
                      alt="Building"
                      readOnly={readOnly}
                      inputRef={buildingImageInputRef}
                      onSelect={(event) => handleImageChange("hotel", "buildingImage", event.target.files)}
                      wide
                    />
                  </div>

                  <Field label="Hotel Description"><textarea value={draft.hotel.hotelDescription} onChange={(e) => onFieldChange("hotel", "hotelDescription", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                </div>
              </SectionShell>}

              {/* Guest Stay Rules */}
              {showPropertySection && <SectionShell icon={MapPin} title="Guest Stay Rules & Policies">
                <div className="grid gap-3">
                  <Field label="Check-in Policy"><textarea value={draft.hotel.checkInPolicy} onChange={(e) => onFieldChange("hotel", "checkInPolicy", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                  <Field label="Check-out Policy"><textarea value={draft.hotel.checkOutPolicy} onChange={(e) => onFieldChange("hotel", "checkOutPolicy", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                  <Field label="Cancellation Policy"><textarea value={draft.hotel.cancellationPolicy} onChange={(e) => onFieldChange("hotel", "cancellationPolicy", e.target.value)} readOnly={readOnly} className={textareaBase} /></Field>
                </div>
              </SectionShell>}

            </div>

         

          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
      <span className="text-[10px] font-mono text-slate-400 uppercase block">{label}</span>
      <span className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white block truncate">{value}</span>
    </div>
  );
}

function SummaryStrip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
      {Icon ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <Icon size={14} />
        </span>
      ) : null}
      <div className="min-w-0">
        <span className="text-[10px] font-mono text-slate-400 uppercase block">{label}</span>
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function SectionShell({ icon: Icon, title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <Icon size={15} />
        </span>
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DocumentCard({ code, label, href }) {
  const hasFile = Boolean(href);
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <span className="text-[10px] font-mono text-slate-400 block">{code}</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</span>
          </div>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${hasFile ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
            {hasFile ? "Attached" : "Missing"}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded my-2">
          {hasFile ? href : "No document attached."}
        </p>
      </div>
      {hasFile ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-900"
        >
          Open Document
          <ExternalLink size={12} />
        </a>
      ) : null}
    </div>
  );
}

function ImageUploadField({
  label,
  helper,
  image,
  hasImage,
  alt,
  readOnly,
  inputRef,
  onSelect,
  placeholder = "Img",
  wide = false,
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <div className="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className={wide ? "h-28 overflow-hidden rounded mb-2" : "flex justify-center mb-2"}>
          {wide ? (
            hasImage ? (
              <img src={image} alt={alt} className="h-full w-full object-cover rounded" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-800 text-[11px] font-bold text-slate-400 rounded">
                Building Preview
              </div>
            )
          ) : (
            <div className="h-16 w-16 overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 flex items-center justify-center">
              {hasImage ? (
                <img src={image} alt={alt} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{placeholder}</span>
              )}
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">{helper}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={readOnly}
            className="inline-flex items-center gap-1 rounded bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-800 dark:hover:bg-emerald-900"
          >
            <Camera size={12} />
            {hasImage ? "Change" : "Upload"}
          </button>
          <span className="text-[10px] text-slate-400">
            {readOnly ? "Locked" : "PNG, JPG, WebP"}
          </span>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onSelect} />
      </div>
    </div>
  );
}