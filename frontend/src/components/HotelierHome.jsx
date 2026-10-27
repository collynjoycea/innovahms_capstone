import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  CircleCheck,
  Loader2,
  Megaphone,
  ShieldCheck,
  Building2,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { subscriptionFeatureList } from '../utils/subscriptionFeatures';

const OWNER_SESSION_KEY = 'ownerSession';

// Shown only if the packages API can't be reached (e.g. not logged in yet).
// Replace with your real packages/prices.
const FALLBACK_PACKAGES = [
  {
    id: 'starter',
    slug: 'starter',
    name: 'Starter',
    monthlyPrice: 1,
    description: 'List your hotel and start receiving bookings directly.',
    features: ['Hotel profile and photo gallery', 'Room and rate management', 'Basic booking analytics'],
  },
  {
    id: 'standard',
    slug: 'standard',
    name: 'Standard',
    monthlyPrice: 999,
    description: 'Stand out in search and track how you compare with competitors.',
    features: [
      'Everything in Starter',
      'Higher placement in portal search',
      'Promotional offers with a clickable badge',
      'Competitor rate benchmarking',
    ],
  },
  {
    id: 'premium',
    slug: 'premium',
    name: 'Premium',
    monthlyPrice: 1999,
    description: 'Full promotional toolkit with deep guest insights.',
    features: [
      'Everything in Standard',
      'Featured hotel on the portal home page',
      'Guest and search-trend insights',
      'Customized analytics reports',
    ],
  },
];

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(OWNER_SESSION_KEY) || '{}');
  } catch {
    return {};
  }
};

export default function HotelierHome() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // New visitors go to register. Owners who are already logged in skip it
  // and go straight to the subscription page.
  const getStarted = () => {
    const session = readSession();
    if (session?.id) {
      navigate('/owner/subscription');
    } else {
      navigate('/owner/signup', { state: { redirectTo: '/owner/subscription' } });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadPackages = async () => {
      try {
        const session = readSession();
        const url = session?.id ? `/api/owner/subscription/${session.id}` : '/api/owner/packages';
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error();
        const list = (data.packages || []).map((pkg) => ({
          ...pkg,
          monthlyPrice: Number(pkg.monthlyPrice ?? pkg.monthly_price ?? 0),
          annualPrice: Number(pkg.annualPrice ?? pkg.annual_price ?? 0),
        }));
        if (!cancelled) setPackages(list.length ? list : FALLBACK_PACKAGES);
      } catch {
        if (!cancelled) setPackages(FALLBACK_PACKAGES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPackages();
    return () => {
      cancelled = true;
    };
  }, []);

  // Highlight the middle plan, like the "Business Studio+" card in the reference.
  const featuredIndex = packages.length === 3 ? 1 : -1;

  return (
    <main className="min-h-screen bg-[#f4f7f6] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans py-10 px-4 sm:px-8 lg:px-16">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* HERO SECTION - Matching SignUp background & style */}
        <section id="top" className="grid md:grid-cols-2 gap-10 items-center pt-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-[#006042] dark:text-emerald-400 text-xs font-semibold mb-4">
             
              <span>Official Partner Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0d2a23] dark:text-emerald-400 tracking-tight leading-tight">
              Partner Registration & Subscription Portal
            </h1>
            
            <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Register your hotel on <span className="font-semibold text-slate-900 dark:text-white">INNOVA-HMS</span> to access flexible subscription plans, gain direct guest bookings, and leverage powerful performance analytics for property growth.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={getStarted}
                className="flex items-center justify-center gap-2 rounded-md bg-[#006042] hover:bg-[#004a33] text-xs font-bold text-white px-6 py-3 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#006042]"
              >
                <span>Register Hotel Account</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Registration Requirement Guide */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Building2 size={18} className="text-[#006042] dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                How to Get Started
              </h2>
            </div>
            
            <ol className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#006042]/10 text-[#006042] dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span><strong className="text-slate-800 dark:text-slate-200">Register Account:</strong> Create an owner account using your official business contact details.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#006042]/10 text-[#006042] dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span><strong className="text-slate-800 dark:text-slate-200">Set Up Profile:</strong> Complete email verification and enter property management details.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#006042]/10 text-[#006042] dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <span><strong className="text-slate-800 dark:text-slate-200">Select Plan:</strong> Subscribe to Starter, Standard, or Premium to activate your listing.</span>
              </li>
            </ol>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-sm grid md:grid-cols-2 gap-10 items-center">
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-[#f4f7f6] dark:bg-slate-800/40 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#006042] dark:text-emerald-400" />
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">Monthly Performance</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded">
                Competitive Rate
              </span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {[40, 55, 35, 70, 60, 85, 75].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#006042]/80 dark:bg-emerald-600/80" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
              {[
                ['Views', '12.4k'],
                ['Clicks', '1.8k'],
                ['Bookings', '214'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2.5">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{value}</div>
                  <div className="text-[11px] text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Optimize Beyond Basic Listings
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Compare market rates, analyze traveler search behavior, and provide compelling reasons for guests to reserve directly with your property.
            </p>
            
            <ul className="mt-6 space-y-4">
              {[
                [Megaphone, 'Promote Your Hotel', 'Add promotional badges and clickable offers to connect directly with guests.'],
                [BarChart3, 'Track Key Metrics', 'Monitor profile views, direct clicks, and total reservations across properties.'],
                [ShieldCheck, 'Flexible Subscriptions', 'Choose the plan suited for your operational size and upgrade anytime.'],
              ].map(([Icon, title, text]) => (
                <li key={title} className="flex gap-3">
                  <span className="grid place-items-center h-8 w-8 shrink-0 rounded-md bg-emerald-100/80 dark:bg-emerald-950 text-[#006042] dark:text-emerald-300">
                    <Icon size={16} />
                  </span>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">{title}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{text}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* SUBSCRIPTION PLANS SECTION */}
        <section id="plans" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-[#0d2a23] dark:text-emerald-300">
              Subscription Plans
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select the best plan to start managing your hotel on INNOVA-HMS.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[#006042]" />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-3 items-stretch">
              {packages.map((pkg, index) => {
                const featured = index === featuredIndex;
                return (
                  <div
                    key={pkg.id}
                    className={`flex flex-col rounded-xl bg-white dark:bg-slate-900 p-6 border ${
                      featured
                        ? 'border-[#006042] ring-2 ring-[#006042]/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{pkg.name}</h3>
                      {featured && (
                        <span className="text-[10px] font-semibold bg-[#006042] text-white rounded px-2 py-0.5">
                          Most popular
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatPhp(pkg.monthlyPrice)}</span>
                      <span className="text-xs text-slate-500 ml-1">/ month</span>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 min-h-[36px]">
                      {pkg.description || 'Standard features for hotel property operations.'}
                    </p>

                    <ul className="mt-4 space-y-2.5 flex-1 border-t border-slate-100 dark:border-slate-800 pt-4">
                      {subscriptionFeatureList(pkg.features).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                          <CheckCircle2 size={16} className="text-[#006042] dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={getStarted}
                      className="mt-6 w-full py-2.5 rounded-md bg-[#006042] hover:bg-[#004a33] text-xs font-bold text-white transition-colors"
                    >
                      Get started
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CircleCheck size={14} className="text-[#006042] dark:text-emerald-400" /> Registration is required prior to selecting and completing a subscription plan.
          </p>
        </section>

      </div>
    </main>
  );
}