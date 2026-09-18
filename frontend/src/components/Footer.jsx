import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

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
        <div className="grid grid-cols-1 gap-8 border-b border-slate-200 pb-10 md:grid-cols-[1.4fr_0.9fr_0.9fr] dark:border-slate-800">
          
          {/* BRAND COLUMN */}
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

          {/* NAVIGATION COLUMN */}
          <div className="space-y-4">
            <h3 className="w-fit border-b-2 border-emerald-700 pb-1 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-emerald-500 dark:text-white">
              Navigation
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

          {/* CONTACT & LOCATION COLUMN */}
          <div className="space-y-4">
            <h3 className="w-fit border-b-2 border-emerald-700 pb-1 text-xs font-bold uppercase tracking-wider text-slate-900 dark:border-emerald-500 dark:text-white">
              Contact
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <a href="tel:+639605736024" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  +63 960 573 6024
                </a>
              </li>
              <li>
                <a href="sms:+639605736024" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  SMS Support
                </a>
              </li>
              <li>
                <a href="mailto:fernandezcollynjoyce@gmail.com" className="transition-colors hover:text-emerald-700 dark:hover:text-emerald-400">
                  fernandezcollynjoyce@gmail.com
                </a>
              </li>
              <li className="pt-1 text-slate-500 dark:text-slate-400 font-semibold">
                📍 Metro Manila, Philippines
              </li>
            </ul>
          </div>
        </div>
        
        

        {/* BOTTOM COPYRIGHT & LEGAL */}
        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-center text-[11px] font-semibold tracking-wider text-slate-400 md:flex-row md:text-left">
          <p>
            Copyright {new Date().getFullYear()} <span className="text-emerald-700 dark:text-emerald-500">INNOVA-HMS</span>. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/about" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              About Us
            </Link>
            <Link to="/features" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              Features
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}