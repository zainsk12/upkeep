// server/controllers/adminNotificationController.js
//
// Admin Notification Management (Module 4). Admin-only (mounted behind
// auth + requireAdmin). Creates/schedules broadcast campaigns, lists history
// with per-campaign read analytics, and exposes actions (resend / cancel /
// delete). Delivery reuses the notification service + dispatch (Modules 2/3);
// no notification-creation logic is duplicated here.

const NotificationCampaign = require("../models/NotificationCampaign");
const Notification = require("../models/Notification");
const User = require("../models/User");
const isValidId = require("../utils/isValidObjectId");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CATALOG,
} = require("../constants/notifications");
const {
  resolveRecipientIds,
  buildAudienceLabel,
  dispatchCampaign,
} = require("../services/notificationDispatch");
const { parsePagination, parseSort } = require("../utils/queryOptions");
const { pagination: pageCfg, campaign: campaignCfg } = require("../config/notifications");

const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const { AUDIENCE_MODES } = NotificationCampaign;

const TITLE_MAX = 120;
const MESSAGE_MAX = 500;

const CAMPAIGN_SORT_MAP = { newest: { createdAt: -1 }, oldest: { createdAt: 1 } };

// ── Validation ──────────────────────────────────────────────────────────────
// Returns a string error message, or null when the payload is valid.
function validateCampaignPayload(body) {
  const { title, message, type, category, priority, audience, scheduledAt, expiresAt } = body;

  if (!title || !title.trim()) return "Title is required.";
  if (title.trim().length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
  if (!message || !message.trim()) return "Message is required.";
  if (message.trim().length > MESSAGE_MAX) return `Message must be ${MESSAGE_MAX} characters or fewer.`;
  if (!type || !NOTIFICATION_TYPES.includes(type)) return "A valid notification type is required.";
  if (category && !NOTIFICATION_CATEGORIES.includes(category)) return "Invalid category.";
  if (priority && !NOTIFICATION_PRIORITIES.includes(priority)) return "Invalid priority.";

  if (!audience || !AUDIENCE_MODES.includes(audience.mode)) return "A valid audience is required.";
  if (audience.mode === "user" && (!audience.userIds || audience.userIds.length !== 1))
    return "Select exactly one user.";
  if (audience.mode === "users" && (!audience.userIds || audience.userIds.length === 0))
    return "Select at least one user.";
  if ((audience.mode === "user" || audience.mode === "users") &&
      (audience.userIds || []).some((id) => !isValidId(String(id))))
    return "One or more selected users are invalid.";
  if (audience.mode === "city" && (!audience.city || !audience.city.trim()))
    return "Enter a city to target.";
  if (audience.mode === "service" && (!audience.service || !audience.service.trim()))
    return "Select a service to target.";

  if (scheduledAt != null) {
    const t = new Date(scheduledAt);
    if (Number.isNaN(t.getTime())) return "Invalid schedule date.";
    if (t.getTime() <= Date.now()) return "Scheduled time must be in the future.";
  }
  if (expiresAt != null && expiresAt !== "") {
    const e = new Date(expiresAt);
    if (Number.isNaN(e.getTime())) return "Invalid expiry date.";
  }
  return null;
}

// Build a clean campaign field object from a request body.
function campaignFieldsFrom(body) {
  const type = body.type;
  const defaults = NOTIFICATION_CATALOG[type] || {};
  return {
    title:    body.title.trim(),
    message:  body.message.trim(),
    type,
    category: body.category || defaults.category || "system",
    icon:     (body.icon && body.icon.trim()) || defaults.icon || "Bell",
    priority: body.priority || defaults.priority || "normal",
    link:     (body.link || "").trim(),
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    audience: {
      mode:    body.audience.mode,
      userIds: body.audience.userIds || [],
      city:    (body.audience.city || "").trim(),
      service: (body.audience.service || "").trim(),
    },
  };
}

// ── POST /api/admin/notifications ─── create (send now or schedule) ───────────
const createCampaign = async (req, res) => {
  try {
    const err = validateCampaignPayload(req.body);
    if (err) return res.status(400).json({ message: err });

    const fields = campaignFieldsFrom(req.body);
    const scheduled = req.body.scheduledAt != null;

    // Best-effort duplicate-request guard: reject an identical immediate send
    // from the same admin within a short window (double-click / retried request).
    if (!scheduled && campaignCfg.duplicateWindowMs > 0) {
      const since = new Date(Date.now() - campaignCfg.duplicateWindowMs);
      const dup = await NotificationCampaign.findOne({
        createdBy: req.user._id,
        title: fields.title,
        message: fields.message,
        "audience.mode": fields.audience.mode,
        createdAt: { $gte: since },
      }).select("_id").lean();
      if (dup) {
        return res.status(409).json({
          message: "Duplicate request ignored — an identical notification was just sent.",
        });
      }
    }

    const campaign = new NotificationCampaign({
      ...fields,
      createdBy: req.user._id,
      scheduledAt: scheduled ? new Date(req.body.scheduledAt) : null,
      status: scheduled ? "scheduled" : "sending",
      audienceLabel: buildAudienceLabel(fields.audience),
    });
    await campaign.save();

    if (scheduled) {
      console.log(`[NOTIF ADMIN] Campaign ${campaign._id} scheduled for ${campaign.scheduledAt.toISOString()} by admin ${req.user._id}.`);
      return res.status(201).json({
        message: "Notification scheduled.",
        campaign,
      });
    }

    // Immediate send — fan out now (reuses the notification service + Socket.IO).
    try {
      const { delivered } = await dispatchCampaign(campaign);
      console.log(`[NOTIF ADMIN] Campaign ${campaign._id} sent to ${delivered} user(s) by admin ${req.user._id}.`);
      return res.status(201).json({
        message: `Notification sent to ${delivered} user(s).`,
        campaign,
      });
    } catch (dispatchErr) {
      campaign.status = "failed";
      await campaign.save().catch(() => {});
      // Audience too large → a validation-style 400 with the specific reason.
      if (dispatchErr.code === "MAX_RECIPIENTS") {
        console.warn(`[NOTIF ADMIN] Campaign ${campaign._id} rejected: ${dispatchErr.message}`);
        return res.status(400).json({ message: dispatchErr.message });
      }
      console.error(`[NOTIF ADMIN] Campaign ${campaign._id} dispatch failed:`, dispatchErr.message);
      return res.status(500).json({ message: "Failed to send notification." });
    }
  } catch (e) {
    console.error("createCampaign error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// Attach delivered/read/unread/lastActivity to a set of campaigns in one query.
async function withAnalytics(campaigns) {
  const ids = campaigns.map((c) => c._id);
  const agg = ids.length
    ? await Notification.aggregate([
        { $match: { campaignId: { $in: ids } } },
        {
          $group: {
            _id: "$campaignId",
            delivered: { $sum: 1 },
            read: { $sum: { $cond: ["$isRead", 1, 0] } },
            lastActivity: { $max: "$updatedAt" },
          },
        },
      ])
    : [];
  const byId = new Map(agg.map((a) => [String(a._id), a]));
  return campaigns.map((c) => {
    const a = byId.get(String(c._id)) || { delivered: 0, read: 0, lastActivity: null };
    const delivered = a.delivered;
    const read = a.read;
    return {
      ...(c.toObject ? c.toObject() : c),
      analytics: {
        delivered,
        read,
        unread: Math.max(0, delivered - read),
        readPercentage: delivered ? Math.round((read / delivered) * 1000) / 10 : 0,
        lastActivity: a.lastActivity || null,
      },
    };
  });
}

// ── GET /api/admin/notifications ─── history (filter / search / sort / page) ──
const listCampaigns = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, pageCfg.adminDefaultLimit, pageCfg.maxLimit);

    const filter = {};
    if (req.query.status && NotificationCampaign.CAMPAIGN_STATUSES.includes(req.query.status))
      filter.status = req.query.status;
    if (req.query.category && NOTIFICATION_CATEGORIES.includes(req.query.category))
      filter.category = req.query.category;
    if (req.query.priority && NOTIFICATION_PRIORITIES.includes(req.query.priority))
      filter.priority = req.query.priority;
    if (req.query.search && req.query.search.trim()) {
      const rx = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ title: rx }, { message: rx }, { audienceLabel: rx }];
    }

    const sort = parseSort(req.query.sort, CAMPAIGN_SORT_MAP, "newest");

    const [rows, total] = await Promise.all([
      NotificationCampaign.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      NotificationCampaign.countDocuments(filter),
    ]);

    const campaigns = await withAnalytics(rows);

    res.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (e) {
    console.error("listCampaigns error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/admin/notifications/analytics ─── global summary ─────────────────
const getAnalytics = async (req, res) => {
  try {
    const [totalSent, agg] = await Promise.all([
      NotificationCampaign.countDocuments({ status: "sent" }),
      Notification.aggregate([
        { $match: { campaignId: { $ne: null } } },
        {
          $group: {
            _id: null,
            delivered: { $sum: 1 },
            read: { $sum: { $cond: ["$isRead", 1, 0] } },
            recipients: { $addToSet: "$userId" },
            lastActivity: { $max: "$updatedAt" },
          },
        },
      ]),
    ]);

    const a = agg[0] || { delivered: 0, read: 0, recipients: [], lastActivity: null };
    const delivered = a.delivered;
    const read = a.read;
    res.json({
      totalSent,
      delivered,
      read,
      unread: Math.max(0, delivered - read),
      readPercentage: delivered ? Math.round((read / delivered) * 1000) / 10 : 0,
      recipients: (a.recipients || []).length,
      lastActivity: a.lastActivity || null,
    });
  } catch (e) {
    console.error("getAnalytics error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/admin/notifications/users ─── recipient picker list ──────────────
const listUsers = async (req, res) => {
  try {
    const filter = { role: "user" };
    const q = (req.query.search || "").trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }
    const users = await User.find(filter)
      .select("name phone email address")
      .sort({ name: 1 })
      .limit(200)
      .lean();
    res.json({ users });
  } catch (e) {
    console.error("listUsers error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/admin/notifications/audience-count ─── preview recipient count ──
const audienceCount = async (req, res) => {
  try {
    const audience = req.body.audience || {};
    if (!AUDIENCE_MODES.includes(audience.mode))
      return res.status(400).json({ message: "Invalid audience." });
    const ids = await resolveRecipientIds(audience);
    res.json({ count: ids.length });
  } catch (e) {
    console.error("audienceCount error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/admin/notifications/:id ─── one campaign + analytics ─────────────
const getCampaign = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid campaign ID." });
    const campaign = await NotificationCampaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    const [withA] = await withAnalytics([campaign]);
    res.json({ campaign: withA });
  } catch (e) {
    console.error("getCampaign error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── PATCH /api/admin/notifications/:id/cancel ─── cancel a scheduled campaign ─
const cancelCampaign = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid campaign ID." });
    const campaign = await NotificationCampaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    if (campaign.status !== "scheduled")
      return res.status(400).json({ message: "Only scheduled notifications can be cancelled." });
    campaign.status = "cancelled";
    await campaign.save();
    console.log(`[NOTIF ADMIN] Campaign ${campaign._id} cancelled by admin ${req.user._id}.`);
    res.json({ message: "Scheduled notification cancelled.", campaign });
  } catch (e) {
    console.error("cancelCampaign error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/admin/notifications/:id/resend ─── re-broadcast immediately ─────
const resendCampaign = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid campaign ID." });
    const original = await NotificationCampaign.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ message: "Campaign not found." });

    const clone = new NotificationCampaign({
      title:    original.title,
      message:  original.message,
      type:     original.type,
      category: original.category,
      icon:     original.icon,
      priority: original.priority,
      link:     original.link,
      expiresAt: original.expiresAt || null,
      audience: original.audience,
      audienceLabel: buildAudienceLabel(original.audience),
      status: "sending",
      scheduledAt: null,
      createdBy: req.user._id,
    });
    await clone.save();

    try {
      const { delivered } = await dispatchCampaign(clone);
      console.log(`[NOTIF ADMIN] Campaign ${req.params.id} resent as ${clone._id} → ${delivered} user(s) by admin ${req.user._id}.`);
      res.status(201).json({ message: `Resent to ${delivered} user(s).`, campaign: clone });
    } catch (dispatchErr) {
      clone.status = "failed";
      await clone.save().catch(() => {});
      if (dispatchErr.code === "MAX_RECIPIENTS")
        return res.status(400).json({ message: dispatchErr.message });
      console.error(`[NOTIF ADMIN] Resend dispatch failed for ${clone._id}:`, dispatchErr.message);
      res.status(500).json({ message: "Failed to resend notification." });
    }
  } catch (e) {
    console.error("resendCampaign error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── DELETE /api/admin/notifications/:id ─── remove a campaign record ──────────
// Deletes the campaign only; notifications already delivered to users are left
// intact (they belong to the users' inboxes).
const deleteCampaign = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid campaign ID." });
    const deleted = await NotificationCampaign.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Campaign not found." });
    console.log(`[NOTIF ADMIN] Campaign ${req.params.id} deleted by admin ${req.user._id}.`);
    res.json({ success: true, message: "Campaign deleted." });
  } catch (e) {
    console.error("deleteCampaign error:", e.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = {
  createCampaign,
  listCampaigns,
  getAnalytics,
  listUsers,
  audienceCount,
  getCampaign,
  cancelCampaign,
  resendCampaign,
  deleteCampaign,
};
