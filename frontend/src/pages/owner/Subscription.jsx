import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Crown, Loader2, Lock, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const OWNER_SESSION_KEY = 'ownerSession';

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

const parseSession = () => {
  try {
    return JSON.parse(localStorage.getItem(OWNER_SESSION_KEY) || '{}');
  } catch {
    return {};
  }
};

export default function OwnerSubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(parseSession());
  const [packages, setPackages] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState('');
  const [hotelSaving, setHotelSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hotelForm, setHotelForm] = useState({ hotelCode: '', hotelName: '', hotelAddress: '' });

  const ownerId = session?.id;

  // Strict check para masigurong active lang kung may actual active subscription data galing sa database
  const isSubscribed = Boolean(subscription?.isActive && subscription?.status === 'ACTIVE');
  const accessUnlocked = Boolean(isSubscribed && session?.hasHotel);
  
  const activePackageId = subscription?.packageId || null;

  const persistSession = (nextSession) => {
    localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify({
      ...session,
      ...nextSession,
      loginTime: session?.loginTime || new Date().toISOString(),
    }));
    setSession(parseSession());
    window.dispatchEvent(new Event('ownerSessionUpdated'));
  };

  const load = async () => {
    if (!ownerId) {
      navigate('/owner/login', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/owner/subscription/${ownerId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load subscription data.');
      
      // Override or inject ₱1 price for starter package kung kinakailangan para sa thesis demo
      const updatedPackages = (data.packages || []).map(pkg => {
        if (pkg.slug === 'starter' || pkg.name?.toLowerCase().includes('starter')) {
          return { ...pkg, monthlyPrice: 1 };
        }
        return pkg;
      });

      setPackages(updatedPackages);
      setSubscription(data.subscription || null);
      if (data.session) persistSession(data.session);
    } catch (err) {
      setError(err.message || 'Failed to load subscription data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ownerId]);

  useEffect(() => {
    if (searchParams.get('payment') === 'failed') {
      setError('Payment was cancelled or declined. Your subscription was not activated.');
      navigate('/owner/subscription', { replace: true });
      return;
    }
    if (!ownerId || searchParams.get('payment') !== 'success') return;
    let cancelled = false;
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/owner/subscription/verify/latest?owner_id=${ownerId}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to verify subscription payment.');
        if (cancelled) return;
        if (data.session) persistSession(data.session);
        setSubscription(data.subscription || null);
        setMessage('Payment confirmed. Your owner subscription is now active.');
        navigate('/owner/subscription', { replace: true });
        await load();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to verify subscription payment.');
      }
    };
    verifyPayment();
    return () => { cancelled = true; };
  }, [ownerId, searchParams]);

  const activatePlan = async (pkg, billingCycle) => {
    if (!ownerId) return;
    setError('');
    setMessage('');
    setPaymentLoading(`${pkg.id}-${billingCycle}`);
    try {
      const response = await fetch('/api/owner/subscription/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, packageId: pkg.id, billingCycle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to activate subscription.');
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      if (data.session) persistSession(data.session);
      setSubscription(data.subscription || null);
      setMessage(data.message || `${pkg.name} ${billingCycle.toLowerCase()} subscription activated successfully.`);
      await load();
    } catch (err) {
      setError(err.message || 'Unable to activate subscription.');
    } finally {
      setPaymentLoading('');
    }
  };

  const cancelSubscription = async () => {
    if (!ownerId || !window.confirm('Are you sure you want to cancel your owner subscription?')) return;
    setError('');
    setMessage('');
    setPaymentLoading('cancel');
    try {
      const response = await fetch('/api/owner/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to cancel subscription.');
      if (data.session) persistSession(data.session);
      setSubscription(null); // Clear subscription state immediately
      setMessage(data.message || 'Your owner subscription has been cancelled.');
      await load();
    } catch (err) {
      setError(err.message || 'Unable to cancel subscription.');
    } finally {
      setPaymentLoading('');
    }
  };

  const submitHotelSetup = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setHotelSaving(true);
    try {
      const response = await fetch('/api/owner/hotel/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ...hotelForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save hotel setup.');
      if (data.session) persistSession(data.session);
      setMessage(data.message || 'Hotel setup completed successfully.');
      await load();
    } catch (err) {
      setError(err.message || 'Unable to save hotel setup.');
    } finally {
      setHotelSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 md:p-8 font-sans">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* HEADER OVERVIEW SECTION */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-400 font-bold block mb-1">Account Subscription</span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {accessUnlocked ? 'Subscription Active & Unlocked' : 'Subscription Required'}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Manage your property billing plan, secure payment processing, and system feature access.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-semibold ${accessUnlocked ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                {accessUnlocked ? 'Active Access' : 'Pending Activation'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded">
              <span className="text-slate-400 block mb-0.5">Current Plan</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{subscription?.packageName || 'None'}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded">
              <span className="text-slate-400 block mb-0.5">Billing Cycle</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{subscription?.billingCycle || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded">
              <span className="text-slate-400 block mb-0.5">Renewal Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          {accessUnlocked && (
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => navigate('/owner')} 
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded shadow-sm transition-colors"
              >
                Go to Owner Dashboard →
              </button>
            </div>
          )}
        </section>

        {/* FEEDBACK ALERTS */}
        {(error || message) && (
          <div className={`p-4 rounded border text-xs flex items-center gap-3 ${error ? 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-800 dark:text-red-200' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200'}`}>
            <span className="font-bold">{error ? 'Error:' : 'Success:'}</span>
            <span>{error || message}</span>
          </div>
        )}

        {/* PACKAGES LIST */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Available Subscription Packages</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-emerald-700" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((pkg) => {
                const isThisPackageActive = isSubscribed && String(activePackageId) === String(pkg.id);

                return (
                  <div key={pkg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{pkg.slug}</span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">{pkg.name}</h4>
                        </div>
                        {isThisPackageActive && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mb-4">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{formatPhp(pkg.monthlyPrice)}</span>
                        <span className="text-[11px] text-slate-500 ml-1">/ month</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 min-h-[36px]">
                        {pkg.description || 'Standard management features for property operations.'}
                      </p>

                      <div className="space-y-1.5 mb-6 border-t border-slate-100 dark:border-slate-800 pt-3">
                        {(pkg.features || []).map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <CheckCircle2 size={14} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MGA BUTTONS: Kung Active ang package na ito -> Renew / Cancel | Kung Hindi -> Pay lang */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {isThisPackageActive ? (
                        <>
                          <button
                            type="button"
                            onClick={() => activatePlan(pkg, 'MONTHLY')}
                            disabled={Boolean(paymentLoading)}
                            className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                          >
                            {paymentLoading === `${pkg.id}-MONTHLY` ? 'Processing...' : 'Renew Subscription'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelSubscription}
                            disabled={Boolean(paymentLoading)}
                            className="w-full py-2 border border-red-300 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold rounded transition-colors disabled:opacity-50"
                          >
                            {paymentLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => activatePlan(pkg, 'MONTHLY')}
                          disabled={Boolean(paymentLoading)}
                          className="w-full py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                        >
                          {paymentLoading === `${pkg.id}-MONTHLY` ? 'Processing...' : 'Pay Plan'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HOTEL SETUP SECTION */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Registered Property Details</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
            {session?.hasHotel ? 'Your establishment is linked to this owner account.' : 'Provide property details to finalize configuration.'}
          </p>

          {session?.hasHotel ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-slate-400 block mb-0.5">Hotel Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{session?.hotelName || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-slate-400 block mb-0.5">Hotel Code</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{session?.hotelCode || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={submitHotelSetup} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hotel Code (Optional)</label>
                <input
                  type="text"
                  placeholder="INNOVAHMS-123"
                  value={hotelForm.hotelCode}
                  disabled={!isSubscribed}
                  onChange={(e) => setHotelForm((curr) => ({ ...curr, hotelCode: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hotel Name *</label>
                <input
                  type="text"
                  placeholder="Grand Vista Hotel"
                  value={hotelForm.hotelName}
                  disabled={!isSubscribed}
                  onChange={(e) => setHotelForm((curr) => ({ ...curr, hotelName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hotel Address *</label>
                <input
                  type="text"
                  placeholder="Complete Address"
                  value={hotelForm.hotelAddress}
                  disabled={!isSubscribed}
                  onChange={(e) => setHotelForm((curr) => ({ ...curr, hotelAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded text-xs bg-slate-50 dark:bg-slate-800 outline-none disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!isSubscribed || hotelSaving}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
              >
                {hotelSaving ? 'Saving...' : 'Save Property Details'}
              </button>
            </form>
          )}
        </section>

      </div>
    </div>
  );
}