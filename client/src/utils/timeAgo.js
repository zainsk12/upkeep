// client/src/utils/timeAgo.js
//
// Compact relative-time formatter for notification timestamps
// (e.g. "Just now", "2 min ago", "3 hrs ago", "5 days ago").

export function timeAgo(dateInput) {
  if (!dateInput) return "";
  const then = new Date(dateInput).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} wk${weeks > 1 ? "s" : ""} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;

  const years = Math.floor(days / 365);
  return `${years} yr${years > 1 ? "s" : ""} ago`;
}
