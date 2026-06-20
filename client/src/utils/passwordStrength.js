// client/src/utils/passwordStrength.js
// Lightweight password-strength scoring for the Reset Password UI.
// Mirrors the backend floor (≥ 8 chars + at least one letter and one number)
// and adds a 0–4 score for the visual strength meter.

/**
 * @param {string} pw
 * @returns {{ score: 0|1|2|3|4, label: string, color: string, checks: object }}
 */
export function scorePassword(pw = "") {
  const checks = {
    length:  pw.length >= 8,
    letter:  /[a-zA-Z]/.test(pw),
    number:  /\d/.test(pw),
    symbol:  /[^a-zA-Z0-9]/.test(pw),
    long:    pw.length >= 12,
  };

  let score = 0;
  if (checks.length) score++;
  if (checks.letter && checks.number) score++;
  if (checks.symbol) score++;
  if (checks.long) score++;
  if (!pw) score = 0;

  // The backend MINIMUM (length + letter + number) maps to "Fair" or better.
  const meetsMinimum = checks.length && checks.letter && checks.number;

  const MAP = [
    { label: "Too weak", color: "#ef4444" }, // 0
    { label: "Weak",     color: "#f97316" }, // 1
    { label: "Fair",     color: "#eab308" }, // 2
    { label: "Good",     color: "#22c55e" }, // 3
    { label: "Strong",   color: "#16a34a" }, // 4
  ];

  return { score, ...MAP[score], checks, meetsMinimum };
}

/** Hard validation gate matching the backend rule (returns error string or ""). */
export function passwordError(pw = "") {
  if (!pw)                                    return "Password is required.";
  if (pw.length < 8)                          return "Password must be at least 8 characters.";
  if (pw.length > 72)                         return "Password must be 72 characters or fewer.";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return "Include at least one letter and one number.";
  return "";
}
