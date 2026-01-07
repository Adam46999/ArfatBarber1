// src/services/bookingService.js
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  setDoc,
  increment,
  runTransaction,
} from "firebase/firestore";

import { toILPhoneE164 } from "../utils/phone";

// يوم محجوب بالكامل؟
export async function fetchBlockedDay(dateYMD) {
  const snap = await getDoc(doc(db, "blockedDays", dateYMD));
  return snap.exists();
}

// أوقات محجوبة لليوم
export async function fetchBlockedTimes(dateYMD) {
  const snap = await getDoc(doc(db, "blockedTimes", dateYMD));
  return snap.exists() ? snap.data().times || [] : [];
}

// حجوزات فعّالة لليوم
export async function fetchActiveBookingsByDate(dateYMD) {
  const q = query(
    collection(db, "bookings"),
    where("selectedDate", "==", dateYMD)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).filter((b) => !b.cancelledAt);
}

// رقم محظور؟ (E.164)
export async function isPhoneBlocked(inputPhone) {
  const phoneE164 = toILPhoneE164(inputPhone);
  const snap = await getDoc(doc(db, "blockedPhones", phoneE164));
  return snap.exists();
}

// هل له حجوزات سابقة؟ (E.164)
export async function hasExistingBookings(inputPhone) {
  const phoneE164 = toILPhoneE164(inputPhone);
  const q = query(
    collection(db, "bookings"),
    where("phoneNumber", "==", phoneE164)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// تضارب على نفس التاريخ/الوقت؟
export async function hasActiveConflict(dateYMD, hhmm) {
  const q = query(
    collection(db, "bookings"),
    where("selectedDate", "==", dateYMD),
    where("selectedTime", "==", hhmm)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).some((b) => !b.cancelledAt);
}

// إنشاء الحجز + محاولة تحديث عدّاد الشهر (بدون ما نخرب الحجز لو فشل العداد)
export async function createBooking(payload) {
  // 1) احفظ الحجز (هذا هو الأهم)
  await addDoc(collection(db, "bookings"), {
    ...payload,
    cancelledAt: payload?.cancelledAt ?? null, // تأكيد وجوده
    createdAt: serverTimestamp(),
  });

  // 2) حاول حدّث العداد (إذا فشل ما نوقف المستخدم)
  try {
    const monthKey = String(payload?.selectedDate || "").slice(0, 7); // YYYY-MM
    if (!monthKey || monthKey.length !== 7) return;

    const ref = doc(db, "statsMonthly", monthKey);

    // total = عدد الحجوزات الفعّالة للشهر (Active)
    await setDoc(
      ref,
      { total: increment(1), updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn("statsMonthly increment failed (ignored):", err);
  }
}

/**
 * إلغاء حجز: ينقص العداد فقط إذا الحجز كان فعّال (مش ملغي).
 * لازم تمرّر bookingId (doc id).
 */
export async function cancelBooking(bookingId) {
  const bookingRef = doc(db, "bookings", bookingId);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error("Booking not found");

      const b = snap.data();

      // إذا ملغي أصلاً: لا تعمل شي (عشان ما ينقص مرتين)
      if (b.cancelledAt) return;

      const monthKey = String(b.selectedDate || "").slice(0, 7); // YYYY-MM
      if (!monthKey || monthKey.length !== 7) {
        // نلغي الحجز بدون ما نلمس العداد إذا الداتا ناقصة
        tx.update(bookingRef, { cancelledAt: serverTimestamp() });
        return;
      }

      const monthRef = doc(db, "statsMonthly", monthKey);

      // 1) علّم الحجز كملغي
      tx.update(bookingRef, { cancelledAt: serverTimestamp() });

      // 2) أنقص العداد الفعّال
      tx.set(
        monthRef,
        { total: increment(-1), updatedAt: serverTimestamp() },
        { merge: true }
      );
    });
  } catch (err) {
    // مهم: لو فشل الترانزاكشن، لا تسكت… لأنه ممكن يضل العداد غلط
    console.error("cancelBooking failed:", err);
    throw err;
  }
}
