import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Users,
  Wifi,
  Waves,
  Utensils,
  CalendarDays,
  Star,
  X,
  ScanEye,
  ThumbsUp,
  User,
  Maximize2,
  Navigation,
} from "lucide-react";
import Marzipano from "marzipano";
import resolveImg from "../utils/resolveImg";
import NeighborhoodMap from "../components/NeighborhoodMap";

const FALLBACKS = [
  "/images/deluxe-room.jpg",
  "/images/single-room.jpg",
  "/images/standard-room.jpg",
  "/images/ocean-suite.jpg",
];

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((i) => i.trim()).filter(Boolean);
  return [];
};

const maskUsername = (name) => {
  if (!name) return "g*****t";
  const str = String(name).trim();
  if (str.length <= 2) return str[0] + "*";
  return str[0] + "*".repeat(Math.min(str.length - 2, 5)) + str[str.length - 1];
};

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [helpfulCounts, setHelpfulCounts] = useState({});

  // 360 tour state
  const [tourOpen, setTourOpen] = useState(false);
  const [tourLoading, setTourLoading] = useState(false);
  const [tourData, setTourData] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourNotice, setTourNotice] = useState("");
  const panoRef = useRef(null);
  const viewerRef = useRef(null);

  // Map modal and routing states
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [routeMode, setRouteMode] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    setImgError(false);

    fetch("/api/rooms")
      .then((r) => r.json())
      .then((payload) => {
        if (!mounted) return;
        const rooms = Array.isArray(payload?.rooms) ? payload.rooms : Array.isArray(payload) ? payload : [];
        const found = rooms.find((item) => String(item.id) === String(id));
        if (!found) throw new Error("Room not found.");
        setRoom(found);
      })
      .catch((err) => { if (mounted) setError(err?.message || "Unable to load room."); })
      .finally(() => { if (mounted) setLoading(false); });

    fetch("/api/reviews")
      .then((r) => r.json())
      .then((data) => { if (mounted) setReviews(data.reviews || []); })
      .catch(() => {});

    return () => { mounted = false; };
  }, [id]);

  const amenities = useMemo(() => {
    const parsed = toList(room?.amenities).map((item) => String(item).toLowerCase());
    return {
      wifi: parsed.some((item) => item.includes("wifi")),
      pool: parsed.some((item) => item.includes("pool")),
      dining: parsed.some((item) => item.includes("dining") || item.includes("breakfast")),
      list: parsed.length ? parsed : ["smart controls", "premium comfort", "24/7 support"],
    };
  }, [room]);

  const roomImg = useMemo(() => {
    const raw = Array.isArray(room?.images) ? room.images.filter(Boolean) : [];
    const first = raw[0] || room?.imageUrl || room?.image_url || "";
    return first ? resolveImg(first) : FALLBACKS[0];
  }, [room]);

  const currentImg = imgError ? FALLBACKS[0] : roomImg;

  const roomReviews = useMemo(() => {
    if (!room || !reviews.length) return [];
    const roomName = room.roomName || room.name || "";
    const hotelName = room.location_description || "";
    return reviews.filter((rev) => {
      if (rev.roomId && String(rev.roomId) === String(room.id)) return true;
      if (rev.roomId == null) {
        return (
          (roomName && rev.roomName?.toLowerCase().includes(roomName.toLowerCase())) ||
          (hotelName && rev.hotelName?.toLowerCase().includes(hotelName.toLowerCase())) ||
          (hotelName && rev.roomName?.toLowerCase().includes(hotelName.toLowerCase()))
        );
      }
      return false;
    });
  }, [room, reviews]);

  const reviewStats = useMemo(() => {
    if (!roomReviews.length) return { average: 5.0, count: 0, countsByStar: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    const countsByStar = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    roomReviews.forEach((rev) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5)));
      countsByStar[r] = (countsByStar[r] || 0) + 1;
      sum += Number(rev.rating) || 5;
    });
    return {
      average: (sum / roomReviews.length).toFixed(1),
      count: roomReviews.length,
      countsByStar,
    };
  }, [roomReviews]);

  const filteredReviews = useMemo(() => {
    if (activeFilter === "All") return roomReviews;
    if (activeFilter.includes("Star")) {
      const targetStar = parseInt(activeFilter);
      return roomReviews.filter((r) => Math.round(Number(r.rating) || 5) === targetStar);
    }
    return roomReviews;
  }, [roomReviews, activeFilter]);

  const toggleHelpful = (revId) => {
    setHelpfulCounts((prev) => ({
      ...prev,
      [revId]: {
        count: (prev[revId]?.count || 0) + (prev[revId]?.active ? -1 : 1),
        active: !prev[revId]?.active,
      },
    }));
  };

  const openTour = async () => {
    setTourOpen(true);
    setTourActive(false);
    setTourData(null);
    setTourNotice("");
    setTourLoading(true);
    try {
      const res = await fetch(`/api/rooms/${id}/tour`);
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.tour) {
        setTourData(payload.tour);
      } else {
        setTourNotice("No 360° tour configured for this room yet.");
      }
    } catch {
      setTourNotice("Could not load tour data.");
    } finally {
      setTourLoading(false);
    }
  };

  const closeTour = () => {
    setTourOpen(false);
    setTourActive(false);
    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch {}
      viewerRef.current = null;
    }
  };

  // Handler to fetch user location and compute/open navigation directions to the hotel
  const handleGetDirections = () => {
    setRouteLoading(true);
    setRouteError("");
    if (!navigator.geolocation) {
      setRouteError("Geolocation is not supported by your browser.");
      setRouteLoading(false);
      setMapModalOpen(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoords(coords);
        setRouteLoading(false);
        setRouteMode(true);
        setMapModalOpen(true);
      },
      (err) => {
        console.warn("Geolocation warning:", err.message);
        setRouteError("Unable to retrieve your location. Please check permissions.");
        setRouteLoading(false);
        setMapModalOpen(true);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!tourActive || !tourData || !panoRef.current) return;
    let isCleanedUp = false;
    
    try {
      panoRef.current.innerHTML = "";
      const viewer = new Marzipano.Viewer(panoRef.current, { controls: { mouseViewMode: "drag" } });
      viewerRef.current = viewer;
      
      const source = Marzipano.ImageUrlSource.fromString(tourData.panoramaUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
      const view = new Marzipano.RectilinearView(
        { 
          yaw: Number(tourData.initialYaw || 0), 
          pitch: Number(tourData.initialPitch || 0), 
          fov: Number(tourData.initialFov || Math.PI / 2) 
        },
        limiter
      );

      if (!isCleanedUp) {
        viewer.createScene({ source, geometry, view, pinFirstLevel: true }).switchTo();
      }
    } catch {
      setTourNotice("Unable to initialize 360° viewer.");
      setTourActive(false);
    }

    return () => {
      isCleanedUp = true;
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [tourActive, tourData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1F6F5F] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] px-6 py-20 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{error || "Room unavailable."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-5 py-2 rounded-lg bg-[#1F6F5F] text-white text-xs font-medium hover:bg-[#2FA084] transition-colors"
        >
          Return to Home
        </button>
      </main>
    );
  }

  const guestCount = Number(room.maxAdults || 0) + Number(room.maxChildren || 0) || 2;
  const price = Number(room.base_price_php || room.price_per_night || room.price || 0);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* COMPACT BREADCRUMB */}
        <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-[#1F6F5F] dark:text-[#2FA084] font-medium hover:underline"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span>/</span>
          <Link to="/" className="hover:text-[#1F6F5F] transition-colors">Home</Link>
          <span>/</span>
          <span className="truncate max-w-[220px] text-slate-700 dark:text-zinc-200 font-medium">
            {room.roomName || room.name || "Room Detail"}
          </span>
        </nav>

        {/* TOP SECTION: IMAGE & BOOKING SUMMARY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          
          {/* IMAGE CONTAINER */}
          <div className="lg:col-span-7">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#0f1a17] h-[340px] shadow-sm">
              <img
                src={currentImg}
                alt={room.roomName || "Room"}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
              <button
                onClick={openTour}
                className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/75 hover:bg-[#1F6F5F] text-white backdrop-blur-md rounded-md px-3 py-1.5 text-xs font-medium transition-all shadow"
              >
                <ScanEye size={14} />
                <span>360° Virtual Tour</span>
              </button>
            </div>
          </div>

          {/* ROOM SPECIFICATIONS CARD */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-wider text-[#1F6F5F] dark:text-[#2FA084] uppercase">
                  {room.roomType || "Executive Suite"}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                  {String(room.status || "Available").toUpperCase()}
                </span>
              </div>
              
              <h1 className="text-xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">
                {room.roomName || room.name || "Innova Room"}
              </h1>
              
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-4 line-clamp-3">
                {room.description || "Designed for ultimate corporate or leisure comfort with high-end fixtures and smart integration."}
              </p>

              <div className="space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-3 mb-4 text-xs text-slate-600 dark:text-zinc-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MapPin size={14} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                    <span className="truncate">{room.location_description || "Innova Smart Hotel Main Property"}</span>
                  </div>
                  {/* SHARE / DIRECTIONS BUTTON */}
                  <button
                    onClick={handleGetDirections}
                    disabled={routeLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F6F5F] dark:text-[#2FA084] hover:underline shrink-0"
                    title="Share location and view route from your position"
                  >
                    <Navigation size={12} /> {routeLoading ? "Locating..." : "Get Directions"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                  <span>Maximum Capacity: {Math.max(guestCount, 1)} Guests</span>
                </div>
              </div>

              {/* AMENITIES BADGES */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {amenities.list.slice(0, 4).map((item, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-zinc-300 capitalize"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* PRICING & ACTION */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                  PHP {price.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Per Night</div>
              </div>
              <button
                onClick={() => navigate(`/booking?roomId=${room.id}`)}
                className="px-4 py-2 rounded-lg bg-[#1F6F5F] hover:bg-[#2FA084] text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Book Room
              </button>
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: REVIEWS & INTERACTIVE MAP SIDE-BY-SIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* REVIEWS SECTION (~7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col">
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Guest Reviews & Ratings</h2>
              <div className="flex items-center gap-1.5">
                <Star size={14} fill="#1F6F5F" className="text-[#1F6F5F] dark:text-[#2FA084]" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">{reviewStats.average}</span>
                <span className="text-[11px] text-slate-400">({reviewStats.count})</span>
              </div>
            </div>

            {/* COMPACT FILTER CHIPS */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["All", "5 Star", "4 Star", "3 Star", "2 Star", "1 Star"].map((filter) => {
                let label = filter;
                if (filter === "All") label = `All (${reviewStats.count})`;
                else if (filter.includes("Star")) {
                  const starNum = parseInt(filter);
                  label = `${filter} (${reviewStats.countsByStar[starNum] || 0})`;
                }
                const isSelected = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-all ${
                      isSelected
                        ? "border-[#1F6F5F] text-[#1F6F5F] bg-emerald-50/40 dark:bg-[#1F6F5F]/20 dark:text-[#2FA084] dark:border-[#2FA084]"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* REVIEWS LIST */}
            <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 space-y-4 divide-y divide-slate-100 dark:divide-white/5">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((rev) => {
                  const nameInitial = rev.guestName ? rev.guestName[0].toUpperCase() : "G";
                  const displayUsername = maskUsername(rev.guestName);
                  const reviewDate = rev.createdAt
                    ? new Date(rev.createdAt).toISOString().replace("T", " ").substring(0, 10)
                    : "2026-04-12";
                  const currentHelpful = helpfulCounts[rev.id] || { count: 0, active: false };

                  return (
                    <div key={rev.id} className="pt-3 first:pt-0">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0 text-slate-600 dark:text-zinc-300 text-[11px] font-semibold">
                          {nameInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{displayUsername}</span>
                            <span className="text-[10px] text-slate-400">{reviewDate}</span>
                          </div>

                          <div className="flex gap-0.5 my-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={11}
                                fill={s <= (rev.rating || 5) ? "#1F6F5F" : "transparent"}
                                className={s <= (rev.rating || 5) ? "text-[#1F6F5F] dark:text-[#2FA084]" : "text-slate-300 dark:text-zinc-700"}
                              />
                            ))}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-2">
                            {rev.comment || "Clean facilities, excellent accommodation experience."}
                          </p>

                          <button
                            onClick={() => toggleHelpful(rev.id)}
                            className={`inline-flex items-center gap-1 text-[11px] transition-colors ${
                              currentHelpful.active
                                ? "text-[#1F6F5F] dark:text-[#2FA084] font-semibold"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            <ThumbsUp size={11} />
                            <span>Helpful {currentHelpful.count > 0 && `(${currentHelpful.count})`}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No reviews available for this filter.
                </div>
              )}
            </div>

          </div>

          {/* INTERACTIVE MAP CONTAINER (~5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MapPin size={14} className="text-[#1F6F5F] dark:text-[#2FA084]" />
                Location & Directions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGetDirections}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F6F5F] dark:text-[#2FA084] hover:underline"
                >
                  <Navigation size={12} /> Route
                </button>
                <button
                  onClick={() => { setRouteMode(false); setMapModalOpen(true); }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:underline"
                  title="Expand map view"
                >
                  <Maximize2 size={12} /> Expand
                </button>
              </div>
            </div>

            {/* Map Preview Box */}
            <div 
              onClick={() => { setRouteMode(false); setMapModalOpen(true); }}
              className="relative flex-1 min-h-[260px] rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 cursor-pointer group bg-slate-100 dark:bg-zinc-900"
            >
              <div className="absolute inset-0 pointer-events-none">
                <NeighborhoodMap
                  hotels={[{
                    id: room.id || 1,
                    name: room.roomName || room.name || "Innova Suite",
                    lat: room.lat || 14.5995,
                    lng: room.lng || 120.9842,
                    address: room.location_description || "Hotel Location",
                  }]}
                  landmarks={[]}
                  hotelCenter={{ lat: room.lat || 14.5995, lng: room.lng || 120.9842 }}
                  focusedHotelId={room.id}
                  isDarkMode={false}
                />
              </div>
              
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-black/75 text-white text-[11px] font-medium px-3 py-1.5 rounded-md backdrop-blur-sm shadow">
                  Click to Expand Map & Directions
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 360 TOUR MODAL */}
      {tourOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-4 py-3 bg-zinc-950 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[#2FA084] text-[10px] font-bold uppercase tracking-wider">Virtual Inspection</p>
                <h3 className="text-white text-sm font-bold">{room.roomName || room.name}</h3>
              </div>
              <button
                onClick={closeTour}
                className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative w-full h-[500px] bg-black">
              <div ref={panoRef} className="absolute inset-0" />

              {tourLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
                  <div className="w-6 h-6 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!tourLoading && !tourData && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-900 text-center px-4">
                  <ScanEye size={28} className="text-white/20" />
                  <p className="text-white/70 text-xs font-medium">No 360° tour data available for this room.</p>
                  <p className="text-white/40 text-[11px]">{tourNotice}</p>
                </div>
              )}

              {!tourLoading && tourData && !tourActive && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/60">
                  <ScanEye size={28} className="text-[#2FA084]" />
                  <p className="text-white/80 text-xs font-medium">Panorama Ready</p>
                  <button
                    onClick={() => setTourActive(true)}
                    className="px-5 py-2 rounded-lg bg-[#1F6F5F] hover:bg-[#2FA084] text-white text-xs font-medium transition-colors shadow"
                  >
                    Launch 360° View
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-zinc-950 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={closeTour}
                className="px-3 py-1.5 rounded border border-white/10 text-white text-xs hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { closeTour(); navigate(`/booking?roomId=${room.id}`); }}
                className="px-4 py-1.5 rounded bg-[#1F6F5F] text-white text-xs font-medium hover:bg-[#2FA084] transition-colors"
              >
                Book This Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED INTERACTIVE MAP & ROUTING MODAL */}
      {mapModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#13221e] border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F6F5F] dark:text-[#2FA084]">
                  {routeMode ? "Route from Your Location" : "Geographic Overview"}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {routeMode ? `Directions to ${room.roomName || room.name}` : (room.location_description || "Property Neighborhood")}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRouteMode(!routeMode)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    routeMode 
                      ? "bg-[#1F6F5F] text-white border-[#1F6F5F]" 
                      : "border-slate-300 dark:border-white/20 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Navigation size={12} /> {routeMode ? "Showing Route" : "Show Route from My Location"}
                </button>
                <button
                  onClick={() => setMapModalOpen(false)}
                  className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {routeError && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>{routeError}</span>
                <button onClick={() => setRouteError("")} className="font-bold">&times;</button>
              </div>
            )}

            <div className="flex-1 relative w-full h-full">
              <NeighborhoodMap
                hotels={[{
                  id: room.id || 1,
                  name: room.roomName || room.name || "Innova Suite",
                  lat: room.lat || 14.5995,
                  lng: room.lng || 120.9842,
                  address: room.location_description || "Hotel Location",
                }]}
                landmarks={[]}
                hotelCenter={{ lat: room.lat || 14.5995, lng: room.lng || 120.9842 }}
                focusedHotelId={room.id}
                userLocation={routeMode ? userCoords : null}
                isDarkMode={false}
              />
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-[#13221e] border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>{routeMode && userCoords ? "Displaying route from your GPS coordinates to hotel." : "Click 'Show Route from My Location' to trace path."}</span>
              <button
                onClick={() => setMapModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-200 font-medium hover:bg-slate-300 transition-colors"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}