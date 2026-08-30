import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Users,
  Star,
  ScanEye,
  Navigation,
  Building2,
  BedDouble,
  Wifi,
  Utensils,
  Waves,
  CheckCircle2,
} from "lucide-react";
import resolveImg from "../utils/resolveImg";

const FALLBACKS = [
  "/images/deluxe-room.jpg",
  "/images/single-room.jpg",
  "/images/standard-room.jpg",
  "/images/ocean-suite.jpg",
];

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    setImgError(false);

    Promise.all([
      fetch("/api/home/hotels"),
      fetch("/api/rooms"),
    ])
      .then(async ([hotelRes, roomRes]) => {
        if (!mounted) return;

        const hotelPayload = await hotelRes.json().catch(() => ({}));
        const roomPayload = await roomRes.json().catch(() => ({}));

        const hotels = Array.isArray(hotelPayload?.hotels) ? hotelPayload.hotels : [];
        const roomsList = Array.isArray(roomPayload?.rooms) ? roomPayload.rooms : Array.isArray(roomPayload) ? roomPayload : [];

        const matchedHotel = hotels.find((item) => String(item.id) === String(id));
        const hotelRooms = roomsList.filter((room) => String(room.hotel_id || room.hotelId || room.hotel_id) === String(id));

        if (!matchedHotel && hotelRooms.length === 0) {
          throw new Error("Hotel not found.");
        }

        setHotel(matchedHotel || {
          id,
          name: "Innova Hotel",
          location: "Innova Smart Hotel",
          description: "A connected hotel experience powered by Innova HMS.",
          image: "/images/signup-img.png",
          tag: "Connected Hotel",
        });

        setRooms(hotelRooms);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || "Unable to load hotel details.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const hotelImage = useMemo(() => {
    const raw = hotel?.image || hotel?.hotelLogo || hotel?.buildingImage || "";
    return raw ? resolveImg(raw) : FALLBACKS[0];
  }, [hotel]);

  const currentHotelImage = imgError ? FALLBACKS[0] : hotelImage;

  const amenities = useMemo(() => {
    const items = toList(hotel?.amenities || hotel?.features || []).map((item) => String(item).trim());
    return items.length ? items : ["Wi‑Fi", "Breakfast", "Pool", "Concierge", "Parking", "24/7 Support"];
  }, [hotel]);

  const avgRoomPrice = rooms.length
    ? rooms.reduce((sum, room) => sum + Number(room.price || room.base_price_php || room.price_per_night || 0), 0) / rooms.length
    : 0;

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
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setRouteLoading(false);
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1F6F5F] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !hotel) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] px-6 py-20 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{error || "Hotel unavailable."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-5 py-2 rounded-lg bg-[#1F6F5F] text-white text-xs font-medium hover:bg-[#2FA084] transition-colors"
        >
          Return to Home
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-6">
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
            {hotel.name || "Hotel Detail"}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          <div className="lg:col-span-7">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#0f1a17] h-[340px] shadow-sm">
              <img
                src={currentHotelImage}
                alt={hotel.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-wider text-[#1F6F5F] dark:text-[#2FA084] uppercase">
                  {hotel.tag || "Connected Hotel"}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                  Open Hotel
                </span>
              </div>

              <h1 className="text-xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">
                {hotel.name}
              </h1>

              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-4 line-clamp-3">
                {hotel.description || "A premium hospitality destination designed for comfort, convenience, and elevated guest experiences."}
              </p>

              <div className="space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-3 mb-4 text-xs text-slate-600 dark:text-zinc-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MapPin size={14} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                    <span className="truncate">{hotel.location || "Innova Smart Hotel"}</span>
                  </div>
                  <button
                    onClick={handleGetDirections}
                    disabled={routeLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F6F5F] dark:text-[#2FA084] hover:underline shrink-0"
                  >
                    <Navigation size={12} /> {routeLoading ? "Locating..." : "Get Directions"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                  <span>{rooms.length} rooms available</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {amenities.slice(0, 5).map((item, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-zinc-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                  {rooms.length ? `PHP ${avgRoomPrice.toLocaleString()}` : "PHP 0"}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Average Room Rate</div>
              </div>
              <button
                onClick={() => navigate(`/vision-suites?viewMode=room&hotel_id=${hotel.id}`)}
                className="px-4 py-2 rounded-lg bg-[#1F6F5F] hover:bg-[#2FA084] text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Browse Rooms
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Hotel Highlights</h2>
              <div className="flex items-center gap-1.5">
                <Star size={14} fill="#1F6F5F" className="text-[#1F6F5F] dark:text-[#2FA084]" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">4.8</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0d1714] p-4">
                <div className="mb-2 flex items-center gap-2 text-[#1F6F5F] dark:text-[#2FA084]">
                  <Wifi size={15} />
                  <span className="text-xs font-bold uppercase tracking-wide">Connectivity</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300">Fast internet, smart room systems, and reliable work-ready comfort for every guest.</p>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0d1714] p-4">
                <div className="mb-2 flex items-center gap-2 text-[#1F6F5F] dark:text-[#2FA084]">
                  <Utensils size={15} />
                  <span className="text-xs font-bold uppercase tracking-wide">Dining</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300">Curated dining experiences and service that keep your stay effortless and enjoyable.</p>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0d1714] p-4">
                <div className="mb-2 flex items-center gap-2 text-[#1F6F5F] dark:text-[#2FA084]">
                  <Waves size={15} />
                  <span className="text-xs font-bold uppercase tracking-wide">Wellness</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300">Relaxation spaces, invigorating facilities, and a calming atmosphere throughout the property.</p>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0d1714] p-4">
                <div className="mb-2 flex items-center gap-2 text-[#1F6F5F] dark:text-[#2FA084]">
                  <CheckCircle2 size={15} />
                  <span className="text-xs font-bold uppercase tracking-wide">Service</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300">Friendly support, efficient check-in, and premium hospitality from arrival to departure.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MapPin size={14} className="text-[#1F6F5F] dark:text-[#2FA084]" />
                Location & Directions
              </span>
              <button
                onClick={handleGetDirections}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F6F5F] dark:text-[#2FA084] hover:underline"
              >
                <Navigation size={12} /> Route
              </button>
            </div>

            <div
              onClick={() => setMapModalOpen(true)}
              className="relative flex-1 min-h-[260px] rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 cursor-pointer group bg-slate-100 dark:bg-zinc-900"
            >
              <div className="absolute inset-0 pointer-events-none">
                <iframe
                  title="Hotel location map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(hotel.location || "Innova Smart Hotel")}&z=13&output=embed`}
                  className="h-full w-full border-0"
                  loading="lazy"
                  allowFullScreen
                />
              </div>

              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-black/75 text-white text-[11px] font-medium px-3 py-1.5 rounded-md backdrop-blur-sm shadow">
                  Click to Expand Map
                </span>
              </div>
            </div>
          </div>
        </div>

        {rooms.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rooms at {hotel.name}</h2>
              <span className="text-xs text-[#1F6F5F] dark:text-[#2FA084] font-medium">{rooms.length} available</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => {
                const roomImage = Array.isArray(room.images) && room.images.length > 0 ? room.images[0] : FALLBACKS[0];
                const roomPrice = Number(room.price || room.base_price_php || room.price_per_night || 0);
                const roomName = room.roomName || room.name || room.roomType || "Suite";

                return (
                  <article
                    key={room.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 dark:border-[#243B33] bg-white dark:bg-[#0f1715] shadow-md"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={resolveImg(roomImage)}
                        alt={roomName}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute right-3 top-3 rounded-full bg-[#080d0b]/80 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#6FCF97]">
                        {String(room.status || "Available").toUpperCase()}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-[#111C18] dark:text-white">{roomName}</h3>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#1F6F5F] dark:text-[#6FCF97]">
                          {room.roomType || "Suite"}
                        </span>
                      </div>

                      <div className="mb-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <BedDouble size={14} className="text-[#1F6F5F] dark:text-[#2FA084]" />
                        <span>{room.maxAdults || room.max_adults || 2} guests</span>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-medium text-[#1F6F5F] dark:text-[#6FCF97]">
                        {(Array.isArray(room.amenities) ? room.amenities : []).slice(0, 3).map((amenity, index) => (
                          <span key={`${amenity}-${index}`} className="rounded-full border border-[#1F6F5F]/25 bg-[#1F6F5F]/5 px-2 py-1">
                            {amenity}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-[#243B33] pt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Starting</p>
                          <p className="text-xl font-bold text-[#1F6F5F] dark:text-[#6FCF97]">₱{roomPrice.toLocaleString()}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/booking?roomId=${room.id}`)}
                          className="rounded-xl bg-[#1F6F5F] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77]"
                        >
                          Reserve Room
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {mapModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#13221e] border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F6F5F] dark:text-[#2FA084]">
                  Hotel Overview
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{hotel.location || "Property Neighborhood"}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGetDirections}
                  className="px-3 py-1 rounded text-xs font-medium border border-slate-300 dark:border-white/20 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5"
                >
                  <Navigation size={12} /> Get Directions
                </button>
                <button
                  onClick={() => setMapModalOpen(false)}
                  className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  ×
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
              <iframe
                title="Hotel map"
                src={`https://www.google.com/maps?q=${encodeURIComponent(hotel.location || "Innova Smart Hotel")}&z=13&output=embed`}
                className="h-full w-full border-0"
                loading="lazy"
                allowFullScreen
              />
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-[#13221e] border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>{userCoords ? "Displaying route guidance from your current location." : "Map preview for the hotel and nearby area."}</span>
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
