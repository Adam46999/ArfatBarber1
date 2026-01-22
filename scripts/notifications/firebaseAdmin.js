// scripts/notifications/firebaseAdmin.js

/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * هذا الملف يُستخدم فقط في بيئة Node.js (GitHub Actions)
 * وليس داخل المتصفح
 */

import admin from "firebase-admin";

let initialized = false;

export function getAdmin() {
  // إذا تهيّأ قبل، رجّعه مباشرة
  if (initialized) {
    return admin;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing. Add it to GitHub Secrets.",
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(json);
  } catch {
    // ما نستخدم err عشان ESLint
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON (not valid JSON)");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  return admin;
}
