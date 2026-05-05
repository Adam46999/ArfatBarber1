// src/services/bookingService.js
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  setDoc,
  increment,
  runTransaction,
} from "firebase/firestore";

import { toILPhoneE164 } from "../utils/phone";

function makeSlotId(dateYMD, hhmm) {
  return `${dateYMD}_${String(hhmm || "").replace(":", "-")}`;
}

export async function fetchBlockedDay(dateYMD) {
  const snap = await getDoc(doc(db, "blockedDays", dateYMD));
  return snap.exists();
}

export async function fetchBlockedTimes(dateYMD) {
  const snap = await getDoc(doc(db, "blockedTimes", dateYMD));
  return snap.exists() ? snap.data().times || [] : [];
}

export async function fetchActiveBookingsByDate(dateYMD) {
  const q = query(
    collection(db, "bookings"),
    where("selectedDate", "==", dateYMD),
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => !b.cancelledAt);
}

export async function isPhoneBlocked(inputPhone) {
  const phoneE164 = toILPhoneE164(inputPhone);
  const snap = await getDoc(doc(db, "blockedPhones", phoneE164));
  return snap.exists();
}

export async function hasExistingBookings(inputPhone) {
  const phoneE164 = toILPhoneE164(inputPhone);
  const q = query(
    collection(db, "bookings"),
    where("phoneNumber", "==", phoneE164),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function hasActiveConflict(dateYMD, hhmm) {
  const q = query(
    collection(db, "bookings"),
    where("selectedDate", "==", dateYMD),
    where("selectedTime", "==", hhmm),
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => d.data()).some((b) => !b.cancelledAt);
}

export async function createBooking(payload) {
  const slotId = makeSlotId(payload.selectedDate, payload.selectedTime);
  const slotRef = doc(db, "bookedSlots", slotId);
  const bookingRef = doc(collection(db, "bookings"));

  await runTransaction(db, async (tx) => {
    const slotSnap = await tx.get(slotRef);

    if (slotSnap.exists() && slotSnap.data()?.active === true) {
      const oldBookingId = slotSnap.data()?.bookingId;

      if (oldBookingId) {
        const oldBookingRef = doc(db, "bookings", oldBookingId);
        const oldBookingSnap = await tx.get(oldBookingRef);

        if (oldBookingSnap.exists()) {
          const oldBooking = oldBookingSnap.data();

          if (!oldBooking.cancelledAt) {
            throw new Error("TIME_ALREADY_BOOKED");
          }
        }
      }
    }

    tx.set(bookingRef, {
      ...payload,
      cancelledAt: payload?.cancelledAt ?? null,
      createdAt: serverTimestamp(),
    });

    tx.set(
      slotRef,
      {
        bookingId: bookingRef.id,
        selectedDate: payload.selectedDate,
        selectedTime: payload.selectedTime,
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  try {
    const monthKey = String(payload?.selectedDate || "").slice(0, 7);
    if (!monthKey || monthKey.length !== 7) return bookingRef.id;

    const monthRef = doc(db, "statsMonthly", monthKey);

    await setDoc(
      monthRef,
      { total: increment(1), updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    console.warn("statsMonthly increment failed (ignored):", err);
  }

  return bookingRef.id;
}

export async function cancelBooking(bookingId) {
  const bookingRef = doc(db, "bookings", bookingId);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error("Booking not found");

      const b = snap.data();

      if (b.cancelledAt) return;

      const slotId = makeSlotId(b.selectedDate, b.selectedTime);
      const slotRef = doc(db, "bookedSlots", slotId);

      tx.update(bookingRef, {
        cancelledAt: serverTimestamp(),
      });

      tx.set(
        slotRef,
        {
          bookingId,
          selectedDate: b.selectedDate,
          selectedTime: b.selectedTime,
          active: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const monthKey = String(b.selectedDate || "").slice(0, 7);
      if (!monthKey || monthKey.length !== 7) return;

      const monthRef = doc(db, "statsMonthly", monthKey);

      tx.set(
        monthRef,
        {
          total: increment(-1),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (err) {
    console.error("cancelBooking failed:", err);
    throw err;
  }
}
