import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  QrCode,
  X,
  Sparkles,
  Star,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PENDING_PAYMENT_KEY = "customerPendingPrivilegePayment";

const fallbackPackages = [
  {
    id: "fallback-silver",
    name: "Silver",
    slug: "silver",
    description: "Entry access to member pricing and elevated guest benefits.",
    monthlyPrice: 1,
    annualPrice: 1,
    bonusPoints: 1,
    isPopular: false,
    perks: [
      "Member-only room rate previews",
      "1% dining and add-on discount",
      "Priority support queue",
      "1 welcome points on activation",
    ],
  },
  {
    id: "fallback-gold",
    name: "Gold",
    slug: "gold",
    description: "Balanced premium tier for frequent leisure and business travelers.",
    monthlyPrice: 799,
    annualPrice: 7990,
    bonusPoints: 1500,
    monthlyBonusPoints: 125,
    annualBonusPoints: 1500,
    isPopular: true,
    perks: [
      "Everything in Silver",
      "10% member booking discount",
      "Upgrade priority on eligible stays",
      "125 monthly or 1,500 annual bonus points",
    ],
  },
  {
    id: "fallback-platinum",
    name: "Platinum",
    slug: "platinum",
    description: "High-touch privileges with richer discounts and concierge-focused perks.",
    monthlyPrice: 1499,
    annualPrice: 14990,
    bonusPoints: 4000,
    monthlyBonusPoints: 400,
    annualBonusPoints: 4000,
    isPopular: false,
    perks: [
      "Everything in Gold",
      "15% member booking discount",
      "Late checkout priority requests",
      "Dedicated privilege support line",
      "400 monthly or 4,000 annual bonus points",
    ],
  },
];

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

const parseCustomerSession = () => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
  } catch {
    return null;
  }
};

const persistCustomerSummary = (summary) => {
  if (!summary?.user?.id) return;

  ["user", "customerSession"].forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.user && typeof parsed.user === "object") {
        parsed.user = {
          ...parsed.user,
          ...summary.user,
          loyaltyPoints: summary.points,
          membershipLevel: summary.tier,
          privilege: summary.privilege,
        };
        localStorage.setItem(key, JSON.stringify(parsed));
        return;
      }
      localStorage.setItem(key, JSON.stringify({
        ...parsed,
        ...summary.user,
        loyaltyPoints: summary.points,
        membershipLevel: summary.tier,
        privilege: summary.privilege,
      }));
    } catch {
      // ignore malformed local data
    }
  });

  window.dispatchEvent(new Event("userUpdated"));
};

