// src/pages/barberPanel/hooks/useBlockedDay.js
import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";

export default function useBlockedDay(selectedDate) {
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setIsDayBlocked(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const ref = doc(db, "blockedDays", selectedDate);
        const snap = await getDoc(ref);
        if (!alive) return;
        setIsDayBlocked(snap.exists());
      } catch {
        if (!alive) return;
        setIsDayBlocked(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const toggleDay = async () => {
    if (!selectedDate) return;
    setLoadingBlock(true);

    const ref = doc(db, "blockedDays", selectedDate);

    try {
      if (isDayBlocked) {
        await deleteDoc(ref);
        setIsDayBlocked(false);
        return;
      }

      // قبل ما نغلق اليوم: تأكد ما في حجوزات فعالة
      const bookingsSnap = await getDocs(
        query(
          collection(db, "bookings"),
          where("selectedDate", "==", selectedDate)
        )
      );

      const activeBookings = bookingsSnap.docs.filter(
        (d) => !d.data().cancelledAt
      );
      if (activeBookings.length > 0) {
        alert("⚠️ لا يمكن تعطيل هذا اليوم لأن هناك حجوزات لم يتم إلغاؤها.");
        return;
      }

      await setDoc(ref, {});
      setIsDayBlocked(true);
    } catch (e) {
      console.error("toggleDay error:", e);
    } finally {
      setLoadingBlock(false);
    }
  };

  return { isDayBlocked, loadingBlock, toggleDay, setIsDayBlocked };
}
