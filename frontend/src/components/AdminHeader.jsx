import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Bell, Menu, X } from 'lucide-react';

const priorityColor = (priority) => {
  if (priority === 'CRITICAL') return 'text-red-500';
  if (priority === 'HIGH') return 'text-orange-500';
  return 'text-[#2FA084]';
};

const AdminHeader = ({ isDarkMode, toggleTheme, isSidebarOpen, toggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json().catch(() => ({}));
      if (res.ok) setNotifications(data.notifications || []);
    } catch {
      // silent fail — bell just shows whatever it last had
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
    <header className={`h-20 border-b flex items-center justify-between px-10 sticky top-0 z-40 transition-all duration-300 
      ${isDarkMode ? 'bg-[#163C34] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
      
      {/* LEFT: MENU + TITLE */}
      <div className="flex items-center gap-3 text-left">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'Close admin sidebar' : 'Open admin sidebar'}
          aria-expanded={isSidebarOpen}
          className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-[#2FA084]' : 'hover:bg-gray-100 text-gray-500 hover:text-[#2FA084]'}`}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <h2 className={`text-xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Welcome <span className="text-[#2FA084]">Admin</span>
        </h2>
      </div>

      {/* RIGHT: NOTIFICATIONS + THEME TOGGLE */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`relative p-2.5 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-[#2FA084]' : 'hover:bg-gray-100 text-gray-500 hover:text-[#2FA084]'}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className={`absolute right-0 mt-2 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden ${isDarkMode ? 'bg-[#163C34] border-white/10' : 'bg-white border-gray-200'}`}>
              <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-black uppercase text-[#2FA084]">{unreadCount} new</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
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
                    <div key={n.id} className={`px-4 py-3 border-b last:border-b-0 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[11px] font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{n.title}</p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#2FA084] mt-1 shrink-0" />}
                      </div>
                      <p className={`text-[10px] mt-0.5 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[8px] font-black uppercase ${priorityColor(n.priority)}`}>{n.priority}</span>
                        <span className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
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
          className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-[#2FA084]' : 'hover:bg-gray-100 text-gray-500 hover:text-[#2FA084]'}`}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
