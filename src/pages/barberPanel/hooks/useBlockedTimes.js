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
  const [recentChange, setRecentChange] = useState(null);

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
    bookings.some((booking) => {
      if (booking.cancelledAt) {
        return false;
      }

      const bookingDate =
        booking.slotDate ||
        booking.selectedDate;

      if (
        booking.selectedTime === time &&
        (
          bookingDate === selectedDate ||
          booking.selectedDate === selectedDate
        )
      ) {
        return true;
      }

      if (
        !Array.isArray(
          booking.bookedSlots,
        )
      ) {
        return false;
      }

      return booking.bookedSlots.some(
        (slot) => {
          if (
            typeof slot === "string"
          ) {
            return (
              booking.selectedDate ===
                selectedDate &&
              slot === time
            );
          }

          if (
            !slot ||
            typeof slot !== "object"
          ) {
            return false;
          }

          const slotTime =
            slot.time ||
            slot.selectedTime ||
            "";

          const slotDate =
            slot.slotDate ||
            slot.date ||
            booking.slotDate ||
            booking.selectedDate;

          return (
            slotTime === time &&
            (
              slotDate ===
                selectedDate ||
              booking.selectedDate ===
                selectedDate
            )
          );
        },
      );
    });

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
        setRecentChange({ date: selectedDate, times: [time] });
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
      setRecentChange({ date: selectedDate, times: [...selectedTimes] });
      setSelectedTimes([]);
      setStatusMessage?.("✅ تم حظر الأوقات بنجاح");
    } catch (err) {
      console.error("apply block error:", err);
      setStatusMessage?.("حدث خطأ، حاول مرة أخرى.");
    }

    setTimeout(() => setStatusMessage?.(""), 2500);
  };

  const handleBlockTimes = async (
    times,
    successMessage = "",
  ) => {
    if (!selectedDate) return 0;

    const requestedTimes = [
      ...new Set(
        (Array.isArray(times) ? times : [])
          .map((time) => String(time || "").trim())
          .filter(Boolean),
      ),
    ];

    const safeTimes = requestedTimes.filter(
      (time) =>
        !blockedTimes.includes(time) &&
        !isBooked(time),
    );

    if (safeTimes.length === 0) {
      setStatusMessage?.(
        "ما في ساعات متاحة للحظر.",
      );
      return 0;
    }

    try {
      const ref = doc(
        db,
        "blockedTimes",
        selectedDate,
      );

      await setDoc(
        ref,
        {
          times: arrayUnion(...safeTimes),
        },
        {
          merge: true,
        },
      );

      setBlockedTimes((current) => [
        ...new Set([
          ...current,
          ...safeTimes,
        ]),
      ]);

      setSelectedTimes([]);

      setRecentChange({
        date: selectedDate,
        times: safeTimes,
      });

      setStatusMessage?.(
        successMessage ||
          `✅ تم حظر ${safeTimes.length} ساعة`,
      );

      return safeTimes.length;
    } catch (error) {
      console.error(
        "block multiple times error:",
        error,
      );

      setStatusMessage?.(
        "حدث خطأ، حاول مرة أخرى.",
      );

      return 0;
    }
  };

  useEffect(() => {
    if (!recentChange) return undefined;

    const timer = setTimeout(() => setRecentChange(null), 2200);
    return () => clearTimeout(timer);
  }, [recentChange]);

  return {
    blockedTimes,
    selectedTimes,
    recentChange,
    setSelectedTimes,
    handleToggleTime,
    handleApplyBlock,
    handleBlockTimes,
  };
}
