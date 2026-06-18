import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchHomepageReviews, fetchReviewStats } from "../services/reviewApi";
import { getPublicServices, getSiteConfig } from "../services/adminApi";
import {
  Search, CalendarCheck2, BadgeCheck,
  MapPin, Phone, Mail,
  ArrowRight, UserPlus,
  ShieldCheck, BadgeDollarSign, Zap as ZapIcon, ThumbsUp,
  Star, Quote, HeadphonesIcon, CalendarCheck, CheckCircle2,
  Zap, Droplets, Sparkles, Hammer, Wind, Paintbrush2, Bug, Wrench,
} from "lucide-react";

/* ─── How it works steps ─────────────────────────────── */
const STEPS = [
  { num: "01", icon: Search,         title: "Choose a Service", desc: "Browse our curated list of professional home services." },
  { num: "02", icon: CalendarCheck2, title: "Book a Slot",      desc: "Select your preferred date, time, and location."       },
  { num: "03", icon: BadgeCheck,     title: "Job Done",         desc: "A verified expert arrives and completes the work."     },
];

/* ─── Why choose us — 6 cards ────────────────────────── */
const WHY_US = [
  {
    icon: ShieldCheck,
    title: "Verified Professionals",
    desc: "Every expert is background-checked, certified, and trained before they enter your home.",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-100 dark:border-emerald-800/40",
  },
  {
    icon: BadgeDollarSign,
    title: "Transparent Pricing",
    desc: "No hidden charges, no surprises. Get a clear cost estimate before confirming any booking.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-100 dark:border-blue-800/40",
  },
  {
    icon: ZapIcon,
    title: "Fast & Reliable Service",
    desc: "Need something fixed urgently? Many of our services are available for same-day booking.",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-100 dark:border-amber-800/40",
  },
  {
    icon: ThumbsUp,
    title: "100% Satisfaction Guarantee",
    desc: "Not happy with the work? We'll make it right — 100% satisfaction or we redo it for free.",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-100 dark:border-rose-800/40",
  },
  {
    icon: CalendarCheck,
    title: "Easy Booking Process",
    desc: "Book any service in under 60 seconds — pick a date, time, and location. We handle the rest.",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-100 dark:border-violet-800/40",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Customer Support",
    desc: "Our support team is always ready to help — before, during, and after every service.",
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-100 dark:border-teal-800/40",
  },
];

/* ─── Avatar palette ─────────────────────────────────── */
const AVATAR_PALETTE = [
  { bg: "bg-rose-100 dark:bg-rose-900/30",       color: "text-rose-700 dark:text-rose-300"    },
  { bg: "bg-sky-100 dark:bg-sky-900/30",          color: "text-sky-700 dark:text-sky-300"      },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30",  color: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/30",    color: "text-violet-700 dark:text-violet-300"   },
  { bg: "bg-amber-100 dark:bg-amber-900/30",      color: "text-amber-700 dark:text-amber-300"  },
  { bg: "bg-teal-100 dark:bg-teal-900/30",        color: "text-teal-700 dark:text-teal-300"    },
];

const avatarStyle = (name = "") => {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
};

/* ─── Star display helper ────────────────────────────── */
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

