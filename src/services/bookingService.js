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

// هل اليوم محجوب بالكامل؟
export async function fetchBlockedDay(dateYMD) {
  const snap = await getDoc(doc(db, "blockedDays", dateYMD));
  return snap.exists();
}

// أوقات محظورة لليوم
export async function fetchBlockedTimes(dateYMD) {
  const snap = await getDoc(doc(db, "blockedTimes", dateYMD));
  return snap.exists() ? snap.data().times || [] : [];
}

// حجوزات فعّالة (غير ملغاة) لليوم
export async function fetchActiveBookingsByDate(dateYMD) {
  const q = query(
    collection(db, "bookings"),
    where("selectedDate", "==", dateYMD)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).filter((b) => !b.cancelledAt);
}

// رقم هاتف محظور؟
export async function isPhoneBlocked(cleanPhone) {
  const snap = await getDoc(doc(db, "blockedPhones", cleanPhone));
  return snap.exists();
}

// هل لديه حجوزات سابقة؟
export async function hasExistingBookings(cleanPhone) {
  const q = query(
    collection(db, "bookings"),
    where("phoneNumber", "==", cleanPhone)
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

// إنشاء الحجز
export async function createBooking(payload) {
  await addDoc(collection(db, "bookings"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}
