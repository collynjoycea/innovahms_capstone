import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Building2, Camera, Mail, Pencil, Phone, Save, ShieldCheck, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { persistManagerSession, readManagerSession } from "./managerSession";

const emptyProfile = {
  firstName: "", lastName: "", email: "", contactNumber: "",
  role: "Hotel Manager", hotelId: null, hotelCode: "", hotelName: "", profileImage: "",
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) return reject(new Error("Image must be under 5MB."));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-slate-400">{label}</span>
    {children}
  </label>
);

const SummaryStrip = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
    <Icon size={15} className="shrink-0 text-emerald-700 dark:text-emerald-400" />
    <div className="min-w-0">
      <span className="block text-[10px] font-mono uppercase text-slate-400">{label}</span>
      <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  </div>
);

export default function ManagerProfile() {
  const navigate = useNavigate();
  const pictureInputRef = useRef(null);
  const [session, setSession] = useState(readManagerSession());
  const [profile, setProfile] = useState(emptyProfile);
  const [draft, setDraft] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const managerId = session?.id;

  useEffect(() => {
    const sync = () => setSession(readManagerSession());
    window.addEventListener("managerSessionUpdated", sync);
    return () => window.removeEventListener("managerSessionUpdated", sync);
  }, []);

  useEffect(() => {
    if (!managerId) {
      navigate("/manager/login", { replace: true });
      return;
    }
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/manager/profile/${managerId}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to load manager profile.");
        if (!active) return;
        const next = { ...emptyProfile, ...data };
        setProfile(next);
        setDraft(next);
      } catch (error) {
        if (active) setMessage(error.message || "Failed to load manager profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [managerId, navigate]);

  const initials = useMemo(
    () => `${draft.firstName?.[0] || ""}${draft.lastName?.[0] || ""}`.toUpperCase() || "M",
    [draft.firstName, draft.lastName]
  );

  const onChange = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const onPicture = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Please select a valid image file.");
    try {
      const dataUrl = await fileToDataUrl(file);
      setDraft((prev) => ({ ...prev, profileImage: dataUrl }));
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Failed to read image file.");
    }
  };

  const cancelEdit = () => {
    setDraft(profile);
    if (pictureInputRef.current) pictureInputRef.current.value = "";
    setEditing(false);
    setMessage("");
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/manager/profile/${managerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email,
          contactNumber: draft.contactNumber,
          profileImage: draft.profileImage,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to update manager profile.");
      const next = { ...emptyProfile, ...data };
      setProfile(next);
      setDraft(next);
      persistManagerSession(
        { firstName: next.firstName, lastName: next.lastName, email: next.email, contactNumber: next.contactNumber, profileImage: next.profileImage },
        { merge: true }
      );
      setEditing(false);
      setMessage("Manager profile updated successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to update manager profile.");
    } finally {
      setSaving(false);
    }
  };

  const readOnly = !editing;
  const inputClass = `w-full rounded border px-3 py-2.5 text-xs outline-none transition-colors border-slate-300 dark:border-slate-700 ${
    readOnly
      ? "cursor-default bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
      : "bg-white text-slate-900 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 dark:bg-slate-800 dark:text-white"
  }`;
  const managerName = `${draft.firstName} ${draft.lastName}`.trim() || "Hotel Manager";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Manager Portal</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Manager Profile</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your personal details and view the hotel you are assigned to.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <X size={14} /> Cancel
                </button>
                <button type="button" onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-1.5 rounded bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-60 shadow-sm">
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-emerald-800 dark:hover:bg-emerald-900 shadow-sm">
                <Pencil size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {message ? (
          <div className={`mb-6 rounded p-3 text-xs font-semibold flex items-center gap-2 ${message.toLowerCase().includes("failed") ? "border-l-4 border-red-600 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "border-l-4 border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>
            <AlertCircle size={15} />
            <span>{message}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Loading manager profile...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Summary */}
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-emerald-100 dark:border-slate-700 dark:bg-emerald-950/60">
                  {draft.profileImage ? (
                    <img src={draft.profileImage} alt={managerName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-bold text-emerald-800 dark:text-emerald-300">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-mono uppercase text-slate-400">Manager Name</span>
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{managerName}</p>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{draft.role || "Hotel Manager"}</p>
                </div>
              </div>
              <SummaryStrip icon={Mail} label="Email Address" value={draft.email || "Add an email address."} />
              <SummaryStrip icon={Phone} label="Contact Number" value={draft.contactNumber || "Add a contact number."} />
              <SummaryStrip icon={Building2} label="Assigned Hotel" value={draft.hotelName || "--"} />
              <SummaryStrip icon={ShieldCheck} label="Hotel Code" value={draft.hotelCode || "--"} />
            </section>

            {/* Edit form */}
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <User size={16} className="text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Personal Details</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First Name"><input value={draft.firstName} onChange={onChange("firstName")} readOnly={readOnly} className={inputClass} /></Field>
                <Field label="Last Name"><input value={draft.lastName} onChange={onChange("lastName")} readOnly={readOnly} className={inputClass} /></Field>
                <Field label="Email"><input type="email" value={draft.email} onChange={onChange("email")} readOnly={readOnly} className={inputClass} /></Field>
                <Field label="Contact Number"><input value={draft.contactNumber} onChange={onChange("contactNumber")} readOnly={readOnly} className={inputClass} /></Field>
                <Field label="Role"><input value={draft.role} readOnly className={inputClass} /></Field>
                <Field label="Hotel Code"><input value={draft.hotelCode} readOnly className={inputClass} /></Field>
              </div>
              <div className="mt-4">
                <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-slate-400">Manager Profile Picture</span>
                <input ref={pictureInputRef} type="file" accept="image/*" onChange={onPicture} disabled={readOnly} className="hidden" id="manager-picture" />
                <label
                  htmlFor="manager-picture"
                  className={`inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700 ${
                    readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  <Camera size={14} /> {draft.profileImage ? "Change Photo" : "Upload Photo"}
                </label>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
