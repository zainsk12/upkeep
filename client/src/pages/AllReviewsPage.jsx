// client/src/pages/AllReviewsPage.jsx

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchAllReviews } from "../services/reviewApi";
import {
  Star, Quote, CheckCircle2, ChevronLeft, ChevronRight,
  ArrowLeft, SlidersHorizontal,
} from "lucide-react";

/* ─── Avatar palette ─────────────────────────────────── */
const AVATAR_PALETTE = [
  { bg: "bg-rose-100 dark:bg-rose-900/30",      color: "text-rose-700 dark:text-rose-300"       },
  { bg: "bg-sky-100 dark:bg-sky-900/30",         color: "text-sky-700 dark:text-sky-300"         },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/30",   color: "text-violet-700 dark:text-violet-300"   },
  { bg: "bg-amber-100 dark:bg-amber-900/30",     color: "text-amber-700 dark:text-amber-300"     },
  { bg: "bg-teal-100 dark:bg-teal-900/30",       color: "text-teal-700 dark:text-teal-300"       },
];

const avatarStyle = (name = "") => {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
};

/* ─── Star display ───────────────────────────────────── */
function StarDisplay({ rating, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < rating ? "text-amber-400 fill-amber-400" : "text-border fill-border"}
        />
      ))}
    </div>
  );
}

/* ─── Review Card ────────────────────────────────────── */
function ReviewCard({ review }) {
  const { bg, color } = avatarStyle(review.name);
  const initial = review.name?.charAt(0).toUpperCase() || "?";
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "";

  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4
        hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      <Quote
        size={28}
        className="absolute top-5 right-5 text-border group-hover:text-border/80 transition-colors"
        strokeWidth={1.5}
      />

      {/* Stars + service badge */}
      <div className="flex items-center justify-between">
        <StarDisplay rating={review.rating} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted
          bg-bg border border-border px-2 py-0.5 rounded-full">
          {review.serviceType}
        </span>
      </div>

      {/* Comment */}
      <p className="text-muted text-sm leading-relaxed flex-1 relative z-10">
        "{review.comment}"
      </p>

      <div className="w-full h-px bg-border" />

      {/* Author row */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center
          flex-shrink-0 ring-2 ring-card`}>
          <span className={`text-sm font-bold ${color}`}>{initial}</span>
        </div>
        <div>
          <div className="text-text font-semibold text-sm leading-tight">{review.name}</div>
          <div className="text-muted text-xs mt-0.5">{date}</div>
        </div>
        <CheckCircle2 size={15} className="text-emerald-400 ml-auto flex-shrink-0" />
      </div>
    </div>
  );
}

/* ─── Skeleton card ──────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="flex gap-1">
          {[1,2,3,4,5].map((s) => <div key={s} className="w-3 h-3 rounded bg-bg" />)}
        </div>
        <div className="w-16 h-4 bg-bg rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-bg rounded w-full" />
        <div className="h-3 bg-bg rounded w-5/6" />
        <div className="h-3 bg-bg rounded w-4/6" />
      </div>
      <div className="h-px bg-border mb-4" />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-bg flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3 bg-bg rounded w-24" />
          <div className="h-2.5 bg-bg rounded w-16" />
        </div>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "newest",  label: "Newest First"  },
  { value: "oldest",  label: "Oldest First"  },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest",  label: "Lowest Rated"  },
];

/* ─── Main Page ──────────────────────────────────────── */
export default function AllReviewsPage() {
  const [reviews, setReviews]     = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading]     = useState(true);
  const [sort, setSort]           = useState("newest");
  const [page, setPage]           = useState(1);
  const LIMIT = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllReviews({ page, limit: LIMIT, sort });
      setReviews(data.reviews || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort]);

  useEffect(() => { load(); }, [load]);

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted hover:text-text text-sm
              font-medium transition-colors mb-6"
          >
            <ArrowLeft size={15} strokeWidth={2} /> Back to Home
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20
                text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest
                border border-amber-100 dark:border-amber-800/40 mb-3">
                Customer Reviews
              </span>
              <h1 className="text-3xl font-bold text-text">All Reviews</h1>
              <p className="text-muted text-sm mt-1">
                {pagination.total > 0
                  ? `${pagination.total} verified customer review${pagination.total !== 1 ? "s" : ""}`
                  : "No reviews yet"}
              </p>
            </div>

            {/* Sort control */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-muted flex-shrink-0" />
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="text-sm bg-bg border border-border rounded-xl px-3 py-2
                  text-text focus:outline-none focus:ring-2 focus:ring-primary/20
                  focus:border-primary/40 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-24">
            <Star size={40} className="text-border mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-text font-semibold text-lg">No reviews yet</p>
            <p className="text-muted text-sm mt-1">Be the first to leave a review!</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((r) => (
                <ReviewCard key={r._id} review={r} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-xl border border-border bg-card text-text
                    flex items-center justify-center hover:border-primary/30 hover:bg-primary/5
                    disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.totalPages ||
                    Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center
                        justify-center text-muted text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-9 h-9 rounded-xl border text-sm font-semibold
                          transition-all ${
                          p === page
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "border-border bg-card text-text hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="w-9 h-9 rounded-xl border border-border bg-card text-text
                    flex items-center justify-center hover:border-primary/30 hover:bg-primary/5
                    disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            <p className="text-center text-muted text-xs mt-4">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          </>
        )}
      </div>
    </div>
  );
}