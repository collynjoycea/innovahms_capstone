import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GuestReviewsSection({ sessionUser, bookingContext, roomId, hotelId }) {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);

  const loadReviews = () => {
    const query = roomId
      ? `room_id=${encodeURIComponent(roomId)}&limit=100`
      : "limit=5";
    fetch(`/api/reviews?${query}`)
      .then((r) => r.json())
      .then((d) => {
        const nextReviews = d.reviews || [];
        setReviews(nextReviews);
        setHasReviewed(Boolean(roomId && sessionUser?.id && nextReviews.some(
          (review) => String(review.customerId) === String(sessionUser.id) && String(review.roomId) === String(roomId)
        )));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadReviews();
  }, [roomId, sessionUser?.id]);

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!sessionUser?.id) {
      navigate("/login");
      return;
    }

    if (!rating) {
      setFeedback("Please select a rating.");
      return;
    }

    if (!comment.trim()) {
      setFeedback("Please write a comment.");
      return;
    }

    setSubmitting(true);
    setFeedback("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: sessionUser.id,
          rating,
          title,
          comment,
          bookingContext,
          roomId,
          hotelId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit.");

      setFeedback("Review submitted! Thank you.");
      setHasReviewed(true);
      setRating(0);
      setTitle("");
      setComment("");
      loadReviews();
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#1F6F5F] mb-2">
            Guest Reviews
          </p>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            What Guests Are Saying
          </h2>

          {reviews.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-[#1F6F5F]">
                {averageRating}
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={18}
                    fill={i <= Math.round(averageRating) ? "#1F6F5F" : "transparent"}
                    className="text-[#1F6F5F]"
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                ({reviews.length} reviews)
              </span>
            </div>
          )}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* FORM */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Write a Review
            </h3>

            {hasReviewed ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                You already submitted a review for this room. Thank you for your feedback!
              </div>
            ) : <form onSubmit={handleSubmit} className="space-y-5">

              {/* STAR RATING */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Rating
                </label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                    >
                      <Star
                        size={26}
                        fill={(hoverRating || rating) >= s ? "#1F6F5F" : "transparent"}
                        className={`${
                          (hoverRating || rating) >= s
                            ? "text-[#1F6F5F]"
                            : "text-gray-300"
                        } transition`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* TITLE */}
              <input
                type="text"
                placeholder="Review title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1F6F5F]/20 outline-none"
              />

              {/* COMMENT */}
              <textarea
                rows="4"
                placeholder="Write your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#1F6F5F]/20 outline-none"
              />

              {!sessionUser?.id && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <LogIn size={16} />
                  Login required to submit review
                </div>
              )}

              {feedback && (
                <p className="text-sm text-center text-red-500">{feedback}</p>
              )}

              <button
                type={sessionUser?.id ? "submit" : "button"}
                onClick={!sessionUser?.id ? () => navigate("/login") : undefined}
                disabled={submitting}
                className="w-full py-3 bg-[#1F6F5F] text-white font-semibold rounded-lg hover:bg-[#2FA084] transition"
              >
                {submitting
                  ? "Submitting..."
                  : sessionUser?.id
                  ? "Submit Review"
                  : "Login to Review"}
              </button>
            </form>}
          </motion.div>

          {/* REVIEWS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 space-y-4"
          >
            {reviews.length === 0 && (
              <p className="text-gray-400">No reviews yet.</p>
            )}

            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-md transition"
              >
                <div className="flex justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {rev.guestName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {rev.roomName || rev.hotelName}
                    </p>
                  </div>

                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        fill={s <= rev.rating ? "#1F6F5F" : "transparent"}
                        className="text-[#1F6F5F]"
                      />
                    ))}
                  </div>
                </div>

                {rev.title && (
                  <p className="font-medium text-sm text-gray-900">
                    {rev.title}
                  </p>
                )}

                <p className="text-sm text-gray-600 mt-1">
                  "{rev.comment}"
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  {new Date(rev.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
