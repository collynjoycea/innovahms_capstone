import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Moon, Sun, ShieldCheck, ChevronDown, UserCircle, Clock } from 'lucide-react';
import ManagerShiftClockWidget from './ManagerShiftClockWidget';
import { readManagerSession, clearManagerSession } from '../pages/Maneger/managerSession';

const HotelManagerHeader = ({ isDarkMode, toggleTheme }) => {
  const session = readManagerSession() || {};
  const firstName = session.firstName || session.first_name || '';
  const lastName  = session.lastName  || session.last_name  || '';
  const role      = session.role || 'Hotel Manager';

  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearManagerSession();
    localStorage.removeItem('staffUser');
    window.dispatchEvent(new Event('staffSessionChanged'));
    navigate('/staff/login');
  };

  const theme = {
    bg:       isDarkMode ? 'bg-[#080808]/80' : 'bg-white/80',
    textMain: isDarkMode ? 'text-white'      : 'text-zinc-900',
    textSub:  isDarkMode ? 'text-zinc-500'   : 'text-zinc-400',
    border:   isDarkMode ? 'border-zinc-900' : 'border-zinc-200',
    input:    isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-zinc-100 border-zinc-200',
    dropdown: isDarkMode ? 'bg-[#0d0c0a] border-white/10' : 'bg-white border-gray-100',
    divider:  isDarkMode ? 'border-white/5' : 'border-gray-100',
    gold: '#2FA084',
  };

  const displayName = `${firstName} ${lastName}`.trim() || 'Manager';
  const initials = `${firstName?.[0] || 'M'}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <header className={`sticky top-0 z-50 w-full h-20 border-b backdrop-blur-xl transition-all duration-300 ${theme.bg} ${theme.border}`}>
      <div className="h-full px-8 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-[#2FA084]/10 border border-[#2FA084]/20">
            <ShieldCheck size={20} color={theme.gold} />
          </div>
          <div>
            <h1 className={`text-sm font-black uppercase tracking-[0.2em] italic ${theme.textMain}`}>
              Manager <span className="text-[#2FA084]"></span>
            </h1>
            <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest`}>
              Executive Oversight · {new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${theme.border} ${theme.input}`}>
            {isDarkMode ? <Sun size={18} color={theme.gold} /> : <Moon size={18} color={theme.gold} />}
          </button>
          <button className={`p-2.5 rounded-xl border relative transition-all hover:bg-[#2FA084]/5 ${theme.border} ${theme.input}`}>
            <Bell size={18} color={theme.gold} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full border-2 border-black animate-pulse" />
          </button>

          <div className={`h-8 w-[1px] mx-1 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-200'}`} />

          {/* Time In / Time Out widget */}
          <ManagerShiftClockWidget isDarkMode={isDarkMode} />

          <div className={`h-8 w-[1px] mx-1 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-200'}`} />

          {/* Profile dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex items-center gap-3 pl-2 p-1.5 rounded-2xl transition-all cursor-pointer ${showProfileMenu ? (isDarkMode ? 'bg-white/5' : 'bg-gray-100') : 'hover:bg-white/5'}`}
            >
              <div className="text-right hidden sm:block">
                <h2 className={`text-[11px] font-black uppercase tracking-tight ${theme.textMain}`}>{displayName}</h2>
                <p className="text-[#2FA084] text-[8px] font-black uppercase tracking-[0.2em] italic">{role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-[#2FA084]/30 flex items-center justify-center overflow-hidden hover:border-[#2FA084] transition-all">
                <div className={`w-full h-full flex items-center justify-center font-black text-xs transition-all ${showProfileMenu ? 'bg-[#2FA084] text-black' : 'bg-[#2FA084]/10 text-[#2FA084]'}`}>
                  {initials}
                </div>
              </div>
              <ChevronDown size={14} className={`${theme.textSub} transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className={`absolute right-0 mt-3 w-56 border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in duration-200 ${theme.dropdown}`}>
                <div className={`px-3 py-2 border-b mb-1 ${theme.divider}`}>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Manager Actions</p>
                </div>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/manager/profile'); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#2FA084]/10 hover:text-[#2FA084] text-xs transition-all cursor-pointer ${theme.textMain}`}
                >
                  <UserCircle size={16} /> My Profile
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/manager/my-shift'); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#2FA084]/10 hover:text-[#2FA084] text-xs transition-all cursor-pointer ${theme.textMain}`}
                >
                  <Clock size={16} /> My Shift
                </button>
                <div className={`my-1 border-t ${theme.divider}`} />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500 text-xs transition-all font-bold cursor-pointer"
                >
                  <LogOut size={16} /> Logout Console
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HotelManagerHeader;
