// server/controllers/adminController.js

const Booking  = require("../models/Booking");
const Service  = require("../models/Service");
const Worker   = require("../models/Worker");
const Review   = require("../models/Review");   // MODULE 6
const Settings = require("../models/Settings"); // MODULE 6: threshold persistence
const isValidId = require("../utils/isValidObjectId");
const { generateUniqueBookingId } = require("../utils/bookingId");
const { sendWorkerAssignedEmail } = require("../services/emailService");
const {
  notifyTechnicianAssigned,
  notifyServiceCompleted,
  notifyQuoteRevised,
} = require("../services/notificationService");
const { pushHistory } = require("../constants/quoteWorkflow");

// ── GET /api/admin/bookings ────────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    console.error("getAllBookings error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/admin/bookings/:id ─────────────────────────────────────────────
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { quotation, price, workerId, contactSource, status } = req.body;

    if (!isValidId(id))
      return res.status(400).json({ message: "Invalid booking ID." });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    // Worker-assignment email is sent out-of-band after save (see end of handler).
    // These capture whether THIS request newly assigned/changed the worker, so the
    // email fires exactly once per assignment and never duplicates on no-op saves.
    let shouldSendAssignmentEmail = false;
    let assignedWorkerDoc = null;
    // Tracks whether THIS request transitioned the booking to "completed", so the
    // service-completed notification fires exactly once on the real transition.
    let justCompleted = false;
    // Tracks whether THIS request sent a revised quotation (revision_requested →
    // awaiting_user_confirmation), so the customer is notified exactly once.
    let sentRevisedQuote = false;

    // ── Set quotation ──────────────────────────────────────────────────────────
    // Allowed from "pending" (first quote) and "revision_requested" (revised
    // quote after the customer rejected the previous one). The previous
    // quotation was already snapshotted into quotationHistory at rejection time,
    // so overwriting `quotation` here never loses history.
    if (quotation !== undefined) {
      const isRevision = booking.status === "revision_requested";
      if (booking.status !== "pending" && !isRevision) {
        return res.status(400).json({
          message:
            "A quotation can only be sent when the booking is pending or a revision has been requested.",
        });
      }

      const labour = parseFloat(quotation.labour) || 0;
      if (labour <= 0) {
        return res.status(400).json({
          message: "Labour charge is required and must be greater than 0.",
        });
      }

      const materials       = Math.max(0, parseFloat(quotation.materials)       || 0);
      const travel          = Math.max(0, parseFloat(quotation.travel)           || 0);
      const inspection      = Math.max(0, parseFloat(quotation.inspection)       || 0);
      const convenience_fee = Math.max(0, parseFloat(quotation.convenience_fee)  || 0);
      const tax             = Math.max(0, parseFloat(quotation.tax)              || 0);
      const total           = labour + materials + travel + inspection + convenience_fee + tax;

      booking.quotation = {
        labour, materials, travel, inspection, convenience_fee, tax,
        notes: (quotation.notes || "").trim(),
        total,
      };
      booking.price  = total;
      booking.status = "awaiting_user_confirmation";
      // The rejection belonged to the superseded quote (kept in
      // quotationHistory + the timeline) — the new quote starts clean.
      if (isRevision) {
        booking.rejection = null;
        sentRevisedQuote = true;
      }
      pushHistory(booking, isRevision ? "revised_quote_sent" : "quote_sent", "admin", { total });
    }

    // ── Set bare price (legacy) ────────────────────────────────────────────────
    if (price !== undefined && quotation === undefined) {
      if (booking.status !== "pending") {
        return res.status(400).json({
          message: "Price can only be set when booking is pending.",
        });
      }
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ message: "Price must be a positive number." });
      }
      booking.price  = parsedPrice;
      booking.status = "awaiting_user_confirmation";
      pushHistory(booking, "quote_sent", "admin", { total: parsedPrice });
    }

    // ── Assign structured worker ───────────────────────────────────────────────
    if (workerId !== undefined) {
      if (booking.status !== "confirmed" && booking.status !== "completed") {
        return res.status(400).json({
          message: "Worker can only be assigned after the user confirms the booking.",
        });
      }

      const worker = await Worker.findById(workerId);
      if (!worker) return res.status(404).json({ message: "Worker not found." });
      if (!worker.active) {
        return res.status(400).json({ message: "Cannot assign an inactive worker." });
      }

      const source = contactSource === "admin" ? "admin" : "worker";

      // `phone` in assignedWorker is always set to the number the client will see.
      // If admin chose to use their own number, the caller must also pass `adminPhone`.
      const contactPhone =
        source === "admin"
          ? (req.body.adminPhone || "").trim() || worker.phone
          : worker.phone;

      // Capture the previously-assigned worker BEFORE overwriting, so we only
      // notify the customer when the assignment is actually new or changed.
      const prevWorkerId = booking.assignedWorker?.workerId?.toString() || null;

      booking.assignedWorker = {
        workerId: worker._id,
        name:     worker.name,
        phone:    contactPhone,
      };
      booking.contactSource = source;

      // Keep legacy `worker` string in sync so old records and clients that
      // read the plain string field directly still receive the correct name.
      // New code should read booking.workerName (virtual) instead.
      booking.worker = worker.name;

      // Trigger the customer email only on a genuine (re)assignment — repeat
      // PATCHes with the same worker won't re-send, preventing duplicates.
      if (prevWorkerId !== worker._id.toString()) {
        shouldSendAssignmentEmail = true;
        assignedWorkerDoc = worker;
        pushHistory(booking, "worker_assigned", "admin", { worker: worker.name });

        // Backfill a booking reference for legacy records (pre-`bookingId`) so
        // the email never shows "Booking ID: undefined". Persisted on save below.
        if (!booking.bookingId) {
          booking.bookingId = await generateUniqueBookingId(Booking);
        }
      }
    }

    // ── Mark completed ─────────────────────────────────────────────────────────
    if (status === "completed") {
      if (booking.status !== "confirmed") {
        return res.status(400).json({
          message: "Only confirmed bookings can be marked as completed.",
        });
      }
      if (!booking.assignedWorker || !booking.assignedWorker.name) {
        return res.status(400).json({
          message: "A worker must be assigned before marking a booking as completed.",
        });
      }
      booking.status = "completed";
      justCompleted = true;
      pushHistory(booking, "completed", "admin");
    }

    // ── Cancel booking (soft delete) ───────────────────────────────────────────
    if (status === "cancelled") {
      if (booking.status === "completed") {
        return res.status(400).json({
          message: "Completed bookings cannot be cancelled.",
        });
      }
      if (booking.status === "cancelled") {
        return res.status(400).json({
          message: "Booking is already cancelled.",
        });
      }
      if (booking.status === "closed") {
        return res.status(400).json({
          message: "This request was closed by the customer and cannot be modified.",
        });
      }
      booking.status = "cancelled";
      pushHistory(booking, "cancelled", "admin");
    }

    await booking.save();
    await booking.populate("userId", "name email phone");

    res.json({ message: "Booking updated.", booking });

    // ── Customer notification (worker assigned) ─────────────────────────────────
    // Sent AFTER the response (fire-and-forget) so the admin action is never
    // blocked by SMTP latency, and only when a worker was newly assigned/changed.
    if (shouldSendAssignmentEmail) {
      const customer = booking.userId; // populated above: { name, email, phone }
      sendWorkerAssignedEmail(
        { name: customer?.name, email: customer?.email },
        booking,
        assignedWorkerDoc
      ).catch((mailErr) => {
        console.error("Worker assigned but email failed:", mailErr.message);
      });
    }

    // ── In-app notifications (fire-and-forget) ─────────────────────────────────
    // booking.userId is populated above; the service resolves its _id.
    if (shouldSendAssignmentEmail) {
      notifyTechnicianAssigned(booking, assignedWorkerDoc).catch((e) =>
        console.error("[NOTIF] technician_assigned emit failed:", e.message)
      );
    }
    if (justCompleted) {
      notifyServiceCompleted(booking).catch((e) =>
        console.error("[NOTIF] service_completed emit failed:", e.message)
      );
    }
    if (sentRevisedQuote) {
      notifyQuoteRevised(booking).catch((e) =>
        console.error("[NOTIF] quote_revised emit failed:", e.message)
      );
    }
  } catch (err) {
    console.error("updateBooking error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── DELETE /api/admin/bookings/:id ────────────────────────────────────────────
const deleteBooking = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    await booking.deleteOne();
    res.json({ success: true, message: "Booking deleted." });
  } catch (err) {
    console.error("deleteBooking error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/bookings/reschedule-settings ───────────────────────────────
// Returns the current reschedule lockout window (in hours).
const getRescheduleSettings = async (req, res) => {
  try {
    const minHoursBeforeReschedule = await Settings.getRescheduleHours();
    res.json({ minHoursBeforeReschedule });
  } catch (err) {
    console.error("getRescheduleSettings error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/admin/bookings/reschedule-settings ─────────────────────────────
// Updates the reschedule lockout window. Body: { minHoursBeforeReschedule: number }
// Set to 0 to disable the guard entirely.
const updateRescheduleSettings = async (req, res) => {
  try {
    const { minHoursBeforeReschedule } = req.body;
    const parsed = Number(minHoursBeforeReschedule);

    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({
        message: "minHoursBeforeReschedule must be a non-negative number.",
      });
    }

    const saved = await Settings.setRescheduleHours(parsed);
    res.json({
      message: "Reschedule settings updated.",
      minHoursBeforeReschedule: saved,
    });
  } catch (err) {
    console.error("updateRescheduleSettings error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/services ───────────────────────────────────────────────────
const getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json({ services });
  } catch (err) {
    console.error("getServices error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/admin/services ──────────────────────────────────────────────────
const createService = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: "Service name is required." });

    const existing = await Service.findOne({ name: name.trim() });
    if (existing)
      return res.status(409).json({ message: "A service with this name already exists." });

    const service = await Service.create({
      name:        name.trim(),
      description: description?.trim() || "",
    });
    res.status(201).json({ message: "Service created.", service });
  } catch (err) {
    console.error("createService error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/admin/services/:id ─────────────────────────────────────────────
const updateService = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid service ID." });

    const { isEnabled, disabledReason, description, name } = req.body;
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found." });

    if (name             !== undefined) service.name           = name.trim();
    if (isEnabled        !== undefined) service.isEnabled      = isEnabled;
    if (description      !== undefined) service.description    = description;
    if (disabledReason   !== undefined) service.disabledReason = disabledReason;
    if (isEnabled === true)             service.disabledReason = "";

    await service.save();
    res.json({ message: "Service updated.", service });
  } catch (err) {
    console.error("updateService error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── DELETE /api/admin/services/:id ────────────────────────────────────────────
const deleteService = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid service ID." });

    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json({ message: "Service deleted." });
  } catch (err) {
    console.error("deleteService error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};


/* ── GET /api/admin/reviews ──────────────────────────────────────────────────
   Returns all reviews with full detail for the admin panel.
   Query params:
     - page  (default 1)
     - limit (default 15)
     - sort  (newest | oldest | highest | lowest | featured)
     - featured (true | false — filter by isFeatured)
*/
const getAllReviewsAdmin = async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 15));
    const skip  = (page - 1) * limit;

    // Optional isFeatured filter
    const filter = {};
    if (req.query.featured === "true")  filter.isFeatured = true;
    if (req.query.featured === "false") filter.isFeatured = false;

    const SORT_MAP = {
      newest:   { createdAt: -1 },
      oldest:   { createdAt:  1 },
      highest:  { rating: -1, createdAt: -1 },
      lowest:   { rating:  1, createdAt: -1 },
      featured: { isFeatured: -1, rating: -1, createdAt: -1 },
    };
    const sortQuery = SORT_MAP[req.query.sort] || SORT_MAP.newest;

    const [reviews, total, featuredCount] = await Promise.all([
      Review.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.countDocuments({ isFeatured: true }),
    ]);

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: { featuredCount },
    });
  } catch (err) {
    console.error("getAllReviewsAdmin error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

/* ── PATCH /api/admin/reviews/:id/feature ────────────────────────────────────
   Toggles isFeatured on a review, or sets it explicitly via body { isFeatured: bool }.
*/
const toggleFeatureReview = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid review ID." });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });

    // Accept explicit value from body, or toggle current value
    const newValue =
      typeof req.body.isFeatured === "boolean"
        ? req.body.isFeatured
        : !review.isFeatured;

    review.isFeatured = newValue;
    await review.save();

    res.json({
      message: `Review ${newValue ? "featured" : "unfeatured"} successfully.`,
      review,
    });
  } catch (err) {
    console.error("toggleFeatureReview error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

/* ── DELETE /api/admin/reviews/:id ──────────────────────────────────────────── */
const deleteReviewAdmin = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid review ID." });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });

    await review.deleteOne();
    res.json({ success: true, message: "Review deleted successfully." });
  } catch (err) {
    console.error("deleteReviewAdmin error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

/* ── GET /api/admin/reviews/settings ─────────────────────────────────────────
   Returns current review display settings (threshold value stored in-memory/env).
   In production you'd persist this in a Settings collection.
*/
const getReviewSettings = async (req, res) => {
  try {
    const [threshold, total, featured] = await Promise.all([
      Settings.getReviewThreshold(),
      Review.countDocuments(),
      Review.countDocuments({ isFeatured: true }),
    ]);
    res.json({ threshold, total, featured });
  } catch (err) {
    console.error("getReviewSettings error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

/* ── PATCH /api/admin/reviews/settings ───────────────────────────────────────
   Update rating threshold (stored in process.env at runtime — restart persists via .env).
   Body: { threshold: number }
*/
const updateReviewSettings = async (req, res) => {
  try {
    const { threshold } = req.body;
    const parsed = Number(threshold);

    if (isNaN(parsed) || parsed < 1 || parsed > 5) {
      return res.status(400).json({ message: "Threshold must be a number between 1 and 5." });
    }

    const saved = await Settings.setReviewThreshold(parsed);
    res.json({ message: "Threshold updated.", threshold: saved });
  } catch (err) {
    console.error("updateReviewSettings error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  getAllBookings, updateBooking, deleteBooking,
  getRescheduleSettings, updateRescheduleSettings,
  getServices, createService, updateService, deleteService,
  getAllReviewsAdmin,
  toggleFeatureReview,
  deleteReviewAdmin,
  getReviewSettings,
  updateReviewSettings,
};