// server/services/firebaseAdmin.js
// Firebase Admin SDK initialization + ID-token verification.
//
// The client (web SDK) performs phone authentication and obtains a Firebase ID
// token. The backend verifies that token here, extracting the verified phone
// number and Firebase UID. This is the trust boundary — never trust a phone
// number that hasn't been confirmed via verifyFirebaseToken().
//
// Required env vars:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY   (with literal \n escapes — they are un-escaped below)

"use strict";

const admin = require("firebase-admin");

let initialized = false;

function initFirebase() {
  if (initialized) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let   privateKey  = process.env.FIREBASE_PRIVATE_KEY;

  const missing = [];
  if (!projectId)   missing.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey)  missing.push("FIREBASE_PRIVATE_KEY");
  if (missing.length) {
    throw new Error(
      `[FIREBASE CONFIG ERROR] Missing env vars: ${missing.join(", ")}.\n` +
      "  → Generate a service account JSON in the Firebase console and set these in server/.env."
    );
  }

  // .env files store the key as a single line with literal "\n"; restore newlines.
  privateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  initialized = true;
  console.log("✅ Firebase Admin initialized");
}

/**
 * Verify a Firebase ID token and return the verified identity.
 * @param {string} idToken
 * @returns {Promise<{ uid: string, phone: string|null }>}
 * @throws if the token is missing, invalid, or expired.
 */
async function verifyFirebaseToken(idToken) {
  if (!idToken) throw new Error("Missing Firebase ID token.");
  initFirebase();
  const decoded = await admin.auth().verifyIdToken(idToken);
  return {
    uid:   decoded.uid,
    phone: decoded.phone_number || null, // E.164, e.g. "+919876543210"
  };
}

module.exports = { initFirebase, verifyFirebaseToken };
