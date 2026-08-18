// src/services/completedStats.js
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const COMPLETED_STATS_COLLECTION = "statsMonthly";
export const AUTO_ARCHIVE_AFTER_MS = 2 * 60 * 60 * 1000;

function makeSlotId(dateYMD, hhmm) {
  return `${dateYMD}_${String(hhmm || "").replace(":", "-")}`;
}

export function getBookingStartDate(booking) {
  const date = String(booking?.selectedDate || "");
  const time = String(booking?.selectedTime || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const parsed = new Date(`${date}T${time}:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getBookingMonthKey(booking) {
  const date = String(booking?.selectedDate || "");

  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "";
}

export function isBookingCancelled(booking) {
  return Boolean(
    booking?.cancelledAt ||
    booking?.canceledAt ||
    booking?.cancelled === true ||
    booking?.isCancelled === true ||
    booking?.status === "cancelled" ||
    booking?.status === "canceled",
  );
}

export function hasBookingStarted(booking, nowMs = Date.now()) {
  const start = getBookingStartDate(booking);

  return Boolean(start && start.getTime() <= nowMs);
}

async function changeMonthlyTotalInTransaction(transaction, monthKey, amount) {
  if (!monthKey || amount === 0) return;

  const statsRef = doc(db, COMPLETED_STATS_COLLECTION, monthKey);

  const statsSnapshot = await transaction.get(statsRef);

  const currentTotal = statsSnapshot.exists()
    ? Math.max(0, Number(statsSnapshot.data()?.completedTotal) || 0)
    : 0;

  const nextTotal = Math.max(0, currentTotal + amount);

  transaction.set(
    statsRef,
    {
      completedTotal: nextTotal,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * يسجّل الدور كدور منجَز أول ما يبدأ وقته.
 *
 * العملية تتم داخل Transaction حتى لا ينحسب نفس الدور
 * مرتين من جهازين أو تبويبين مختلفين.
 */
export async function countBookingIfEligible(bookingId, nowMs = Date.now()) {
  if (!bookingId) {
    return { counted: false };
  }

  return runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);

    if (!bookingSnapshot.exists()) {
      return { counted: false };
    }

    const booking = bookingSnapshot.data() || {};
    const start = getBookingStartDate(booking);

    if (
      !start ||
      start.getTime() > nowMs ||
      isBookingCancelled(booking) ||
      booking.completedStatsCounted === true
    ) {
      return { counted: false };
    }

    const monthKey = getBookingMonthKey(booking);

    if (!monthKey) {
      return { counted: false };
    }

    await changeMonthlyTotalInTransaction(transaction, monthKey, 1);

    transaction.update(bookingRef, {
      completedStatsCounted: true,
      completedStatsMonth: monthKey,
      completedStatsCountedAt: serverTimestamp(),
    });

    return {
      counted: true,
      monthKey,
    };
  });
}

/**
 * يفحص الحجوزات الموجودة حاليًا.
 *
 * فقط الدور الذي:
 * - بدأ وقته.
 * - لم يُلغَ.
 * - لم يُحسب سابقًا.
 *
 * يدخل إلى الإحصائيات.
 */
export async function syncPassedBookingsForCompletedStats(
  bookings,
  nowMs = Date.now(),
) {
  const candidates = (Array.isArray(bookings) ? bookings : []).filter(
    (booking) =>
      booking?.id &&
      booking.completedStatsCounted !== true &&
      !isBookingCancelled(booking) &&
      hasBookingStarted(booking, nowMs),
  );

  if (candidates.length === 0) return;

  await Promise.allSettled(
    candidates.map((booking) => countBookingIfEligible(booking.id, nowMs)),
  );
}

/**
 * بعد مرور ساعتين على بداية الدور:
 *
 * - نتأكد أولًا أن الدور انحسب إذا كان غير ملغي.
 * - نحذف تفاصيل الحجز القديمة.
 * - نحذف حجز الساعة من bookedSlots.
 *
 * يبقى فقط العدد الشهري الخفيف.
 */
export async function archiveExpiredBooking(bookingId, nowMs = Date.now()) {
  if (!bookingId) {
    return { archived: false };
  }

  return runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);

    if (!bookingSnapshot.exists()) {
      return { archived: false };
    }

    const booking = bookingSnapshot.data() || {};
    const start = getBookingStartDate(booking);

    if (!start || nowMs - start.getTime() <= AUTO_ARCHIVE_AFTER_MS) {
      return { archived: false };
    }

    if (
      !isBookingCancelled(booking) &&
      booking.completedStatsCounted !== true
    ) {
      const monthKey = getBookingMonthKey(booking);

      if (monthKey) {
        await changeMonthlyTotalInTransaction(transaction, monthKey, 1);
      }
    }

    transaction.delete(bookingRef);

    if (booking.selectedDate && booking.selectedTime) {
      const slotRef = doc(
        db,
        "bookedSlots",
        makeSlotId(booking.selectedDate, booking.selectedTime),
      );

      transaction.delete(slotRef);
    }

    return { archived: true };
  });
}

/**
 * حذف دور بدأ وقته من سجل الحلاق.
 *
 * NO_SHOW:
 * الزبون لم يأتِ.
 * إذا كان الدور انحسب، ننقصه من إحصائيات الشهر.
 *
 * DELETE_ONLY:
 * الدور صار فعلًا.
 * نضمن أنه محسوب ثم نحذف تفاصيله فقط.
 */
export async function deletePastBookingWithStats(
  bookingId,
  mode = "DELETE_ONLY",
  nowMs = Date.now(),
) {
  if (!bookingId) return;

  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);

    if (!bookingSnapshot.exists()) return;

    const booking = bookingSnapshot.data() || {};
    const monthKey = getBookingMonthKey(booking);

    const started = hasBookingStarted(booking, nowMs);
    const cancelled = isBookingCancelled(booking);

    const alreadyCounted = booking.completedStatsCounted === true;

    if (mode === "NO_SHOW") {
      if (monthKey && alreadyCounted) {
        await changeMonthlyTotalInTransaction(transaction, monthKey, -1);
      }
    } else if (started && !cancelled && !alreadyCounted && monthKey) {
      await changeMonthlyTotalInTransaction(transaction, monthKey, 1);
    }

    transaction.delete(bookingRef);

    if (booking.selectedDate && booking.selectedTime) {
      const slotRef = doc(
        db,
        "bookedSlots",
        makeSlotId(booking.selectedDate, booking.selectedTime),
      );

      transaction.delete(slotRef);
    }
  });
}

/**
 * إلغاء الحجز من أي مكان في الموقع.
 *
 * إذا كان وقت الدور بدأ وانحسب مسبقًا،
 * ينقص العدد مباشرة حتى لا يبقى رقم غلط.
 */
export async function cancelBookingWithStats(bookingId, cancelledBy = null) {
  if (!bookingId) return;

  const safeCancelledBy =
    cancelledBy === "BARBER" || cancelledBy === "CUSTOMER"
      ? cancelledBy
      : null;

  const cancelledNow = await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);

    if (!bookingSnapshot.exists()) {
      throw new Error("Booking not found");
    }

    const booking = bookingSnapshot.data() || {};

    if (isBookingCancelled(booking)) return false;

    const monthKey = getBookingMonthKey(booking);

    if (monthKey && booking.completedStatsCounted === true) {
      await changeMonthlyTotalInTransaction(transaction, monthKey, -1);
    }

    transaction.update(bookingRef, {
      cancelledAt: serverTimestamp(),
      completedStatsCounted: false,
      completedStatsMonth: monthKey || null,
      completedStatsCountedAt: null,
    });

    if (booking.selectedDate && booking.selectedTime) {
      const slotRef = doc(
        db,
        "bookedSlots",
        makeSlotId(booking.selectedDate, booking.selectedTime),
      );

      transaction.set(
        slotRef,
        {
          bookingId,
          selectedDate: booking.selectedDate,
          selectedTime: booking.selectedTime,
          active: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    return true;
  });

  /*
   * cancelledBy معلومة إضافية فقط.
   * إذا فشل حفظها، الإلغاء الأساسي يظل ناجحًا.
   */
  if (!cancelledNow || !safeCancelledBy) return;

  try {
    await runTransaction(db, async (transaction) => {
      const bookingRef = doc(db, "bookings", bookingId);
      const bookingSnapshot = await transaction.get(bookingRef);

      if (!bookingSnapshot.exists()) return;

      const booking = bookingSnapshot.data() || {};

      /*
       * حماية من سباق الاسترجاع:
       * لا نكتب مصدر إلغاء إذا الحجز تم استرجاعه.
       */
      if (!isBookingCancelled(booking)) return;

      transaction.update(bookingRef, {
        cancelledBy: safeCancelledBy,
      });
    });
  } catch (error) {
    console.warn(
      "Cancellation source metadata write skipped:",
      error?.code || error,
    );
  }
}
