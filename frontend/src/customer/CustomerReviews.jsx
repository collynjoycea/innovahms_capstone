import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import GuestReviewsSection from "../components/GuestReviewsSection";
import { extractCustomerSession } from "./customerHelpers";
import { MessageSquare, Star, Info } from "lucide-react";

export default function CustomerReviews() {
  const location = useLocation();
  const [sessionUser, setSessionUser] = useState(null);
  const [bookingContext, setBookingContext] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [hotelId, setHotelId] = useState(null);

  useEffect(() => {
    setSessionUser(extractCustomerSession());
    const params = new URLSearchParams(location.search);
    const roomName = params.get("roomName");
    const hotelName = params.get("hotelName");
    const bookingId = params.get("bookingId");
    const roomIdParam = params.get("roomId");
    const hotelIdParam = params.get("hotelId");

    if (bookingId || roomName || hotelName) {
      const title = [hotelName, roomName].filter(Boolean).join(" — ");
      setBookingContext(title || `Booking #${bookingId}`);
    }
    
    setRoomId(roomIdParam ? parseInt(roomIdParam) : null);
    setHotelId(hotelIdParam ? parseInt(hotelIdParam) : null);
  }, [location.search]);

  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-slate-950 font-sans py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h1 className="text-3xl font-extrabold text-[#0d2a23] dark:text-emerald-400 tracking-tight">
            Customer Reviews & Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage and view guest feedback for completed stays and room services.
          </p>
        </div>

        {/* Main Section - Pahaba / Full Width */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Card Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-8 h-8 rounded-full bg-[#006042] text-white flex items-center justify-center font-bold text-sm shrink-0">
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Guest Experience
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bookingContext ? `Booking Context: ${bookingContext}` : "Submit your review or check existing guest ratings below."}
              </p>
            </div>
          </div>

          {/* Core Reviews Component */}
          <GuestReviewsSection 
            sessionUser={sessionUser} 
            bookingContext={bookingContext} 
            roomId={roomId} 
            hotelId={hotelId} 
          />

        </div>

      </div>
    </div>
  );
}