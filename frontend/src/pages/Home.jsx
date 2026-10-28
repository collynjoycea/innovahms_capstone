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
  Building,
  BedDouble,
  CalendarCheck,
} from "lucide-react";
import resolveImg from "../utils/resolveImg";
import RoomDiscountBadge from "../components/RoomDiscountBadge";

/* ==========================================
   FALLBACK DATA (Para siguradong may lalabas)
   ========================================== */
const FALLBACK_HOTELS = [
  {
    id: "sobel-hotel",
    name: "Sobel Hotel",
    location: "#03 A Gen. Pio Valenzuela St., Brgy. 78, Caloocan, Metro Manila",
    description: "Experience premium comfort and warm hospitality with top-tier room amenities and convenient location.",
    image: "/images/sobel.png",
    availableToday: null,
    bookingsToday: null,
    avgRating: 0,
    reviewCount: 0,
  },
  {
    id: "victoria-court-north-edsa",
    name: "Victoria Court North EDSA",
    location: "3 Don Vicente Ang, Bagong Barrio West, Caloocan, Metro Manila",
    description: "Stylish, modern suites with fast Wi-Fi, 24/7 service, and themed luxurious ambiance.",
    image: "/images/3.jpg",
    availableToday: null,
    bookingsToday: null,
    avgRating: 0,
    reviewCount: 0,
  },
];

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

const images = ["/images/sobel.png", "/images/3.jpg", "/images/2.jpg"];

const ROOM_TYPE_OPTIONS = ["Standard", "Double", "Suite", "Deluxe", "Family Room"];
const ITEMS_PER_VIEW = 4;

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

/* ==========================================
   MAIN COMPONENT CODE
   ========================================== */
