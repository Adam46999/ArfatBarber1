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

// هل له حجوزات سابقة؟ (E.164) - عام (كل الأيام)
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

/* =========================================
   إعدادات الحلاق: حجز واحد لكل رقم في اليوم
   ========================================= */

// هل وضع "حجز واحد لكل رقم في اليوم" مفعّل؟
export async function isLimitOneBookingPerDayEnabled() {
  try {
    const ref = doc(db, "barberSettings", "global");
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data();
    // دعم اسم حقل واحد أساسي + اسم بديل احتياطي
    const value =
      typeof data.limitOneBookingPerDayPerPhone === "boolean"
        ? data.limitOneBookingPerDayPerPhone
        : !!data.limitOneBookingPerDay;

    return value;
  } catch (err) {
    console.error("isLimitOneBookingPerDayEnabled error:", err);
    // لو صار خطأ، منرجع false عشان ما نخرّب تجربة المستخدم
    return false;
  }
}

// هل يوجد حجز فعّال لنفس الرقم في نفس اليوم؟
export async function hasSameDayBookingForPhone(inputPhone, dateYMD) {
  const phoneE164 = toILPhoneE164(inputPhone);
  const q = query(
    collection(db, "bookings"),
    where("phoneNumber", "==", phoneE164),
    where("selectedDate", "==", dateYMD)
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;

  return snap.docs.map((d) => d.data()).some((b) => !b.cancelledAt);
}

// إنشاء الحجز
export async function createBooking(payload) {
  await addDoc(collection(db, "bookings"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}
