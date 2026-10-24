import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  View, 
  MessageSquare, 
  CreditCard, 
  X
} from "lucide-react";

export default function Features() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [selectedFeature, setSelectedFeature] = useState(null);

  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("theme");
      setIsDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    window.addEventListener("themeChanged", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("themeChanged", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const smartFeatures = [
    { 
      title: "Smart Room Booking", 
      desc: "Search available accommodations, view room details, and make reservations through one convenient platform.", 
      modalTitle: "Smart Room Booking",
      modalDesc: "The Smart Room Booking feature automates and optimizes room allocation and reservation management. Designed to streamline operations, reduce administrative overhead, and prevent double-booking, the feature delivers real-time updates on room status, interactive selection, and automated guest notifications.",
      modalHighlights: [
        "Real-Time Availability Calendar: Interactive grid/calendar view displaying real-time status (Available, Occupied, Maintenance, Reserved) with instant filter options by room type, floor level, capacity, price range, and amenities.",
        "Intelligent Auto-Assignment & Matching: Automatically suggests or assigns optimal rooms based on guest preferences, group size, special requests, and stay duration, featuring smart layout integration.",
        "Dynamic Pricing & Rate Management: Integrates dynamic rate updates based on peak seasons, occupancy levels, weekend surges, or promotional discount codes.",
        "Role-Based Access & Conflict Prevention: Double-booking protection using atomic database transactions and distinct permissions for Guests, Staff, and Admins."
      ],
      icon: <Sparkles className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/Ai-recommendations.jpg"
    },
    { 
      title: "Virtual 360 Tours", 
      desc: "Allow guests to explore suites and facilities in immersive 3D before they even check in.", 
      modalTitle: "Virtual 360 Tours",
      modalDesc: "The Virtual 360 Tours feature provides guests with an immersive 3D walkthrough experience of suites, amenities, and hotel facilities prior to their arrival, building confidence and driving direct bookings.",
      modalHighlights: [
        "Immersive 3D Exploration: High-resolution panoramic views of rooms, lobbies, dining areas, and recreational facilities.",
        "Interactive Hotspots: Clickable informational tags highlighting key room amenities, views, and specific suite features.",
      ],
      icon: <View className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/virtual-360-tours.jpg"
    },
    { 
      title: "AI Guest Assistant", 
      desc: "Get automated assistance for common hotel inquiries and booking-related questions through an AI-powered chatbot.", 
      modalTitle: "AI Guest Assistant",
      modalDesc: "The AI Guest Assistant delivers 24/7 automated support to handle common guest inquiries, booking assistance, and concierge services through an intelligent, natural-language chatbot.",
      modalHighlights: [
        "24/7 Automated Support: Instant answers regarding hotel policies, amenities, check-in procedures, and local attractions.",
        "Booking & Modification Help: Guides guests through reservation steps, status checks, and simple modifications without staff intervention.",
      ],
      icon: <MessageSquare className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/AI-concierge.jpg"
    },
    { 
      title: "Seamless Online Payments", 
      desc: "Complete hotel reservations securely through integrated online payment processing.", 
      modalTitle: "Seamless Online Payments",
      modalDesc: "The Seamless Online Payments feature enables fast, secure, and flexible financial transactions, supporting multiple payment gateways and automated invoicing for reservations.",
      modalHighlights: [
        "Multi-Gateway Integration: Secure processing for major credit cards, e-wallets, online banking, and digital payment channels.",
        "Automated Invoicing & Receipts: Instant generation of digital receipts, tax invoices, and payment summaries sent directly to guests.",
      ],
      icon: <CreditCard className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/indoor-navigation.jpg"
    }
  ];

  return (
    <div className={`min-h-screen w-full ${isDark ? "dark" : ""} bg-slate-50 dark:bg-[#080d0b] text-[#14231e] dark:text-[#EEEEEE] font-sans transition-colors duration-300 selection:bg-[#2FA084]/30 overflow-x-hidden`}>
      
      {/* HERO SECTION */}
      <section className="relative min-h-[48vh] flex items-center justify-center overflow-hidden bg-[#0a120f]">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-features.jpg" 
            className="w-full h-full object-cover opacity-40 scale-105" 
            alt="Luxury Hotel Technology"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080d0b]/80 via-[#080d0b]/50 to-[#080d0b]" />
        </div>

        <div className="relative z-10 w-full max-w-5xl px-6 py-16 text-center">
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white leading-tight">
            Next-Generation <span className="font-semibold text-[#6FCF97]">Hotel Management</span>
          </h1>
          
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-gray-300 font-normal leading-relaxed">
            Elevating modern hospitality through quiet automation, intelligent guest routing, and tailored stay experiences.
          </p>
        </div>
      </section>

      {/* SMART GUEST EXPERIENCE SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 border-b border-gray-200 dark:border-[#182924] pb-6">
          <div>
            <span className="text-[11px] font-mono tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] uppercase block mb-1">
              Guest Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-light text-[#111C18] dark:text-white">
              Intelligent Suite Features
            </h2>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {smartFeatures.map((feature, index) => (
            <div 
              key={index} 
              onClick={() => setSelectedFeature(feature)}
              className="group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#121E1A] border border-gray-200 dark:border-[#243B33] overflow-hidden transition-all duration-300 hover:border-[#1F6F5F] dark:hover:border-[#2FA084] shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(47,160,132,0.15)] hover:-translate-y-1 cursor-pointer"
            >
              <div className="p-6">
                {/* Icon Container */}
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#182924] border border-emerald-100 dark:border-[#243B33] flex items-center justify-center mb-5 group-hover:bg-[#1F6F5F] dark:group-hover:bg-[#2FA084] transition-colors duration-300">
                  {React.cloneElement(feature.icon, {
                    className: "w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97] group-hover:text-white transition-colors duration-300"
                  })}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-medium text-[#111C18] dark:text-white group-hover:text-[#1F6F5F] dark:group-hover:text-[#6FCF97] transition-colors">
                    {feature.title}
                  </h3>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                  {feature.desc}
                </p>
              </div>

              {/* Image Footer */}
              <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-[#182924] mt-2 border-t border-gray-100 dark:border-[#1e332c]">
                <img 
                  src={feature.img} 
                  alt={feature.title} 
                  onError={(e) => { e.currentTarget.src = '/images/1.webp'; }}
                  className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* FEATURE MODAL */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:pt-16 bg-black/60 backdrop-blur-sm animate-fadeIn">
          {/* Ginawang pt-12 o sm:pt-16 para bumaba nang kaunti ang buong modal mula sa itaas */}
          <div className="relative w-full max-w-lg max-h-[75vh] flex flex-col rounded-2xl bg-white dark:bg-[#121E1A] border border-gray-200 dark:border-[#243B33] shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Content - Scrollable area */}
            <div className="overflow-y-auto flex-1 px-6 pb-6 pt-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              
              {/* Modal Image Header - Buong sakop sa taas nang walang margin/space at may close button sa loob sa kanang itaas */}
              <div className="relative h-52 w-full overflow-hidden bg-gray-100 dark:bg-[#182924] mb-4 -mx-6 w-[calc(100%+3rem)]">
                <img
                  src={selectedFeature.img}
                  alt={selectedFeature.modalTitle}
                  onError={(e) => { e.currentTarget.src = '/images/1.webp'; }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Close Button sa loob sa kanang itaas ng picture */}
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="absolute top-3 right-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors shadow-md"
                  aria-label="Close Modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#182924] border border-emerald-100 dark:border-[#243B33] shadow-sm mb-3 text-[#1F6F5F] dark:text-[#6FCF97]">
                {selectedFeature.icon}
              </div>

              <h3 className="text-xl font-semibold text-[#111C18] dark:text-white mb-2">
                {selectedFeature.modalTitle}
              </h3>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                {selectedFeature.modalDesc}
              </p>

              <div className="mb-6">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] mb-3">
                  Key Capabilities & Highlights
                </h4>
                <ul className="space-y-2.5">
                  {selectedFeature.modalHighlights.map((highlight, idx) => {
                    const [title, details] = highlight.split(":");
                    return (
                      <li key={idx} className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-3 border-l-2 border-[#1F6F5F] dark:border-[#2FA084]">
                        <strong className="text-[#111C18] dark:text-white font-medium">{title}:</strong> {details}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-[#243B33]">
                <button
                  type="button"
                  onClick={() => setSelectedFeature(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#1F6F5F] hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77] text-white text-xs font-semibold tracking-wider uppercase transition-all"
                >
                  CLOSED
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}