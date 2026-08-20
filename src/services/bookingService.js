// src/services/bookingService.js
import { db } from "../firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { toILPhoneE164 } from "../utils/phone";
import { cancelBookingWithStats } from "./completedStats";

/**
 * يحوّل التاريخ والساعة إلى معرّف ثابت للموعد.
 *
 * مثال:
 * 2026-07-20 + 14:30
 * يصبح:
 * 2026-07-20_14-30
 */
function makeSlotId(dateYMD, hhmm) {
  return `${dateYMD}_${String(hhmm || "").replace(":", "-")}`;
}

/**
 * يتأكد أن requestId آمن للاستخدام كمعرّف مستند في Firestore.
 */
function cleanRequestId(value) {
  if (typeof value !== "string") return "";

  const cleaned = value.trim();

  return /^[A-Za-z0-9_-]{12,120}$/.test(cleaned) ? cleaned : "";
}

/**
 * يفحص أن الحجز الموجود يعود فعلًا لنفس محاولة الحجز.
 *
 * هذا يمنع إعادة استخدام requestId نفسه لحجز مختلف.
 */
function matchesExistingAttempt(existing, payload) {
  return (
    existing?.selectedDate === payload?.selectedDate &&
    existing?.selectedTime === payload?.selectedTime &&
    existing?.phoneNumber === payload?.phoneNumber
  );
}

/**
 * فحص هل اليوم مغلق بالكامل.
 */
export async function fetchBlockedDay(dateYMD) {
  const snapshot = await getDoc(doc(db, "blockedDays", dateYMD));

  return snapshot.exists();
}

/**
 * جلب الساعات المغلقة في يوم معيّن.
 */
export async function fetchBlockedTimes(dateYMD) {
  const snapshot = await getDoc(doc(db, "blockedTimes", dateYMD));

  return snapshot.exists() ? snapshot.data().times || [] : [];
}

/**
 * جلب الحجوزات الفعالة في يوم معيّن.
 *
 * الحجوزات الملغاة لا تعتبر مواعيد مشغولة.
 */
export async function fetchActiveBookingsByDate(dateYMD) {
  const bookingsQuery = query(
    collection(db, "bookings"),
    where("selectedDate", "==", dateYMD),
  );

  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs
    .map((bookingDocument) => ({
      id: bookingDocument.id,
      ...bookingDocument.data(),
    }))
    .filter((booking) => !booking.cancelledAt);
}

/**
 * فحص هل رقم الهاتف محظور.
 */
export async function isPhoneBlocked(inputPhone) {
  const phoneE164 = toILPhoneE164(inputPhone);

  const snapshot = await getDoc(doc(db, "blockedPhones", phoneE164));

  return snapshot.exists();
}

/**
 * فحص هل لدى رقم الهاتف أي حجوزات سابقة.
 */
export async function hasExistingBookings(inputPhone) {
  const phoneE164 = toILPhoneE164(inputPhone);

  const bookingsQuery = query(
    collection(db, "bookings"),
    where("phoneNumber", "==", phoneE164),
  );

  const snapshot = await getDocs(bookingsQuery);

  return !snapshot.empty;
}

/**
 * فحص إضافي هل يوجد حجز فعّال بنفس التاريخ والساعة.
 */
export async function hasActiveConflict(dateYMD, hhmm) {
  const bookingsQuery = query(
    collection(db, "bookings"),
    where("selectedDate", "==", dateYMD),
    where("selectedTime", "==", hhmm),
  );

  const snapshot = await getDocs(bookingsQuery);

  return snapshot.docs
    .map((bookingDocument) => bookingDocument.data())
    .some((booking) => !booking.cancelledAt);
}

/**
 * البحث عن حجز بواسطة رقم محاولة الحجز.
 *
 * نستخدم requestId نفسه كمعرّف للحجز.
 * هذا يسمح للموقع باسترجاع نتيجة المحاولة بعد:
 *
 * - بطء الاتصال.
 * - تحديث الصفحة.
 * - الخروج والرجوع.
 * - انقطاع الإنترنت.
 */
