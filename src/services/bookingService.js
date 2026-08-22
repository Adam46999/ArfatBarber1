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
import defaultWorkingHours from "../constants/workingHours";
import {
  applyExtraSlots,
  generateSlots30Min,
  safeInt,
} from "../utils/slots";
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
/**
 * أقل مدة مسموحة قبل الموعد لتغييره.
 *
 * نفس سياسة الإلغاء الحالية حتى لا يصبح
 * تغيير الموعد طريقة للالتفاف على حد الإلغاء.
 */
const RESCHEDULE_WINDOW_MIN = 50;

function normalizeBookingCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getBookingStartMs(booking) {
  if (booking?.startAt?.toMillis) {
    const value = booking.startAt.toMillis();

    if (Number.isFinite(value)) {
      return value;
    }
  }

  if (booking?.startAt?.toDate) {
    const value = booking.startAt.toDate()?.getTime?.();

    if (Number.isFinite(value)) {
      return value;
    }
  }

  const dateYMD = String(booking?.selectedDate || "").trim();
  const timeHHMM = String(booking?.selectedTime || "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateYMD) ||
    !/^\d{2}:\d{2}$/.test(timeHHMM)
  ) {
    return Number.NaN;
  }

  const value = new Date(
    `${dateYMD}T${timeHHMM}:00`,
  ).getTime();

  return Number.isFinite(value)
    ? value
    : Number.NaN;
}

function extractWeeklyHoursForReschedule(data) {
  if (!data || typeof data !== "object") {
    return defaultWorkingHours;
  }

  if (
    data.weekly &&
    typeof data.weekly === "object" &&
    !Array.isArray(data.weekly)
  ) {
    return data.weekly;
  }

  if (
    data.weeklyHours &&
    typeof data.weeklyHours === "object" &&
    !Array.isArray(data.weeklyHours)
  ) {
    return data.weeklyHours;
  }

  const hasDirectDay = Object.keys(
    defaultWorkingHours,
  ).some((dayKey) =>
    Object.prototype.hasOwnProperty.call(
      data,
      dayKey,
    ),
  );

  return hasDirectDay
    ? data
    : defaultWorkingHours;
}

