import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Edit2,
  Zap,
  Crown,
  Sprout,
  RefreshCw,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';
import { confirmAdminAction, showAdminResult } from '../../utils/adminDialogs';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const emptyPackageForm = {
  name: '',
  description: '',
  monthlyPrice: '0',
  annualPrice: '0',
  maxRooms: '',
  displayOrder: '0',
  featuresText: '',
  isPopular: false,
  isActive: true,
};

const packageTheme = (slug) => {
  if (slug === 'enterprise') return { icon: Crown, accent: 'text-purple-700 dark:text-purple-400', pill: 'text-purple-800 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50' };
  if (slug === 'pro') return { icon: Zap, accent: 'text-emerald-700 dark:text-emerald-400', pill: 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' };
  return { icon: Sprout, accent: 'text-emerald-700 dark:text-emerald-400', pill: 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' };
};

const formatPhp = (amount) => currencyFormatter.format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
};

const normalizeFeatures = (rawValue) =>
  String(rawValue || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const ModalShell = ({ children, onClose, isDarkMode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Package Management</span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Edit Package Settings</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const MemPackage = () => {
  const { isDarkMode = false } = useOutletContext() || {};
  const [packages, setPackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [packageForm, setPackageForm] = useState(emptyPackageForm);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showPackageModal, setShowPackageModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/packages');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load package data.');
      setPackages(data.packages || []);
      setSubscriptions(data.subscriptions || []);
      setHotels(data.hotels || []);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.message || 'Unable to load package data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSubscriptions = useMemo(() => subscriptions.filter((subscription) => {
    const matchesPlan = planFilter === 'all' || subscription.planSlug === planFilter || subscription.plan === planFilter;
    const haystack = `${subscription.hotelName} ${subscription.hotelCode} ${subscription.ownerName} ${subscription.ownerEmail} ${subscription.plan}`.toLowerCase();
    return matchesPlan && haystack.includes(search.toLowerCase());
  }), [subscriptions, planFilter, search]);

  const { paged, page, totalPages, setPage } = usePagination(filteredSubscriptions);

  const openEditPackageModal = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name || '',
      description: pkg.description || '',
      monthlyPrice: String(pkg.monthlyPrice ?? 0),
      annualPrice: String(pkg.annualPrice ?? 0),
      maxRooms: pkg.maxRooms ?? '',
      displayOrder: String(pkg.displayOrder ?? 0),
      featuresText: (pkg.features || []).join('\n'),
      isPopular: Boolean(pkg.isPopular),
      isActive: Boolean(pkg.isActive),
    });
    setShowPackageModal(true);
  };

  const closePackageModal = () => {
    setShowPackageModal(false);
    setEditingPackage(null);
    setPackageForm(emptyPackageForm);
  };

  const submitPackage = async (event) => {
    event.preventDefault();
    const confirmation = await confirmAdminAction({
      title: 'Save package changes?',
      text: `The ${packageForm.name.trim()} package will be updated in the database.`,
      icon: 'question',
      confirmButtonText: 'Save changes',
    });
    if (!confirmation.isConfirmed) return;

    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      name: packageForm.name.trim(),
      description: packageForm.description.trim(),
      monthlyPrice: Number(packageForm.monthlyPrice || 0),
      annualPrice: Number(packageForm.annualPrice || 0),
      maxRooms: packageForm.maxRooms === '' ? null : Number(packageForm.maxRooms),
      displayOrder: Number(packageForm.displayOrder || 0),
      features: normalizeFeatures(packageForm.featuresText),
      isPopular: packageForm.isPopular,
      isActive: packageForm.isActive,
    };

    try {
      const response = await fetch(editingPackage ? `/api/admin/packages/${editingPackage.id}` : '/api/admin/packages', {
        method: editingPackage ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save package.');
      closePackageModal();
      setNotice(data.message || 'Package saved successfully.');
      await loadData();
      await showAdminResult({
        title: 'Package saved',
        text: 'Your package changes are now saved in the database.',
        icon: 'success',
      });
    } catch (err) {
      setError(err.message || 'Unable to save package.');
      await showAdminResult({
        title: 'Unable to save package',
        text: err.message || 'Please try again.',
        icon: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const renewSubscription = async (subscriptionId) => {
    const confirmation = await confirmAdminAction({
      title: 'Renew this subscription?',
      text: 'This will mark the subscription as paid and extend its renewal date.',
      icon: 'warning',
      confirmButtonText: 'Renew subscription',
    });
    if (!confirmation.isConfirmed) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/package-subscriptions/${subscriptionId}/renew`, { method: 'PATCH' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to renew subscription.');
      setNotice(data.message || 'Subscription renewed successfully.');
      await loadData();
      await showAdminResult({
        title: 'Subscription renewed',
        text: data.message || 'Subscription renewed successfully.',
        icon: 'success',
      });
    } catch (err) {
      setError(err.message || 'Unable to renew subscription.');
      await showAdminResult({
        title: 'Unable to renew subscription',
        text: err.message || 'Please try again.',
        icon: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-6 lg:p-8 font-sans dark:bg-slate-950 dark:text-slate-100 space-y-6">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold">Admin Control Panel</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Membership Packages & Subscriptions</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Manage subscription tiers, pricing, features, and active hotel billing schedules.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={saving}
            className="self-start sm:self-auto px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>
      </div>

      {(error || notice) && (
        <div className={`rounded-lg border px-4 py-3 text-xs font-bold ${error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
          {error || notice}
        </div>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Package Count', value: stats.totalPackages ?? packages.length },
          { label: 'Active Hotels', value: stats.activeSubscriptions ?? 0 },
          { label: 'Pending Hotels', value: stats.pendingSubscriptions ?? 0 },
          { label: 'Projected MRR', value: formatPhp(stats.monthlyRecurringRevenue ?? 0) },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck size={18} />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Live</span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{card.label}</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</h2>
          </div>
        ))}
      </div>

      {/* EDITABLE PACKAGE CARDS GRID */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-emerald-700 dark:text-emerald-400" size={28} />
          </div>
        ) : (
          packages.map((pkg) => {
            const meta = packageTheme(pkg.slug);
            const Icon = meta.icon;
            return (
              <div key={pkg.id} className={`relative bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm flex flex-col justify-between transition-all ${pkg.isPopular ? 'border-emerald-600 dark:border-emerald-500 ring-1 ring-emerald-600/30' : 'border-slate-200 dark:border-slate-800'}`}>
                {pkg.isPopular && (
                  <span className="absolute right-6 top-[-10px] rounded-full bg-emerald-700 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                    Most Popular
                  </span>
                )}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40 ${meta.accent}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${pkg.isActive ? 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50' : 'text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                        {pkg.isActive ? 'Live' : 'Paused'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditPackageModal(pkg)}
                        className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Edit Package"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{pkg.name}</h3>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                      {pkg.maxRooms ? `Up to ${pkg.maxRooms} rooms` : 'Unlimited rooms'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatPhp(pkg.monthlyPrice)}</span>
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">/ month</span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 min-h-[36px] leading-relaxed">{pkg.description || 'No package description yet.'}</p>

                  <ul className="my-5 space-y-2.5">
                    {(pkg.features || []).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <CheckCircle2 size={14} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {(!pkg.features || pkg.features.length === 0) && (
                      <li className="text-xs text-slate-400 italic">No features listed.</li>
                    )}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openEditPackageModal(pkg)}
                  className="w-full mt-2 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Edit Price & Features
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* SUBSCRIPTION TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-700 dark:text-emerald-400" size={18} />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Hotel Subscriptions</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{filteredSubscriptions.length} matching hotels</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search hotel, owner..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs rounded focus:outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase rounded outline-none cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Plans</option>
              {packages.map((pkg) => <option key={pkg.id} value={pkg.slug}>{pkg.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-emerald-700 dark:text-emerald-400" size={28} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    {['Hotel', 'Plan', 'Billing Cycle', 'Amount', 'Next Renewal', 'Status', 'Action'].map((heading) => (
                      <th key={heading} className="px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paged.map((subscription) => {
                    const meta = packageTheme(subscription.planSlug);
                    return (
                      <tr key={subscription.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">{subscription.hotelName}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {subscription.ownerName}
                              {subscription.hotelCode ? ` | ${subscription.hotelCode}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${meta.pill}`}>{subscription.plan}</span>
                        </td>
                        <td className="px-6 py-3.5 font-mono uppercase text-slate-600 dark:text-slate-400">{subscription.cycle}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{formatPhp(subscription.amount)}</td>
                        <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">{formatDate(subscription.renewal)}</td>
                        <td className="px-6 py-3.5">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${
                            subscription.status === 'ACTIVE'
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                              : subscription.status === 'PENDING'
                                ? 'text-amber-800 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                                : 'text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {subscription.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <button
                            type="button"
                            onClick={() => renewSubscription(subscription.id)}
                            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                            title="Renew subscription"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-400">
                        No subscriptions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filteredSubscriptions.length} isDarkMode={isDarkMode} />
          </>
        )}
      </div>

      {/* PACKAGE EDIT MODAL */}
      {showPackageModal && (
        <ModalShell onClose={closePackageModal} isDarkMode={isDarkMode}>
          <form onSubmit={submitPackage} className="space-y-4 p-6 text-xs">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  placeholder="e.g. Pro Hotelier"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Rooms (Blank for unlimited)</label>
                <input
                  type="number"
                  value={packageForm.maxRooms}
                  onChange={(e) => setPackageForm({ ...packageForm, maxRooms: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Price (PHP) *</label>
                <input
                  type="number"
                  required
                  value={packageForm.monthlyPrice}
                  onChange={(e) => setPackageForm({ ...packageForm, monthlyPrice: e.target.value })}
                  placeholder="e.g. 2500"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Annual Price (PHP) *</label>
                <input
                  type="number"
                  required
                  value={packageForm.annualPrice}
                  onChange={(e) => setPackageForm({ ...packageForm, annualPrice: e.target.value })}
                  placeholder="e.g. 25000"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                placeholder="Short description..."
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Features (Type each feature on a new line or separate by commas)
              </label>
              <textarea
                rows={4}
                value={packageForm.featuresText}
                onChange={(e) => setPackageForm({ ...packageForm, featuresText: e.target.value })}
                placeholder="24/7 Support&#10;Advanced Analytics&#10;Unlimited Bookings"
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={packageForm.isPopular}
                  onChange={(e) => setPackageForm({ ...packageForm, isPopular: e.target.checked })}
                  className="rounded border-slate-300 accent-emerald-600 h-4 w-4 cursor-pointer"
                />
                <span>Mark as 'Most Popular'</span>
              </label>
              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={packageForm.isActive}
                  onChange={(e) => setPackageForm({ ...packageForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 accent-emerald-600 h-4 w-4 cursor-pointer"
                />
                <span>Active (Live)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={closePackageModal}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save Package
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

export default MemPackage;