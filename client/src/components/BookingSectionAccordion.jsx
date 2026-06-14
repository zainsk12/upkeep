/**
 * BookingSectionAccordion.jsx
 *
 * Reusable collapsible section for grouping booking cards by status.
 *
 * Animation technique: CSS `grid-template-rows` transition from `0fr` → `1fr`.
 * This avoids the max-height hack (no arbitrary large value needed) and produces
 * a perfectly smooth, content-aware collapse without JavaScript height measurement.
 *
 * Usage:
 *   <BookingSectionAccordion
 *     title="Pending Review"
 *     count={3}
 *     defaultOpen={true}
 *     dotColor="bg-amber-400"
 *     emptyMessage="No pending bookings"
 *   >
 *     {bookingCards}
 *   </BookingSectionAccordion>
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * @param {object}          props
 * @param {string}          props.title         Section heading, e.g. "🕐 Pending Review"
 * @param {number}          props.count         Booking count shown beside the title
 * @param {boolean}         [props.defaultOpen] Start expanded (default: true)
 * @param {string}          [props.dotColor]    Tailwind bg-* class for the status dot
 * @param {string}          [props.accentColor] Tailwind text-* class for count badge
 * @param {string}          [props.emptyMessage] Text when count === 0
 * @param {React.ReactNode} props.children      Booking card grid / list
 */
export default function BookingSectionAccordion({
  title,
  count,
  defaultOpen = true,
  dotColor = "bg-muted",
  accentColor = "text-primary",
  emptyMessage = "No bookings in this section yet",
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isEmpty = count === 0;

  return (
    <div
      className="rounded-2xl border border-border bg-card overflow-hidden
        shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* ── Header / Toggle ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group
          hover:bg-bg/70 active:bg-bg transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
      >
        {/* Animated status dot */}
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform
            duration-200 group-hover:scale-125 ${dotColor}`}
        />

        {/* Section title */}
        <span className="flex-1 text-base font-bold text-text">{title}</span>

        {/* Count badge */}
        <span
          className={`
            min-w-[1.75rem] text-center text-xs font-bold px-2.5 py-0.5 rounded-full
            transition-colors duration-150
            ${isEmpty
              ? "bg-bg text-muted"
              : `bg-primary/8 dark:bg-primary/15 ${accentColor}`
            }
          `}
        >
          {count}
        </span>

        {/* Divider line — subtle visual weight before chevron */}
        <span className="w-px h-4 bg-border flex-shrink-0" />

        {/* Animated chevron */}
        <ChevronDown
          size={16}
          strokeWidth={2.5}
          className={`
            text-muted flex-shrink-0 transition-transform duration-300 ease-in-out
            ${isOpen ? "rotate-180" : "rotate-0"}
          `}
        />
      </button>

      {/* ── Collapsible body using CSS grid trick ──
          grid-template-rows: 0fr  → content collapses to zero
          grid-template-rows: 1fr  → content expands to natural height
          The inner div needs min-h-0 to allow shrinking below its natural height.
      ── */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-border px-5 pt-4 pb-5">
            {isEmpty ? (
              /* ── Per-section empty state ── */
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center select-none">
                <span className="text-3xl opacity-25">📋</span>
                <p className="text-sm text-muted italic">{emptyMessage}</p>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}