function getWeekdayName(dateYMD) {
  const date = new Date(`${dateYMD}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

/**
 * تغيير موعد الحجز نفسه بدون إنشاء حجز جديد.
 *
 * جميع التغييرات الحساسة:
 * - تثبيت الساعة الجديدة
 * - تحديث الحجز
 * - تحرير الساعة القديمة
 *
 * تتم داخل Transaction واحدة.
 */
export async function rescheduleBooking({
  bookingId,
  bookingCode,
  selectedDate,
  selectedTime,
}) {
  const safeBookingId = String(
    bookingId || "",
  ).trim();

  const safeBookingCode =
    normalizeBookingCode(bookingCode);

  const safeSelectedDate = String(
    selectedDate || "",
  ).trim();

  const safeSelectedTime = String(
    selectedTime || "",
  ).trim();

  if (
    !safeBookingId ||
    !safeBookingCode ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      safeSelectedDate,
    ) ||
    !/^\d{2}:\d{2}$/.test(
      safeSelectedTime,
    )
  ) {
    throw new Error(
      "INVALID_RESCHEDULE_REQUEST",
    );
  }

  const targetTimestamp = new Date(
    `${safeSelectedDate}T${safeSelectedTime}:00`,
  ).getTime();

  if (!Number.isFinite(targetTimestamp)) {
    throw new Error(
      "INVALID_TARGET_DATE_TIME",
    );
  }

  const currentMs = Date.now();

  if (targetTimestamp <= currentMs) {
    throw new Error("TARGET_TIME_IN_PAST");
  }

  const bookingRef = doc(
    db,
    "bookings",
    safeBookingId,
  );

  const [rescheduleBookingSnap, rescheduleSettingsSnap] =
    await Promise.all([
      getDoc(bookingRef),
      getDoc(doc(db, "barberSettings", "global")),
    ]);

  if (!rescheduleBookingSnap.exists()) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  const rescheduleCurrentBooking =
    rescheduleBookingSnap.data() || {};

  if (
    normalizeBookingCode(rescheduleCurrentBooking.bookingCode) !==
    safeBookingCode
  ) {
    throw new Error("INVALID_BOOKING_CODE");
  }

  const rescheduleSettings = rescheduleSettingsSnap.exists()
    ? rescheduleSettingsSnap.data() || {}
    : {};

  const limitOnePerDay =
    typeof rescheduleSettings.limitOneBookingPerDayPerPhone === "boolean"
      ? rescheduleSettings.limitOneBookingPerDayPerPhone
      : Boolean(rescheduleSettings.limitOneBookingPerDay);

  if (limitOnePerDay) {
    const phone = toILPhoneE164(
      rescheduleCurrentBooking.phoneNumber,
    );

    const dayBookings =
      await fetchActiveBookingsByDate(safeSelectedDate);

    const hasOtherBooking = dayBookings.some(
      (candidate) =>
        candidate.id !== safeBookingId &&
        toILPhoneE164(candidate.phoneNumber) === phone,
    );

    if (hasOtherBooking) {
      throw new Error("PHONE_ALREADY_BOOKED_TODAY");
    }
  }
  return runTransaction(
    db,
    async (transaction) => {
      const bookingSnapshot =
        await transaction.get(bookingRef);

      if (!bookingSnapshot.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      const booking =
        bookingSnapshot.data() || {};

      if (booking.cancelledAt) {
        throw new Error("BOOKING_CANCELLED");
      }

      const storedCode =
        normalizeBookingCode(
          booking.bookingCode,
        );

      if (
        !storedCode ||
        storedCode !== safeBookingCode
      ) {
        throw new Error(
          "INVALID_BOOKING_CODE",
        );
      }

      const oldDate = String(
        booking.selectedDate || "",
      ).trim();

      const oldTime = String(
        booking.selectedTime || "",
      ).trim();

      if (
        oldDate === safeSelectedDate &&
        oldTime === safeSelectedTime
      ) {
        throw new Error(
          "SAME_BOOKING_TIME",
        );
      }

      const oldStartMs =
        getBookingStartMs(booking);

      if (!Number.isFinite(oldStartMs)) {
        throw new Error(
          "INVALID_CURRENT_BOOKING_TIME",
        );
      }

      const minutesLeft = Math.floor(
        (oldStartMs - currentMs) / 60000,
      );

      if (
        minutesLeft <
        RESCHEDULE_WINDOW_MIN
      ) {
        throw new Error(
          "RESCHEDULE_WINDOW_CLOSED",
        );
      }

      if (
        booking.completedStatsCounted ===
        true
      ) {
        throw new Error(
          "BOOKING_ALREADY_COUNTED",
        );
      }

      const oldSlotRef = doc(
        db,
        "bookedSlots",
        makeSlotId(oldDate, oldTime),
      );

      const newSlotRef = doc(
        db,
        "bookedSlots",
        makeSlotId(
          safeSelectedDate,
          safeSelectedTime,
        ),
      );

      const blockedDayRef = doc(
        db,
        "blockedDays",
        safeSelectedDate,
      );

      const blockedTimesRef = doc(
        db,
        "blockedTimes",
        safeSelectedDate,
      );

      const slotExtrasRef = doc(
        db,
        "slotExtras",
        safeSelectedDate,
      );

      const weeklyHoursRef = doc(
        db,
        "barberSettings",
        "hours",
      );

      const [
        oldSlotSnapshot,
        newSlotSnapshot,
        blockedDaySnapshot,
        blockedTimesSnapshot,
        slotExtrasSnapshot,
        weeklyHoursSnapshot,
      ] = await Promise.all([
        transaction.get(oldSlotRef),
        transaction.get(newSlotRef),
        transaction.get(blockedDayRef),
        transaction.get(blockedTimesRef),
        transaction.get(slotExtrasRef),
        transaction.get(weeklyHoursRef),
      ]);

      if (blockedDaySnapshot.exists()) {
        throw new Error(
          "TARGET_DAY_BLOCKED",
        );
      }

      const blockedTimes =
        blockedTimesSnapshot.exists()
          ? blockedTimesSnapshot.data()
              ?.times
          : [];

      if (
        Array.isArray(blockedTimes) &&
        blockedTimes.includes(
          safeSelectedTime,
        )
      ) {
        throw new Error(
          "TARGET_TIME_BLOCKED",
        );
      }

      /*
       * نتأكد أن الساعة الجديدة موجودة فعلًا
       * ضمن نفس جدول الدوام والـExtra Slots
       * الذي يعتمد عليه الحجز العادي.
       */
      const weeklyHours =
        weeklyHoursSnapshot.exists()
          ? extractWeeklyHoursForReschedule(
              weeklyHoursSnapshot.data(),
            )
          : defaultWorkingHours;

      const weekday =
        getWeekdayName(
          safeSelectedDate,
        );

      const dayHours =
        weekday
          ? weeklyHours?.[weekday]
          : null;

      if (
        !dayHours?.from ||
        !dayHours?.to
      ) {
        throw new Error(
          "TARGET_DAY_CLOSED",
        );
      }

      const extraSlots =
        slotExtrasSnapshot.exists()
          ? safeInt(
              slotExtrasSnapshot.data()
                ?.extraSlots,
              0,
            )
          : 0;

      const validTargetSlots =
        applyExtraSlots(
          generateSlots30Min(
            dayHours.from,
            dayHours.to,
          ),
          extraSlots,
        );

      if (
        !validTargetSlots.includes(
          safeSelectedTime,
        )
      ) {
        throw new Error(
          "TARGET_TIME_NOT_AVAILABLE",
        );
      }

      if (
        oldSlotSnapshot.exists() &&
        oldSlotSnapshot.data()?.active ===
          true
      ) {
        const owner =
          oldSlotSnapshot.data()
            ?.bookingId;

        if (
          !owner || owner !== safeBookingId
        ) {
          throw new Error(
            "OLD_SLOT_CONFLICT",
          );
        }
      }

      if (
        newSlotSnapshot.exists() &&
        newSlotSnapshot.data()?.active ===
          true
      ) {
        const occupyingBookingId =
          newSlotSnapshot.data()?.bookingId;

        /*
         * أي slot فعّال ليس للحجز نفسه
         * نعتبره محجوزًا.
         *
         * لا نحاول إصلاح بيانات قديمة هنا
         * لأن الأولوية هي ألا نسرق موعدًا
         * من حجز آخر تحت أي ظرف.
         */
        if (
          !occupyingBookingId ||
          occupyingBookingId !==
            safeBookingId
        ) {
          throw new Error(
            "TIME_ALREADY_BOOKED",
          );
        }
      }

      const previousCount = Number(
        booking.rescheduleCount || 0,
      );

      const nextCount =
        Number.isFinite(previousCount)
          ? previousCount + 1
          : 1;

      /*
       * نحافظ على flags الخاصة بإنشاء الحجز،
       * ونصفّر فقط تذكيرات الوقت.
       */
      const nextNotify = {
        ...(booking.notify || {}),
        r24hSentAt: null,
        r2hSentAt: null,
        r30mSentAt: null,
      };

      transaction.update(
        bookingRef,
        {
          selectedDate:
            safeSelectedDate,

          selectedTime:
            safeSelectedTime,

          timestamp:
            targetTimestamp,

          startAt: new Date(
            targetTimestamp,
          ),

          notify: nextNotify,

          reminderSent_60: false,
          reminderSent_30: false,

          rescheduledAt:
            serverTimestamp(),

          rescheduledAtMs:
            currentMs,

          rescheduleCount:
            nextCount,

          lastReschedule: {
            fromDate: oldDate,
            fromTime: oldTime,
            fromTimestamp:
              oldStartMs,

            toDate:
              safeSelectedDate,
            toTime:
              safeSelectedTime,
            toTimestamp:
              targetTimestamp,

            changedBy:
              "CUSTOMER",
            changedAtMs:
              currentMs,
          },

          updatedAt:
            serverTimestamp(),
        },
      );

      transaction.set(
        newSlotRef,
        {
          bookingId:
            safeBookingId,

          selectedDate:
            safeSelectedDate,

          selectedTime:
            safeSelectedTime,

          active: true,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        },
      );

      /*
       * الساعة القديمة تتحرر فقط
       * لو الـslot نفسه يعود لهذا الحجز.
       */
      if (
        oldSlotSnapshot.exists() &&
        oldSlotSnapshot.data()
          ?.bookingId ===
          safeBookingId
      ) {
        transaction.set(
          oldSlotRef,
          {
            bookingId:
              safeBookingId,

            selectedDate:
              oldDate,

            selectedTime:
              oldTime,

            active: false,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          },
        );
      }

      return {
        bookingId:
          safeBookingId,

        previousDate:
          oldDate,

        previousTime:
          oldTime,

        selectedDate:
          safeSelectedDate,

        selectedTime:
          safeSelectedTime,

        timestamp:
          targetTimestamp,

        rescheduleCount:
          nextCount,
      };
    },
  );
}

export async function cancelBooking(bookingId) {
  try {
    await cancelBookingWithStats(bookingId, "CUSTOMER");
  } catch (error) {
    console.error("cancelBooking failed:", error);

    throw error;
  }
}
