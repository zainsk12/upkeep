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
    next();
  } catch (err) {
    // FIX: was missing err param — error was silently swallowed, making
    // token debugging impossible.
    console.error("Auth middleware error:", err.message);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};