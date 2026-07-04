// server/utils/queryOptions.js
//
// Small, defensive parsers for list-endpoint query params so every notification
// endpoint clamps pagination and whitelists sort identically. Malformed input
// (non-numeric, negative, absurdly large, unknown sort keys) can never reach the
// database as-is.

/**
 * Parse & clamp pagination params.
 * @returns {{ page:number, limit:number, skip:number }}
 */
function parsePagination(query = {}, defaultLimit = 20, maxLimit = 100) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Resolve a sort value against a whitelist map (value → Mongo sort object).
 * Unknown/omitted values fall back to `fallbackKey`.
 */
function parseSort(value, sortMap, fallbackKey) {
  return sortMap[value] || sortMap[fallbackKey];
}

module.exports = { parsePagination, parseSort };
