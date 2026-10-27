import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import AdminSidebar from '../components/AdminSidebar'; 
import AdminHeader from '../components/AdminHeader';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPreferenceLoaded, setIsSidebarPreferenceLoaded] = useState(false);
  const [sidebarPreferenceError, setSidebarPreferenceError] = useState('');
  const sidebarSaveQueue = useRef(Promise.resolve());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminDarkMode') || 'false') === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;

    const loadSidebarPreference = async () => {
      try {
        const admin = JSON.parse(localStorage.getItem('adminData') || '{}');
        if (!admin.id) throw new Error('Admin account information is missing.');

        const response = await fetch(`/api/admin/${encodeURIComponent(admin.id)}/sidebar-preference`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Unable to load sidebar preference.');
        if (typeof data.isOpen !== 'boolean') throw new Error('The saved sidebar preference is invalid.');
        if (active) {
          setIsSidebarOpen(data.isOpen);
          setSidebarPreferenceError('');
        }
      } catch (error) {
        console.error('Unable to load admin sidebar preference:', error);
        if (active) setSidebarPreferenceError(error.message || 'Unable to load sidebar preference.');
      } finally {
        if (active) setIsSidebarPreferenceLoaded(true);
      }
    };

    loadSidebarPreference();
    return () => { active = false; };
  }, []);

  const toggleSidebar = () => {
    const nextIsOpen = !isSidebarOpen;
    setIsSidebarOpen(nextIsOpen);
    setSidebarPreferenceError('');

    let adminId;
    try {
      adminId = JSON.parse(localStorage.getItem('adminData') || '{}').id;
    } catch (error) {
      console.error('Unable to read admin account information:', error);
      setSidebarPreferenceError('Unable to save sidebar preference: admin account information is invalid.');
      return;
    }

    if (!adminId) {
      setSidebarPreferenceError('Unable to save sidebar preference: admin account information is missing.');
      return;
    }

    sidebarSaveQueue.current = sidebarSaveQueue.current.then(async () => {
      const response = await fetch(`/api/admin/${encodeURIComponent(adminId)}/sidebar-preference`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: nextIsOpen }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to save sidebar preference.');
      if (typeof data.isOpen !== 'boolean') throw new Error('The saved sidebar preference is invalid.');
    }).catch((error) => {
      console.error('Unable to save admin sidebar preference:', error);
      setSidebarPreferenceError(error.message || 'Unable to save sidebar preference.');
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('adminDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`admin-portal flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#090b10] text-white' : 'bg-gray-50 text-slate-900'}`}>
      <AdminSidebar
        isDarkMode={isDarkMode}
        isExpanded={isSidebarOpen}
        sidebarPreferenceError={sidebarPreferenceError}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          isSidebarPreferenceLoaded={isSidebarPreferenceLoaded}
        />
        
        <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#0f1117]' : 'bg-slate-50'}`}>
          <Outlet context={{ isDarkMode }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;