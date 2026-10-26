import React from "react";

export default function RoomDiscountBadge({ discountType, discountValue, className = "" }) {
  const type = String(discountType || "none").toLowerCase();
  const value = Number(discountValue || 0);
  if (!["fixed", "percentage"].includes(type) || !Number.isFinite(value) || value <= 0) return null;

  const label = type === "percentage"
    ? `${value}% OFF`
    : `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })} OFF`;

  return (
    <span className={`inline-flex items-center rounded-md border border-amber-300/70 bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900 shadow-sm dark:border-amber-300/30 dark:bg-amber-300 dark:text-amber-950 ${className}`}>
      Special Offer · {label}
    </span>
  );
}
