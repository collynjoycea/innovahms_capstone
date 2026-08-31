import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Gift, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const getCustomer = () => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
  } catch { return null; }
};

export default function Rewards() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(getCustomer());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setCustomer(getCustomer());
    window.addEventListener("userUpdated", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("userUpdated", sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    if (!customer?.id) { navigate("/login", { replace: true }); return; }
    fetch(`/api/innova/summary/${customer.id}`)
      .then((response) => response.json().catch(() => ({})).then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => { if (ok) setSummary(body); })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [customer?.id, navigate]);

  const balance = summary?.pointsBalance || {};
  const bookingSources = useMemo(() => (summary?.pointSources || []).filter((source) => source.key === "stay-spend"), [summary]);
  const totalPoints = Number(balance.total ?? summary?.points ?? 0);
  const monthlyPoints = Number(balance.thisMonth ?? summary?.pointsThisMonth ?? 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-white shadow-xl md:p-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400"><Sparkles size={14} /> Rewards & Points</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Your Booking Rewards</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300">Earn points from eligible reservations and completed stays, then use them on future bookings.</p>
              <button type="button" onClick={() => navigate("/customer/bookings")} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800">View My Bookings <ArrowRight size={16} /></button>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-7 text-center">
              <Gift className="mx-auto text-emerald-400" size={30} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Available Points</p>
              <p className="mt-1 text-4xl font-bold text-emerald-400">{loading ? "..." : totalPoints.toLocaleString()}</p>
              <p className="mt-1 text-xs text-zinc-400">1 point = PHP 1 booking discount</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Total Balance</p><p className="mt-2 text-3xl font-bold">{totalPoints.toLocaleString()} pts</p><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Available for future reservations.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Earned This Month</p><p className="mt-2 text-3xl font-bold">{monthlyPoints.toLocaleString()} pts</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400"><CalendarDays size={15} /> Based on eligible stays.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Earn Rate</p><p className="mt-2 text-3xl font-bold">1 pt / PHP 100</p><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Reservation spend converts automatically.</p></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Point Sources</p>
          <h2 className="mt-2 text-2xl font-bold">Points from your reservations</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">{balance.explanation || "Points are earned from eligible booking and reservation spend only."}</p>
          <div className="mt-6 space-y-3">
            {bookingSources.map((source) => <div key={source.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/60"><div><p className="font-bold">{source.label}</p><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{source.description}</p></div><p className="text-xl font-bold text-emerald-500">{Number(source.points || 0).toLocaleString()} pts</p></div>)}
            {!bookingSources.length && !loading ? <p className="text-sm text-slate-500 dark:text-zinc-400">No eligible reservation points yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
