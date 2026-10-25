import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Building2, Shield, Database, RotateCcw, CheckCircle2, Cpu, Mail, Bell, AlertCircle } from 'lucide-react';

const defaultSettings = {
  platformName: 'INNOVA-HMS',
  systemVersion: 'v1.0.0 - Production',
  deploymentScope: 'Selected Hotels in Caloocan City',
  twoFactor: true,
  sessionTimeout: true,
  ipWhitelisting: true,
  maintenanceMode: false,
  autoBackup: true,
  emailAlerts: true,
  smsFailures: true,
  errorLogDigest: true,
  prophetAutoSync: true,
  paymongoLiveMode: true,
};

const Settings = () => {
  const { isDarkMode } = useOutletContext();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastIsError, setToastIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [errors, setErrors] = useState({});
  const [maintenanceSchedule, setMaintenanceSchedule] = useState("");

  const bgMain = isDarkMode ? 'bg-[#09090b]' : 'bg-[#F4F5F7]';
  const cardBg = isDarkMode ? 'bg-[#111111]' : 'bg-white';
  const borderColor = isDarkMode ? 'border-white/10' : 'border-gray-200';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-900';
  const inputBg = isDarkMode ? 'bg-black/40' : 'bg-gray-50';

  const triggerToast = (msg, isError = false) => {
    setToastMsg(msg);
    setToastIsError(isError);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const validateSettings = () => {
    const nextErrors = {};
    if (!settings.platformName.trim()) nextErrors.platformName = 'Platform name is required.';
    if (settings.platformName.trim().length < 3) nextErrors.platformName = 'Platform name must be at least 3 characters.';
    if (!settings.deploymentScope.trim()) nextErrors.deploymentScope = 'Deployment scope is required.';
    if (settings.deploymentScope.trim().length < 3) nextErrors.deploymentScope = 'Deployment scope must be at least 3 characters.';
    return nextErrors;
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load admin settings.');
        setSettings({ ...defaultSettings, ...(data.settings || {}) });
      } catch (error) {
        triggerToast(error.message || 'Unable to load admin settings.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSave = async () => {
    const nextErrors = validateSettings();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      triggerToast('Please correct the highlighted setting fields.');
      return;
    }
    if (settings.maintenanceMode && !maintenanceSchedule) {
      triggerToast('Choose a maintenance date and time before saving.', true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          platformName: settings.platformName.trim(),
          systemVersion: settings.systemVersion.trim(),
          deploymentScope: settings.deploymentScope.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save settings.');
      setSettings({ ...defaultSettings, ...(data.settings || {}) });
      if (settings.maintenanceMode) {
        const notificationResponse = await fetch('/api/admin/notifications/system-maintenance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledTime: maintenanceSchedule }),
        });
        const notificationData = await notificationResponse.json();
        if (!notificationResponse.ok) {
          throw new Error(notificationData.error || 'Settings saved, but maintenance notifications could not be sent.');
        }
        triggerToast(`${notificationData.notificationsCreated} maintenance notifications sent.`);
      } else {
        triggerToast('INNOVA-HMS Admin settings updated successfully!');
      }
    } catch (error) {
      triggerToast(error.message || 'Unable to save settings.', true);
    } finally {
      setSaving(false);
    }
  };

  const renderToggle = (label, stateKey) => (
    <div
      className="flex items-center justify-between py-3 cursor-pointer group select-none transition-all active:px-1"
      onClick={() => handleToggle(stateKey)}
    >
      <span className={`text-[11px] font-bold transition-colors ${isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-black'}`}>
        {label}
      </span>
      <div className={`w-9 h-5 rounded-full relative transition-all duration-300 shadow-inner ${settings[stateKey] ? 'bg-[#2FA084]' : 'bg-gray-600'}`}>
        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-300 ${settings[stateKey] ? 'left-5' : 'left-1'}`}></div>
      </div>
    </div>
  );

  return (
    <div className={`p-6 space-y-5 text-left min-h-screen relative transition-all duration-300 ${bgMain}`}>
      {showToast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 ${toastIsError ? 'bg-rose-600 text-white' : 'bg-[#2FA084] text-black'} px-5 py-3 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300`}>
          {toastIsError ? <AlertCircle size={18} strokeWidth={3} /> : <CheckCircle2 size={18} strokeWidth={3} />}
          <span className="text-[11px] font-black uppercase tracking-wider">{toastMsg}</span>
        </div>
      )}

      <div className={`flex justify-between items-center border-b ${borderColor} pb-5`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${textColor}`}>
            System Admin <span className="text-[#2FA084]">Settings</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>
            Platform Configuration & Operational Parameters for INNOVA-HMS
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded bg-[#2FA084] text-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#2FA084]/20 hover:scale-105 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} strokeWidth={3} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2FA084] border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className={`p-6 rounded-xl border ${cardBg} ${borderColor} space-y-5`}>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-[#2FA084]" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Platform & Subscription Configuration</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Platform Name</label>
                  <input
                    type="text"
                    value={settings.platformName}
                    onChange={(e) => handleInputChange('platformName', e.target.value)}
                    className={`w-full p-3 rounded-lg border ${borderColor} ${inputBg} ${textColor} text-[11px] font-bold outline-none focus:border-[#2FA084]/50 transition-all ${errors.platformName ? 'border-red-500' : ''}`}
                  />
                  {errors.platformName && <p className="text-[9px] font-bold text-red-500">{errors.platformName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">System Version</label>
                  <input
                    type="text"
                    value={settings.systemVersion}
                    onChange={(e) => handleInputChange('systemVersion', e.target.value)}
                    className={`w-full p-3 rounded-lg border ${borderColor} ${inputBg} ${textColor} text-[11px] font-bold outline-none focus:border-[#2FA084]/50 transition-all`}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Target Deployment Scope</label>
                <input
                  type="text"
                  value={settings.deploymentScope}
                  onChange={(e) => handleInputChange('deploymentScope', e.target.value)}
                  className={`w-full p-3 rounded-lg border ${borderColor} ${inputBg} ${textColor} text-[11px] font-bold outline-none focus:border-[#2FA084]/50 transition-all ${errors.deploymentScope ? 'border-red-500' : ''}`}
                />
                {errors.deploymentScope && <p className="text-[9px] font-bold text-red-500">{errors.deploymentScope}</p>}
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-xl border ${cardBg} ${borderColor}`}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-[#2FA084]" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Security & Access Control</h2>
            </div>
            <div className="space-y-0 divide-y divide-white/5">
              {renderToggle('Two-Factor Authentication (2FA) for Admins', 'twoFactor')}
              {renderToggle('Strict Session Timeout (30 mins)', 'sessionTimeout')}
              {renderToggle('IP Whitelisting for System Admin', 'ipWhitelisting')}
              {renderToggle('System-Wide Maintenance Mode', 'maintenanceMode')}
              {settings.maintenanceMode && (
                <label className={`block py-3 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Scheduled maintenance date and time
                  <input
                    type="datetime-local"
                    value={maintenanceSchedule}
                    onChange={(event) => setMaintenanceSchedule(event.target.value)}
                    className={`mt-2 w-full rounded-lg border p-3 text-xs font-semibold outline-none ${borderColor} ${inputBg} ${textColor}`}
                  />
                </label>
              )}
            </div>
          </div>

          <div className={`p-6 rounded-xl border ${cardBg} ${borderColor} space-y-5`}>
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-[#2FA084]" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>AI & API Integration Gateways</h2>
            </div>
            <div className="space-y-0 divide-y divide-white/5">
              {renderToggle('Python Prophet Forecasting Auto-Sync', 'prophetAutoSync')}
              {renderToggle('PayMongo Gateway Live Mode (Online Payments)', 'paymongoLiveMode')}
            </div>
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#2FA084]" />
                <span className={`text-[10px] font-bold ${textColor}`}>Gmail SMTP Status</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-black uppercase">Connected</span>
            </div>
          </div>

          <div className={`p-6 rounded-xl border ${cardBg} ${borderColor} space-y-5`}>
            <div className="flex items-center gap-2">
              <Database size={16} className="text-[#2FA084]" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Database & Audit Backups</h2>
            </div>
            <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-2">
              <p className="text-[9px] font-bold text-gray-500 uppercase">PostgreSQL Audit Logs & Records</p>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${textColor}`}>Automated Daily Backup</span>
                <span className="text-[10px] text-[#2FA084] font-black">{settings.autoBackup ? 'Active' : 'Disabled'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => triggerToast('Initiating system-wide database backup...')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#2FA084] text-black font-black text-[9px] uppercase hover:brightness-110 active:scale-95 transition-all">
                <Database size={14}/> Backup Now
              </button>
              <button onClick={() => triggerToast('Restoration protocol verified.')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border ${borderColor} ${textColor} text-[9px] font-black uppercase hover:bg-white/5 active:scale-95 transition-all`}>
                <RotateCcw size={14}/> Restore Logs
              </button>
            </div>
          </div>
          <div className={`p-6 rounded-xl border ${cardBg} ${borderColor}`}>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} className="text-[#2FA084]" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Notification Settings</h2>
            </div>
            <div className="space-y-0 divide-y divide-white/5">
              {renderToggle('Email alerts for new hotel signups', 'emailAlerts')}
              {renderToggle('SMS on payment failures', 'smsFailures')}
              {renderToggle('Error log digest (daily)', 'errorLogDigest')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;