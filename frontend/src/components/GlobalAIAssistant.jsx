import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, MessageCircle, Send, Trash2, X } from "lucide-react";

const HISTORY_LIMIT = 120;

const hiddenPrefixes = [
  "/login",
  "/signup",
  "/owner",
  "/staff",
  "/admin",
  "/hr",
  "/manager",
  "/housekeeping",
  "/maintenance",
  "/inventory",
];

const getStoredUser = () => {
  const rawUser = localStorage.getItem("user") || localStorage.getItem("customerSession");
  if (!rawUser) return null;
  try {
    const parsed = JSON.parse(rawUser);
    return parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
  } catch {
    return null;
  }
};

const getDefaultWelcome = (firstName) => [
  {
    id: "welcome",
    from: "bot",
    text: firstName
      ? `Hi ${firstName}. I'm Nova. I can help you find rooms, guide you through reservations, check your booking status, and answer hotel questions.`
      : "Hi. I'm Nova. I can help you find rooms, guide you through reservations, check your booking status, and answer hotel questions.",
    timestamp: Date.now(),
  },
];

export default function GlobalAIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionUser, setSessionUser] = useState(() => getStoredUser());
  const [messages, setMessages] = useState(() =>
    getDefaultWelcome(getStoredUser()?.firstName || getStoredUser()?.first_name || "")
  );
  const chatScrollRef = useRef(null);

  const shouldHide = hiddenPrefixes.some((prefix) => location.pathname.startsWith(prefix));
  const userId = sessionUser?.id || sessionUser?.customer_id || sessionUser?.user_id || "guest";
  const historyKey = useMemo(() => `innova_ai_history_${userId}`, [userId]);
  const guestHotelId = location.pathname.match(/^\/(?:hoteldetail|roomdetail)\/(\d+)/)?.[1];

  useEffect(() => {
    const handleSessionRefresh = () => {
      setSessionUser(getStoredUser());
    };

    window.addEventListener("userUpdated", handleSessionRefresh);
    window.addEventListener("storage", handleSessionRefresh);
    return () => {
      window.removeEventListener("userUpdated", handleSessionRefresh);
      window.removeEventListener("storage", handleSessionRefresh);
    };
  }, []);

  useEffect(() => {
    const handleOpenAssistant = (event) => {
      const prompt = typeof event?.detail?.prompt === "string" ? event.detail.prompt : "";
      setIsOpen(true);
      if (prompt) {
        setInput(prompt);
      }
    };

    window.addEventListener("openGlobalAIAssistant", handleOpenAssistant);
    return () => {
      window.removeEventListener("openGlobalAIAssistant", handleOpenAssistant);
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(historyKey);
    if (!raw) {
      setMessages(getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || ""));
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed.slice(-HISTORY_LIMIT));
      } else {
        setMessages(getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || ""));
      }
    } catch {
      setMessages(getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || ""));
    }
  }, [historyKey, sessionUser?.firstName, sessionUser?.first_name]);

  useEffect(() => {
    localStorage.setItem(historyKey, JSON.stringify(messages.slice(-HISTORY_LIMIT)));
  }, [historyKey, messages]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  if (shouldHide) return null;

  const handleSend = async (suggestedMessage) => {
    const message = (suggestedMessage ?? input).trim();
    if (!message || isTyping) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setNotice("");

    const lowerMessage = message.toLowerCase();
    const isTagalog = /\b(?:magkano|paano|saan|nasaan|ano|anong|may|ba|pwede|puwede|gusto|ko|ngayon|bukas|kuwarto|kwarto|reserba|kansela|salamat|kumusta)\b/.test(lowerMessage);
    const signedInCustomerId = sessionUser?.id || sessionUser?.customer_id || sessionUser?.user_id;
    const mentionsBooking = lowerMessage.includes("booking") || lowerMessage.includes("reservation");
    const asksBookingStatus = [
      "booking status", "reservation status", "check my booking", "check my reservation",
      "where is my booking", "where is my reservation", "where's my booking", "where's my reservation",
      "track my booking", "track my reservation", "status of my booking", "status of my reservation",
      "status ng booking", "status ng reservation", "status ng booking ko", "status ng reservation ko",
      "kamusta booking ko", "kumusta booking ko", "kumusta reservation ko", "na-confirm na ba",
    ].some((phrase) => lowerMessage.includes(phrase));
    if (asksBookingStatus && !signedInCustomerId) {
      setMessages((prev) => [...prev, {
        id: `b-${Date.now()}`,
        from: "bot",
        text: isTagalog
          ? "Mag-sign in muna sa guest account para matingnan ang status ng reservation mo. Buksan ang /login."
          : "Please sign in to your guest account to check your reservation status. Open /login.",
        timestamp: Date.now(),
      }]);
      return;
    }
    const asksToChangeBooking = mentionsBooking
      && ["change", "modify", "update", "reschedule", "switch room", "change room", "guest count", "number of guests",
        "baguhin", "palitan", "ilipat", "i-reschedule", "baguhin ang petsa", "palitan ang petsa"].some((phrase) => lowerMessage.includes(phrase));
    if (asksToChangeBooking) {
      const responseText = signedInCustomerId
        ? isTagalog
          ? "Buksan ang My Bookings para makita ang mga opsyon sa pagbabago o pagkansela ng reservation. Depende sa status ng booking at patakaran ng hotel ang eligibility. Kung available ang pagbabago, kailangang may bakanteng kuwarto at muling kakalkulahin ang total at natitirang bayad. Buksan ang /customer/bookings."
          : "Open My Bookings to review modification or cancellation options for your reservation. Eligibility depends on the booking status and hotel policy. If a change is available, the room must be available and the total and remaining balance are recalculated. Open /customer/bookings."
        : isTagalog
          ? "Mag-sign in muna sa guest account para makita ang mga opsyon sa pagbabago o pagkansela ng booking mula sa My Bookings. Buksan ang /login."
          : "Please sign in to your guest account to review modification or cancellation options in My Bookings. Open /login.";
      setMessages((prev) => [...prev, {
        id: `b-${Date.now()}`,
        from: "bot",
        text: responseText,
        timestamp: Date.now(),
      }]);
      return;
    }

    try {
      setIsTyping(true);
      const response = await fetch("/api/chatbot/rasa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: `global-${userId}`,
          customer_id: signedInCustomerId || null,
          message,
          context_path: location.pathname,
          hotel_id: guestHotelId ? Number(guestHotelId) : undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "AI assistant is unavailable right now.");
      }

      if (payload?.source === "fallback") {
        setNotice("Fallback mode active. History is still saved.");
      }

      const replies = Array.isArray(payload.messages) ? payload.messages : [];
      setMessages((prev) => [
        ...prev,
        ...(replies.length
          ? replies.map((text, index) => ({
              id: `b-${Date.now()}-${index}`,
              from: "bot",
              text,
              timestamp: Date.now(),
            }))
          : [
              {
                id: `b-${Date.now()}`,
                from: "bot",
                text: "No response text returned by assistant.",
                timestamp: Date.now(),
              },
            ]),
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          from: "bot",
          text: error?.message || "Unable to process request.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    const reset = getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || "");
    setMessages(reset);
    setNotice("History cleared for current session.");
  };
  const quickQuestions = [
    "Show available room types",
    "How much is a 6-hour stay in a Queen room?",
    "How do I book a room?",
    "How can I check my booking status?",
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[1200] h-14 w-14 rounded-full bg-[#1F6F5F] text-white shadow-2xl shadow-[#1F6F5F]/30 flex items-center justify-center hover:bg-[#288B77] transition-all"
        title="Nova"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {isOpen ? (
        <div className="fixed bottom-24 right-6 z-[1200] w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[#d6eee7] dark:border-white/10 bg-white dark:bg-[#12110d] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#d6eee7] dark:border-white/10 bg-[#eaf8f3] dark:bg-[#1a1915] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-[#1F6F5F]" />
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F6F5F] dark:text-[#9ad8c2]">
                Nova
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#2b7a68] dark:text-[#9ad8c2] hover:text-[#1F6F5F]"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div ref={chatScrollRef} className="h-80 overflow-y-auto p-4 space-y-3 bg-[#fffdf8] dark:bg-[#12110d]">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    message.from === "user"
                      ? "bg-[#1F6F5F] text-white rounded-tr-sm font-bold"
                      : "bg-white dark:bg-[#1b1914] border border-[#d6eee7] dark:border-white/10 text-[#4f4434] dark:text-[#d4ccb8] rounded-tl-sm"
                  }`}
                >
                  {message.text}
                  {message.from === "bot" && message.text.includes("/customer/bookings") ? (
                    <Link to="/customer/bookings" className="mt-2 block font-bold text-emerald-700 underline dark:text-emerald-300">
                      Open My Bookings
                    </Link>
                  ) : null}
                  {message.from === "bot" && message.text.includes("/login") ? (
                    <Link to="/login" className="mt-2 block font-bold text-emerald-700 underline dark:text-emerald-300">
                      Sign in
                    </Link>
                  ) : null}
                  {message.from === "bot" && message.text.includes("/vision-suites") ? (
                    <Link to="/vision-suites" className="mt-2 block font-bold text-emerald-700 underline dark:text-emerald-300">
                      Browse rooms
                    </Link>
                  ) : null}
                  {message.from === "bot" && message.text.includes("/customer/dashboard") ? (
                    <Link to="/customer/dashboard" className="mt-2 block font-bold text-emerald-700 underline dark:text-emerald-300">
                      Open Customer Dashboard
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}

            {!messages.some((message) => message.from === "user") ? (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-[#8d7e63] dark:text-[#9e927b]">Try asking:</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSend(question)}
                      disabled={isTyping}
                      className="rounded-full border border-[#d6eee7] dark:border-white/10 bg-white dark:bg-[#1b1914] px-2.5 py-1.5 text-left text-[10px] leading-snug text-[#1F6F5F] dark:text-[#9ad8c2] hover:bg-[#eaf8f3] dark:hover:bg-[#24221b] disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isTyping ? (
              <div className="text-[11px] font-semibold text-[#8d7e63] dark:text-[#9e927b]">Assistant is typing...</div>
            ) : null}
          </div>

          {notice ? (
            <p className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7a5f] dark:text-[#9d8f77] border-t border-[#eee4cf] dark:border-white/10">
              {notice}
            </p>
          ) : null}

          <div className="p-3 border-t border-[#eee4cf] dark:border-white/10 bg-[#fbf5e9] dark:bg-[#1a1915]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about rooms, promos, booking..."
                className="flex-1 rounded-xl border border-[#d6eee7] dark:border-white/10 bg-white dark:bg-[#12110d] px-3 py-2 text-sm text-[#504434] dark:text-[#d4ccb8] outline-none focus:border-[#1F6F5F]"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="h-10 w-10 rounded-xl bg-[#1F6F5F] text-white disabled:opacity-50 flex items-center justify-center hover:bg-[#288B77]"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
