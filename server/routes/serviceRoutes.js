// server/routes/serviceRoutes.js  ← NEW

const express  = require("express");
const router   = express.Router();
const Service  = require("../models/Service");

// GET /api/services
// Public — returns all services with their enabled/disabled status
// Frontend uses this to show "Currently Unavailable" state
router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 }).lean();
    res.json({ services });
  } catch (err) {
    console.error("getPublicServices error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;