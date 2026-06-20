const jwt  = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided." });

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User not found." });

    // ── Session invalidation on password change ──────────────────────────────
    // Reject any token issued before the account's last password change so a
    // password reset immediately logs out all previously-issued sessions.
    // `iat` is in seconds; passwordChangedAt is stored 1s in the past (see model)
    // to avoid invalidating a token minted in the same second as the change.
    if (req.user.passwordChangedAt && decoded.iat) {
      const changedAtSec = Math.floor(req.user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSec)
        return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    next();
  } catch (err) {
    // FIX: was missing err param — error was silently swallowed, making
    // token debugging impossible.
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};