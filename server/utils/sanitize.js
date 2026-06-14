// server/utils/sanitize.js
//
// Lightweight, zero-dependency HTML sanitizer.
// Strips all HTML/script tags from a string so malicious markup cannot be
// stored in the database and later rendered as live HTML by a frontend.
// Normal review text (letters, punctuation, emoji) passes through unchanged.

/**
 * Removes all HTML tags from `str` and trims whitespace.
 *
 * @param {string} str
 * @returns {string}
 */
function stripHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "")  // strip any <tag> or </tag>
    .trim();
}

module.exports = { stripHtml };