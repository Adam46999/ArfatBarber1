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
 * تحديث الحجز بعد الإرسال
 * updates مثال:
 * { "notify.r30mSentAt": Date.now() }
 */
export async function markBookingUpdated(bookingId, updates) {
  const admin = getAdmin();
  const db = admin.firestore();

  await db.collection(CONFIG.COLLECTION).doc(bookingId).update(updates);
}
