// client/src/components/RescheduleModal.jsx
//
// MODULE 8 — RESCHEDULING SYSTEM
// TIME_SLOTS are fetched from the backend (single source of truth).
// No hardcoded TIME_SLOTS array.
// MIN_HOURS_BEFORE_RESCHEDULE is fetched from the backend config endpoint.

import { useState, useEffect, useCallback } from "react";
import {
  X, CalendarDays, Clock, CalendarClock,
  AlertTriangle, ArrowRight, RotateCcw,
} from "lucide-react";
import { toast } from "../utils/toast";
import { rescheduleBooking } from "../services/bookingApi";
import { getTimeSlots, getRescheduleHours } from "../services/adminApi";
import {
  getLocalDateString,
  isPastDate,
  isToday,
  getAvailableSlots,
  allSlotsDisabled,
  parseSlotToMinutes,
} from "../utils/bookingValidation";

function parseBookingDate(value) {
  if (!value) return new Date(NaN);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  return new Date(s);
}

function isTooClose(booking, minHours) {
  if (minHours === 0) return false;
  try {
    const d = parseBookingDate(booking.date);
    const slotMins = parseSlotToMinutes(booking.time);
    if (slotMins === -1) return false;
    d.setHours(Math.floor(slotMins / 60), slotMins % 60, 0, 0);
    const msRemaining = d - new Date();
    if (msRemaining < 0) return false;
    return msRemaining < minHours * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function formatSlot(dateStr, timeStr) {
  if (!dateStr || !timeStr) return "—";
  const d = parseBookingDate(dateStr);
  const label = d.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  return `${label}, ${timeStr}`;
}

export default function RescheduleModal({ booking, onClose, onSuccess }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const [timeSlots, setTimeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  // Reschedule lockout window fetched from server — no hardcoded value.
  const [minHoursBeforeReschedule, setMinHoursBeforeReschedule] = useState(2);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    getTimeSlots()
      .then((res) => setTimeSlots(res.data.timeSlots || []))
      .catch(() => setTimeSlots([]))
      .finally(() => setSlotsLoading(false));
  }, []);

  useEffect(() => {
    getRescheduleHours()
      .then((res) => {
        const val = res.data.minHoursBeforeReschedule;
        if (typeof val === "number" && val >= 0) {
          setMinHoursBeforeReschedule(val);
        }
      })
      .catch(() => {
        // Keep the safe default (2h) on network failure
      })
      .finally(() => setConfigLoading(false));
  }, []);

  const today = getLocalDateString(now);
  const currentDateStr = getLocalDateString(parseBookingDate(booking.date));

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  const enrichedSlots = getAvailableSlots(timeSlots, date, now);
  const noSlotsLeft   = date && allSlotsDisabled(timeSlots, date, now);

  useEffect(() => {
    if (!time || !date) return;
    const match = enrichedSlots.find((s) => s.slot === time);
    if (match?.disabled) setTime("");
  }, [now, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = useCallback((e) => {
    const newDate = e.target.value;
    setDate(newDate);
    setTime((prev) => {
      if (!prev) return "";
      const stillValid = !getAvailableSlots(timeSlots, newDate, now)
        .find((s) => s.slot === prev)?.disabled;
      return stillValid ? prev : "";
    });
  }, [now, timeSlots]);

  const tooClose = isTooClose(booking, minHoursBeforeReschedule);
  const isReady  = !slotsLoading && !configLoading;

  const handleSubmit = async () => {
    if (tooClose) return;
    if (!date) { toast.error("Please select a new date."); return; }
    if (isPastDate(date)) { toast.error("Past dates cannot be selected."); return; }
    if (!time) { toast.error("Please select a time slot."); return; }
    const chosen = enrichedSlots.find((s) => s.slot === time);
    if (chosen?.disabled) {
      toast.error(chosen.reason || "This time slot is no longer available.");
      setTime("");
      return;
    }
    if (date === currentDateStr && time === booking.time) {
      toast.error("The new schedule is the same as the current one. Please pick a different date or time.");
      return;
    }
    setLoading(true);
    try {
      const res = await rescheduleBooking(booking._id, { date, time });
      toast.success("Booking rescheduled successfully! 📅");
      onSuccess(res.data.booking);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reschedule. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(11,29,58,0.58)", backdropFilter: "blur(7px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ boxShadow: "0 24px 64px rgba(8,53,74,0.18), 0 4px 16px rgba(0,0,0,0.08)" }}
      >
        {/* Header */}
        <div className="bg-primary dark:bg-primary-dark px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <CalendarClock size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Change appointment</p>
              <h2 className="text-white font-bold text-base leading-tight truncate max-w-[220px]">
                {booking.service}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto max-h-[80vh] sm:max-h-none">

          {/* Current appointment pill */}
          <div className="rounded-xl bg-bg border border-border px-4 py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CalendarDays size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wider mb-0.5">Current appointment</p>
              <p className="text-sm font-semibold text-text">
                {formatSlot(booking.date, booking.time)}
              </p>
            </div>
          </div>

          {!isReady ? (
            <div className="flex items-center justify-center py-8">
              <span className="inline-block w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : tooClose ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  Too close to reschedule
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Rescheduling is not allowed within{" "}
                  <span className="font-bold">{minHoursBeforeReschedule} hours</span>{" "}
                  of the appointment. Please call us to make last-minute changes.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* New date */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-text">
                  <CalendarDays size={14} className="text-primary" />
                  New Date <span className="text-primary text-xs font-normal">*</span>
                </label>
                <input
                  type="date"
                  min={today}
                  value={date}
                  onChange={handleDateChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
                    transition-all hover:bg-card [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              {/* New time */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-text">
                  <Clock size={14} className="text-primary" />
                  New Time Slot <span className="text-primary text-xs font-normal">*</span>
                </label>

                {!date && (
                  <p className="text-xs text-muted py-1">Select a date first to see available slots.</p>
                )}

                {date && noSlotsLeft && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    No available slots for today. Please choose a future date.
                  </div>
                )}

                {date && !noSlotsLeft && (
                  <div className="grid grid-cols-3 gap-2">
                    {enrichedSlots.map(({ slot, disabled, reason }) => {
                      const isSelected = time === slot;
                      const isCurrent  = date === currentDateStr && slot === booking.time;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          title={disabled ? reason : isCurrent ? "Current slot" : ""}
                          onClick={() => !disabled && setTime(slot)}
                          className={`
                            relative py-2.5 px-1 rounded-xl text-xs font-semibold text-center
                            transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30
                            ${disabled
                              ? "bg-bg text-muted/40 border border-border cursor-not-allowed line-through"
                              : isSelected
                                ? "bg-primary text-white border border-primary shadow-sm shadow-primary/30 scale-[1.03]"
                                : isCurrent
                                  ? "bg-primary/8 text-primary border border-primary/30 hover:bg-primary/15"
                                  : "bg-bg text-text border border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            }
                          `}
                        >
                          {slot}
                          {isCurrent && !isSelected && (
                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] bg-primary/20 text-primary px-1.5 py-px rounded-full font-bold whitespace-nowrap">
                              current
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {date && time && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-4 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                    <ArrowRight size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider mb-0.5">New appointment</p>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      {formatSlot(date, time)}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-muted hover:bg-bg text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            {isReady && !tooClose && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !date || !time || slotsLoading}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  bg-primary hover:bg-primary-hover text-white text-sm font-bold
                  transition-all hover:-translate-y-0.5 shadow-md shadow-primary/30
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {loading
                  ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><RotateCcw size={14} /> Confirm Reschedule</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}