// server/utils/isValidObjectId.js

const { Types } = require("mongoose");

/**
 * Returns true when `id` is a valid 24-hex-char MongoDB ObjectId string.
 * Use before any findById / findByIdAndDelete call that takes a route param.
 */
function isValidObjectId(id) {
  return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;
}

module.exports = isValidObjectId;