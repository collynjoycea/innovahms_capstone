import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Briefcase, Building2, ChevronDown, ShieldCheck } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import GlobalAIAssistant from "../components/GlobalAIAssistant";

const AuthHotelierHeader = () => {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const registrationOptions = [
    { to: "/owner/signup", label: "Signup as Hotel Owner", icon: <Building2 size={16} className="text-emerald-600" /> },
  ];

  const loginOptions = [
    { to: "/owner/login", label: "Login as Hotel Owner", icon: <Building2 size={16} className="text-emerald-600" /> },
    { to: "/staff/login", label: "Login as Hotel Staff", icon: <Briefcase size={16} className="text-emerald-600" /> },
    { to: "/admin/login", label: "Login as Admin", icon: <ShieldCheck size={16} className="text-emerald-600" /> },
  ];

  const toggleMenu = (menu) => setOpenMenu((current) => (current === menu ? null : menu));
  const closeMenu = () => setOpenMenu(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) closeMenu();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
        <div className="flex items-center gap-4">
          <Link to="/hotelier" className="min-w-0 flex-shrink-0" aria-label="Official Partner Portal home">
            <img src="/images/logo.png" alt="Innova HMS" className="h-12 w-auto sm:h-14" />
          </Link>
          <nav aria-label="Hotelier navigation" className="flex items-center">
            <Link
              to="/hotelier"
              className="border-l border-slate-300 pl-4 text-xs font-semibold uppercase text-slate-500 transition-colors hover:text-emerald-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              Hotelier
            </Link>
            <Link
              to="/hotelier#plans"
              className="border-l border-slate-300 pl-4 text-xs font-semibold uppercase text-slate-500 transition-colors hover:text-emerald-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              Subscription
            </Link>
          </nav>
        </div>

        <nav ref={menuRef} aria-label="Registration account links" className="flex shrink-0 items-center gap-2">
          {[
            {
              name: "registration",
              label: "Registration",
              options: registrationOptions,
              buttonClass: "bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500",
            },
            {
              name: "login",
              label: "Log In",
              options: loginOptions,
              buttonClass:
                "border border-emerald-700 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950",
            },
          ].map((menu) => (
            <div key={menu.name} className="relative">
              <button
                type="button"
                aria-expanded={openMenu === menu.name}
                aria-haspopup="true"
                onClick={() => toggleMenu(menu.name)}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${menu.buttonClass}`}
              >
                {menu.label}
                <ChevronDown size={14} className={`transition-transform ${openMenu === menu.name ? "rotate-180" : ""}`} />
              </button>

              {openMenu === menu.name ? (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {menu.options.map((option) => (
                    <Link
                      key={option.to}
                      to={option.to}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
                    >
                      {option.icon}
                      {option.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
};

const CustomerLayout = () => {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return (savedTheme || (prefersDark ? "dark" : "light")) === "dark";
  });

  const authHeaderRoutes = [
    "/staff/login",
    "/staff/signup",
    "/owner/login",
    "/owner/signup",
    "/admin/login",
  ];
  const showHotelierAuthHeader = authHeaderRoutes.includes(location.pathname);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const nextDark = (savedTheme || (prefersDark ? "dark" : "light")) === "dark";
      document.documentElement.classList.toggle("dark", nextDark);
      document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
      setIsDarkMode(nextDark);
    };

    applyTheme();
    window.addEventListener("themeChanged", applyTheme);
    window.addEventListener("storage", applyTheme);
    return () => {
      window.removeEventListener("themeChanged", applyTheme);
      window.removeEventListener("storage", applyTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
    setIsDarkMode(nextDark);
    window.dispatchEvent(new Event("themeChanged"));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300">
      {showHotelierAuthHeader ? (
        <AuthHotelierHeader />
      ) : (
        <Header />
      )}

      <main className={`min-h-screen ${showHotelierAuthHeader ? "pt-0" : "pt-20"}`}>
        <Outlet />
      </main>

      <Footer />
      <GlobalAIAssistant />
    </div>
  );
};

export default CustomerLayout;
