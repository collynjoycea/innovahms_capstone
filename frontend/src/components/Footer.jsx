import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("user") || localStorage.getItem("customerSession"))
  );

  useEffect(() => {
    const syncCustomerSession = () => {
      setIsCustomerLoggedIn(Boolean(localStorage.getItem("user") || localStorage.getItem("customerSession")));
    };

    window.addEventListener("userUpdated", syncCustomerSession);
    window.addEventListener("storage", syncCustomerSession);
    return () => {
      window.removeEventListener("userUpdated", syncCustomerSession);
      window.removeEventListener("storage", syncCustomerSession);
    };
  }, []);

  const scrollToHomeSection = (sectionId) => {
    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="border-t border-slate-200 bg-white py-10 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 font-sans">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          className={`grid grid-cols-1 gap-8 border-b border-slate-200 pb-10 ${
            isCustomerLoggedIn
              ? "md:grid-cols-[1.5fr_0.9fr_1fr_1.1fr]"
              : "md:grid-cols-[1.5fr_0.9fr_1fr_0.9fr_1.1fr]"
          } dark:border-slate-800`}
        >
          <div className="space-y-3">
            <Link to="/" className="flex w-fit items-center gap-2.5">
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                INNOVA-<span className="text-emerald-700 dark:text-emerald-500">HMS</span>
              </h2>
            </Link>

            <p className="max-w-md text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Smart hotel booking, room discovery, and guest support in one simple platform.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="w-fit border-b-2 border-emerald-700 pb-1 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-emerald-500 dark:text-white">
              Innova-HMS
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToHomeSection("hero")}
                  className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400"
                >
                  Home
                </button>
              </li>
              <li>
                <Link to="/features" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/vision-suites" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  Vision Suites
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="w-fit border-b-2 border-emerald-700 pb-1 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-emerald-500 dark:text-white">
              Help Center
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <a href="tel:+639605736024" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  +63 960 573 6024
                </a>
              </li>
              <li>
                <a href="mailto:support.innova.hms@gmail.com" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  support.innova.hms@gmail.com
                </a>
              </li>
              <li className="pt-1 text-slate-500 dark:text-slate-400 font-semibold">
                📍 Metro Manila, Philippines
              </li>
            </ul>
          </div>
          {!isCustomerLoggedIn && (
            <div className="space-y-4">
              <h3 className="w-fit border-b-2 border-emerald-700 pb-1 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-emerald-500 dark:text-white">
                Join Us
              </h3>
              <ul className="space-y-2.5 text-xs font-medium">
                <li>
                  <Link to="/hotelier" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                    For Hotelier
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="w-fit border-b-2 border-emerald-700 pb-1 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-emerald-500 dark:text-white">
              Terms & Policies
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link to="/terms-of-service" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  Terms of Service
                </Link>
              </li>
             
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-center text-[11px] font-semibold tracking-wider text-slate-400 md:flex-row md:text-left">
          <p>
            Copyright {new Date().getFullYear()} <span className="text-emerald-700 dark:text-emerald-500">INNOVA-HMS</span>. All rights reserved.
          </p>
          <div className="flex gap-6" />
        </div>
      </div>
    </footer>
  );
}