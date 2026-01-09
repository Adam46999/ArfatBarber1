// src/pages/barberPanel/hooks/useBookingsLive.js
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../../firebase";

export default function useBookingsLive() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "bookings"));
    const unsub = onSnapshot(
      q,
      (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Bookings onSnapshot error:", err)
    );
    return () => unsub();
  }, []);

  const activeBookings = useMemo(
    () => bookings.filter((b) => !b.cancelledAt),
    [bookings]
  );

  const recentBookings = useMemo(() => {
    const getBookingCreationDate = (b) => {
      if (b.createdAt && typeof b.createdAt.toDate === "function")
        return b.createdAt.toDate();
      if (b.createdAt instanceof Date) return b.createdAt;
      try {
        if (b.selectedDate && b.selectedTime)
          return new Date(`${b.selectedDate}T${b.selectedTime}:00`);
      } catch {
        /* empty */
      }
      return new Date(0);
    };

    return [...activeBookings]
      .sort((a, b) => getBookingCreationDate(a) - getBookingCreationDate(b))
      .slice(-5)
      .reverse();
  }, [activeBookings]);

  return { bookings, activeBookings, recentBookings };
}