const getStartingHourlyRate = (room) => {
  const rates = [3, 6, 9, 12, 24].flatMap((hours) => {
    const weekdayRate = Number(room?.[`rate${hours}Hours`] || 0);
    const weekendRate = Number(room?.[`weekendRate${hours}Hours`] || 0);
    return [
      { price: weekdayRate, hours },
      ...(room?.useDayRates ? [{ price: weekendRate, hours }] : []),
    ].filter((rate) => Number.isFinite(rate.price) && rate.price > 0);
  });
  return rates.sort((first, second) => first.price - second.price)[0] || null;
};

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentImg, setCurrentImg] = useState(() => _heroImgIndex);
  const [hotelCards, setHotelCards] = useState([]);
  const [featuredHotels, setFeaturedHotels] = useState(FALLBACK_HOTELS);
  
  // Carousel States
  const [hotelIndex, setHotelIndex] = useState(0);
  const [showAllHotels, setShowAllHotels] = useState(false);

  const [roomIndex, setRoomIndex] = useState(0);
  const [showAllRooms, setShowAllRooms] = useState(false);

  const [promotionCards, setPromotionCards] = useState(fallbackPromotions);
  const [sessionUser, setSessionUser] = useState(null);
  
  const [heroCheckIn, setHeroCheckIn] = useState(() => toInputDate(new Date()));
  const [heroCheckOut, setHeroCheckOut] = useState(() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return toInputDate(nextDay);
  });
  const [heroAdults, setHeroAdults] = useState(2);
  const [heroKids, setHeroKids] = useState(0);
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

        let hotelMapData = new Map();
        if (hotelsRes.ok) {
          const hotelsPayload = await hotelsRes.json().catch(() => ({}));
          const hotels = Array.isArray(hotelsPayload?.hotels) ? hotelsPayload.hotels : [];
          for (const h of hotels) {
            if (h.id) hotelMapData.set(String(h.id), h.name);
          }

          if (hotels.length > 0) {
            const mappedFeatured = hotels.map((hotel, index) => ({
              ...hotel,
              image: resolveImg(hotel.image || hotel.hotelLogo || hotel.buildingImage || FALLBACK_HOTELS[index % 2].image),
              availableToday: Number.isFinite(Number(hotel.availableToday)) ? Number(hotel.availableToday) : null,
              bookingsToday: Number.isFinite(Number(hotel.bookingsToday)) ? Number(hotel.bookingsToday) : null,
              avgRating: Number(hotel.avgRating ?? 0),
              reviewCount: Number(hotel.reviewCount ?? 0),
            }));

            if (isMounted) setFeaturedHotels(mappedFeatured);
          }
        }

        if (roomsRes.ok) {
          const roomsPayload = await roomsRes.json();
          const rooms = Array.isArray(roomsPayload?.rooms)
            ? roomsPayload.rooms
            : Array.isArray(roomsPayload)
              ? roomsPayload
              : [];

          const roomGroups = new Map();
          for (const room of rooms) {
            const roomType = room.roomType || room.type || room.room_type || "Suite";
            const roomName = room.roomName || room.room_name || room.name || roomType || "Innova Suite";
            const key = String(roomName).trim().toLowerCase();

            if (!roomGroups.has(key)) {
              const hId = String(room.hotel_id || room.hotelId || "");
              const hotelNameSource = room.hotelName || room.hotel_name || hotelMapData.get(hId) || room.location_description || "Sobel Hotel";

              roomGroups.set(key, {
                ...room,
                roomName,
                roomType,
                resolvedHotelName: hotelNameSource,
              });
            }
          }

          const mappedHotels = Array.from(roomGroups.values()).map((room) => {
            const capacity = Number(room.maxAdults || 0) + Number(room.maxChildren || 0);
            const roomType = room.roomType || room.type || room.room_type || "Suite";
            const rawImg = (Array.isArray(room.images) && room.images[0]) || "";
            const image = resolveImg(rawImg);
            const roomName = room.roomName || room.room_name || room.name || roomType || "Innova Suite";
            const startingHourlyRate = getStartingHourlyRate(room);
            const roomDesc = room.description || "";

            return {
              id: room.id,
              name: roomName,
              hotelName: room.resolvedHotelName,
              description: roomDesc,
              location: room.location_description || "Innova Smart Hotel",
              image,
              forecast: `${Math.max(capacity, 2)} Pax`,
              roomType,
              price: startingHourlyRate?.price || 0,
              priceDurationHours: startingHourlyRate?.hours || 0,
              ownerDiscountType: room.ownerDiscountType || room.owner_discount_type || "none",
              ownerDiscountValue: Number(room.ownerDiscountValue ?? room.owner_discount_value ?? 0),
              amenities: Array.isArray(room.amenities) ? room.amenities : [],
              avgRating: Number(room.avgRating ?? room.rating ?? 0),
              reviewCount: Number(room.reviewCount ?? room.review_count ?? 0),
            };
          });

          if (isMounted && mappedHotels.length > 0) {
            setHotelCards(mappedHotels);
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

  const handleHeroCheckInChange = (event) => setHeroCheckIn(event.target.value);
  const handleHeroCheckOutChange = (event) => setHeroCheckOut(event.target.value);

  const handleHeroAvailabilitySearch = () => {
    const params = new URLSearchParams();
    if (heroCheckIn) params.set("from", heroCheckIn);
    if (heroCheckOut) params.set("to", heroCheckOut);
    if (heroAdults) params.set("adults", String(heroAdults));
    if (heroKids) params.set("children", String(heroKids));
    if (heroAdults || heroKids) params.set("guests", String(Number(heroAdults || 0) + Number(heroKids || 0)));
    if (heroRoomType && heroRoomType !== "Any") params.set("view", heroRoomType);
    params.set("viewMode", "room");
    navigate(`/vision-suites?${params.toString()}`);
  };

  /* ================= HOTELS CAROUSEL LOGIC ================= */
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
    if (showAllHotels || totalHotels <= ITEMS_PER_VIEW) return featuredHotels;

    const items = [];
    for (let i = 0; i < Math.min(ITEMS_PER_VIEW, totalHotels); i++) {
      items.push(featuredHotels[(hotelIndex + i) % totalHotels]);
    }
    return items;
  };

  const visibleHotels = getVisibleHotels();

  /* ================= ROOMS CAROUSEL LOGIC ================= */
  const totalRooms = hotelCards.length;

  const handleNextRooms = () => {
    if (totalRooms === 0) return;
    setRoomIndex((prev) => (prev + 1) % totalRooms);
  };

  const handlePrevRooms = () => {
    if (totalRooms === 0) return;
    setRoomIndex((prev) => (prev - 1 + totalRooms) % totalRooms);
  };

  const getVisibleRooms = () => {
    if (totalRooms === 0) return [];
    if (showAllRooms || totalRooms <= ITEMS_PER_VIEW) return hotelCards;

    const items = [];
    for (let i = 0; i < Math.min(ITEMS_PER_VIEW, totalRooms); i++) {
      items.push(hotelCards[(roomIndex + i) % totalRooms]);
    }
    return items;
  };

  const visibleRooms = getVisibleRooms();

  return (
    <main className={`relative min-h-screen w-full ${isDark ? "dark" : ""} bg-slate-50 dark:bg-[#080d0b] font-sans selection:bg-[#2FA084]/30 overflow-x-hidden text-[#14231e] dark:text-[#EEEEEE] transition-colors duration-300`}>
      
      {/* HERO SECTION */}
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
            <div className={`absolute inset-0 ${isDark ? "bg-black/45" : "bg-black/35"}`} />
            <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-b from-black/40 via-transparent to-[#080d0b]" : "bg-gradient-to-b from-black/30 via-transparent to-black/70"}`} />
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

          {/* SEARCH FORM WIDGET */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-5 w-full max-w-3xl relative"
          >
            <div className="flex items-center justify-center mb-[-1px] relative z-20">
              <button 
                type="button"
                className="flex items-center gap-2 px-6 py-2 rounded-t-xl bg-white dark:bg-[#121E1A] text-[#1F6F5F] dark:text-[#6FCF97] font-bold text-xs shadow-md border-t border-x border-gray-200 dark:border-[#243B33]"
              >
                <Building size={15} />
                <span>Hotels</span>
              </button>
            </div>

            <div className="relative z-10 rounded-2xl bg-white/80 dark:bg-[#121E1A]/80 backdrop-blur-md p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.25)] border border-gray-100/80 dark:border-[#243B33] text-left">
              
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
                      {ROOM_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type} className="text-black dark:text-black">{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
                
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
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Check-out</p>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-[#1F6F5F] dark:text-[#6FCF97] shrink-0" />
                      <input
                        type="date"
                        value={heroCheckOut}
                        min={heroMinCheckOut}
                        onChange={handleHeroCheckOutChange}
                        className="w-full bg-transparent text-xs font-semibold text-gray-800 dark:text-white outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-[#243B33] bg-gray-50/50 dark:bg-[#080d0b]/50 px-3.5 py-2">
                  <Users size={16} className="text-[#1F6F5F] dark:text-[#6FCF97] shrink-0" />
                  <div className="w-full">
                    <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Occupancy</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={heroAdults}
                        onChange={(e) => setHeroAdults(Math.max(1, Number(e.target.value) || 1))}
                        className="w-12 bg-transparent text-xs font-semibold text-gray-800 dark:text-white outline-none"
                        aria-label="Adults"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">adults</span>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        value={heroKids}
                        onChange={(e) => setHeroKids(Math.max(0, Number(e.target.value) || 0))}
                        className="w-12 bg-transparent text-xs font-semibold text-gray-800 dark:text-white outline-none"
                        aria-label="Kids"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">kids</span>
                    </div>
                  </div>
                </div>

              </div>

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
              View All Hotel <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="relative group/slider">
          {!showAllHotels && totalHotels > ITEMS_PER_VIEW && (
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
                      onError={(e) => { e.currentTarget.src = '/images/sobel.png'; }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 flex items-center gap-1 border border-white/10 text-white rounded-md">
                      <span className="text-[11px] font-bold">{Number(hotel.avgRating || 0).toFixed(1)}</span>
                      <span className="text-[10px] text-emerald-300">★</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-base font-medium text-[#111C18] dark:text-white group-hover:text-[#1F6F5F] dark:group-hover:text-[#6FCF97] transition-colors leading-snug">
                      {hotel.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-2 flex items-center gap-1">
                      <MapPin size={12} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" /> <span className="truncate">{hotel.location}</span>
                    </p>
                    <p className="mt-3 line-clamp-2 min-h-8 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                      {hotel.description || "Comfortable rooms and a relaxing stay await you."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
                      {hotel.availableToday != null ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <BedDouble size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
                          {hotel.availableToday} rooms available today
                        </span>
                      ) : null}
                      {hotel.bookingsToday != null ? (
                        <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                          <CalendarCheck size={13} className="text-[#1F6F5F] dark:text-[#2FA084]" />
                          Booked {hotel.bookingsToday} {hotel.bookingsToday === 1 ? "time" : "times"} today
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {hotel.reviewCount} {hotel.reviewCount === 1 ? "review" : "reviews"}
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

      {/* ROOMS SECTION */}
      {hotelCards.length > 0 && (
        <section id="rooms" className="py-16 px-6 max-w-7xl mx-auto border-t border-emerald-950/10 dark:border-white/10 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-light text-[#111C18] dark:text-white mt-1">Rooms</h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => navigate("/vision-suites?viewMode=room")}
                className="text-xs font-medium text-[#1F6F5F] dark:text-[#6FCF97] hover:underline flex items-center gap-1.5"
              >
                View All Room <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="relative group/slider">
            {!showAllRooms && totalRooms > ITEMS_PER_VIEW && (
              <>
                <button
                  type="button"
                  onClick={handlePrevRooms}
                  className="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl transition-transform duration-200 hover:scale-110 active:scale-95 border border-gray-100 dark:border-transparent"
                  aria-label="Previous Rooms"
                >
                  <ChevronLeft size={22} className="stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={handleNextRooms}
                  className="absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-xl transition-transform duration-200 hover:scale-110 active:scale-95 border border-gray-100 dark:border-transparent"
                  aria-label="Next Rooms"
                >
                  <ChevronRight size={22} className="stroke-[2.5]" />
                </button>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleRooms.map((hotel, idx) => (
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
                      <RoomDiscountBadge
                        discountType={hotel.ownerDiscountType}
                        discountValue={hotel.ownerDiscountValue}
                        className="absolute top-3 left-3"
                      />
                      <div className="absolute bottom-3 left-3 bg-black/65 backdrop-blur-sm px-2 py-1 flex items-center gap-1 border border-white/10 text-white rounded-md">
                        <span className="text-[11px] font-bold">{Number(hotel.avgRating || 0).toFixed(1)}</span>
                        <span className="text-[10px] text-emerald-300">★</span>
                      </div>
                    </div>

                    <div className="p-5">
                      {/* Hotel Name Tag para malaman ng guest kung saang hotel galing ang room */}
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#1F6F5F] dark:text-[#6FCF97] uppercase tracking-wider mb-1">
                        <Building size={12} className="shrink-0" />
                        <span className="truncate">{hotel.hotelName || "Sobel Hotel"}</span>
                      </div>

                      <h3 className="text-base font-medium text-[#111C18] dark:text-white">
                        {hotel.name}
                      </h3>

                      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase block mt-0.5">
                        Capacity: {hotel.forecast}
                      </span>

                      {/* Room Description */}
                      <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        {hotel.description || "No room description provided."}
                      </p>

                      <p className="mt-3 text-xs font-semibold text-[#1F6F5F] dark:text-[#6FCF97]">
                        {hotel.price ? `PHP ${Number(hotel.price).toLocaleString()} / ${hotel.priceDurationHours} hours` : "Hourly rate not configured"}
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
          </div>
        </section>
      )}

    </main>
  );
}