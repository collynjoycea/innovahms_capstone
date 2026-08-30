import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  MapPin, 
  CalendarDays, 
  Users, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Building
} from "lucide-react";
import resolveImg from "../utils/resolveImg";

const fallbackPromotions = [
  {
    id: "promo-early-bird",
    badge: "Early Bird",
    title: "Early Sanctuary Deal",
    desc: "Book 30 days in advance and unlock premium savings on all room categories. Includes complimentary breakfast.",
    promo: "30%",
    sub: "off any room",
    expiry: "Limited-time offer",
    icon: "SUN",
  },
  {
    id: "promo-vip-weekend",
    badge: "VIP Exclusive",
    title: "Suki Member Weekend",
    desc: "Exclusive weekend rate for loyalty members with room upgrades and spa access.",
    promo: "40%",
    sub: "off weekends",
    expiry: "Limited-time offer",
    icon: "VIP",
  },
  {
    id: "promo-long-stay",
    badge: "Long Stay",
    title: "Extended Sanctuary",
    desc: "Stay 5 nights and get the 6th night free on selected premium rooms.",
    promo: "6th Night",
    sub: "free",
    expiry: "Ongoing promotion",
    icon: "STAY",
  },
];

let _heroImgIndex = 0;
let _heroInterval = null;

const images = ["/images/1.webp", "/images/3.jpg", "/images/2.jpg"];

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) return null;
  return new Date(year, month - 1, day);
};

