/* eslint-env node */
// scripts/notifications/runTestNotifications.js
//
// يقرأ طلبات testNotifications (pending) ويرسل FCM ثم يحدّث الحالة.
// يُشغّل من GitHub Actions فقط (Node.js)

import admin from "firebase-admin";

let initialized = false;

function initAdmin() {
  if (initialized) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var");
  }

  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
}

export default async function runTestNotifications() {
  initAdmin();

  const db = admin.firestore();
  const messaging = admin.messaging();

  // مهم: ما بنستخدم orderBy لتفادي فشل لو createdAt ناقص بدوك قديم
  const snap = await db
    .collection("testNotifications")
    .where("status", "==", "pending")
    .limit(20)
    .get();

  if (snap.empty) {
    console.log("ℹ️ No pending test notifications.");
    return;
  }

  for (const docSnap of snap.docs) {
    const req = docSnap.data();

    try {
      if (!req?.token) throw new Error("Missing token");

      const title = req?.notification?.title || "🧪 Test Notification";
      const body =
        req?.notification?.body ||
        "If you received this, Notifications pipeline works ✅";

      console.log("📤 Sending test notification:", docSnap.id);

      await messaging.send({
        token: req.token,
        notification: { title, body },
        data: req.data || {},
      });

      await docSnap.ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Sent:", docSnap.id);
    } catch (err) {
      console.error("❌ Failed:", docSnap.id, err?.message || err);

      await docSnap.ref.update({
        status: "failed",
        error: String(err?.message || err),
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}
