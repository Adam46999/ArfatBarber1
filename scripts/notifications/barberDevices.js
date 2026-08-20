// scripts/notifications/barberDevices.js

/**
 * قراءة أجهزة الحلاق المسجلة لاستقبال FCM.
 *
 * مهم:
 * - هذا الملف لا يرسل أي إشعار.
 * - لا يعدّل أي بيانات.
 * - فقط يقرأ deviceTokens التي role فيها barber.
 */

import { getAdmin } from "./firebaseAdmin.js";
import verifyBarberDevice from "./barberDeviceVerification.js";

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

export async function getBarberDeviceTokens() {
  const admin = getAdmin();
  const db = admin.firestore();

  const snap = await db
    .collection("deviceTokens")
    .where("role", "==", "barber")
    .get();

  return unique(
    snap.docs
      .filter((docSnapshot) => {
        const data = docSnapshot.data() || {};

        if (data.verified !== true) {
          return false;
        }

        const token =
          typeof data.token === "string"
            ? data.token.trim()
            : "";

        const verificationProof =
          typeof data.verificationProof === "string"
            ? data.verificationProof.trim()
            : "";

        return verifyBarberDevice({
          documentId: docSnapshot.id,
          token,
          proof: verificationProof,
        });
      })
      .map((docSnapshot) => {
        const data = docSnapshot.data() || {};
        return typeof data.token === "string" ? data.token.trim() : "";
      }),
  );
}

/**
 * حذف FCM tokens غير الصالحة الخاصة بالحلاق فقط.
 *
 * حماية إضافية:
 * - لا نحذف أي document إلا إذا role === barber.
 * - لا يوجد أي إرسال إشعارات هنا.
 * - الدالة لا تعمل إلا إذا تم استدعاؤها صراحة.
 */
export async function removeBarberDeviceTokens(tokens) {
  const safeTokens = unique(tokens);

  if (safeTokens.length === 0) {
    return { removed: 0 };
  }

  const admin = getAdmin();
  const db = admin.firestore();

  let removed = 0;

  for (let i = 0; i < safeTokens.length; i += 400) {
    const chunk = safeTokens.slice(i, i + 400);
    const refs = chunk.map((token) =>
      db.collection("deviceTokens").doc(token),
    );

    const snapshots = await db.getAll(...refs);
    const batch = db.batch();
    let batchDeletes = 0;

    snapshots.forEach((snapshot) => {
      if (!snapshot.exists) return;

      const data = snapshot.data() || {};

      if (data.role !== "barber") return;

      batch.delete(snapshot.ref);
      batchDeletes += 1;
    });

    if (batchDeletes > 0) {
      await batch.commit();
      removed += batchDeletes;
    }
  }

  return { removed };
}
