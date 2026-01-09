// src/pages/barberPanel/hooks/useBlockedTimes.js
import { useEffect, useState } from "react";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";

export default function useBlockedTimes({
  selectedDate,
  bookings,
  setStatusMessage,
}) {
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);

  useEffect(() => {
    if (!selectedDate) {
      setBlockedTimes([]);
      setSelectedTimes([]);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const ref = doc(db, "blockedTimes", selectedDate);
        const snap = await getDoc(ref);
        if (!alive) return;

        setBlockedTimes(snap.exists() ? snap.data()?.times || [] : []);
        setSelectedTimes([]);
      } catch (err) {
        console.error("fetch blockedTimes error:", err);
        if (!alive) return;
        setBlockedTimes([]);
        setSelectedTimes([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const isBooked = (time) =>
    bookings.some(
      (b) =>
        b.selectedDate === selectedDate &&
        b.selectedTime === time &&
        !b.cancelledAt
    );

  const handleToggleTime = async (time) => {
    if (!selectedDate) return;

    if (isBooked(time)) {
      setStatusMessage?.("هذه الساعة محجوزة ولا يمكن تعديلها.");
      return;
    }

    // استرجاع محظور
    if (blockedTimes.includes(time)) {
      const updated = blockedTimes.filter((t) => t !== time);
      setBlockedTimes(updated);

      try {
        const ref = doc(db, "blockedTimes", selectedDate);
        await updateDoc(ref, { times: arrayRemove(time) });
        setStatusMessage?.("✅ تم استرجاع الساعة بنجاح");
      } catch (err) {
        console.error("restore blocked time error:", err);
        setStatusMessage?.("حدث خطأ، حاول مرة أخرى.");
      }

      setTimeout(() => setStatusMessage?.(""), 2500);
      return;
    }

    // اختيار للحظر
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
    setStatusMessage?.("");
  };

  const handleApplyBlock = async () => {
    if (!selectedDate || selectedTimes.length === 0) {
      setStatusMessage?.("اختر ساعة واحدة على الأقل للحظر.");
      return;
    }

    for (const time of selectedTimes) {
      if (isBooked(time)) {
        setStatusMessage?.(`الساعة ${time} محجوزة.`);
        return;
      }
    }

    try {
      const ref = doc(db, "blockedTimes", selectedDate);
      const snap = await getDoc(ref);
      if (!snap.exists()) await setDoc(ref, { times: [] });

      for (const time of selectedTimes) {
        await updateDoc(ref, { times: arrayUnion(time) });
      }

      setBlockedTimes((prev) => [...prev, ...selectedTimes]);
      setSelectedTimes([]);
      setStatusMessage?.("✅ تم حظر الأوقات بنجاح");
    } catch (err) {
      console.error("apply block error:", err);
      setStatusMessage?.("حدث خطأ، حاول مرة أخرى.");
    }

    setTimeout(() => setStatusMessage?.(""), 2500);
  };

  return {
    blockedTimes,
    selectedTimes,
    setSelectedTimes,
    handleToggleTime,
    handleApplyBlock,
  };
}
