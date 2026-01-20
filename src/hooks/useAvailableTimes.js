// src/hooks/useAvailableTimes.js
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";

import { generateSlots30Min, applyExtraSlots, safeInt } from "../utils/slots";

function toDateAt(ymd, hhmm) {
  try {
    return new Date(`${ymd}T${hhmm}:00`);
  } catch {
    return null;
  }
}

export default function useAvailableTimes(selectedDate, workingHours) {
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);

  useEffect(() => {
    // ✅ لا تاريخ -> فاضي
    if (!selectedDate) {
      setAvailableTimes([]);
      setIsDayBlocked(false);
      setLoadingTimes(false);
      return;
    }

    // ✅ لو ساعات الأسبوع لسه مش جاهزة (Firestore لسه بجيبها)
    if (!workingHours || typeof workingHours !== "object") {
      setAvailableTimes([]);
      setIsDayBlocked(false);
      setLoadingTimes(false);
      return;
    }

    setLoadingTimes(true);

    // 1) listeners state
    let dayBlocked = false;
    let blockedTimesArr = [];
    let extraSlots = 0;
    let bookedSet = new Set();

    const recompute = () => {
      try {
        // ساعات الدوام حسب اليوم
        const d = new Date(`${selectedDate}T00:00:00`);
        const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
        const hours = workingHours?.[weekday] || null;

        // ✅ اليوم مغلق (يا إمّا محظور أو ما في ساعات)
        if (dayBlocked || !hours?.from || !hours?.to) {
          setIsDayBlocked(dayBlocked || !hours?.from || !hours?.to);
          setAvailableTimes([]);
          setLoadingTimes(false);
          return;
        }

        setIsDayBlocked(false);

        const baseSlots = generateSlots30Min(hours.from, hours.to);
        const slots = applyExtraSlots(baseSlots, extraSlots);

        const now = new Date();
        const todayStr = now.toLocaleDateString("sv-SE"); // YYYY-MM-DD
        const isToday = selectedDate === todayStr;

        const blockedSet = new Set(blockedTimesArr);

        const finalSlots = slots.filter((t) => {
          if (blockedSet.has(t)) return false;
          if (bookedSet.has(t)) return false;

          if (isToday) {
            const dt = toDateAt(selectedDate, t);
            if (!dt) return false;
            return dt > now;
          }
          return true;
        });

        setAvailableTimes(finalSlots);
        setLoadingTimes(false);
      } catch (e) {
        console.error("recompute error:", e);
        setIsDayBlocked(false);
        setAvailableTimes([]);
        setLoadingTimes(false);
      }
    };

    // 2) blockedDays realtime
    const unsubDay = onSnapshot(
      doc(db, "blockedDays", selectedDate),
      (snap) => {
        dayBlocked = snap.exists();
        recompute();
      },
      (err) => {
        console.error("blockedDays snapshot error:", err);
        dayBlocked = false;
        recompute();
      }
    );

    // 3) blockedTimes realtime
    const unsubTimes = onSnapshot(
      doc(db, "blockedTimes", selectedDate),
      (snap) => {
        const times =
          snap.exists() && Array.isArray(snap.data()?.times)
            ? snap.data().times
            : [];
        blockedTimesArr = times;
        recompute();
      },
      (err) => {
        console.error("blockedTimes snapshot error:", err);
        blockedTimesArr = [];
        recompute();
      }
    );

    // 4) slotExtras realtime
    const unsubExtras = onSnapshot(
      doc(db, "slotExtras", selectedDate),
      (snap) => {
        extraSlots = snap.exists() ? safeInt(snap.data()?.extraSlots, 0) : 0;
        recompute();
      },
      (err) => {
        console.error("slotExtras snapshot error:", err);
        extraSlots = 0;
        recompute();
      }
    );

    // 5) bookings realtime (لنفس التاريخ)
    const qBookings = query(
      collection(db, "bookings"),
      where("selectedDate", "==", selectedDate)
    );

    const unsubBookings = onSnapshot(
      qBookings,
      (snap) => {
        const s = new Set();
        snap.docs.forEach((d) => {
          const b = d.data();
          if (!b?.cancelledAt && b?.selectedTime) s.add(b.selectedTime);
        });
        bookedSet = s;
        recompute();
      },
      (err) => {
        console.error("bookings snapshot error:", err);
        bookedSet = new Set();
        recompute();
      }
    );

    // initial compute (لو snapshots تأخرت لحظة)
    recompute();

    return () => {
      unsubDay();
      unsubTimes();
      unsubExtras();
      unsubBookings();
    };
  }, [selectedDate, workingHours]);

  return useMemo(
    () => ({ availableTimes, isDayBlocked, loadingTimes }),
    [availableTimes, isDayBlocked, loadingTimes]
  );
}
