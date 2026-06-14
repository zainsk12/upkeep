// admin-client/src/pages/ReviewsPage.jsx

import { useEffect, useState, useCallback } from "react";
import { toast } from "../utils/toast";
import {
  Star, Trash2, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  Bookmark, BookmarkCheck, Settings2, Save,
} from "lucide-react";
import {
  getAdminReviews,
  toggleFeatureReview,
  deleteAdminReview,
  getReviewSettings,
  updateReviewSettings,
} from "../services/api";

/* ─── Star display ───────────────────────────────────── */
function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </div>
  );
}

/* ─── Review row card ────────────────────────────────── */
function ReviewRow({ review, onToggleFeature, onDelete }) {
  const [featuring, setFeaturing] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [confirm, setConfirm]     = useState(false);

  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  const handleToggle = async () => {
    setFeaturing(true);
    try {
      await onToggleFeature(review._id, !review.isFeatured);
    } finally {
      setFeaturing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      await onDelete(review._id);
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <div className={`admin-card p-4 sm:p-5 transition-all duration-200 ${
      review.isFeatured ? "ring-1 ring-amber-300/60 bg-amber-50/30" : ""
    }`}>
      {/* Top row: name, rating, service, date */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center
            flex-shrink-0 text-primary font-bold text-sm">
            {review.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-gray-800 font-semibold text-sm leading-tight">{review.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{date}</p>
          </div>
          <StarDisplay rating={review.rating} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500
            bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
            {review.serviceType}
          </span>
          {review.isFeatured && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700
              bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggle}
            disabled={featuring}
            title={review.isFeatured ? "Unfeature review" : "Feature review"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              review.isFeatured
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {featuring ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : review.isFeatured ? (
              <BookmarkCheck size={12} />
            ) : (
              <Bookmark size={12} />
            )}
            {review.isFeatured ? "Unfeature" : "Feature"}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              confirm
                ? "bg-red-500 border-red-500 text-white"
                : "bg-gray-50 border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
            }`}
          >
            {deleting ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            {confirm ? "Confirm?" : "Delete"}
          </button>

          {confirm && (
            <button
              onClick={() => setConfirm(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1.5 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Comment */}
      <p className="text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
        "{review.comment}"
      </p>
    </div>
  );
}

/* ─── Threshold settings panel ───────────────────────── */
function ThresholdPanel({ settings, onSave }) {
  const [val, setVal]     = useState(settings.threshold ?? 4);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setVal(settings.threshold ?? 4); }, [settings.threshold]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(val);
      toast.success(`Threshold updated to ${val} ★`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update threshold.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 size={16} className="text-primary" />
        <h3 className="text-gray-800 font-semibold text-sm">Homepage Review Settings</h3>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Minimum rating threshold
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Reviews with rating ≥ this value appear on the homepage (plus any manually featured reviews).
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={val}
              onChange={(e) => setVal(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-12 text-center font-bold text-primary text-sm bg-primary/8
              border border-primary/20 rounded-lg py-1">
              {val} ★
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-400 min-w-[160px] space-y-1">
          <p><span className="font-semibold text-gray-600">{settings.featured ?? 0}</span> featured reviews</p>
          <p><span className="font-semibold text-gray-600">{settings.total ?? 0}</span> total reviews</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover
            text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed
            shadow-sm shadow-primary/20"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
    </div>
  );
}

/* ─── Sort options ───────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "newest",   label: "Newest"        },
  { value: "oldest",   label: "Oldest"        },
  { value: "highest",  label: "Highest Rated" },
  { value: "lowest",   label: "Lowest Rated"  },
  { value: "featured", label: "Featured First" },
];

const FEATURED_FILTER = [
  { value: "",      label: "All Reviews"      },
  { value: "true",  label: "Featured Only"    },
  { value: "false", label: "Non-featured Only" },
];

/* ─── Main Page ──────────────────────────────────────── */
export default function ReviewsPage() {
  const [reviews, setReviews]       = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [settings, setSettings]     = useState({ threshold: 4, total: 0, featured: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [sort, setSort]             = useState("newest");
  const [featured, setFeatured]     = useState("");
  const [page, setPage]             = useState(1);
  const LIMIT = 15;

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT, sort };
      if (featured) params.featured = featured;
      const res = await getAdminReviews(params);
      setReviews(res.data.reviews || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [page, sort, featured]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await getReviewSettings();
      setSettings(res.data);
    } catch {
      /* settings not critical */
    }
  }, []);

  useEffect(() => {
    loadReviews();
    loadSettings();
  }, [loadReviews, loadSettings]);

  const handleToggleFeature = async (id, isFeatured) => {
    try {
      await toggleFeatureReview(id, isFeatured);
      toast.success(isFeatured ? "Review featured." : "Review unfeatured.");
      setReviews((prev) =>
        prev.map((r) => (r._id === id ? { ...r, isFeatured } : r))
      );
      setSettings((prev) => ({
        ...prev,
        featured: isFeatured ? prev.featured + 1 : prev.featured - 1,
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update review.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminReview(id);
      toast.success("Review deleted.");
      setReviews((prev) => prev.filter((r) => r._id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      setSettings((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete review.");
    }
  };

  const handleSaveThreshold = async (val) => {
    const res = await updateReviewSettings(val);
    setSettings((prev) => ({ ...prev, threshold: res.data.threshold }));
  };

  const handleFilterChange = (key, val) => {
    if (key === "sort")     { setSort(val);     setPage(1); }
    if (key === "featured") { setFeatured(val); setPage(1); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl overflow-x-hidden space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Reviews</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Manage customer reviews and homepage visibility.
          </p>
        </div>
        <button
          onClick={() => { loadReviews(); loadSettings(); }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200
            bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Settings panel */}
      <ThresholdPanel settings={settings} onSave={handleSaveThreshold} />

      {/* Filter / sort bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <SlidersHorizontal size={14} />
          <span className="font-medium">Filter:</span>
        </div>

        {/* Featured filter */}
        <select
          value={featured}
          onChange={(e) => handleFilterChange("featured", e.target.value)}
          className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-1.5
            text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          {FEATURED_FILTER.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => handleFilterChange("sort", e.target.value)}
          className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-1.5
            text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-gray-400">
          {pagination.total} review{pagination.total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100
          rounded-xl text-red-600 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="admin-card p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-32" />
                  <div className="h-2.5 bg-gray-100 rounded w-20" />
                </div>
                <div className="flex gap-2">
                  <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                  <div className="h-7 w-16 bg-gray-100 rounded-lg" />
                </div>
              </div>
              <div className="space-y-1.5 border-t border-gray-50 pt-3">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="admin-card flex flex-col items-center justify-center py-20 text-center">
          <Star size={36} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-gray-500 font-semibold">No reviews found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewRow
                key={r._id}
                review={r}
                onToggleFeature={handleToggleFeature}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600
                  flex items-center justify-center hover:bg-gray-50 disabled:opacity-40
                  disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="text-sm text-gray-500 px-3">
                Page <span className="font-semibold text-gray-700">{page}</span> of{" "}
                <span className="font-semibold text-gray-700">{pagination.totalPages}</span>
              </span>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600
                  flex items-center justify-center hover:bg-gray-50 disabled:opacity-40
                  disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}