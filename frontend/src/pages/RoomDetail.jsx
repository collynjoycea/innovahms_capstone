import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Star,
  X,
  ScanEye,
  ThumbsUp,
  FileText,
  MessageSquare,
} from "lucide-react";
import Marzipano from "marzipano";
import resolveImg from "../utils/resolveImg";

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

  // Modal States para sa See More
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);

  // 360 tour state
  const [tourOpen, setTourOpen] = useState(false);
  const [tourLoading, setTourLoading] = useState(false);
  const [tourData, setTourData] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourNotice, setTourNotice] = useState("");
  const panoRef = useRef(null);
  const viewerRef = useRef(null);

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

    fetch(`/api/reviews?room_id=${encodeURIComponent(id)}&limit=100`, { cache: "no-store" })
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

  const roomHighlights = toList(room?.highlights);
  const roomFeatures = toList(room?.features);
  
  const detailSections = [
    { title: "Room Facilities", items: roomHighlights },
    { title: "Amenities", items: toList(room?.amenities) },
    { title: "Room Features", items: roomFeatures },
  ];

  const roomImg = useMemo(() => {
    const raw = Array.isArray(room?.images) ? room.images.filter(Boolean) : [];
    const first = raw[0] || room?.imageUrl || room?.image_url || "";
    return first ? resolveImg(first) : FALLBACKS[0];
  }, [room]);

  const currentImg = imgError ? FALLBACKS[0] : roomImg;

  const roomReviews = useMemo(() => {
    return reviews.filter((rev) => String(rev.roomId) === String(id));
  }, [id, reviews]);

  const reviewStats = useMemo(() => {
    const countsByStar = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const count = Number(room?.reviewCount ?? roomReviews.length);
    if (!roomReviews.length) {
      return {
        average: Number(room?.avgRating || 0).toFixed(1),
        count,
        countsByStar,
      };
    }
    let sum = 0;
    roomReviews.forEach((rev) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(rev.rating))));
      countsByStar[r] = (countsByStar[r] || 0) + 1;
      sum += Number(rev.rating);
    });
    return {
      average: Number(room?.avgRating ?? (sum / roomReviews.length)).toFixed(1),
      count,
      countsByStar,
    };
  }, [room, roomReviews]);

  const filteredReviews = useMemo(() => {
    if (activeFilter === "All") return roomReviews;
    if (activeFilter.includes("Star")) {
      const targetStar = parseInt(activeFilter);
      return roomReviews.filter((r) => Math.round(Number(r.rating)) === targetStar);
    }
    return roomReviews;
  }, [roomReviews, activeFilter]);

  // Limit sa 3 reviews sa main view
  const displayedReviews = useMemo(() => {
    return filteredReviews.slice(0, 3);
  }, [filteredReviews]);

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
        
        {/* BREADCRUMB */}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
          
          {/* IMAGE CONTAINER */}
          <div className="lg:col-span-7">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#0f1a17] h-[320px] shadow-sm">
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
              <div className="mb-2">
                <span className="text-[11px] font-semibold tracking-wider text-[#1F6F5F] dark:text-[#2FA084] uppercase">
                  {room.roomType || "Executive Suite"}
                </span>
              </div>
              
              <h1 className="text-xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">
                {room.roomName || room.name || "Innova Room"}
              </h1>
              
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-3 line-clamp-3 whitespace-pre-line">
                {room.description || "No room description has been added by the owner yet."}
              </p>

              <div className="space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-3 mb-3 text-xs text-slate-600 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                  <span>Maximum Capacity: {Math.max(guestCount, 1)} Guests</span>
                </div>
              </div>

              {/* AMENITIES BADGES */}
              <div className="flex flex-wrap gap-1.5 mb-3">
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

        {/* MIDDLE-BOTTOM SECTION: DESCRIPTION & REVIEWS SIDE-BY-SIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* DESCRIPTION SECTION */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1a17] p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Room Description</h2>
              <p className="whitespace-pre-line text-xs sm:text-sm leading-6 text-slate-600 dark:text-zinc-300 line-clamp-5">
                {room.description || "No room description has been added by the owner yet."}
              </p>

              {/* SEE MORE MODAL TRIGGER BUTTON */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setDescModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F6F5F] dark:text-[#2FA084] hover:underline"
                >
                  <FileText size={14} />
                  <span>See More</span>
                </button>
              </div>
            </div>
          </div>

          {/* REVIEWS & RATINGS SECTION */}
          <div className="lg:col-span-6 bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-white/5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ratings & Reviews</h2>
                <div className="flex items-center gap-1.5">
                  {reviewStats.count > 0 ? (
                    [1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        fill={star <= Math.round(Number(reviewStats.average)) ? "#1F6F5F" : "transparent"}
                        className={star <= Math.round(Number(reviewStats.average)) ? "text-[#1F6F5F] dark:text-[#2FA084]" : "text-slate-300 dark:text-zinc-700"}
                      />
                    ))
                  ) : (
                    <Star size={13} className="text-slate-300 dark:text-zinc-700" />
                  )}
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                    {reviewStats.count > 0 ? reviewStats.average : "No ratings"}
                  </span>
                  <span className="text-[10px] text-slate-400">({reviewStats.count})</span>
                </div>
              </div>

              {/* FILTER CHIPS */}
              <div className="flex flex-wrap gap-1 mb-3">
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
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
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
              <div className="space-y-3 divide-y divide-slate-100 dark:divide-white/5">
                {displayedReviews.length > 0 ? (
                  displayedReviews.map((rev) => {
                    const nameInitial = rev.guestName ? rev.guestName[0].toUpperCase() : "G";
                    const displayUsername = maskUsername(rev.guestName);
                    const createdAt = rev.createdAt ? new Date(rev.createdAt) : null;
                    const reviewDate = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString().slice(0, 10) : "";
                    const currentHelpful = helpfulCounts[rev.id] || { count: 0, active: false };

                    return (
                      <div key={rev.id} className="pt-2.5 first:pt-0">
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0 text-slate-600 dark:text-zinc-300 text-[10px] font-semibold">
                            {nameInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200">{displayUsername}</span>
                              {reviewDate ? <span className="text-[10px] text-slate-400">{reviewDate}</span> : null}
                            </div>

                            <div className="flex gap-0.5 my-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={10}
                                  fill={s <= Number(rev.rating) ? "#1F6F5F" : "transparent"}
                                  className={s <= Number(rev.rating) ? "text-[#1F6F5F] dark:text-[#2FA084]" : "text-slate-300 dark:text-zinc-700"}
                                />
                              ))}
                            </div>

                            {rev.comment ? <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-normal mb-1.5">{rev.comment}</p> : null}

                            <button
                              onClick={() => toggleHelpful(rev.id)}
                              className={`inline-flex items-center gap-1 text-[10px] transition-colors ${
                                currentHelpful.active
                                  ? "text-[#1F6F5F] dark:text-[#2FA084] font-semibold"
                                  : "text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              <ThumbsUp size={10} />
                              <span>Helpful {currentHelpful.count > 0 && `(${currentHelpful.count})`}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No reviews available for this filter.
                  </div>
                )}
              </div>
            </div>

            {/* SEE MORE REVIEWS MODAL TRIGGER */}
            {filteredReviews.length > 3 && (
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setReviewsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1F6F5F] dark:text-[#2FA084] hover:underline"
                >
                  <MessageSquare size={14} />
                  <span>See More Reviews ({filteredReviews.length - 3} more)</span>
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* 1. ROOM DESCRIPTION & FACILITIES MODAL (Inilagay sa medyo mababang posisyon) */}
      {descModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pt-16 sm:pt-20">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[78vh] my-auto">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#13221e] border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#1F6F5F] dark:text-[#2FA084]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Full Room Details & Facilities</h3>
              </div>
              <button
                onClick={() => setDescModalOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F6F5F] dark:text-[#2FA084] mb-2">Description</h4>
                <p className="whitespace-pre-line leading-relaxed text-slate-600 dark:text-zinc-300">
                  {room.description || "No detailed description provided."}
                </p>
              </div>

              <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-4">
                {detailSections.map((section) => (
                  <div key={section.title} className="rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-4">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1F6F5F] dark:text-[#2FA084]">
                      {section.title}
                    </h4>
                    {section.items && section.items.length > 0 ? (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-zinc-300">
                        {section.items.map((item, index) => (
                          <li key={`${section.title}-${index}`} className="flex items-start gap-1.5">
                            <span className="text-[#1F6F5F] dark:text-[#2FA084] font-bold">•</span>
                            <span className="whitespace-pre-line">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">No {section.title.toLowerCase()} listed.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-[#13221e] border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setDescModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-[#1F6F5F] dark:bg-[#2FA084] text-white text-xs font-bold hover:brightness-110 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FULL REVIEWS MODAL (Inilagay sa medyo mababang posisyon) */}
      {reviewsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pt-16 sm:pt-20">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[78vh] my-auto">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#13221e] border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-[#1F6F5F] dark:text-[#2FA084]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Reviews ({filteredReviews.length})</h3>
              </div>
              <button
                onClick={() => setReviewsModalOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {filteredReviews.map((rev) => {
                const nameInitial = rev.guestName ? rev.guestName[0].toUpperCase() : "G";
                const displayUsername = maskUsername(rev.guestName);
                const createdAt = rev.createdAt ? new Date(rev.createdAt) : null;
                const reviewDate = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString().slice(0, 10) : "";
                const currentHelpful = helpfulCounts[rev.id] || { count: 0, active: false };

                return (
                  <div key={rev.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0 text-slate-600 dark:text-zinc-300 text-xs font-semibold">
                        {nameInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{displayUsername}</span>
                          {reviewDate ? <span className="text-[10px] text-slate-400">{reviewDate}</span> : null}
                        </div>

                        <div className="flex gap-0.5 my-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={11}
                              fill={s <= Number(rev.rating) ? "#1F6F5F" : "transparent"}
                              className={s <= Number(rev.rating) ? "text-[#1F6F5F] dark:text-[#2FA084]" : "text-slate-300 dark:text-zinc-700"}
                            />
                          ))}
                        </div>

                        {rev.comment ? <p className="text-xs text-slate-600 dark:text-zinc-300 leading-normal mb-2">{rev.comment}</p> : null}

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
              })}
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-[#13221e] border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setReviewsModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-[#1F6F5F] dark:bg-[#2FA084] text-white text-xs font-bold hover:brightness-110 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 360 TOUR MODAL */}
      {tourOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 pt-16 sm:pt-20">
          <div className="w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl my-auto">
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

            <div className="relative w-full h-[460px] bg-black">
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

    </main>
  );
}