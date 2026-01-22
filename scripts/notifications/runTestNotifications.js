/* eslint-env node */
// scripts/notifications/runTestNotifications.js

import { getAdmin } from "./firebaseAdmin.js";

export default async function runTestNotifications() {
  const admin = getAdmin();

  const db = admin.firestore();
  const messaging = admin.messaging();

  const snap = await db
    .collection("testNotifications")
    .where("status", "==", "pending")
    .limit(20)
    .get();

  if (snap.empty) {
    console.log("ℹ️ No pending test notifications.");
    return;
  }

  for (const doc of snap.docs) {
    const t = doc.data();

    // لازم يكون عندك token محفوظ من الويب
    const token = t?.token;
    if (!token) {
      await doc.ref.set(
        {
          status: "failed",
          error: "Missing token",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      continue;
    }

    const payload = {
      notification: {
        title: t?.title || "Test Notification ✅",
        body: t?.body || "Push is working (sent from GitHub Actions).",
      },
      data: t?.data || {},
      token,
    };

    try {
      const res = await messaging.send(payload);
      await doc.ref.set(
        {
          status: "sent",
          messageId: res,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      console.log("✅ Sent test notification:", doc.id, res);
    } catch (err) {
      await doc.ref.set(
        {
          status: "failed",
          error: String(err?.message || err),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      console.log("❌ Failed test notification:", doc.id, err);
    }
  }
}
