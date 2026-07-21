// src/pages/barberPanel/hooks/useBookingsLive.js

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../../firebase";

const MAX_RECENT_BOOKINGS = 5;

/**
 * نحدد وقت إنشاء الحجز الحقيقي.
 *
 * الأولوية:
 * 1. createdAtMs
 * 2. createdAt من Firestore
 * 3. Date عادي إذا كان موجود
 *
 * تاريخ ووقت الموعد نفسه ليس هو الأساس،
 * لأن هدف القسم هو عرض آخر من قام بالحجز.
 */
function getBookingCreationTime(booking) {
  const createdAtMs = Number(booking?.createdAtMs);

  if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
    return createdAtMs;
  }

  if (booking?.createdAt && typeof booking.createdAt.toDate === "function") {
    return booking.createdAt.toDate().getTime();
  }

  if (booking?.createdAt instanceof Date) {
    return booking.createdAt.getTime();
  }

  return 0;
}

export default function useBookingsLive() {
  const [bookings, setBookings] = useState([]);

  // =========================================================
  // الاستماع المباشر لكل الحجوزات
  // =========================================================
  useEffect(() => {
    const bookingsQuery = query(collection(db, "bookings"));

    const unsubscribe = onSnapshot(
      bookingsQuery,

      (snapshot) => {
        const nextBookings = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setBookings(nextBookings);
      },

      (error) => {
        console.error("Bookings onSnapshot error:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // الحجوزات الفعالة
  // =========================================================
  const activeBookings = useMemo(
    () => bookings.filter((booking) => !booking.cancelledAt),
    [bookings],
  );

  // =========================================================
  // آخر 5 حجوزات تم إنشاؤها
  //
  // مهم:
  // هذا القسم لا يعني أقرب 5 مواعيد.
  // يعني آخر 5 زبائن قاموا بعملية حجز.
  // =========================================================
  const recentBookings = useMemo(() => {
    return [...activeBookings]
      .sort((a, b) => getBookingCreationTime(b) - getBookingCreationTime(a))
      .slice(0, MAX_RECENT_BOOKINGS);
  }, [activeBookings]);

  return {
    bookings,
    activeBookings,
    recentBookings,
  };
}
