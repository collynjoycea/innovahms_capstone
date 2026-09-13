import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CreditCard, Building2, Calendar, 
  Users, Sparkles, Package, Shield, BarChart3, Star 
} from 'lucide-react';

const OwnerSidebar = ({ isExpanded = false }) => {
  const location = useLocation();

  // Subscription plan features configuration
  const planFeatures = {
    starter: ['dashboard', 'rooms', 'reservations', 'customers', 'reviews'],
    pro: ['dashboard', 'rooms', 'reservations', 'customers', 'reviews', 'housekeeping', 'inventory', 'staff'],
    enterprise: ['dashboard', 'rooms', 'reservations', 'customers', 'reviews', 'housekeeping', 'inventory', 'staff', 'reports', 'promotions'],
  };

  // Owner session state
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ownerSession') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const sync = () => {
      try {
        setSession(JSON.parse(localStorage.getItem('ownerSession') || '{}'));
      } catch {
        setSession({});
      }
    };
    window.addEventListener('ownerSessionUpdated', sync);
    window.addEventListener('storage', sync);
    
    return () => {
      window.removeEventListener('ownerSessionUpdated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Format Owner details from session
  const fullName = `${session?.firstName || ''} ${session?.lastName || ''}`.trim() || 'Hotel Owner';
  const hotelName = session?.hotelName || (session?.subscriptionActive ? 'Hotel Setup Required' : 'Subscription Required');
  const profileImage = session?.profileImage || '';

  const navItems = [
    { name: 'Dashboard', path: '/owner', feature: 'dashboard', requiredPlan: 'Starter', icon: <LayoutDashboard size={18} /> },
    { name: 'Subscription', path: '/owner/subscription', feature: 'subscription', requiredPlan: null, icon: <CreditCard size={18} /> },
    { name: 'Rooms', path: '/owner/rooms', feature: 'rooms', requiredPlan: 'Starter', icon: <Building2 size={18} /> },
    { name: 'Reservations', path: '/owner/reservations', feature: 'reservations', requiredPlan: 'Starter', icon: <Calendar size={18} /> },
    { name: 'Customers', path: '/owner/customers', feature: 'customers', requiredPlan: 'Starter', icon: <Users size={18} /> },
    { name: 'Housekeeping', path: '/owner/housekeeping', feature: 'housekeeping', requiredPlan: 'Pro', icon: <Sparkles size={18} /> },
    { name: 'Inventory', path: '/owner/inventory', feature: 'inventory', requiredPlan: 'Pro', icon: <Package size={18} /> },
    { name: 'Staff', path: '/owner/staff', feature: 'staff', requiredPlan: 'Pro', icon: <Shield size={18} /> },
    { name: 'Reports', path: '/owner/reports', feature: 'reports', requiredPlan: 'Enterprise', icon: <BarChart3 size={18} /> },
    { name: 'Reviews', path: '/owner/reviews', feature: 'reviews', requiredPlan: 'Starter', icon: <Star size={18} /> },
  ];

  const allowedFeatures = new Set(
    Array.isArray(session?.allowedOwnerFeatures) && session.allowedOwnerFeatures.length > 0
      ? session.allowedOwnerFeatures
      : (planFeatures[session?.subscriptionPlanSlug] || [])
  );

  return (
    <aside className={`${isExpanded ? 'w-[260px]' : 'w-[76px]'} bg-white border-r border-black/5 flex flex-col h-screen sticky top-0 font-sans transition-all duration-300 ease-in-out dark:bg-[#0b0f16] dark:border-white/15 overflow-hidden`}>
      <div className="h-full overflow-y-auto no-scrollbar flex flex-col text-left">
        
        {/* BRAND LOGO */}
        <div className={`py-6 flex items-center shrink-0 ${isExpanded ? 'px-7 justify-between' : 'justify-center'}`}>
          <Link to="/owner" className="transition-transform hover:scale-105 text-left">
            <img src="/images/logo.png" alt="Innova HMS" className="h-8 w-auto object-contain drop-shadow-sm" />
          </Link>
        </div>

        {/* OWNER PROFILE MINI-CARD */}
        <div className={`mb-6 shrink-0 ${isExpanded ? 'px-4' : 'flex justify-center'}`}>
          <Link
            to="/owner/profile"
            className={`${isExpanded ? 'flex items-center gap-3 p-3 w-full' : 'flex items-center justify-center p-2'} rounded-xl border border-black/5 bg-white shadow-sm transition-colors hover:border-[#2FA084]/40 hover:bg-[#2FA084]/5 dark:border-[#2FA084]/15 dark:bg-[#2FA084]/5 dark:hover:bg-[#2FA084]/10 ${location.pathname === '/owner/profile' ? 'ring-1 ring-[#2FA084]/40' : ''}`}
            title="Open Owner Profile"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2FA084] to-[#1F6F5F] flex items-center justify-center text-white text-sm shadow-md overflow-hidden shrink-0">
              {profileImage ? (
                <img src={profileImage} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-xs">{fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              )}
            </div>
            <div className={`${isExpanded ? 'block' : 'hidden'} overflow-hidden min-w-0`}>
              <h4 className="text-[11px] font-black uppercase tracking-tight leading-none text-slate-800 truncate dark:text-white" title={fullName}>
                {fullName}
              </h4>
              <p className="text-[8px] font-bold text-[#2FA084] uppercase tracking-widest mt-1.5 opacity-90 truncate" title={hotelName}>
                {session?.subscriptionActive ? 'Verified Owner' : 'Owner Portal'}
              </p>
            </div>
          </Link>
        </div>

        {/* NAVIGATION MENU */}
        <div className={`flex-1 space-y-1.5 pb-6 overflow-y-auto no-scrollbar ${isExpanded ? 'px-3' : 'px-2'}`}>
          <p className={`${isExpanded ? 'block' : 'hidden'} text-[9px] font-black tracking-[0.25em] uppercase px-4 mb-2 text-slate-400 dark:text-slate-500`}>
            Management Portal
          </p>
          
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const lockedByPlan = Boolean(
              session?.subscriptionActive &&
              item.feature !== 'subscription' &&
              !allowedFeatures.has(item.feature)
            );
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={lockedByPlan ? `Upgrade to ${item.requiredPlan} to unlock ${item.name}` : item.name}
                className={`group flex items-center py-2.5 rounded-lg transition-all duration-200 relative ${isExpanded ? 'gap-3 px-4' : 'justify-center'} ${
                  active 
                    ? "bg-[#2FA084]/10 text-[#2FA084] dark:bg-[#121824] dark:text-[#2FA084]" 
                    : lockedByPlan
                      ? "text-slate-400 hover:bg-slate-50 hover:text-[#2FA084] dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-[#2FA084]"
                      : "text-slate-600 hover:text-[#2FA084] hover:bg-slate-50 dark:text-slate-300 dark:hover:text-[#2FA084] dark:hover:bg-white/5"
                }`}
              >
                <span className={`${active ? "text-[#2FA084]" : "text-slate-400 group-hover:text-[#2FA084]"} transition-colors`}>
                  {React.cloneElement(item.icon, { strokeWidth: active ? 2.5 : 2 })}
                </span>
                <span className={`${isExpanded ? 'block' : 'hidden'} text-[11px] uppercase tracking-wide flex-1 ${active ? 'font-black' : 'font-semibold'}`}>
                  {item.name}
                </span>
                {lockedByPlan && isExpanded && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-[#2FA084]/10 text-[#2FA084]">
                    {item.requiredPlan}
                  </span>
                )}
                {active && (
                  <div className="absolute left-0 w-1 h-4 bg-[#2FA084] rounded-r-full shadow-[0_0_12px_#2FA084]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        /* Tinanggal ang nakikitang scrollbar habang pwede pa ring mag-scroll */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </aside>
  );
};

export default OwnerSidebar;