/* ─── Single testimonial card ────────────────────────── */
function TestimonialCard({ name, rating, comment, serviceType, initial, bg, color }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4
      hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      <Quote
        size={32}
        className="absolute top-5 right-5 text-border group-hover:text-border/80 transition-colors"
        strokeWidth={1.5}
      />
      <div className="flex items-center justify-between">
        <StarDisplay rating={rating} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted
          bg-bg border border-border px-2 py-0.5 rounded-full">
          {serviceType}
        </span>
      </div>
      <p className="text-muted text-sm leading-relaxed flex-1 relative z-10">
        "{comment}"
      </p>
      <div className="w-full h-px bg-border" />
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0 ring-2 ring-card`}>
          <span className={`text-sm font-bold ${color}`}>{initial}</span>
        </div>
        <div>
          <div className="text-text font-semibold text-sm leading-tight">{name}</div>
          <div className="text-muted text-xs mt-0.5">Verified Customer</div>
        </div>
        <CheckCircle2 size={15} className="text-emerald-400 ml-auto flex-shrink-0" />
      </div>
    </div>
  );
}

/* ─── Testimonials section ───────────────────────────── */
function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const reviews = await fetchHomepageReviews(6);
        if (cancelled) return;
        if (Array.isArray(reviews) && reviews.length > 0) {
          const shaped = reviews.map((r) => {
            const { bg, color } = avatarStyle(r.name);
            return {
              name:        r.name,
              rating:      r.rating,
              comment:     r.comment,
              serviceType: r.serviceType,
              initial:     r.name.charAt(0).toUpperCase(),
              bg,
              color,
            };
          });
          setTestimonials(shaped);
        } else {
          setTestimonials([]);
        }
      } catch {
        if (!cancelled) setTestimonials([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-20 bg-bg">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400
            text-xs font-semibold uppercase tracking-widest border border-amber-100 dark:border-amber-800/40 mb-4">
            Customer Reviews
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-text landing-heading">
            What Our Customers Say
          </h2>
          <p className="text-muted text-sm mt-3 max-w-sm mx-auto leading-relaxed">
            Real stories from real customers across Nashik.
          </p>

          <div className="flex items-center justify-center gap-2 mt-5">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-text font-bold text-sm">4.9</span>
            <span className="text-muted text-sm">/ 5 — based on 10,000+ reviews</span>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <div key={s} className="w-3 h-3 rounded bg-bg" />
                    ))}
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
            ))}
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Star size={36} className="mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">No reviews yet.</p>
            <p className="text-sm mt-1">Be the first to share your experience!</p>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full
                bg-card border border-border text-sm font-semibold text-text
                hover:border-primary/25 hover:text-primary hover:-translate-y-0.5 transition-all"
            >
              Book a Service <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} />
            ))}
          </div>
        )}

        {/* View All Reviews CTA */}
        {!loading && testimonials.length > 0 && (
          <div className="text-center mt-10">
            <Link
              to="/reviews"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                bg-card border border-border text-text hover:border-primary/25 hover:text-primary
                font-semibold text-sm hover:-translate-y-0.5 transition-all duration-200
                shadow-sm hover:shadow-md"
            >
              View All Reviews <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Scalable icon palette for homepage service cards ──────────────────── */
const KNOWN_ICONS = {
  "Electrical":   { icon: Zap,         color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20"   },
  "Plumbing":     { icon: Droplets,    color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20"     },
  "Cleaning":     { icon: Sparkles,    color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  "Carpentry":    { icon: Hammer,      color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/20" },
  "AC Service":   { icon: Wind,        color: "text-sky-500",     bg: "bg-sky-50 dark:bg-sky-900/20"       },
  "Painting":     { icon: Paintbrush2, color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-900/20" },
  "Pest Control": { icon: Bug,         color: "text-lime-600",    bg: "bg-lime-50 dark:bg-lime-900/20"     },
};

const FALLBACK_ICON_PALETTE = [
  { icon: Wrench,      color: "text-primary",    bg: "bg-primary/10"                           },
  { icon: ZapIcon,     color: "text-rose-500",   bg: "bg-rose-50 dark:bg-rose-900/20"          },
  { icon: ShieldCheck, color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-900/20"          },
  { icon: Wrench,      color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20"      },
  { icon: Hammer,      color: "text-pink-500",   bg: "bg-pink-50 dark:bg-pink-900/20"          },
  { icon: Wind,        color: "text-cyan-500",   bg: "bg-cyan-50 dark:bg-cyan-900/20"          },
];

function getHomepageServiceMeta(name = "") {
  if (KNOWN_ICONS[name]) return KNOWN_ICONS[name];
  const idx = (name.charCodeAt(0) || 0) % FALLBACK_ICON_PALETTE.length;
  return FALLBACK_ICON_PALETTE[idx];
}

/* ─── Homepage Services Section (fully dynamic, no static dependency) ──── */
function HomepageServicesSection() {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPublicServices()
      .then((res) => {
        if (cancelled) return;
        const active = (res.data.services || [])
          .filter((s) => s.isEnabled !== false)
          .slice(0, 4);
        setServices(active);
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
      <div className="text-center mb-12">
        <span className="inline-block px-3 py-1 rounded-full bg-primary/8 text-primary
          text-xs font-semibold uppercase tracking-widest mb-4">
          What We Offer
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-text landing-heading">Explore Services</h2>
        <p className="text-muted mt-3 max-w-md mx-auto text-sm leading-relaxed">
          From quick repairs to complete home transformations.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-card border border-border rounded-2xl p-4 sm:p-5 animate-pulse">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-bg mx-auto mb-3" />
              <div className="h-3 bg-bg rounded w-2/3 mx-auto mb-2" />
              <div className="h-2.5 bg-bg rounded w-full hidden sm:block" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? null : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {services.map((dbSvc) => {
            const { icon: Icon, bg, color } = getHomepageServiceMeta(dbSvc.name);
            const description = (dbSvc.description && dbSvc.description.trim())
              ? dbSvc.description
              : "";

            return (
              <Link
                key={dbSvc._id || dbSvc.name}
                to="/services"
                className="group bg-card rounded-2xl p-4 sm:p-5 text-center border border-border
                  hover:shadow-xl hover:shadow-primary/[0.10] hover:-translate-y-2 hover:border-primary/20
                  transition-all duration-300 shadow-sm"
                style={{ boxShadow: "0 2px 8px rgba(8,53,74,0.05)" }}
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${bg} flex items-center justify-center
                    mx-auto mb-3 group-hover:scale-105 transition-transform duration-300`}
                >
                  <Icon size={20} className={color} strokeWidth={1.8} />
                </div>
                <div className="font-semibold text-text text-xs sm:text-sm">{dbSvc.name}</div>
                {description && (
                  <div className="text-muted text-xs mt-1 leading-relaxed line-clamp-2 hidden sm:block">
                    {description}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* View All Services CTA */}
      <div className="text-center mt-10">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full
            bg-card border border-border text-text hover:border-primary/25 hover:text-primary
            font-semibold text-sm hover:-translate-y-0.5 transition-all duration-200
            shadow-sm hover:shadow-md"
        >
          View All Services <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

/* ─── Hero stats — single source of truth for desktop + mobile ── */
const HERO_SUPPORTING_STATS = [
  { value: "1000+", label: "Happy Homes"   },
  { value: "100+",  label: "Verified Pros" },
  { value: "10+",   label: "Home Services" },
];
const HERO_RATING_FALLBACK = "4.9";

/* ─── Main Landing Page ──────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth();
  const isLoggedIn = user != null;

  const [avgRating, setAvgRating] = useState(null);

  useEffect(() => {
    fetchReviewStats()
      .then(({ averageRating }) => {
        if (averageRating != null) setAvgRating(averageRating.toFixed(1));
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  const displayRating = avgRating ?? HERO_RATING_FALLBACK;

  const [siteConfig, setSiteConfig] = useState({
    businessName: "UpKeep",
    tagline:      "by Austrum",
    city:         "Nashik, Maharashtra",
    phone:        "+91 98765 43210",
    email:        "support@austrum.in",
  });

  useEffect(() => {
    getSiteConfig()
      .then((res) => setSiteConfig(res.data))
      .catch(() => { /* keep defaults */ });
  }, []);

  return (
    <div className="bg-bg">

      {/* ── HERO ── */}
      <section className="relative flex flex-col overflow-hidden min-h-[62svh] sm:min-h-[70vh]">

        {/* Background photo — file untouched per hard constraint */}
        <img
          src="/hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay — directional navy-charcoal duotone scrim.
            Darkest top-left (content column), eases bottom-right so the photo
            reads as deep navy-charcoal, not its original pink/burgundy.
            Per BRAND_REFRESH_GUIDE.md §11 / HERO_REDESIGN_PLAN.md §8. */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(110deg, rgba(5,15,25,0.96) 0%, rgba(8,53,74,0.91) 55%, rgba(8,53,74,0.83) 100%)" }}
        />

        {/* ── Main content — vertically centered, fills remaining space ── */}
        <div className="relative flex-1 flex items-center">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-12 sm:pt-16 pb-2 w-full">

            {/* 1. Brand lockup — stacked: logo · UpKeep / by Austrum */}
            <div
              className="flex items-center gap-3 mb-4 sm:mb-5 animate-in"
              style={{ animationDelay: "0ms" }}
            >
              <img
                src="/upkeep_logo.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover
                  border-2 border-white/20 shadow-md flex-shrink-0"
              />
              <div className="flex flex-col justify-center">
                <span className="text-white text-2xl sm:text-3xl font-bold nav-brand tracking-tight leading-tight">
                  UpKeep
                </span>
                <span className="text-white/45 text-[11px] font-medium tracking-wide leading-none mt-0.5">
                  by Austrum
                </span>
              </div>
            </div>

            {/* 2. Headline */}
            <h1
              className="text-[2.05rem] sm:text-4xl lg:text-5xl font-extrabold
                text-white leading-[1.1] tracking-tight mb-4 sm:mb-5
                landing-heading max-w-2xl animate-in"
              style={{ animationDelay: "80ms" }}
            >
              The trusted way to keep
              <br className="hidden sm:block" />{" "}
              your <span className="text-accent">home</span> running.
            </h1>

            {/* 3. Micro-trust row */}
            <div
              className="flex flex-wrap items-center gap-x-5 gap-y-2
                mb-5 sm:mb-6 animate-in"
              style={{ animationDelay: "160ms" }}
            >
              {[
                { icon: ShieldCheck, label: "Verified Professionals" },
                { icon: BadgeCheck,  label: "Background-Checked"     },
                { icon: ThumbsUp,    label: "100% Satisfaction"      },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-white/55 text-xs font-medium"
                >
                  <Icon
                    size={12}
                    className="text-emerald-400/90 flex-shrink-0"
                    strokeWidth={2.2}
                  />
                  {label}
                </span>
              ))}
            </div>

            {/* 4. CTA — single primary action */}
            <div
              className="animate-in"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-7 sm:px-8 py-3.5 rounded-full
                  bg-blush hover:bg-blush/85 text-primary-dark font-bold text-sm
                  transition-all duration-200 hover:-translate-y-0.5
                  shadow-lg shadow-black/25
                  focus:outline-none focus:ring-2 focus:ring-blush/50"
              >
                Book a Service <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>

        {/* 5. Stat strip */}
        <div
          className="relative mt-2 mb-8 sm:mb-20 animate-in"
          style={{ animationDelay: "320ms" }}
        >
          {/* Desktop / tablet — horizontal glass strip */}
          <div className="hidden sm:flex max-w-6xl mx-auto px-6 lg:px-10">
            <div
              className="flex-1 flex divide-x divide-white/[0.12]
                bg-white/[0.07] backdrop-blur-md border border-white/[0.12]
                rounded-2xl overflow-hidden"
            >
              {/* Rating — featured: copper accent, larger type, sub-line */}
              <div
                className="flex-1 flex flex-col items-center justify-center px-5 py-4
                  hover:bg-white/[0.05] transition-colors duration-200 cursor-default"
              >
                <div className="text-3xl font-extrabold text-accent leading-none tracking-tight">
                  {displayRating}
                </div>
                <div className="flex items-center gap-[2px] mt-1.5 mb-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <div className="text-white/55 text-xs">Average Rating</div>
              </div>

              {/* Three supporting stats */}
              {HERO_SUPPORTING_STATS.map(({ value, label }) => (
                <div
                  key={label}
                  className="flex-1 flex flex-col items-center justify-center px-5 py-4
                    hover:bg-white/[0.05] transition-colors duration-200 cursor-default"
                >
                  <div className="text-2xl font-bold text-white leading-none">{value}</div>
                  <div className="text-white/55 text-xs mt-1.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile — 2×2 grid, all four stats visible without scrolling */}
          <div className="sm:hidden grid grid-cols-2 gap-2.5 px-5">
            {/* Rating — featured, top-left */}
            <div
              className="flex flex-col items-center justify-center px-2.5 py-3
                bg-white/[0.10] backdrop-blur-md border border-white/[0.15] rounded-xl"
            >
              <div className="text-2xl font-extrabold text-accent leading-none">{displayRating}</div>
              <div className="flex items-center gap-[2px] my-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={8} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <div className="text-white/50 text-[10px] text-center leading-tight">Average Rating</div>
            </div>

            {/* Three supporting stats — top-right, bottom-left, bottom-right */}
            {HERO_SUPPORTING_STATS.map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center px-2.5 py-3
                  bg-white/[0.10] backdrop-blur-md border border-white/[0.15] rounded-xl"
              >
                <div className="text-xl font-bold text-white leading-none">{value}</div>
                <div className="text-white/50 text-[10px] mt-1 text-center leading-tight">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 900 0 720 20C540 40 240 0 0 20L0 60Z" fill="var(--bg)" />
          </svg>
        </div>
      </section>

      {/* ── SERVICE CATEGORIES ── */}
      <HomepageServicesSection />

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 md:py-20 bg-bg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/8 text-primary
              text-xs font-semibold uppercase tracking-widest mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text landing-heading">How It Works</h2>
            <p className="text-muted text-sm mt-3 max-w-xs mx-auto">
              Three steps to a cleaner, better home.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
              <div
                key={i}
                className="relative bg-card border border-border rounded-3xl p-7 sm:p-8
                text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full
                    bg-primary text-white text-xs font-bold flex items-center justify-center
                    shadow-md shadow-primary/25"
                >
                  {num}
                </div>
                <div
                  className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center
                  mx-auto mb-4 mt-2 group-hover:bg-primary/20 transition-colors duration-300"
                >
                  <Icon size={26} className="text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-text font-bold text-lg mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 -right-2.5 w-5 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US — 6 cards ── */}
      <section className="py-16 md:py-20 bg-bg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/8 text-primary
              text-xs font-semibold uppercase tracking-widest mb-4">
              Our Promise
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-text landing-heading">Why Choose Us</h2>
            <p className="text-muted text-sm mt-3 max-w-sm mx-auto leading-relaxed">
              We built UpKeep around one idea — home services should be stress-free.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_US.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div
                key={title}
                className={`bg-card rounded-2xl p-6 border ${border} shadow-sm
                  hover:shadow-md hover:-translate-y-1 transition-all duration-300 group`}
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}
              >
                <div className={`w-11 h-11 rounded-xl ${bg} border ${border} flex items-center
                  justify-center mb-4 group-hover:scale-105 transition-transform duration-300`}>
                  <Icon size={21} className={color} strokeWidth={1.9} />
                </div>
                <h3 className="text-text font-bold text-base mb-2 leading-snug">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <TestimonialsSection />

      {/* ── CTA — guests only ── */}
      {!isLoggedIn && (
        <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
          <div
            className="rounded-3xl p-10 sm:p-12 md:p-16 text-center relative overflow-hidden
              bg-card border border-border"
            style={{ boxShadow: "0 4px 40px rgba(8,53,74,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(14,74,99,0.06) 0%, transparent 70%)" }}
            />
            <div
              className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(251,231,211,0.07) 0%, transparent 70%)" }}
            />

            <div className="relative">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/8 text-primary
                text-xs font-semibold uppercase tracking-widest mb-5">
                Get Started Today
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-text mb-3 landing-heading">
                Ready to get started?
              </h2>
              <p className="text-muted text-base mb-10 max-w-sm mx-auto leading-relaxed">
                Join thousands of happy customers across Nashik.
              </p>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                <Link
                  to="/signup"
                  className="flex items-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full
                    bg-primary hover:bg-primary-hover text-white font-bold text-sm
                    hover:-translate-y-1 transition-all shadow-lg shadow-primary/20"
                >
                  <UserPlus size={15} strokeWidth={2.5} />
                  Sign Up Free
                </Link>
                <Link
                  to="/services"
                  className="flex items-center gap-2 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full
                    bg-bg text-muted font-semibold text-sm border border-border
                    hover:bg-card hover:-translate-y-1 transition-all"
                >
                  View Services <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-primary-dark text-white/40" style={{ background: "var(--primary-dark)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-14 pb-10 grid sm:grid-cols-2 md:grid-cols-3 gap-10">

          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/upkeep_logo.png"
                alt="UpKeep by Austrum"
                className="h-10 w-10 rounded-full object-cover border border-white/20 shadow-sm"
              />
              <div className="flex flex-col justify-center">
                <div className="text-white font-bold text-base leading-tight nav-brand">
                  {siteConfig.businessName}
                </div>
                <div className="text-white/35 text-[10px] font-medium tracking-[0.12em] uppercase leading-none mt-0.5">
                  {siteConfig.tagline}
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/40 max-w-xs">
              Nashik's trusted home services — delivered with professionalism and care.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white/60 font-semibold mb-4 text-xs uppercase tracking-widest">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[["Services", "/services"], ["My Bookings", "/my-bookings"], ["Login", "/login"], ["Sign Up", "/signup"]].map(([l, h]) => (
                <li key={l}>
                  <Link
                    to={h}
                    className="text-white/40 hover:text-white transition-colors duration-150"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white/60 font-semibold mb-4 text-xs uppercase tracking-widest">Contact</h4>
            <ul className="space-y-2.5 text-sm text-white/40">
              <li className="flex items-center gap-2.5">
                <MapPin size={13} className="text-accent/60 flex-shrink-0" /> {siteConfig.city}
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={13} className="text-accent/60 flex-shrink-0" /> {siteConfig.phone}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={13} className="text-accent/60 flex-shrink-0" /> {siteConfig.email}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.07] py-5">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/25">
            <span>© {new Date().getFullYear()} Austrum. All rights reserved.</span>
            <span className="text-white/15">Part of the Austrum family of products</span>
          </div>
        </div>
      </footer>
    </div>
  );
}