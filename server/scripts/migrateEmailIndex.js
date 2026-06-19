// server/scripts/migrateEmailIndex.js
//
// One-time migration: replace the old `email_1` (unique + sparse) index with a
// PARTIAL unique index, and strip any leftover `email: null` values so they are
// stored as "no email" (field absent) instead.
//
// Why: a sparse unique index still indexes documents that store `email: null`,
// so the second email-less signup failed with:
//   E11000 duplicate key error … index: email_1 dup key: { email: null }
// A partial index ( email is a string ) ignores null/missing emails entirely.
//
// Run once after deploying the updated User model:
//   node server/scripts/migrateEmailIndex.js
//
// Requires MONGO_URI (or MONGODB_URI) in the environment / .env.

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error("✗ MONGO_URI (or MONGODB_URI) is not set.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  const users = mongoose.connection.collection("users");
  console.log("✓ Connected. Running email index migration…");

  // 1. Unset any explicitly-stored null emails → makes the field absent.
  const unset = await users.updateMany(
    { email: null },
    { $unset: { email: "" } }
  );
  console.log(`  • Cleared email:null on ${unset.modifiedCount} document(s).`);

  // 2. Drop the old email index if it exists (name is "email_1").
  const indexes = await users.indexes();
  if (indexes.some((i) => i.name === "email_1")) {
    await users.dropIndex("email_1");
    console.log("  • Dropped old email_1 index.");
  } else {
    console.log("  • No existing email_1 index found (nothing to drop).");
  }

  // 3. Recreate as a PARTIAL unique index (only indexes real string emails).
  await users.createIndex(
    { email: 1 },
    { unique: true, partialFilterExpression: { email: { $type: "string" } }, name: "email_1" }
  );
  console.log("  • Created partial unique index email_1.");

  console.log("✓ Migration complete.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("✗ Migration failed:", err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
