import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, FileBarChart, Globe, History, Hotel, KeyRound,
  Laptop, LayoutDashboard, LogOut, Settings as SettingsIcon, ShieldCheck,
  Star, Users
} from 'lucide-react';

const parseStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('adminData') || '{}');
  } catch {
    return {};
  }
};

const AdminSidebar = ({ isDarkMode, isExpanded, sidebarPreferenceError }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [admin, setAdmin] = useState(parseStoredAdmin());

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const refreshAdmin = () => setAdmin(parseStoredAdmin());
    window.addEventListener('userUpdated', refreshAdmin);
    return () => window.removeEventListener('userUpdated', refreshAdmin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  const menuSections = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard /> },
        { name: 'Reports & Analytics', path: '/admin/reports', icon: <FileBarChart /> },
        { name: 'Reviews', path: '/admin/reviews', icon: <Star /> },
      ]
    },
    {
      title: 'People & Properties',
      items: [
        { name: 'Hotel Owners', path: '/admin/owners', icon: <Hotel /> },
      ]
    },
    {
      title: 'Platform',
      items: [
        { name: 'Member Packages', path: '/admin/packages', icon: <ShieldCheck /> },
        { name: 'System Logs', path: '/admin/logs', icon: <History /> },
      ]
    }
  ];

  const adminName = admin?.name || 'Admin';
  const adminInitials = adminName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const borderColor = isDarkMode ? 'border-white/10' : 'border-black/5';
  const textMain = isDarkMode ? 'text-white' : 'text-slate-800';
  const textSub = isDarkMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <aside
      className={`${isExpanded ? 'w-[260px]' : 'w-[76px]'} border-r ${borderColor} h-screen flex-shrink-0 font-sans transition-all duration-300 ease-in-out bg-white dark:bg-[#0b0f16] overflow-hidden`}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden custom-sidebar-scroll no-scrollbar flex flex-col">
        
        {/* 1. BRAND LOGO & NETWORK STATUS */}
        <div className={`py-6 flex items-center shrink-0 ${isExpanded ? 'px-7 justify-between' : 'px-0 justify-center'}`}>
          <Link to="/admin" className={`transition-transform hover:scale-105 shrink-0 flex items-center overflow-hidden ${isExpanded ? 'gap-2' : 'mx-auto'}`}>
            <img src="/images/logo.png" alt="Innova HMS" className="h-8 w-auto object-contain shrink-0" />
            {isExpanded && (
              <span className={`text-sm font-black tracking-tight uppercase whitespace-nowrap overflow-hidden transition-all duration-200 ${textMain}`}>
                INNOVA-<span className="text-[#2FA084]">HMS</span>
              </span>
            )}
          </Link>
          {isExpanded && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-200 overflow-hidden whitespace-nowrap shrink-0 ml-2 ${isOnline ? 'border-[#2FA084]/30 bg-[#2FA084]/10 text-[#2FA084]' : 'border-red-400/30 bg-red-400/10 text-red-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-[#2FA084] animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[8px] font-black uppercase tracking-wider">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>

        {/* 2. PROFILE MINI-CARD (links to the My Profile page) */}
        <div className={`mb-6 shrink-0 ${isExpanded ? 'px-4' : 'px-0 flex justify-center'}`}>
          <Link
            to="/admin/profile"
            className={`rounded-xl border transition-colors hover:border-[#2FA084]/40 hover:bg-[#2FA084]/5 dark:border-[#2FA084]/15 dark:bg-[#2FA084]/5 dark:hover:bg-[#2FA084]/10 ${
              isExpanded ? 'w-full flex items-center gap-3 p-3' : 'flex items-center justify-center p-2'
            } ${location.pathname === '/admin/profile' ? 'ring-1 ring-[#2FA084]/40' : 'border-black/5 bg-white shadow-sm'}`}
          >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2FA084] to-[#1F6F5F] flex items-center justify-center text-white text-sm shadow-md shrink-0 overflow-hidden">
              {admin?.profileImage ? (
                <img src={admin.profileImage} alt={adminName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black">{adminInitials || 'AD'}</span>
              )}
            </div>
            <div className={`overflow-hidden text-left whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <h4 className={`text-[11px] font-black uppercase tracking-tight leading-none ${textMain}`}>{adminName}</h4>
              <p className="text-[8px] font-bold text-[#2FA084] uppercase tracking-widest mt-1.5 opacity-90">Admin Portal</p>
            </div>
          </Link>
        </div>

        {/* 3. NAVIGATION LINKS */}
        <div className={`flex-1 space-y-6 pb-6 text-left ${isExpanded ? 'px-3' : 'px-2'}`}>
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className={`text-[9px] font-black tracking-[0.25em] uppercase mb-2 whitespace-nowrap overflow-hidden transition-all duration-200 ${textSub} ${isExpanded ? 'opacity-100 h-auto px-4' : 'opacity-0 h-0 px-0'}`}>
                {section.title}
              </p>
              {!isExpanded && <div className={`h-px mx-3 mb-2 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />}
              {section.items.map((item) => {
                const active = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(`${item.path}/`));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={!isExpanded ? item.name : undefined}
                    className={`group flex items-center py-2.5 rounded-lg transition-all duration-200 relative ${isExpanded ? 'gap-3 px-4' : 'justify-center px-0'} ${
                      active
                        ? 'bg-[#2FA084]/10 text-[#2FA084] dark:bg-[#121824] dark:text-[#2FA084]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#2FA084] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-[#2FA084]'
                    }`}
                  >
                    <span className={`shrink-0 transition-colors ${active ? 'text-[#2FA084]' : 'text-slate-400 group-hover:text-[#2FA084]'}`}>
                      {React.cloneElement(item.icon, { size: 18, strokeWidth: active ? 2.5 : 2 })}
                    </span>
                    {isExpanded && (
                      <span className={`text-[11px] uppercase tracking-wide whitespace-nowrap overflow-hidden transition-all duration-200 flex-1 ${active ? 'font-black' : 'font-bold'}`}>
                        {item.name}
                      </span>
                    )}
                    {item.badge && isExpanded && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#6FCF97] text-[#173F35] shrink-0">
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <div className="absolute left-0 w-1 h-4 rounded-r-full bg-[#2FA084] shadow-[0_0_12px_#2FA084]" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* 4. FOOTER ACTIONS */}
        <div className={`p-4 space-y-2 shrink-0 ${isExpanded ? `border-t ${borderColor}` : ''} ${isExpanded ? '' : 'px-2'}`}>
          {sidebarPreferenceError && (
            <p
              role="alert"
              title={sidebarPreferenceError}
              className={`text-[9px] font-bold text-red-500 ${isExpanded ? '' : 'text-center'}`}
            >
              {isExpanded ? sidebarPreferenceError : '!'}
            </p>
          )}
          <Link 
            to="/admin/settings" 
            title={!isExpanded ? 'Settings' : undefined}
            className={
              isExpanded
                ? `flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.1em] border ${
                    location.pathname === '/admin/settings' ? 'bg-[#2FA084] text-white border-[#2FA084]' : `bg-white text-slate-700 border-black/5 hover:border-[#2FA084] dark:bg-white/5 dark:text-slate-200 dark:border-white/10`
                  }`
                : `flex items-center justify-center py-2.5 rounded-xl transition-all ${
                    location.pathname === '/admin/settings' ? 'bg-[#2FA084] text-white border-[#2FA084]' : `bg-transparent border-transparent text-slate-400 hover:text-[#2FA084]`
                  }`
            }
          >
            <SettingsIcon size={14} className="shrink-0" />
            {isExpanded && <span className="whitespace-nowrap overflow-hidden transition-all duration-200">Settings</span>}
          </Link>
          <button
            onClick={handleLogout}
            title={!isExpanded ? 'Logout' : undefined}
            className={
              isExpanded
                ? `w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.1em] border bg-transparent ${isDarkMode ? 'text-slate-300 border-white/10 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-600 border-black/5 hover:text-red-600 hover:bg-red-50'}`
                : `w-full flex items-center justify-center py-2.5 rounded-xl transition-all bg-transparent border-transparent text-slate-400 hover:text-red-500`
            }
          >
            <LogOut size={14} className="shrink-0" />
            {isExpanded && <span className="whitespace-nowrap overflow-hidden transition-all duration-200">Logout</span>}
          </button>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .custom-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb { 
          background: #2FA084;
          border-radius: 10px; 
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #1F6F5F; }
      `}</style>
    </aside>
  );
};

export default AdminSidebar;
