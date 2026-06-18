// server/controllers/workerController.js

const Worker = require("../models/Worker");
const { isValidIndianPhone, normalizePhone } = require("../utils/phone");
const isValidObjectId = require("../utils/isValidObjectId");

// ── GET /api/workers ──────────────────────────────────────────────────────────
const getAllWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json({ workers });
  } catch (err) {
    console.error("getAllWorkers error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/workers ─────────────────────────────────────────────────────────
const createWorker = async (req, res) => {
  try {
    const { name, phone, skills, experience } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ message: "Worker name is required." });
    if (!phone || !phone.trim())
      return res.status(400).json({ message: "Worker phone is required." });

    if (!isValidIndianPhone(phone))
      return res.status(400).json({ message: "Enter a valid Indian mobile number (10 digits, starting with 6–9)." });

    const skillsArr = Array.isArray(skills)
      ? skills.map((s) => s.trim().toLowerCase()).filter(Boolean)
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const worker = await Worker.create({
      name: name.trim(),
      phone: normalizePhone(phone),
      skills: skillsArr,
      experience: parseFloat(experience) || 0,
      active: true,
    });

    res.status(201).json({ message: "Worker created.", worker });
  } catch (err) {
    console.error("createWorker error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/workers/:id ──────────────────────────────────────────────────────
const updateWorker = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid worker ID." });

    const { name, phone, skills, experience, active } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found." });

    if (name !== undefined) worker.name = name.trim();
    if (phone !== undefined) {
      if (!isValidIndianPhone(phone))
        return res.status(400).json({ message: "Enter a valid Indian mobile number (10 digits, starting with 6–9)." });
      worker.phone = normalizePhone(phone);
    }
    if (experience !== undefined) worker.experience = parseFloat(experience) || 0;
    if (active !== undefined) worker.active = active;

    if (skills !== undefined) {
      const skillsArr = Array.isArray(skills)
        ? skills.map((s) => s.trim().toLowerCase()).filter(Boolean)
        : typeof skills === "string"
        ? skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
        : [];
      worker.skills = skillsArr;
    }

    await worker.save();
    res.json({ message: "Worker updated.", worker });
  } catch (err) {
    console.error("updateWorker error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/workers/:id/toggle ─────────────────────────────────────────────
const toggleWorker = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return res.status(400).json({ message: "Invalid worker ID." });

    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: "Worker not found." });

    worker.active = !worker.active;
    await worker.save();

    res.json({
      message: `Worker ${worker.active ? "activated" : "deactivated"}.`,
      worker,
    });
  } catch (err) {
    console.error("toggleWorker error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = { getAllWorkers, createWorker, updateWorker, toggleWorker };