export async function getBookingByRequestId(requestId) {
  const safeRequestId = cleanRequestId(requestId);

  if (!safeRequestId) return null;

  const snapshot = await getDoc(doc(db, "bookings", safeRequestId));

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/**
 * إنشاء الحجز مرة واحدة فقط لكل requestId.
 *
 * إذا أعاد المستخدم المحاولة بعد بطء الاتصال أو تحديث الصفحة،
 * يرجع نفس الحجز بدل إنشاء حجز مكرر.
 */
export async function createBooking(payload) {
  const safeRequestId = cleanRequestId(payload?.requestId);

  const bookingRef = safeRequestId
    ? doc(db, "bookings", safeRequestId)
    : doc(collection(db, "bookings"));

  const slotId = makeSlotId(payload.selectedDate, payload.selectedTime);

  const slotRef = doc(db, "bookedSlots", slotId);

  await runTransaction(db, async (transaction) => {
    /*
     * نقرأ الحجز والموعد أولًا قبل تنفيذ أي كتابة.
     */
    const [bookingSnapshot, slotSnapshot] = await Promise.all([
      transaction.get(bookingRef),
      transaction.get(slotRef),
    ]);

    /*
     * إذا كان الحجز موجودًا بنفس requestId،
     * نتحقق هل هو فعلًا نفس المحاولة.
     */
    if (bookingSnapshot.exists()) {
      const existingBooking = bookingSnapshot.data();

      if (!matchesExistingAttempt(existingBooking, payload)) {
        throw new Error("REQUEST_ID_CONFLICT");
      }

      /*
       * نفس محاولة الحجز نجحت سابقًا.
       * لا ننشئ حجزًا ثانيًا.
       */
      return;
    }

    /*
     * فحص هل الموعد مسجّل كموعد فعّال.
     */
    if (slotSnapshot.exists() && slotSnapshot.data()?.active === true) {
      const oldBookingId = slotSnapshot.data()?.bookingId;

      /*
       * نفحص الحجز القديم للتأكد أنه غير ملغى.
       */
      if (oldBookingId) {
        const oldBookingRef = doc(db, "bookings", oldBookingId);

        const oldBookingSnapshot = await transaction.get(oldBookingRef);

        if (oldBookingSnapshot.exists()) {
          const oldBooking = oldBookingSnapshot.data();

          if (!oldBooking.cancelledAt) {
            throw new Error("TIME_ALREADY_BOOKED");
          }
        }
      } else {
        /*
         * إذا كان الموعد فعّالًا لكن لا يوجد bookingId،
         * نعتبره محجوزًا للحماية.
         */
        throw new Error("TIME_ALREADY_BOOKED");
      }
    }

    const createdAtMs = Number(payload?.createdAtMs) || Date.now();

    /*
     * إنشاء الحجز.
     */
    transaction.set(bookingRef, {
      ...payload,

      requestId: safeRequestId || bookingRef.id,

      createdAtMs,

      cancelledAt: payload?.cancelledAt ?? null,

      /*
       * هذه الحقول تمنع احتساب نفس الدور مرتين.
       */
      completedStatsCounted: false,
      completedStatsMonth: null,
      completedStatsCountedAt: null,

      notify: {
        onCreateSentAt: null,
        r24hSentAt: null,
        r2hSentAt: null,
        r30mSentAt: null,
        barberOnCreateSentAt: null,
        barberOnCreateStatus: null,
        ...(payload?.notify || {}),
      },

      createdAt: serverTimestamp(),
    });

    /*
     * حجز الموعد في bookedSlots.
     */
    transaction.set(
      slotRef,
      {
        bookingId: bookingRef.id,
        selectedDate: payload.selectedDate,
        selectedTime: payload.selectedTime,
        active: true,
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      },
    );
  });

  return bookingRef.id;
}

/**
 * إضافة FCM Token بعد نجاح الحجز.
 *
 * فشل الإشعارات لا يمنع الحجز ولا يؤخره.
 */
export async function attachFcmTokenToBooking(bookingId, token) {
  if (!bookingId || !token) return;

  await updateDoc(doc(db, "bookings", bookingId), {
    fcmToken: token,

    fcmTokens: arrayUnion(token),

    fcmTokenUpdatedAt: serverTimestamp(),
  });
}

/**
 * تسجيل أحداث وأخطاء الحجز بالخلفية.
 *
 * لا ننتظر هذه العملية، لذلك لا تستطيع:
 *
 * - إبطاء الحجز.
 * - تعطيل الحجز.
 * - منع ظهور النجاح.
 */
export function logBookingClientEvent(event) {
  const safeEvent = {
    type: String(event?.type || "UNKNOWN").slice(0, 80),

    stage: String(event?.stage || "").slice(0, 80),

    requestId: String(event?.requestId || "").slice(0, 120),

    selectedDate: String(event?.selectedDate || "").slice(0, 10),

    selectedTime: String(event?.selectedTime || "").slice(0, 5),

    errorCode: String(event?.errorCode || "").slice(0, 120),

    durationMs: Number(event?.durationMs) || 0,

    online:
      typeof event?.online === "boolean"
        ? event.online
        : typeof navigator !== "undefined"
          ? navigator.onLine
          : true,

    createdAt: serverTimestamp(),
  };

  addDoc(collection(db, "bookingClientEvents"), safeEvent).catch((error) => {
    console.warn("Booking diagnostic write skipped:", error?.code || error);
  });
}

/**
 * إلغاء الحجز وتحرير الموعد.
 *
 * إذا كان الدور قد بدأ وانحسب بالإحصائيات،
 * ينقص العدد تلقائيًا عند الإلغاء.
 *
 * إذا لم يبدأ الدور بعد،
 * ينلغى بدون التأثير على الإحصائيات.
 */
export async function cancelBooking(bookingId) {
  try {
    await cancelBookingWithStats(bookingId, "CUSTOMER");
  } catch (error) {
    console.error("cancelBooking failed:", error);

    throw error;
  }
}
