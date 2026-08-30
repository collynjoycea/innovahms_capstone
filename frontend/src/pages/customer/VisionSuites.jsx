import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Calendar,
  Hotel,
  MapPin,
  MessageCircle,
  RotateCcw,
  ScanEye,
  Search,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Marzipano from "marzipano";
import resolveImg from "../../utils/resolveImg";
import { extractCustomerSession } from "../../customer/customerHelpers";

const php = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const friendlyDate = (value) => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

const getRoomPreviewImage = (value, fallback = null) => {
  const rawImage =
    value?.previewUrl ||
    value?.imageUrl ||
    value?.image_url ||
    value?.image ||
    (Array.isArray(value?.images) ? value.images.find(Boolean) : value?.images) ||
    value?.panoramaUrl ||
    "";

  return rawImage ? resolveImg(rawImage, fallback) : fallback;
};

function TourModal({ open, onClose, onReserve, roomName, tour, loading, notice }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [tourActive, setTourActive] = useState(false);
  const [viewerError, setViewerError] = useState("");

  const panoramaUrl = tour?.panoramaUrl ? resolveImg(tour.panoramaUrl, null) : null;
  const previewUrl = getRoomPreviewImage(tour, null);
  const hasTour = Boolean(panoramaUrl);

  useEffect(() => {
    if (!open) {
      setTourActive(false);
      setViewerError("");
      try { viewerRef.current?.destroy?.(); } catch {}
      viewerRef.current = null;
      return;
    }

    setTourActive(false);
    setViewerError("");
  }, [open, panoramaUrl]);

  useEffect(() => {
    if (!open) return;
    if (!tourActive) return;
    if (!containerRef.current) return;
    if (!panoramaUrl) return;

    try {
      containerRef.current.innerHTML = "";
      const viewer = new Marzipano.Viewer(containerRef.current, { controls: { mouseViewMode: "drag" } });
      viewerRef.current = viewer;

      const source = Marzipano.ImageUrlSource.fromString(panoramaUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
      const view = new Marzipano.RectilinearView(
        { yaw: tour.initialYaw ?? 0, pitch: tour.initialPitch ?? 0, fov: tour.initialFov ?? Math.PI / 2 },
        limiter
      );

      const scene = viewer.createScene({ source, geometry, view });
      scene.switchTo({ transitionDuration: 350 });
    } catch (error) {
      console.error("VisionSuites Marzipano init failed:", error);
      setViewerError("Unable to initialize the 360 tour viewer.");
      setTourActive(false);
    }

    return () => {
      try { viewerRef.current?.destroy?.(); } catch { }
      viewerRef.current = null;
    };
  }, [open, panoramaUrl, tour, tourActive]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#2FA084]">360° Virtual Tour</p>
            <h3 className="text-2xl font-black text-white">{roomName || "Vision Suite"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center border border-[#1F6F5F]/40 bg-[#1F6F5F]/20 text-white backdrop-blur-md transition-all hover:bg-[#1F6F5F]"
            aria-label="Close tour"
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative overflow-hidden border border-[#1F6F5F]/40 bg-zinc-900 shadow-2xl" style={{ height: "68vh" }}>
          <div ref={containerRef} className="absolute inset-0" />

          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
              <div className="h-8 w-8 rounded-full border-2 border-[#2FA084] border-t-transparent animate-spin" />
            </div>
          ) : null}

          {!loading && !previewUrl ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-900 px-6 text-center">
              <ScanEye size={40} className="text-[#2FA084]/40" />
              <p className="text-sm font-bold text-white/70">No 360° tour configured for this room yet.</p>
              <p className="text-xs text-white/35">{notice || "Add a panorama image to enable the immersive viewer."}</p>
            </div>
          ) : null}

          {!loading && previewUrl && !tourActive ? (
            <div className="absolute inset-0 z-10">
              <img src={previewUrl} alt={roomName || "Room preview"} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center">
                <ScanEye size={36} className="text-[#2FA084]" />
                <p className="text-xs font-bold uppercase tracking-widest text-[#2FA084]">360° panorama ready</p>
                <p className="max-w-md text-sm text-white/60">
                  Drag to look around once the viewer starts.
                </p>
                {hasTour ? (
                  <button
                    type="button"
                    onClick={() => setTourActive(true)}
                    className="bg-[#1F6F5F] hover:bg-[#288B77] px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-2xl transition-colors"
                  >
                    Start 360°
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && viewerError ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 px-6 text-center">
              <ScanEye size={36} className="text-red-400" />
              <p className="text-sm font-bold text-white/75">{viewerError}</p>
              <p className="text-xs text-white/35">{notice || "Check the uploaded panorama path and try again."}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#1F6F5F]/40 px-5 py-3 text-xs font-black uppercase tracking-widest text-[#2FA084] transition-colors hover:bg-[#1F6F5F]/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReserve}
            className="bg-[#1F6F5F] hover:bg-[#288B77] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors"
          >
            Reserve This Room
          </button>
          <button
            type="button"
            onClick={() => {
              if (hasTour) setTourActive((active) => !active);
            }}
            disabled={!hasTour}
            className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
              hasTour
                ? tourActive
                  ? "bg-white text-black"
                  : "border border-[#1F6F5F]/40 bg-[#1F6F5F]/20 text-[#2FA084] hover:bg-[#1F6F5F]/40"
                : "cursor-not-allowed border border-white/10 bg-white/5 text-white/30"
            }`}
          >
            {hasTour ? (tourActive ? "Close 360" : "Start 360") : "Preview Only"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VisionSuites() {
  const PAGE_SIZE = 6;
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionUser, setSessionUser] = useState(null);

  const [hotel, setHotel] = useState(null);
  const [locationLabel, setLocationLabel] = useState("Hotel Location");
  const [searchContext, setSearchContext] = useState({
    from: "",
    to: "",
    guests: "",
    view: "All",
    hasFilters: false,
  });

  const [rooms, setRooms] = useState([]);
  const [hotelSearch, setHotelSearch] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("all");
  const [selectedRating, setSelectedRating] = useState("all");
  const [sortMode, setSortMode] = useState("recommended");
  const [filterCheckIn, setFilterCheckIn] = useState("");
  const [filterCheckOut, setFilterCheckOut] = useState("");
  const [filterGuests, setFilterGuests] = useState("");
  const [visibleItemCount, setVisibleItemCount] = useState(PAGE_SIZE);
  const [landmarks, setLandmarks] = useState([]);
  const [nearbyHotels, setNearbyHotels] = useState([]);
  const [homeHotels, setHomeHotels] = useState([]);
  const [activeTab, setActiveTab] = useState("Overnight Stays");
  const [viewMode, setViewMode] = useState("hotel");

  const [tourOpen, setTourOpen] = useState(false);
  const [tourRoom, setTourRoom] = useState(null);
  const [tourData, setTourData] = useState(null);
  const [tourLoading, setTourLoading] = useState(false);
  const [tourNotice, setTourNotice] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      from: "bot",
      text: "Greetings. I can assist you with room availability, virtual tours, and local landmarks.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const validateDateRange = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return true;
    if (new Date(`${checkOut}T00:00:00`) <= new Date(`${checkIn}T00:00:00`)) {
      setError("Check-out date must be after the check-in date.");
      return false;
    }
    setError("");
    return true;
  };

  const loadVision = async (query = {}) => {
    setLoading(true);
    setError("");
    try {
      const from = query.from || "";
      const to = query.to || "";
      if (!validateDateRange(from, to)) {
        setLoading(false);
        return;
      }

      const qs = new URLSearchParams(query).toString();
      const suffix = qs ? `?${qs}` : "";

      const [hotelRes, roomsRes, lmRes, nearbyHotelsRes] = await Promise.all([
        fetch(`/api/vision/hotel${suffix}`),
        fetch(`/api/vision/rooms${suffix}`),
        fetch(`/api/vision/landmarks${suffix}`),
        fetch(`/api/vision/nearby-hotels${suffix}`),
      ]);

      const hotelPayload = await hotelRes.json().catch(() => ({}));
      const roomsPayload = await roomsRes.json().catch(() => ({}));
      const lmPayload = await lmRes.json().catch(() => ({}));
      const nearbyHotelsPayload = await nearbyHotelsRes.json().catch(() => ({}));

      if (!hotelRes.ok) throw new Error(hotelPayload?.error || `Hotel load failed (HTTP ${hotelRes.status})`);
      if (!roomsRes.ok) throw new Error(roomsPayload?.error || `Rooms load failed (HTTP ${roomsRes.status})`);
      if (!lmRes.ok) throw new Error(lmPayload?.error || `Landmarks load failed (HTTP ${lmRes.status})`);
      if (!nearbyHotelsRes.ok) throw new Error(nearbyHotelsPayload?.error || `Nearby hotels load failed (HTTP ${nearbyHotelsRes.status})`);

      setHotel(hotelPayload.hotel);
      setLocationLabel(hotelPayload.hotel?.locationLabel || "Hotel Location");
      setRooms(roomsPayload.rooms || []);
      setLandmarks(lmPayload.landmarks || []);
      setNearbyHotels(nearbyHotelsPayload.hotels || []);
    } catch (e) {
      setError(e?.message || "Failed to load Vision Suites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const from = params.get("from") || params.get("checkIn") || "";
    const to = params.get("to") || params.get("checkOut") || "";
    const guests = params.get("guests") || "";
    const requestedView = params.get("view") || params.get("roomType") || "";
    const hotelId = params.get("hotel_id") || "";
    const selectedViewMode = params.get("viewMode") || params.get("mode") || "hotel";

    setViewMode(selectedViewMode === "room" ? "room" : "hotel");

    const query = {};
    if (from) query.from = from;
    if (to) query.to = to;
    if (hotelId) query.hotel_id = hotelId;
    if (requestedView && requestedView.toLowerCase() !== "any") {
      query.view = requestedView;
    }

    setSearchContext({
      from,
      to,
      guests,
      view: query.view || "All",
      hasFilters: Boolean(from || to || guests || query.view || hotelId),
      hotelId,
    });
    if (from) setFilterCheckIn(from);
    if (to) setFilterCheckOut(to);
    if (guests) setFilterGuests(guests);
    setHotelSearch("");
    setSelectedRoomType("all");
    setSelectedRating("all");
    setSortMode("recommended");
    setVisibleItemCount(PAGE_SIZE);

    loadVision(query);
  }, [location.search]);

  useEffect(() => {
    setSessionUser(extractCustomerSession());

    const loadHomeHotels = async () => {
      try {
        const res = await fetch("/api/home/hotels");
        const payload = await res.json().catch(() => ({}));
        const hotels = Array.isArray(payload?.hotels) ? payload.hotels : [];
        setHomeHotels(hotels);
      } catch (error) {
        console.error("Failed to load home hotels:", error);
        setHomeHotels([]);
      }
    };

    loadHomeHotels();
  }, []);

  useEffect(() => {
    if (!location.hash) return;

    const sectionId = location.hash.replace("#", "");
    const timer = window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - 112;
      window.scrollTo({ top: Math.max(0, top) });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [location.hash, loading]);

  const openTour = async (room) => {
    const roomPreview =
      room?.imageUrl ||
      room?.image_url ||
      room?.image ||
      (Array.isArray(room?.images) ? room.images.find(Boolean) : room?.images) ||
      null;
    const fallbackTour = roomPreview
      ? {
          roomId: room.id,
          panoramaUrl: roomPreview,
          previewUrl: roomPreview,
          initialYaw: 0,
          initialPitch: 0,
          initialFov: Math.PI / 2,
          isInteractive: false,
        }
      : null;

    setTourRoom(room);
    setTourData(fallbackTour);
    setTourNotice("");
    setTourOpen(true);
    setTourLoading(true);
    try {
      const res = await fetch(`/api/vision/rooms/${room.id}/tour`);
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.tour) {
        setTourData({
          ...fallbackTour,
          ...payload.tour,
          previewUrl: payload.tour.previewUrl || fallbackTour?.previewUrl || null,
          panoramaUrl: payload.tour.panoramaUrl || fallbackTour?.panoramaUrl || null,
        });
      } else {
        setTourData(fallbackTour);
        setTourNotice(payload?.error || "No 360° tour configured for this room yet.");
      }
    } catch (error) {
      setTourData(fallbackTour);
      setTourNotice(error?.message || "Could not load tour data.");
    } finally {
      setTourLoading(false);
    }
  };

  const closeTour = () => {
    setTourOpen(false);
    setTourRoom(null);
    setTourData(null);
    setTourLoading(false);
    setTourNotice("");
  };

  const handleChatSubmit = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, from: "user", text: message }]);
    setChatInput("");

    try {
      setChatLoading(true);
      const response = await fetch("/api/chatbot/rasa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "vision-suites",
          customer_id: sessionUser?.id || null,
          message,
          context_path: "/vision-suites",
          hotel_id: searchContext.hotelId || hotel?.id || null,
          from: filterCheckIn || searchContext.from || "",
          to: filterCheckOut || searchContext.to || "",
          guests: filterGuests || searchContext.guests || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Assistant unavailable.");

      const replies = Array.isArray(payload.messages) ? payload.messages : [];
      setChatMessages((prev) => [
        ...prev,
        ...(replies.length
          ? replies.map((text, index) => ({ id: `b-${Date.now()}-${index}`, from: "bot", text }))
          : [{ id: `b-${Date.now()}`, from: "bot", text: "No reply from assistant." }]),
      ]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { id: `e-${Date.now()}`, from: "bot", text: error.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const roomTypeOptions = useMemo(
    () => Array.from(new Set((rooms || []).map((room) => room.type).filter(Boolean))),
    [rooms]
  );

  const displayHotels = useMemo(() => {
    let list = [];
    if (homeHotels.length) list = homeHotels;
    else if (nearbyHotels.length) list = nearbyHotels;
    else if (hotel) list = [hotel];

    const query = hotelSearch.trim().toLowerCase();
    if (!query) return list;

    return list.filter((h) => 
      String(h.name || "").toLowerCase().includes(query) ||
      String(h.location || h.locationLabel || h.address || "").toLowerCase().includes(query)
    );
  }, [homeHotels, nearbyHotels, hotel, hotelSearch]);

  const filteredRooms = useMemo(() => {
    const query = hotelSearch.trim().toLowerCase();
    const next = (rooms || []).filter((room) => {
      const matchRoomType = selectedRoomType === "all" || String(room.type || "").toLowerCase() === String(selectedRoomType).toLowerCase();
      const matchSearch =
        !query ||
        String(room.hotelName || "").toLowerCase().includes(query) ||
        String(room.name || "").toLowerCase().includes(query) ||
        String(room.type || "").toLowerCase().includes(query);

      let matchRating = true;
      if (selectedRating !== "all") {
        const ratingNum = Number(selectedRating);
        const roomRating = room.rating || 5;
        matchRating = Math.floor(roomRating) === ratingNum;
      }

      return matchRoomType && matchSearch && matchRating;
    });

    if (sortMode === "price-asc") {
      next.sort((a, b) => Number(a.basePricePhp || 0) - Number(b.basePricePhp || 0));
    } else if (sortMode === "price-desc") {
      next.sort((a, b) => Number(b.basePricePhp || 0) - Number(a.basePricePhp || 0));
    } else if (sortMode === "capacity") {
      next.sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
    }

    return next;
  }, [rooms, hotelSearch, selectedRoomType, selectedRating, sortMode]);

  const handleSearchRoomsSubmit = () => {
    if (!validateDateRange(filterCheckIn, filterCheckOut)) {
      return;
    }

    const query = {};
    if (filterCheckIn) query.from = filterCheckIn;
    if (filterCheckOut) query.to = filterCheckOut;
    if (filterGuests) query.guests = filterGuests;
    if (selectedRoomType !== "all") query.view = selectedRoomType;
    loadVision(query);
  };

  const clearCollectionFilters = () => {
    setHotelSearch("");
    setSelectedRoomType("all");
    setSelectedRating("all");
    setSortMode("recommended");
    setFilterCheckIn("");
    setFilterCheckOut("");
    setFilterGuests("");
    setVisibleItemCount(PAGE_SIZE);
  };

  useEffect(() => {
    setVisibleItemCount(PAGE_SIZE);
  }, [hotelSearch, selectedRoomType, selectedRating, sortMode, filterCheckIn, filterCheckOut, filterGuests, viewMode]);

  const currentList = viewMode === "hotel" ? displayHotels : filteredRooms;

  const paginatedList = useMemo(() => {
    return currentList.slice(0, visibleItemCount);
  }, [currentList, visibleItemCount]);

  const hasMoreItems = visibleItemCount < currentList.length;

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0b120e] text-[#1a160d] dark:text-[#d1eae0] transition-colors duration-300">
      <TourModal
        open={tourOpen}
        onClose={closeTour}
        onReserve={() => {
          const roomId = tourRoom?.id;
          closeTour();
          if (roomId) navigate(`/booking?roomId=${roomId}`);
        }}
        roomName={tourRoom?.name}
        tour={tourData}
        loading={tourLoading}
        notice={tourNotice}
      />

      <button
        type="button"
        onClick={() => setChatOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-[50] h-14 w-14 rounded-xl border border-[#1F6F5F]/20 bg-white/95 text-[#1F6F5F] shadow-2xl shadow-slate-900/10 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-slate-50"
        title="AI Guest Assistant"
      >
        <MessageCircle size={22} />
      </button>

      {chatOpen ? (
        <div className="fixed right-6 bottom-24 z-[50] w-[320px] bg-white dark:bg-[#111c16] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden rounded-xl">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#111c16]">
            <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Concierge AI Assistant</p>
            <button type="button" onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-[#1F6F5F]">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-4 space-y-3 bg-white dark:bg-[#111c16]">
            {chatMessages.slice(-6).map((message) => (
              <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 text-sm ${message.from === "user" ? "bg-[#1F6F5F] text-white font-medium" : "bg-white dark:bg-[#14231b] border border-[#1F6F5F]/20 text-slate-700 dark:text-[#bcefd7]"}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {chatLoading ? (
              <div className="text-xs font-semibold text-[#1F6F5F]">Concierge is typing...</div>
            ) : null}
          </div>
          <div className="p-3 border-t border-[#1F6F5F]/20 flex items-center gap-2 bg-white dark:bg-[#111c16]">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleChatSubmit();
                }
              }}
              placeholder="Inquire about luxury suites, rates..."
              className="flex-1 border border-[#1F6F5F]/30 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-[#1F6F5F]"
            />
            <button
              type="button"
              onClick={handleChatSubmit}
              disabled={!chatInput.trim() || chatLoading}
              className="h-10 w-10 bg-[#1F6F5F] hover:bg-[#288B77] text-white disabled:opacity-50 flex items-center justify-center transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* SECTION 1: HERO WITH SINGLE-ROW SEARCH FILTER IN FORMAL BOX */}
      <section className="relative min-h-[65vh] flex flex-col items-center justify-center overflow-hidden pb-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/vision-lobby.jpg" 
            alt="Refined Living" 
            className="w-full h-full object-cover filter brightness-90" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0b120e]" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl w-full pt-12 pb-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-serif tracking-tight leading-tight mb-4 text-white drop-shadow-lg"
          >
            Navigate <span className="italic text-[#2FA084] font-light">Hotels and Rooms</span>
          </motion.h1>

          {error ? (
            <div className="mt-4 max-w-3xl mx-auto border border-red-500/30 bg-red-950/80 backdrop-blur-sm px-5 py-3 text-sm text-red-200 font-semibold shadow-lg">
              {error}
            </div>
          ) : null}
        </div>

        {/* STICKY SEARCH BOX - FORMAL RECTANGULAR CONTAINER */}
        <div className="sticky top-20 z-40 w-full max-w-7xl px-4 mx-auto">
          <div className="relative bg-white/95 dark:bg-[#121c16]/95 p-6 md:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl border border-[#1F6F5F]/30">
            
            {/* Top Tag */}
            <div className="absolute -top-4 left-6">
              <div className="flex items-center gap-2 bg-white dark:bg-[#18261e] px-4 py-1.5 shadow-md border border-[#1F6F5F]/30 text-[#2FA084] font-black text-xs tracking-widest uppercase font-serif">
                <Hotel size={14} className="text-[#2FA084]" />
                <span>{viewMode === "hotel" ? "Hotel Directory" : "Room Collection"}</span>
              </div>
            </div>

            {/* Sub-tabs & Reset Filters */}
            <div className="flex items-center justify-between border-b border-[#1F6F5F]/20 pb-3 mb-5 pt-2 gap-4 flex-wrap">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2 rounded-full border border-[#1F6F5F]/20 bg-[#1F6F5F]/5 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("hotel")}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                      viewMode === "hotel"
                        ? "bg-[#1F6F5F] text-white shadow-sm"
                        : "text-[#2FA084] hover:bg-[#1F6F5F]/10"
                    }`}
                  >
                    Hotel
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("room")}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                      viewMode === "room"
                        ? "bg-[#1F6F5F] text-white shadow-sm"
                        : "text-[#2FA084] hover:bg-[#1F6F5F]/10"
                    }`}
                  >
                    Room
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("Overnight Stays")}
                  className={`text-sm font-bold transition-all pb-1 border-b-2 ${
                    activeTab === "Overnight Stays"
                      ? "text-[#2FA084] border-[#2FA084]"
                      : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  Overnight Stays
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("Day Use Stays")}
                  className={`text-sm font-bold transition-all pb-1 border-b-2 ${
                    activeTab === "Day Use Stays"
                      ? "text-[#2FA084] border-[#2FA084]"
                      : "text-slate-400 border-transparent hover:text-white"
                  }`}
                >
                  Day Use Stays
                </button>
              </div>

              <button
                type="button"
                onClick={clearCollectionFilters}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2FA084] hover:text-[#288B77] transition-colors"
              >
                <RotateCcw size={13} />
                <span>Reset Filters</span>
              </button>
            </div>

            {/* SINGLE ROW FILTER LAYOUT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-center">
              
              {/* Check-In Field */}
              <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-3 transition-all hover:border-[#2FA084]">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#2FA084] mb-1">
                  Check-In
                </label>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[#2FA084] shrink-0" />
                  <input
                    type="date"
                    value={filterCheckIn}
                    onChange={(e) => setFilterCheckIn(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Check-Out Field */}
              <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-3 transition-all hover:border-[#2FA084]">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#2FA084] mb-1">
                  Check-Out
                </label>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[#2FA084] shrink-0" />
                  <input
                    type="date"
                    value={filterCheckOut}
                    onChange={(e) => setFilterCheckOut(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Guests Field */}
              <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-3 transition-all hover:border-[#2FA084]">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#2FA084] mb-1">
                  Guests
                </label>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[#2FA084] shrink-0" />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="2 Guests"
                    value={filterGuests}
                    onChange={(e) => setFilterGuests(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Room Type Selector */}
              <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-3 transition-all hover:border-[#2FA084]">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#2FA084] mb-1">
                  Room Type
                </label>
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-[#2FA084] shrink-0" />
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="all" className="dark:bg-[#121c16]">All Types</option>
                    {roomTypeOptions.map((type) => (
                      <option key={type} value={type} className="dark:bg-[#121c16]">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Star Rating */}
              <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-3 transition-all hover:border-[#2FA084]">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#2FA084] mb-1">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-[#2FA084] fill-[#2FA084] shrink-0" />
                  <select
                    value={selectedRating}
                    onChange={(e) => setSelectedRating(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="all" className="dark:bg-[#121c16]">All Ratings</option>
                    <option value="5" className="dark:bg-[#121c16]">5 Stars</option>
                    <option value="4" className="dark:bg-[#121c16]">4 Stars</option>
                    <option value="3" className="dark:bg-[#121c16]">3 Stars</option>
                  </select>
                </div>
              </div>

              {/* Sort Order */}
              <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-3 transition-all hover:border-[#2FA084]">
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#2FA084] mb-1">
                  Sort
                </label>
                <div className="flex items-center gap-2">
                  <ArrowUpDown size={14} className="text-[#2FA084] shrink-0" />
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="recommended" className="dark:bg-[#121c16]">Recommended</option>
                    <option value="price-asc" className="dark:bg-[#121c16]">Price: Low-High</option>
                    <option value="price-desc" className="dark:bg-[#121c16]">Price: High-Low</option>
                  </select>
                </div>
              </div>

              {/* Search Button Action */}
              <div>
                <button
                  type="button"
                  onClick={handleSearchRoomsSubmit}
                  className="w-full py-3.5 px-3 bg-[#1F6F5F] hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77] text-white font-bold text-xs tracking-wider uppercase shadow-md transition-all hover:scale-[1.005] active:scale-[0.995] flex items-center justify-center gap-2"
                >
                  <Search size={14} />
                  <span>Filter</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: COLLECTION RESULTS LIST (GRID FOR HOTELS, LIST FOR ROOMS) */}
      <section className="py-12 px-4 max-w-7xl mx-auto pt-8">
        <div className="min-w-0">

          {viewMode === "hotel" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedList.map((entry, index) => (
                <motion.article
                  key={entry.id || `${entry.name}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex flex-col overflow-hidden border border-[#1F6F5F]/30 bg-white shadow-xl transition-all duration-300 hover:border-[#2FA084] dark:border-[#1F6F5F]/30 dark:bg-[#121c16]"
                >
                  {/* Tamang sukat na h-44 at object-cover para hindi ma-distort ang larawan ng hotel */}
                  <div className="relative h-44 overflow-hidden bg-zinc-900">
                    <img
                      src={resolveImg(entry.image || entry.hotelLogo || entry.buildingImage || entry.imageUrl || "/images/signup-img.png")}
                      alt={entry.name}
                      onError={(e) => { e.currentTarget.src = "/images/signup-img.png"; }}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 flex items-center gap-1 border border-white/10">
                      <Star size={12} className="fill-[#2FA084] text-[#2FA084]" />
                      <span className="text-xs font-bold text-white">{Number(entry.avgRating || 0).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <h4 className="text-xl font-serif font-black text-slate-900 dark:text-white">{entry.name}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#2FA084] font-semibold mb-2">
                        <MapPin size={14} />
                        <span>{entry.location || entry.locationLabel || entry.address || "Innova Smart Hotel"}</span>
                      </div>

                      <div className="flex items-center gap-1 mb-3 text-[#2FA084]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} className="fill-[#2FA084] text-[#2FA084]" />
                        ))}
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          {Number(entry.avgRating || 0).toFixed(1)} · {entry.reviewCount || 0} reviews
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {(entry.amenities || ["Wi‑Fi", "Breakfast", "Pool", "Concierge", "Parking"]).slice(0, 4).map((item, idx) => (
                          <span key={`${item}-${idx}`} className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 px-2 py-1 text-[10px] font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                            {item}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2">
                        "{entry.description || "A premium hotel experience designed for comfort, convenience, and elevated hospitality."}"
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#1F6F5F]/20 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">From</p>
                        <p className="text-lg font-black text-[#2FA084]">{php(entry.startingPrice || entry.minPrice || 0)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/hoteldetail/${entry.id}`)}
                        className="border border-[#1F6F5F]/40 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#2FA084] transition-all hover:bg-[#1F6F5F]/20"
                      >
                        View Hotel
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {paginatedList.map((room, index) => (
                <motion.article
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex flex-col lg:flex-row overflow-hidden border border-[#1F6F5F]/30 bg-white shadow-xl transition-all duration-300 hover:border-[#2FA084] dark:border-[#1F6F5F]/30 dark:bg-[#121c16]"
                >
                  {/* Left Side: Room Photo View */}
                  <div className="relative lg:w-[360px] shrink-0 h-56 lg:h-auto overflow-hidden bg-zinc-900">
                    <img
                      src={getRoomPreviewImage(room, undefined)}
                      alt={room.name}
                      onError={(e) => { e.currentTarget.src = "/images/deluxe-room.jpg"; }}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent lg:hidden" />
                    <div className="absolute bottom-3 left-3 flex lg:hidden items-center gap-2">
                      <span className="bg-[#1F6F5F] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                        {room.type || "Suite"}
                      </span>
                    </div>
                  </div>

                  {/* Middle Info & Formal Amenities */}
                  <div className="flex-1 p-6 lg:p-7 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h4 className="text-2xl font-serif font-black text-slate-900 dark:text-white">{room.name}</h4>
                        <div className="hidden lg:flex items-center gap-1.5 border border-[#1F6F5F]/30 bg-[#1F6F5F]/20 px-3 py-1">
                          <Star size={13} className="fill-[#2FA084] text-[#2FA084]" />
                          <span className="text-xs font-black text-[#2FA084]">{Number(room.avgRating || 0).toFixed(1)}</span>
                          <span className="text-xs text-slate-400 font-semibold">({room.reviewCount || 0} reviews)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-[#2FA084] font-semibold mb-3">
                        <MapPin size={15} />
                        <span>{room.hotelName || locationLabel}</span>
                      </div>

                      <div className="flex items-center gap-1 mb-3 text-[#2FA084]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className="fill-[#2FA084] text-[#2FA084]" />
                        ))}
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          {Number(room.avgRating || 0).toFixed(1)} · {room.reviewCount || 0} reviews
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 px-2.5 py-1 text-[11px] font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                          High-Speed Wi-Fi
                        </span>
                        <span className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 px-2.5 py-1 text-[11px] font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                          Valet Parking
                        </span>
                        <span className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 px-2.5 py-1 text-[11px] font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                          24-Hour Concierge
                        </span>
                        <span className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 px-2.5 py-1 text-[11px] font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                          Max {room.capacity || 2} Guests
                        </span>
                      </div>

                      <p className="text-sm italic text-slate-500 dark:text-slate-400">
                        "{room.description || "Designed to provide supreme comfort and sophisticated elegance during your stay."}"
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#1F6F5F]/20 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTour(room)}
                          className="border border-[#1F6F5F]/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#2FA084] transition-all hover:bg-[#1F6F5F]/20"
                        >
                          {room.hasVirtualTour ? "Explore in 360°" : "Open Tour"}
                        </button>
                        <Link
                          to={`/roomdetail/${room.id}`}
                          className="border border-slate-200 dark:border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all hover:bg-[#1F6F5F]/20"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Pricing & Reservation Box Action */}
                  <div className="lg:w-[260px] p-6 bg-[#1F6F5F]/10 dark:bg-[#0f1913] border-t lg:border-t-0 lg:border-l border-[#1F6F5F]/20 flex flex-col justify-between items-end text-right">
                    <div className="w-full text-right">
                      <div className="hidden lg:inline-block relative bg-[#1F6F5F] text-white px-3 py-1 text-xs font-black mb-2 shadow-sm">
                        Prime Selection
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nightly Rate</p>
                      <p className="text-2xl lg:text-3xl font-black text-[#2FA084] mt-0.5">
                        {php(room.basePricePhp)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">exclusive of local taxes</p>
                    </div>

                    <div className="w-full mt-6">
                      <button
                        type="button"
                        onClick={() => navigate(`/booking?roomId=${room.id}${filterCheckIn ? `&from=${filterCheckIn}` : ""}${filterCheckOut ? `&to=${filterCheckOut}` : ""}`)}
                        className="w-full py-3.5 px-5 bg-[#1F6F5F] hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77] text-white font-bold text-xs tracking-wider uppercase shadow-md transition-all hover:scale-[1.005] active:scale-[0.995] flex items-center justify-center gap-2"
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {!loading && currentList.length > 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 border border-[#1F6F5F]/30 bg-white/90 px-5 py-4 shadow-sm dark:bg-[#121c16]">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Showing {paginatedList.length} of {currentList.length}
              </p>
              {hasMoreItems ? (
                <button
                  type="button"
                  onClick={() => setVisibleItemCount((prev) => Math.min(prev + PAGE_SIZE, currentList.length))}
                  className="border border-[#1F6F5F]/30 px-5 py-2.5 text-sm font-semibold text-[#2FA084] transition-all hover:bg-[#1F6F5F]/20"
                >
                  View All
                </button>
              ) : (
                <span className="text-sm font-semibold text-[#2FA084]">All items loaded</span>
              )}
            </div>
          ) : null}

          {loading && currentList.length === 0 ? (
            <div className="mt-10 text-center text-[#2FA084] font-semibold">Loading collection...</div>
          ) : null}

          {!loading && currentList.length === 0 ? (
            <div className="mt-10 border border-dashed border-[#1F6F5F]/40 bg-white/70 px-6 py-12 text-center text-slate-500 dark:bg-white/5 dark:text-slate-400">
              No results match your criteria.
            </div>
          ) : null}
        </div>
      </section>

      {!sessionUser?.id ? (
        <section className="py-20 px-4 max-w-7xl mx-auto">
          <div className="border border-[#1F6F5F]/30 bg-white dark:bg-[#121c16] p-10 md:p-14 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#2FA084] mb-3">Executive Privileges</p>
                <h3 className="text-3xl font-serif font-black text-slate-900 dark:text-white">Become a Member for Exclusive Perks</h3>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                  Unlock customized suite recommendations, loyalty tier multipliers, and priority VIP reservations.
                </p>
                <div className="mt-8 flex gap-3">
                  <a
                    href="/signup"
                    className="inline-flex items-center justify-center px-8 py-4 bg-[#1F6F5F] hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77] text-white font-black uppercase text-[11px] tracking-[0.25em]"
                  >
                    Register Account
                  </a>
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center px-8 py-4 border border-[#1F6F5F]/40 bg-[#1F6F5F]/20 text-[#2FA084] font-black uppercase text-[11px] tracking-[0.25em] hover:bg-[#1F6F5F]/40"
                  >
                    Sign In
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-5">
                  <p className="text-xs font-black text-[#2FA084]">Personalized AI Matches</p>
                  <p className="text-sm text-slate-500 mt-1 blur-[2px] select-none">Curated options aligned with your taste.</p>
                </div>
                <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-5">
                  <p className="text-xs font-black text-[#2FA084]">Innova Rewards Program</p>
                  <p className="text-sm text-slate-500 mt-1 blur-[2px] select-none">Earn 500 bonus points upon reservation.</p>
                </div>
                <div className="border border-[#1F6F5F]/30 bg-[#1F6F5F]/10 p-5">
                  <p className="text-xs font-black text-[#2FA084]">Concierge Route Mapping</p>
                  <p className="text-sm text-slate-500 mt-1 blur-[2px] select-none">Exclusive travel guides and transport access.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}