function PrivilegeQrModal({ data, customerId, onPaid, onClose }) {
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!data?.linkId || !customerId) return undefined;
    setPaid(false);
    let settled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/customer/privileges/verify/${data.linkId}?customer_id=${customerId}`);
        const payload = await response.json().catch(() => ({}));
        if (!settled && response.ok && payload.status === "paid") {
          settled = true;
          setPaid(true);
          clearInterval(timer);
          setTimeout(() => onPaid(payload), 900);
        }
      } catch {
        // Continue polling while the QR payment is pending.
      }
    };
    const timer = setInterval(poll, 4000);
    poll();
    return () => clearInterval(timer);
  }, [data?.linkId, customerId, onPaid]);

  if (!data) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-slate-900 dark:text-white">
        <button type="button" onClick={onClose} className="float-right rounded p-1 text-slate-400"><X size={18} /></button>
        {paid ? (
          <><CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" /><h3 className="text-xl font-bold">Payment Confirmed</h3></>
        ) : (
          <>
            <QrCode size={30} className="mx-auto mb-2 text-emerald-500" />
            <h3 className="text-xl font-bold">Scan to Pay</h3>
            <p className="mb-4 mt-1 text-sm text-slate-500">QR Ph • {formatPhp(data.amount)}</p>
            {data.qrCodeUrl ? <img src={data.qrCodeUrl} alt="QR Ph payment code" className="mx-auto h-56 w-56 rounded-xl bg-white p-3" /> : <Loader2 className="mx-auto my-16 animate-spin" />}
            <p className="mt-4 text-xs text-slate-500">Scan using GCash, Maya, or your banking app.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Privileges() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionUser, setSessionUser] = useState(parseCustomerSession());
  const [packages, setPackages] = useState(fallbackPackages);
  const [summary, setSummary] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [billingCycleModalOpen, setBillingCycleModalOpen] = useState(false);
  const [billingSelection, setBillingSelection] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSelection, setPaymentSelection] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("gcash");
  const [qrPayment, setQrPayment] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const customerId = sessionUser?.id;
  const activePlanSlug = subscription?.packageSlug;
  const privilegeActive = Boolean(subscription?.isActive);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = customerId ? `?customer_id=${customerId}` : "";
      const response = await fetch(`/api/customer/privileges${query}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load privileges.");
      setPackages(payload.packages?.length ? payload.packages : fallbackPackages);
      setSummary(payload.summary || null);
      setSubscription(payload.subscription || payload.summary?.privilege || null);
      if (payload.summary) persistCustomerSummary(payload.summary);
    } catch (err) {
      setError(err.message || "Failed to load privileges.");
      setPackages(fallbackPackages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncSession = () => setSessionUser(parseCustomerSession());
    syncSession();
    window.addEventListener("userUpdated", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("userUpdated", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    load();
  }, [customerId]);

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    const pendingRaw = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!customerId || !paymentState || !pendingRaw) return;

    let pending = null;
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      pending = null;
    }
    if (!pending || Number(pending.customerId) !== Number(customerId) || !pending.linkId) return;

    if (paymentState === "failed") {
      setError("Privilege payment was not completed.");
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      setSearchParams({});
      return;
    }

    if (paymentState !== "success") return;

    const verify = async () => {
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      setPaymentLoading(pending.linkId);
      try {
        const response = await fetch(`/api/customer/privileges/verify/${pending.linkId}?customer_id=${customerId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to verify privilege payment.");
        if (data.summary) {
          setSummary(data.summary);
          setSubscription(data.subscription || data.summary?.privilege || null);
          persistCustomerSummary(data.summary);
        }
        setMessage("Privilege payment confirmed. Your customer benefits are now active.");
        setSearchParams({});
        await load();
      } catch (err) {
        localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(pending));
        setError(err.message || "Unable to verify privilege payment.");
      } finally {
        setPaymentLoading("");
      }
    };

    verify();
  }, [customerId, searchParams, setSearchParams]);

  const summaryStats = useMemo(() => ([
    {
      label: "Current Tier",
      value: summary?.tier || "STANDARD",
      helper: privilegeActive ? `${subscription?.packageName} benefits active` : "No paid privilege yet",
    },
    {
      label: "Points Balance",
      value: `${Number(summary?.points || 0).toLocaleString()} pts`,
      helper: `${Number(summary?.pointsThisMonth || 0).toLocaleString()} points earned this month`,
    },
    {
      label: "Renewal Date",
      value: subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "--",
      helper: privilegeActive ? "Active privilege access" : "Activate a plan to unlock benefits",
    },
  ]), [summary, subscription, privilegeActive]);

  const handleCheckout = async (pkg, billingCycle, paymentMethod = "gcash") => {
    if (!customerId) {
      navigate("/login");
      return;
    }

    setError("");
    setMessage("");
    setPaymentLoading(`${pkg.id}-${billingCycle}`);
    try {
      const response = await fetch("/api/customer/privileges/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          packageId: pkg.id,
          billingCycle,
          paymentMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start privilege checkout.");
      localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
        customerId,
        linkId: data.linkId,
        packageId: pkg.id,
        billingCycle,
      }));
      if (data.isQrPayment && data.qrCodeUrl) {
        setQrPayment({ ...data, linkId: data.linkId || data.intentId, amount: data.amount || 0 });
        return;
      }
      if (!data.checkoutUrl) throw new Error("PayMongo did not return a checkout URL.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message || "Unable to start privilege checkout.");
      setPaymentLoading("");
    }
  };

  const finishQrPayment = async () => {
    setQrPayment(null);
    localStorage.removeItem(PENDING_PAYMENT_KEY);
    setMessage("Privilege payment confirmed. Your customer benefits are now active.");
    await load();
  };

  const openPaymentMethodModal = (pkg, billingCycle) => {
    setPaymentSelection({ pkg, billingCycle });
    setSelectedPaymentMethod("gcash");
    setPaymentModalOpen(true);
  };

  const openBillingCycleModal = (pkg) => {
    setBillingSelection(pkg);
    setBillingCycleModalOpen(true);
  };

  const handleCancelPrivilege = async () => {
    if (!customerId || cancelLoading) return;
    setCancelLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/customer/privileges/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to cancel privilege tier.");
      if (data.summary) {
        setSummary(data.summary);
        setSubscription(data.subscription || data.summary?.privilege || null);
        persistCustomerSummary(data.summary);
      }
      setMessage(data.message || "Privilege tier cancelled successfully.");
      setCancelModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || "Unable to cancel privilege tier.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#080d0b] dark:text-[#EEEEEE] font-sans selection:bg-[#2FA084]/30">
      <PrivilegeQrModal data={qrPayment} customerId={customerId} onPaid={finishQrPayment} onClose={() => setQrPayment(null)} />

      {/* BILLING CYCLE MODAL - Silver keeps its existing thesis tryout flow. */}
      {billingCycleModalOpen && billingSelection ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-[#243B33] dark:bg-[#0e1a16]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-mono tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] uppercase">Billing Cycle</p>
                <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">Choose {billingSelection.name} billing</h3>
              </div>
              <button
                type="button"
                onClick={() => setBillingCycleModalOpen(false)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-[#243B33] dark:text-gray-300 dark:hover:bg-[#182924]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { key: "MONTHLY", label: "Monthly", price: billingSelection.monthlyPrice, points: billingSelection.monthlyBonusPoints, note: "Billed every month" },
                { key: "ANNUAL", label: "Annual", price: billingSelection.annualPrice, points: billingSelection.annualBonusPoints, note: "Billed once per year" },
              ].map((cycle) => (
                <button
                  key={cycle.key}
                  type="button"
                  onClick={() => {
                    setBillingCycleModalOpen(false);
                    openPaymentMethodModal(billingSelection, cycle.key);
                  }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10"
                >
                  <span className="block text-sm font-semibold text-emerald-900 dark:text-emerald-300">{cycle.label}</span>
                  <span className="mt-2 block text-lg font-bold text-gray-900 dark:text-white">{formatPhp(cycle.price)}</span>
                  <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">{cycle.note} • {Number(cycle.points || 0).toLocaleString()} bonus points</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      
      {/* PAYMENT METHOD MODAL */}
      {paymentModalOpen && paymentSelection ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-[#243B33] dark:bg-[#0e1a16]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-mono tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] uppercase">Payment Method</p>
                <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                  Choose how you want to pay
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:border-[#243B33] dark:text-gray-300 dark:hover:bg-[#182924]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {[
                { key: "gcash", label: "GCash" },
                { key: "paymaya", label: "Maya / eWallet" },
                { key: "qrph", label: "QR Ph" },
                { key: "card", label: "Card" },
              ].map((method) => (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod(method.key);
                    setPaymentModalOpen(false);
                    handleCheckout(paymentSelection.pkg, paymentSelection.billingCycle, method.key);
                  }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                    selectedPaymentMethod === method.key
                      ? "border-[#2FA084] bg-[#1F6F5F]/5 text-[#1F6F5F] dark:border-[#2FA084] dark:bg-[#1F6F5F]/10 dark:text-[#6FCF97]"
                      : "border-gray-200 bg-slate-50 text-gray-700 hover:bg-gray-100 dark:border-[#243B33] dark:bg-[#080d0b]/40 dark:text-gray-200 dark:hover:bg-[#182924]"
                  }`}
                >
                  <span className="text-sm font-medium">{method.label}</span>
                  <span className="text-[10px] uppercase tracking-wider">Select</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-gray-100 bg-slate-50 p-3 text-xs text-gray-600 dark:border-[#182924] dark:bg-[#080d0b]/40 dark:text-gray-300">
              Selected: <span className="font-semibold text-gray-900 dark:text-white">{selectedPaymentMethod.toUpperCase()}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* CANCEL MODAL */}
      {cancelModalOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-2xl dark:border-emerald-500/30 dark:bg-[#0e1a16]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Membership Confirmation</p>
              <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">Cancel membership?</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Your {subscription?.packageName || "current"} membership will be cancelled. Member discounts will no longer apply to future bookings.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 rounded-xl border border-emerald-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
              >
                Keep Membership
              </button>
              <button
                type="button"
                onClick={handleCancelPrivilege}
                disabled={cancelLoading}
                className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* HERO SECTION */}
      <section className="relative flex min-h-[50vh] items-center overflow-hidden border-b border-gray-200 bg-[#0a120f] px-6 py-16 dark:border-[#182924]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,160,132,0.18),transparent_40%),linear-gradient(135deg,rgba(8,13,11,0.92),rgba(14,26,22,0.85))]" />
        
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2FA084]/30 bg-[#1F6F5F]/20 px-3.5 py-1.5 text-[11px] font-mono tracking-widest uppercase text-[#6FCF97]">
              <Star size={13} /> Customer Privileges
            </span>
            <h1 className="mt-4 max-w-2xl text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight text-white tracking-tight">
              Premium stays, direct loyalty perks, and verified rewards.
            </h1>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-gray-300 font-normal">
              Choose a privilege tier to sync automated booking discounts, tier renewals, and bonus points directly into your customer profile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => (customerId ? navigate("/rewards") : navigate("/login"))}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1F6F5F] hover:bg-[#288B77] text-white px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all shadow-md"
              >
                {customerId ? "Open Rewards Center" : "Sign In to Continue"}
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/vision-suites?viewMode=room")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#243B33] bg-[#0c1612]/60 hover:bg-[#182924] text-gray-200 px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all"
              >
                Browse Rooms
              </button>
            </div>
          </div>

          {/* LIVE SNAPSHOT */}
          <div className="rounded-2xl border border-[#243B33] bg-[#0c1612]/80 p-6 shadow-xl backdrop-blur-md">
            <p className="text-[11px] font-mono tracking-widest text-[#6FCF97] uppercase mb-4">Live Membership Snapshot</p>
            <div className="grid gap-3">
              {summaryStats.map((item) => (
                <div key={item.label} className="rounded-xl border border-[#182924] bg-[#080d0b]/60 p-4">
                  <p className="text-[10px] font-mono tracking-wider text-gray-400 uppercase">{item.label}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{item.value}</h3>
                  <p className="mt-0.5 text-xs text-gray-400">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ERROR / MESSAGE BANNER */}
      <section className="mx-auto max-w-7xl px-6 pt-6">
        {(error || message) ? (
          <div className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            error
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-[#2FA084]/30 dark:bg-[#1F6F5F]/20 dark:text-[#6FCF97]"
          }`}>
            {error || message}
          </div>
        ) : null}
      </section>

      {/* PLANS GRID */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[11px] font-mono tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] uppercase">Privilege Plans</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white">
              Choose your membership tier
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Payment verification updates your account status automatically and unlocks instant tier perks on all future room bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[#1F6F5F] dark:text-[#6FCF97]" />
            </div>
          ) : (
            packages.map((pkg, index) => {
              const isCurrent = activePlanSlug === pkg.slug;
              return (
                <motion.article
                  key={pkg.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className={`flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition-all ${
                    isCurrent
                      ? "border-[#2FA084] bg-white dark:bg-[#0c1612] dark:border-[#2FA084] shadow-md ring-1 ring-[#2FA084]"
                      : "border-gray-200 bg-white dark:border-[#182924] dark:bg-[#0e1a16]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-wider ${
                        pkg.isPopular
                          ? "bg-[#1F6F5F]/10 text-[#1F6F5F] dark:bg-[#2FA084]/20 dark:text-[#6FCF97]"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {pkg.isPopular ? "Most Chosen" : "Privilege Tier"}
                      </span>
                      <span className="text-2xl font-bold text-[#1F6F5F] dark:text-[#6FCF97]">{pkg.name}</span>
                    </div>

                    <h3 className="mt-4 text-base font-medium text-gray-900 dark:text-white">{pkg.description}</h3>
                    
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-slate-50 p-3.5 dark:border-[#182924] dark:bg-[#080d0b]/50">
                      <Crown size={18} className="text-[#1F6F5F] dark:text-[#6FCF97]" />
                      <div>
                        <p className="text-[10px] font-mono uppercase text-gray-500 dark:text-gray-400">Bonus Points</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {pkg.slug === "gold" || pkg.slug === "platinum"
                            ? `${Number(pkg.monthlyBonusPoints || 0).toLocaleString()} monthly / ${Number(pkg.annualBonusPoints || 0).toLocaleString()} annual`
                            : `${Number(pkg.bonusPoints || 0).toLocaleString()} pts`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2.5">
                      {(pkg.perks || []).map((perk) => (
                        <div key={perk} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300">
                          <CheckCircle2 size={15} className="mt-0.5 text-[#1F6F5F] dark:text-[#6FCF97] shrink-0" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (["gold", "platinum"].includes(String(pkg.slug).toLowerCase())) {
                            openBillingCycleModal(pkg);
                            return;
                          }
                          openPaymentMethodModal(pkg, isCurrent ? "MONTHLY" : "ANNUAL");
                        }}
                        disabled={Boolean(paymentLoading) || cancelLoading}
                        className="rounded-xl bg-[#1F6F5F] hover:bg-[#288B77] text-white py-2.5 text-[11px] font-medium uppercase tracking-wider transition-all disabled:opacity-60"
                      >
                        {paymentLoading === `${pkg.id}-${isCurrent ? "MONTHLY" : "ANNUAL"}`
                          ? "Processing..."
                          : "Pay"}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCancelModalOpen(true)}
                        disabled={Boolean(paymentLoading) || cancelLoading}
                        className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-[11px] font-medium uppercase tracking-wider text-red-600 hover:bg-red-100 transition-all disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                      >
                        {cancelLoading ? "Cancelling..." : "Cancel"}
                      </button>
                    </div>

                    {!isCurrent ? (
                      <p className="mt-2.5 text-center text-[11px] text-gray-500 dark:text-gray-400">
                        Monthly: {formatPhp(pkg.monthlyPrice)} • Annual: {formatPhp(pkg.annualPrice)}
                      </p>
                    ) : null}
                  </div>
                </motion.article>
              );
            })
          )}
        </div>
      </section>

      {/* FOOTER INFO SECTION */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm dark:border-[#182924] dark:bg-[#0e1a16]">
            <span className="text-[11px] font-mono tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] uppercase">Payment Flow</span>
            <h3 className="mt-1 text-xl font-medium text-gray-900 dark:text-white">What happens after you pay</h3>
            <div className="mt-5 space-y-2.5">
              {[
                "Choose a privilege tier and billing cycle on this page.",
                "The app generates a payment link and opens the checkout flow.",
                "After payment, Innova HMS verifies the transaction and updates your database privilege record.",
                "Your customer points, benefits, and renewal dates refresh automatically.",
              ].map((step) => (
                <div key={step} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-slate-50 p-3.5 text-xs text-gray-600 dark:border-[#182924] dark:bg-[#080d0b]/40 dark:text-gray-300">
                  <Sparkles size={15} className="mt-0.5 text-[#1F6F5F] dark:text-[#6FCF97] shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm dark:border-[#182924] dark:bg-[#0e1a16]">
            <div className="flex items-center gap-3 mb-5">
              <div className="rounded-xl bg-[#1F6F5F]/10 p-2.5 text-[#1F6F5F] dark:bg-[#2FA084]/20 dark:text-[#6FCF97]">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-[10px] font-mono tracking-widest text-gray-500 uppercase">Current Access</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {privilegeActive ? `${subscription?.packageName} Active` : "No Active Privilege"}
                </h3>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-slate-50 p-3.5 dark:border-[#182924] dark:bg-[#080d0b]/40">
                <span className="text-gray-500 dark:text-gray-400">Payment Status</span>
                <span className="font-semibold text-gray-900 dark:text-white">{subscription?.paymentStatus || "UNPAID"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-slate-50 p-3.5 dark:border-[#182924] dark:bg-[#080d0b]/40">
                <span className="text-gray-500 dark:text-gray-400">Billing Cycle</span>
                <span className="font-semibold text-gray-900 dark:text-white">{subscription?.billingCycle || "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-slate-50 p-3.5 dark:border-[#182924] dark:bg-[#080d0b]/40">
                <span className="text-gray-500 dark:text-gray-400">Renewal Date</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "--"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => navigate(customerId ? "/rewards" : "/login")}
                className="w-full rounded-xl bg-[#1F6F5F] hover:bg-[#288B77] text-white py-2.5 text-xs font-medium uppercase tracking-wider transition-all"
              >
                {customerId ? "Open Rewards Center" : "Sign In To Activate"}
              </button>
              {privilegeActive ? (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-medium uppercase tracking-wider text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                >
                  Cancel Privilege Tier
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate("/customer/bookings")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:border-[#243B33] dark:bg-[#080d0b]/40 dark:text-gray-300 dark:hover:bg-[#182924]"
              >
                Manage Bookings
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