const addDaysToInputDate = (value, days) => {
  const parsed = parseInputDate(value);
  if (!parsed) return "";
  const next = new Date(parsed);
  next.setDate(next.getDate() + days);
  return toInputDate(next);
};

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentImg, setCurrentImg] = useState(() => _heroImgIndex);
  const [hotelCards, setHotelCards] = useState([]);
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [hotelIndex, setHotelIndex] = useState(0);
  const [showAllHotels, setShowAllHotels] = useState(false);
  const [promotionCards, setPromotionCards] = useState(fallbackPromotions);
  const [sessionUser, setSessionUser] = useState(null);
  
  // Stay Type State: 'overnight' or 'day_use'
  const [stayType, setStayType] = useState("overnight");

  const [heroCheckIn, setHeroCheckIn] = useState(() => toInputDate(new Date()));
  const [heroCheckOut, setHeroCheckOut] = useState(() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return toInputDate(nextDay);
  });
  const [heroGuests, setHeroGuests] = useState(2);
  const [heroRoomType, setHeroRoomType] = useState("Any");
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const heroMinCheckIn = toInputDate(new Date());
  const heroMinCheckOut = heroCheckIn ? addDaysToInputDate(heroCheckIn, 1) : addDaysToInputDate(heroMinCheckIn, 1);

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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (_heroInterval) clearInterval(_heroInterval);
    _heroInterval = setInterval(() => {
      _heroImgIndex = (_heroImgIndex + 1) % images.length;
      setCurrentImg(_heroImgIndex);
    }, 8000);
    return () => {
      if (_heroInterval) clearInterval(_heroInterval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const [roomsRes, offersRes, hotelsRes] = await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/guest-offers"),
          fetch("/api/home/hotels"),
        ]);

        if (roomsRes.ok) {
          const roomsPayload = await roomsRes.json();
          const rooms = Array.isArray(roomsPayload?.rooms)
            ? roomsPayload.rooms
            : Array.isArray(roomsPayload)
              ? roomsPayload
              : [];

          const mappedHotels = rooms.slice(0, 4).map((room) => {
            const capacity = Number(room.maxAdults || 0) + Number(room.maxChildren || 0);
            const roomType = room.roomType || room.type || room.room_type || "Suite";
            const rawImg = (Array.isArray(room.images) && room.images[0]) || "";
            const image = resolveImg(rawImg);
            return {
              id: room.id,
              name: room.roomName || room.name || roomType || "Innova Suite",
              location: room.location_description || "Innova Smart Hotel",
              image,
              forecast: `${Math.max(capacity, 2)} Pax`,
              status: String(room.status || "Available").toUpperCase() === "AVAILABLE" ? "OPEN" : String(room.status || "CLOSED").toUpperCase(),
              schedule: "24/7 Guest Service",
              roomType,
              amenities: Array.isArray(room.amenities) ? room.amenities : [],
              avgRating: Number(room.avgRating || room.averageRating || 0),
              reviewCount: Number(room.reviewCount || room.review_count || 0),
            };
          });

          if (isMounted && mappedHotels.length > 0) {
            setHotelCards(mappedHotels);
          }
        }

        if (offersRes.ok) {
          const offersPayload = await offersRes.json();
          const offers = Array.isArray(offersPayload) ? offersPayload : [];

          const mappedOffers = offers.slice(0, 3).map((offer, index) => {
            const iconByType = {
              seasonal: "SUN",
              flash_deal: "FLASH",
              holiday_package: "PACK",
            };

            const promoText = Number(offer.discount_percentage || 0) > 0
              ? `${Number(offer.discount_percentage)}%`
              : `PHP ${Number(offer.discounted_price || 0).toLocaleString()}`;

            return {
              id: offer.id || `offer-${index}`,
              badge: offer.badge_text || "Featured Deal",
              title: offer.title || "Special Offer",
              desc: offer.description || "Enjoy exclusive rates for a limited time.",
              promo: promoText,
              sub: Number(offer.discount_percentage || 0) > 0 ? "off today" : "promo rate",
              expiry: offer.expiry_date ? `Expires ${new Date(offer.expiry_date).toLocaleDateString()}` : "Limited-time offer",
              icon: iconByType[offer.offer_type] || "DEAL",
            };
          });

          if (isMounted && mappedOffers.length > 0) {
            setPromotionCards(mappedOffers);
          }
        }

        if (hotelsRes.ok) {
          const hotelsPayload = await hotelsRes.json().catch(() => ({}));
          const hotels = Array.isArray(hotelsPayload?.hotels) ? hotelsPayload.hotels : [];
          const mappedFeatured = hotels.map((hotel) => ({
            ...hotel,
            image: resolveImg(hotel.image || hotel.hotelLogo || hotel.buildingImage),
          }));
          if (isMounted && mappedFeatured.length > 0) {
            setFeaturedHotels(mappedFeatured);
          }
        }
      } catch (error) {
        console.error("Home data fetch error:", error);
      }
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadSessionUser = () => {
      const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
      if (!raw) {
        setSessionUser(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        const normalizedUser = parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
        setSessionUser(normalizedUser);
      } catch {
        setSessionUser(null);
      }
    };

    loadSessionUser();
    window.addEventListener("userUpdated", loadSessionUser);
    window.addEventListener("storage", loadSessionUser);

    return () => {
      window.removeEventListener("userUpdated", loadSessionUser);
      window.removeEventListener("storage", loadSessionUser);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/" || !location.hash) return;

    const sectionId = location.hash.replace("#", "");
    const timer = setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);

    return () => clearTimeout(timer);
  }, [location.pathname, location.hash, hotelCards.length, promotionCards.length]);

  // Handle stay type changes and sync check-out logic
  useEffect(() => {
    if (stayType === "day_use") {
      setHeroCheckOut(heroCheckIn);
    } else {
      if (!heroCheckOut || heroCheckOut <= heroCheckIn) {
        setHeroCheckOut(addDaysToInputDate(heroCheckIn, 1));
      }
    }
  }, [stayType, heroCheckIn]);

  const handleHeroCheckInChange = (event) => {
    const newCheckIn = event.target.value;
    setHeroCheckIn(newCheckIn);
    if (stayType === "day_use") {
      setHeroCheckOut(newCheckIn);
    }
  };

  const handleHeroCheckOutChange = (event) => {
    if (stayType !== "day_use") {
      setHeroCheckOut(event.target.value);
    }
  };

  const handleHeroAvailabilitySearch = () => {
    const params = new URLSearchParams();
    if (heroCheckIn) params.set("from", heroCheckIn);
    if (heroCheckOut) params.set("to", heroCheckOut);
    if (heroGuests) params.set("guests", String(heroGuests));
    if (heroRoomType && heroRoomType !== "Any") params.set("view", heroRoomType);
    if (stayType) params.set("stayType", stayType);
    
    navigate(`/vision-suites${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const roomTypeOptions = Array.from(
    new Set(hotelCards.map((room) => room.roomType).filter(Boolean))
  );

  const ITEMS_PER_VIEW = 4;
  const totalHotels = featuredHotels.length;

  const handleNextHotels = () => {
    if (totalHotels === 0) return;
    setHotelIndex((prev) => (prev + 1) % totalHotels);
  };

  const handlePrevHotels = () => {
    if (totalHotels === 0) return;
    setHotelIndex((prev) => (prev - 1 + totalHotels) % totalHotels);
  };

  const getVisibleHotels = () => {
    if (totalHotels === 0) return [];
    if (showAllHotels) return featuredHotels;

    const items = [];
    for (let i = 0; i < Math.min(ITEMS_PER_VIEW, totalHotels); i++) {
      items.push(featuredHotels[(hotelIndex + i) % totalHotels]);
    }
    return items;
  };

  const visibleHotels = getVisibleHotels();

  return (
    <main className={`relative min-h-screen w-full ${isDark ? "dark" : ""} bg-slate-50 dark:bg-[#080d0b] font-sans selection:bg-[#2FA084]/30 overflow-x-hidden text-[#14231e] dark:text-[#EEEEEE] transition-colors duration-300`}>
      
      {/* HERO SECTION - Adjusted height and padding to make it more compact */}
      <section id="hero" className="relative w-full overflow-hidden shadow-2xl pt-12 pb-10 md:pt-16 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImg}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-[-6%] z-0 bg-cover bg-center animate-hero-zoom"
            style={{ backgroundImage: `url(${images[currentImg]})` }}
          >
            <div className={`absolute inset-0 ${
              isDark ? "bg-black/45" : "bg-black/35"
            }`} />
            <div className={`absolute inset-0 ${
              isDark
                ? "bg-gradient-to-b from-black/40 via-transparent to-[#080d0b]"
                : "bg-gradient-to-b from-black/30 via-transparent to-black/70"
            }`} />
          </motion.div>
        </AnimatePresence>

        <style>{`
          @keyframes heroZoom {
            0%   { transform: scale(1.06); }
            100% { transform: scale(1.14); }
          }
          .animate-hero-zoom {
            animation: heroZoom 10s ease-in-out infinite alternate;
          }
        `}</style>

        <div className="relative z-20 mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-2"
          >
            <h2 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.4em] text-[#6FCF97] opacity-90">
              The Evolution of Travel
            </h2>
            <h1 className="mt-1 text-3xl sm:text-4xl md:text-5xl font-black leading-none tracking-tight text-white drop-shadow-[0_15px_40px_rgba(0,0,0,0.35)]">
              INNOVA<span className="text-[#2FA084]">.</span>HMS
            </h1>
          </motion.div>

          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mx-auto mt-1 text-xs sm:text-xs leading-relaxed tracking-[0.01em] text-white/90 font-light drop-shadow-md"
            >
              INNOVA-HMS is designed to provide guests with a smarter, faster, and more convenient hotel experience.
            </motion.p>
          </div>

          {/* SEARCH FORM WIDGET - Positioned higher up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-5 w-full max-w-3xl relative"
          >
            {/* Centered Hotels Tab Header */}
            <div className="flex items-center justify-center mb-[-1px] relative z-20">
              <button 
                type="button"
                className="flex items-center gap-2 px-6 py-2 rounded-t-xl bg-white dark:bg-[#121E1A] text-[#1F6F5F] dark:text-[#6FCF97] font-bold text-xs shadow-md border-t border-x border-gray-200 dark:border-[#243B33]"
              >
                <Building size={15} />
                <span>Hotels</span>
              </button>
            </div>

            {/* Main Search Panel Box */}
            <div className="relative z-10 rounded-2xl bg-white dark:bg-[#121E1A] p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-[#243B33] text-left">
              
              {/* Overnight vs Day Use Toggle Buttons */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setStayType("overnight")}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    stayType === "overnight"
                      ? "bg-emerald-50 dark:bg-[#182924] text-[#1F6F5F] dark:text-[#6FCF97] border border-emerald-200 dark:border-[#2FA084]/30"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#182924]"
                  }`}
                >
                  Overnight Stays
                </button>
                <button
                  type="button"
                  onClick={() => setStayType("day_use")}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    stayType === "day_use"
                      ? "bg-emerald-50 dark:bg-[#182924] text-[#1F6F5F] dark:text-[#6FCF97] border border-emerald-200 dark:border-[#2FA084]/30"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#182924]"
                  }`}
                >
                  Day Use Stays
                </button>
              </div>

              {/* Input Row 1: Room Type Dropdown */}
              <div className="mb-2.5">
                <div className="flex items-center gap-2.5 w-full rounded-xl border border-gray-200 dark:border-[#243B33] bg-gray-50/50 dark:bg-[#080d0b]/50 px-3.5 py-2 focus-within:border-[#1F6F5F] dark:focus-within:border-[#2FA084] transition-all">
                  <Search size={16} className="text-gray-400 shrink-0" />
                  <div className="w-full">
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Room Type / Option</p>
                    <select
                      value={heroRoomType}
                      onChange={(e) => setHeroRoomType(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-gray-800 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="Any" className="text-black dark:text-black">Any Room Type</option>
                      {roomTypeOptions.map((type) => (
                        <option key={type} value={type} className="text-black dark:text-black">{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Input Row 2: Check-in, Check-out, Guests Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
                
                {/* Dates Input Group */}
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 dark:border-[#243B33] bg-gray-50/50 dark:bg-[#080d0b]/50 p-2">
                  <div className="border-r border-gray-200 dark:border-[#243B33] pr-2">
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Check-in</p>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-[#1F6F5F] dark:text-[#6FCF97] shrink-0" />
                      <input
                        type="date"
                        value={heroCheckIn}
                        min={heroMinCheckIn}
                        onChange={handleHeroCheckInChange}
                        className="w-full bg-transparent text-xs font-semibold text-gray-800 dark:text-white outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pl-2">
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
                      {stayType === "day_use" ? "Same Day Check-out" : "Check-out"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-[#1F6F5F] dark:text-[#6FCF97] shrink-0" />
                      <input
                        type="date"
                        value={heroCheckOut}
                        min={heroMinCheckOut}
                        disabled={stayType === "day_use"}
                        onChange={handleHeroCheckOutChange}
                        className={`w-full bg-transparent text-xs font-semibold outline-none ${
                          stayType === "day_use" 
                            ? "text-gray-400 dark:text-gray-500 cursor-not-allowed" 
                            : "text-gray-800 dark:text-white cursor-pointer"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Guests Input Group */}
                <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-[#243B33] bg-gray-50/50 dark:bg-[#080d0b]/50 px-3.5 py-2">
                  <Users size={16} className="text-[#1F6F5F] dark:text-[#6FCF97] shrink-0" />
                  <div className="w-full">
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Occupancy</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={heroGuests}
                        onChange={(e) => setHeroGuests(Math.max(1, Number(e.target.value) || 1))}
                        className="w-14 bg-transparent text-xs font-semibold text-gray-800 dark:text-white outline-none"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Adults / Guests</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Search Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleHeroAvailabilitySearch}
                  className="w-full py-3 rounded-xl bg-[#1F6F5F] hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77] text-white font-bold text-xs tracking-wider uppercase shadow-md transition-all hover:scale-[1.005] active:scale-[0.995] flex items-center justify-center gap-2"
                >
                  <Search size={16} />
                  <span>Search Rooms</span>
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* HOTELS SECTION */}
      {featuredHotels.length > 0 && (
        <section id="hotels" className="py-16 px-6 max-w-7xl mx-auto border-t border-emerald-950/10 dark:border-white/10 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-light text-[#111C18] dark:text-white mt-1">Hotels</h2>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/vision-suites?viewMode=hotel")}
                className="text-xs font-medium text-[#1F6F5F] dark:text-[#6FCF97] hover:underline flex items-center gap-1.5"
              >
                {showAllHotels ? "Show Less" : "View All Hotel"} <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="relative group/slider">
            {!showAllHotels && (
              <>
                <button
                  type="button"
                  onClick={handlePrevHotels}
                  className="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl transition-transform duration-200 hover:scale-110 active:scale-95 border border-gray-100 dark:border-transparent"
                  aria-label="Previous Hotels"
                >
                  <ChevronLeft size={22} className="stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={handleNextHotels}
                  className="absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl transition-transform duration-200 hover:scale-110 active:scale-95 border border-gray-100 dark:border-transparent"
                  aria-label="Next Hotels"
                >
                  <ChevronRight size={22} className="stroke-[2.5]" />
                </button>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleHotels.map((hotel, idx) => (
                <div
                  key={`${hotel.id}-${idx}`}
                  onClick={() => navigate(`/hoteldetail/${hotel.id}`)}
                  className="group cursor-pointer rounded-2xl bg-white dark:bg-[#121E1A] border border-gray-200 dark:border-[#243B33] overflow-hidden transition-all duration-300 hover:border-[#1F6F5F] dark:hover:border-[#2FA084] flex flex-col justify-between shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(47,160,132,0.15)] hover:-translate-y-1"
                >
                  <div>
                    <div className="relative h-44 overflow-hidden bg-gray-100 dark:bg-[#182924]">
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 flex items-center gap-1 border border-white/10 text-white">
                        <span className="text-[11px] font-bold">{Number(hotel.avgRating || 0).toFixed(1)}</span>
                        <span className="text-[10px] text-emerald-300">★</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <span className="text-[10px] font-mono text-[#1F6F5F] dark:text-[#6FCF97] tracking-wider uppercase block mb-1">
                        {hotel.tag || "Property"}
                      </span>
                      <h3 className="text-base font-medium text-[#111C18] dark:text-white group-hover:text-[#1F6F5F] dark:group-hover:text-[#6FCF97] transition-colors leading-snug">
                        {hotel.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-300 mt-2 flex items-center gap-1">
                        <MapPin size={12} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" /> <span className="truncate">{hotel.location}</span>
                      </p>
                      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                        {hotel.reviewCount ? `${hotel.reviewCount} reviews` : "New property"}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 mt-auto">
                    <div className="pt-3 border-t border-gray-100 dark:border-[#243B33] flex items-center justify-end text-[11px] text-[#739487]">
                      <span className="font-medium text-[#1F6F5F] dark:text-[#6FCF97] group-hover:underline">View Details &rarr;</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ROOMS SECTION */}
      <section id="rooms" className="py-16 px-6 max-w-7xl mx-auto border-t border-emerald-950/10 dark:border-white/10 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-light text-[#111C18] dark:text-white mt-1">Rooms</h2>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/recommendations")}
              className="text-xs font-medium text-[#1F6F5F] dark:text-[#6FCF97] hover:underline flex items-center gap-1.5"
            >
              Recommendation Rooms <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/vision-suites?viewMode=room")}
              className="text-xs font-medium text-[#1F6F5F] dark:text-[#6FCF97] hover:underline flex items-center gap-1.5"
            >
              View All Room <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotelCards.map((hotel, idx) => (
            <div
              key={hotel.id || idx}
              onClick={() => navigate(`/roomdetail/${hotel.id}`)}
              className="flex flex-col justify-between rounded-2xl bg-white dark:bg-[#121E1A] border border-gray-200 dark:border-[#243B33] overflow-hidden transition-all duration-300 hover:border-[#1F6F5F] dark:hover:border-[#2FA084] shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(47,160,132,0.15)] hover:-translate-y-1 cursor-pointer"
            >
              <div>
                <div className="relative h-44 overflow-hidden bg-gray-100 dark:bg-[#182924]">
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    onError={(e) => { e.currentTarget.src = '/images/deluxe-room.jpg'; }}
                    className="w-full h-full object-cover"
                  />
                  <span className={`absolute top-3 right-3 text-[9px] font-mono px-2.5 py-1 rounded-full border ${
                    hotel.status === "OPEN"
                      ? "bg-[#080d0b]/80 text-[#6FCF97] border-[#243B33]"
                      : "bg-rose-950/80 text-rose-300 border-rose-900/40"
                  }`}>
                    {hotel.status}
                  </span>
                  <div className="absolute bottom-3 left-3 bg-black/65 backdrop-blur-sm px-2 py-1 flex items-center gap-1 border border-white/10 text-white">
                    <span className="text-[11px] font-bold">{Number(hotel.avgRating || 0).toFixed(1)}</span>
                    <span className="text-[10px] text-emerald-300">★</span>
                  </div>
                </div>

                <div className="p-5">
                  <span className="text-[10px] font-mono text-[#739487] dark:text-[#88A89B] uppercase block mb-1">
                    Capacity: {hotel.forecast}
                  </span>
                  <h3 className="text-base font-medium text-[#111C18] dark:text-white">
                    {hotel.name}
                  </h3>
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {hotel.reviewCount ? `${hotel.reviewCount} reviews` : "New listing"}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 mt-auto">
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-[#243B33]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/roomdetail/${hotel.id}`);
                    }}
                    className="flex-1 text-center py-2 rounded-xl border border-gray-200 dark:border-[#243B33] text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#182924] transition-colors hover:bg-gray-100 dark:hover:bg-[#1B2A25]"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/booking?roomId=${hotel.id}`);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#1F6F5F] hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77] text-white text-xs font-medium transition-colors"
                  >
                    Reserve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}