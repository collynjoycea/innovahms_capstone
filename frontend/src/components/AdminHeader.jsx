import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Bell, Menu, X } from 'lucide-react';

const priorityColor = (priority) => {
  if (priority === 'CRITICAL') return 'text-red-500';
  if (priority === 'HIGH') return 'text-orange-500';
  return 'text-[#2FA084]';
};

const AdminHeader = ({ isDarkMode, toggleTheme, isSidebarOpen, toggleSidebar, isSidebarPreferenceLoaded }) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notificationError, setNotificationError] = useState('');
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminData') || '{}');
    } catch {
      return {};
    }
  });
  const dropdownRef = useRef(null);

  const pageTitles = {
    '/admin': 'System Dashboard',
    '/admin/reports': 'Reports & Analytics',
    '/admin/reviews': 'Reviews',
    '/admin/owners': 'Hotel Owners',
    '/admin/staff': 'Staff Management',
    '/admin/customers': 'Customer Management',
    '/admin/packages': 'Member Packages',
    '/admin/roles': 'Roles & Permissions',
    '/admin/profile': 'My Profile',
    '/admin/logs': 'System Logs',
    '/admin/api': 'Integrations',
    '/admin/maps': 'Map Services',
    '/admin/notifications': 'Notifications',
    '/admin/settings': 'System Settings',
  };
  const pageTitle = pageTitles[location.pathname] || 'Admin Portal';
  const adminInitials = String(admin?.name || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const refreshAdmin = () => {
      try {
        setAdmin(JSON.parse(localStorage.getItem('adminData') || '{}'));
      } catch {
        setAdmin({});
      }
    };
    window.addEventListener('userUpdated', refreshAdmin);
    window.addEventListener('storage', refreshAdmin);
    return () => {
      window.removeEventListener('userUpdated', refreshAdmin);
      window.removeEventListener('storage', refreshAdmin);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to load notifications.');
      setNotifications(data.notifications || []);
      setNotificationError('');
    } catch (error) {
      setNotificationError(error.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const recent = notifications.slice(0, 8);

  return (
    <header className={`sticky top-0 z-40 flex h-20 items-center justify-between border-b px-5 sm:px-8 lg:px-10 backdrop-blur-md transition-colors duration-300 ${
      isDarkMode ? 'border-white/10 bg-[#0b0f16]/85' : 'border-black/5 bg-white/80'
    }`}>
      
      {/* LEFT: MENU + TITLE */}
      <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <button
          type="button"
          onClick={toggleSidebar}
          disabled={!isSidebarPreferenceLoaded}
          aria-label={isSidebarOpen ? 'Close admin sidebar' : 'Open admin sidebar'}
          aria-expanded={isSidebarOpen}
          className={`rounded-2xl border px-3 py-3 transition-all disabled:cursor-wait disabled:opacity-50 ${
            isDarkMode ? 'border-white/10 bg-white/5 text-slate-200 hover:text-[#2FA084]' : 'border-black/5 bg-white text-slate-600 hover:text-[#2FA084]'
          }`}
          title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#2FA084] to-[#1F6F5F] opacity-80" />
        <div className="flex min-w-0 flex-col overflow-hidden">
          <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.3em] text-[#2FA084]">INNOVA HMS</span>
          <h2 className={`mt-0.5 truncate font-serif text-xl font-bold tracking-tight md:text-2xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* RIGHT: NOTIFICATIONS + THEME TOGGLE */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Admin notifications"
            className={`relative rounded-2xl border px-3 py-3 shadow-sm transition-all ${
              isDarkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:border-[#2FA084]/30 hover:text-[#2FA084]' : 'border-black/5 bg-white text-slate-600 hover:border-[#2FA084]/30 hover:text-[#2FA084]'
            }`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className={`absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl z-50 overflow-hidden ${isDarkMode ? 'bg-[#121824] border-white/10' : 'bg-white border-black/5'}`}>
              <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-black uppercase text-[#2FA084]">{unreadCount} new</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationError && (
                  <p role="alert" className="px-4 py-3 text-[10px] font-bold text-red-500">
                    {notificationError}
                  </p>
                )}
                {loading && recent.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : recent.length === 0 ? (
                  <p className={`px-4 py-6 text-center text-[11px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No notifications yet.
                  </p>
                ) : (
                  recent.map((n) => (
                    <div key={n.id} className={`px-4 py-3 border-b last:border-b-0 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{n.title}</p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#2FA084] mt-1 shrink-0" />}
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[8px] font-black uppercase ${priorityColor(n.priority)}`}>{n.priority}</span>
                        <span className={`text-[9px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={toggleTheme} 
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`rounded-2xl border px-3 py-3 transition-all ${
            isDarkMode ? 'border-white/10 bg-white/5 text-slate-200 hover:text-[#f5d37e]' : 'border-black/5 bg-white text-slate-600 hover:text-[#2FA084]'
          }`}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link
          to="/admin/profile"
          title={admin?.name || 'Admin profile'}
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#2FA084]/20 bg-gradient-to-br from-[#2FA084] to-[#1F6F5F] text-xs font-black text-white shadow-sm"
        >
          {admin?.profileImage
            ? <img src={admin.profileImage} alt={admin?.name || 'Admin'} className="h-full w-full object-cover" />
            : adminInitials}
        </Link>
      </div>
    </header>
  );
};

export default AdminHeader;
