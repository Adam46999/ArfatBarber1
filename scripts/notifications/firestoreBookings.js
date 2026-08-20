// scripts/notifications/firestoreBookings.js

/**
 * هذا الملف مسؤول عن:
 * - قراءة الحجوزات من Firestore
 * - تحديد أي حجوزات لازم ينبعت لها إشعار الآن
 * - تحديث flags داخل الحجز بعد الإرسال
 *
 * لا يوجد FCM هنا
 * لا يوجد Templates
 * فقط Firestore logic
 */

import { getAdmin } from "./firebaseAdmin.js";
import { CONFIG } from "./config.js";

// الوقت الحالي بالـ ms
function nowMs() {
  return Date.now();
}

/**
 * الحجوزات الجديدة لإشعار "عند الحجز"
 * نبحث عن حجوزات:
 * - انشأت خلال آخر LOOKBACK_CREATE_MIN
 * - notify.onCreateSentAt == null
 */
export async function getNewBookingsForOnCreate() {
  const admin = getAdmin();
  const db = admin.firestore();

  const fromMs = nowMs() - CONFIG.LOOKBACK_CREATE_MIN * 60 * 1000;

  const snap = await db
    .collection(CONFIG.COLLECTION)
    .where("createdAtMs", ">=", fromMs)
    .where("notify.onCreateSentAt", "==", null)
    .get();

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/**
 * الحجوزات الجديدة التي لم تتم معالجة إشعار الحلاق لها بعد.
 *
 * مهم:
 * - هذا المسار منفصل عن إشعار الزبون.
 * - لا يعتمد على وجود FCM token للزبون.
 * - نستخدم شرط createdAtMs فقط في Firestore لتجنب الحاجة
 *   إلى Composite Index جديد، ثم نفلتر barberOnCreateSentAt في Node.
 */
export async function getNewBookingsForBarberOnCreate() {
  const admin = getAdmin();
  const db = admin.firestore();

  const fromMs = nowMs() - CONFIG.LOOKBACK_CREATE_MIN * 60 * 1000;

  const snap = await db
    .collection(CONFIG.COLLECTION)
    .where("createdAtMs", ">=", fromMs)
    .get();

  return snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    .filter((booking) => {
      const notify = booking?.notify;

      return (
        notify &&
        Object.prototype.hasOwnProperty.call(
          notify,
          "barberOnCreateSentAt",
        ) &&
        notify.barberOnCreateSentAt == null
      );
    });
}

/**
 * الحجوزات التي تحتاج تذكير
 * minutesBefore = 24h / 2h / 30m
 */
export async function getBookingsForReminder(minutesBefore) {
  const admin = getAdmin();
  const db = admin.firestore();

  const windowMs = CONFIG.WINDOW_MIN * 60 * 1000;
  const targetMs = nowMs() + minutesBefore * 60 * 1000;

  const fromMs = targetMs - windowMs;
  const toMs = targetMs + windowMs;

  // تحديد أي flag نستخدم
  let flagField = "notify.r30mSentAt";
  if (minutesBefore === 24 * 60) flagField = "notify.r24hSentAt";
  if (minutesBefore === 2 * 60) flagField = "notify.r2hSentAt";

  const snap = await db
    .collection(CONFIG.COLLECTION)
    .where("timestamp", ">=", fromMs)
    .where("timestamp", "<=", toMs)
    .where(flagField, "==", null)
    .get();

  return {
    flagField,
    bookings: snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })),
  };
}

/**
 * Claim ذري لمعالجة إشعار الحلاق عند إنشاء الحجز.
 *
 * الهدف:
 * - منع تشغيلين متزامنين من إرسال نفس الإشعار مرتين.
 * - عدم إعادة معالجة حجز تم إرسال إشعار الحلاق له.
 * - السماح باستعادة claim عالق بعد انتهاء مدة الـ lease.
 *
 * هذه الدالة لا ترسل أي إشعار.
 */
export async function claimBarberOnCreate(
  bookingId,
  claimId,
  leaseMs = 10 * 60 * 1000,
) {
  if (!bookingId || !claimId) return false;

  const admin = getAdmin();
  const db = admin.firestore();
  const bookingRef = db.collection(CONFIG.COLLECTION).doc(bookingId);
  const currentMs = nowMs();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bookingRef);

    if (!snapshot.exists) {
      return false;
    }

    const booking = snapshot.data() || {};
    const notify = booking.notify || {};

    if (
      !Object.prototype.hasOwnProperty.call(
        notify,
        "barberOnCreateSentAt",
      )
    ) {
      return false;
    }

    if (notify.barberOnCreateSentAt != null) {
      return false;
    }

    const existingClaimId = notify.barberOnCreateClaimId || null;
    const existingClaimedAt = Number(notify.barberOnCreateClaimedAt || 0);
    const claimStillActive =
      existingClaimId &&
      existingClaimedAt > 0 &&
      currentMs - existingClaimedAt < leaseMs;

    if (claimStillActive) {
      return false;
    }

    transaction.update(bookingRef, {
      "notify.barberOnCreateClaimId": claimId,
      "notify.barberOnCreateClaimedAt": currentMs,
      "notify.barberOnCreateStatus": "processing",
    });

    return true;
  });
}

/**
 * تحديث الحجز بعد الإرسال
 * updates مثال:
 * { "notify.r30mSentAt": Date.now() }
 */
export async function markBookingUpdated(bookingId, updates) {
  const admin = getAdmin();
  const db = admin.firestore();

  await db.collection(CONFIG.COLLECTION).doc(bookingId).update(updates);
}
