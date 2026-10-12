import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BedDouble,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Loader2,
  Megaphone,
  Search,
  ShieldCheck,
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
    description: 'List your hotel and start receiving bookings.',
    features: ['Hotel profile and photo gallery', 'Room and rate management', 'Basic booking analytics'],
  },
  {
    id: 'standard',
    slug: 'standard',
    name: 'Standard',
    monthlyPrice: 999,
    description: 'Stand out in search and track how you compare.',
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
    description: 'Full promotion tools and deeper insights.',
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
  const location = useLocation();
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
    if (location.hash !== '#plans') return;
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;
    const loadPackages = async () => {
      try {
        const session = readSession();
        // Logged-in owners use the existing endpoint. Visitors need a public one:
        // add GET /api/owner/packages on the backend, or the fallback list is shown.
        const url = session?.id ? `/api/owner/subscription/${session.id}` : '/api/owner/packages';
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error();
        const list = (data.packages || []).map((pkg) =>
          pkg.slug === 'starter' || pkg.name?.toLowerCase().includes('starter')
            ? { ...pkg, monthlyPrice: 1 }
            : pkg
        );
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
    <main className="min-h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* HERO */}
      <section id="top" className="bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              Promote your hotel to more travelers
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-md">
              List your property on the INNOVA-HMS portal, show your best rates, and get bookings directly to your hotel.
            </p>
            <button
              type="button"
              onClick={getStarted}
              className="mt-8 px-7 py-3.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
            >
              Start subscription
            </button>
          </div>

          {/* Phone mockup: how a hotel appears to guests */}
          <div className="mx-auto w-full max-w-[300px]" aria-hidden="true">
            <div className="rounded-[2rem] border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl">
              <div className="rounded-[1.4rem] overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-emerald-800 dark:text-emerald-400">
                  <span>INNOVA-HMS</span>
                  <Search size={16} className="text-slate-500" />
                </div>
                <div className="h-28 bg-gradient-to-br from-emerald-700 to-emerald-900 grid place-items-center text-white/80">
                  <BedDouble size={44} />
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500">Hotel</div>
                      <div className="font-bold">Your Hotel Name</div>
                    </div>
                    <span className="text-[11px] font-semibold border border-slate-800 dark:border-slate-300 rounded-full px-2.5 py-1">
                      Contact info
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold">Direct booking</div>
                      <div className="text-xl font-bold">{formatPhp(2800)}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-emerald-700 text-white text-xs font-semibold rounded px-3 py-2">
                      View deal <ChevronRight size={14} />
                    </span>
                  </div>
                  <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    <div>{formatPhp(3050)} Other site A</div>
                    <div>{formatPhp(3200)} Other site B</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        {/* Dashboard preview */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 shadow-sm" aria-hidden="true">
          <div className="flex items-center justify-between mb-5">
            <div className="font-semibold text-sm">This month</div>
            <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded">
              Rate competitive
            </span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {[40, 55, 35, 70, 60, 85, 75].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-emerald-700/80" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
            {[
              ['Views', '12.4k'],
              ['Clicks', '1.8k'],
              ['Bookings', '214'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2.5">
                <div className="font-bold text-base">{value}</div>
                <div className="text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Go beyond a basic listing</h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-lg">
            See how your rates compare, understand what travelers search for, and give guests more reasons to book direct with you.
          </p>
          <ul className="mt-8 space-y-5">
            {[
              [Megaphone, 'Promote your hotel', 'Add offers with a clickable badge so guests can reach you directly.'],
              [BarChart3, 'Know your numbers', 'Track views, clicks, and bookings for each property.'],
              [ShieldCheck, 'Pay only for what you pick', 'Choose a plan that fits your hotel and change it any time.'],
            ].map(([Icon, title, text]) => (
              <li key={title} className="flex gap-4">
                <span className="grid place-items-center h-10 w-10 shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <Icon size={20} />
                </span>
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight text-emerald-900 dark:text-emerald-300">
            Choose the plan that fits your hotel
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-emerald-700" />
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-3 items-stretch">
              {packages.map((pkg, index) => {
                const featured = index === featuredIndex;
                return (
                  <div
                    key={pkg.id}
                    className={`flex flex-col rounded-xl bg-white dark:bg-slate-900 p-7 border ${
                      featured
                        ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-lg'
                        : 'border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">{pkg.name}</h3>
                      {featured && (
                        <span className="text-xs font-semibold bg-emerald-700 text-white rounded px-2 py-0.5">
                          Most popular
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-3xl font-bold">{formatPhp(pkg.monthlyPrice)}</span>
                      <span className="text-sm text-slate-500 ml-1">/ month</span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 min-h-[40px]">
                      {pkg.description || 'Standard management features for property operations.'}
                    </p>

                    <ul className="mt-5 space-y-3 flex-1">
                      {subscriptionFeatureList(pkg.features).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <CheckCircle2 size={18} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={getStarted}
                      className="mt-8 w-full py-3 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
                    >
                      Get started
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
            <CircleCheck size={16} /> Create an owner account first, then choose your plan.
          </p>
        </div>
      </section>
    </main>
  );
}
