// src/hooks/useAvailableTimes.js
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/**
 * Helpers (خارج الهوك عشان ما يعمل missing-deps)
 */
function toDateAt(ymd, hhmm) {
  try {
    return new Date(`${ymd}T${hhmm}:00`);
  } catch {
    return null;
  }
}

function addMinutesToHHMM(hhmm, minsToAdd) {
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map(Number);
  const base = new Date();
  base.setHours(h || 0, m || 0, 0, 0);
  base.setMinutes(base.getMinutes() + (Number(minsToAdd) || 0));
  const hh = String(base.getHours()).padStart(2, "0");
  const mm = String(base.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * يولّد أدوار 30 دقيقة “شاملة النهاية” زي الموجود عند الحلاق
 */
function generateSlots30Min(from, to) {
  if (!from || !to) return [];
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);

  const cur = new Date();
  cur.setHours(fh, fm, 0, 0);

  const end = new Date();
  end.setHours(th, tm, 0, 0);

  const out = [];
  while (cur <= end) {
    out.push(cur.toTimeString().slice(0, 5));
    cur.setMinutes(cur.getMinutes() + 30);
  }
  return out;
}

/**
 * Hook:
 * - يجيب availableTimes لزبون حسب:
 *   workingHours + blockedDays + blockedTimes + bookings + slotExtras
 *
 * slotExtras schema:
 *   collection: slotExtras
 *   doc id: YYYY-MM-DD
 *   fields:
 *     - extraSlots: number (مثلاً +2 يزيد دورين بعد آخر دور، -1 ينقص آخر دور)
 */
export default function useAvailableTimes(selectedDate, workingHours) {
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!selectedDate) {
        if (!alive) return;
        setAvailableTimes([]);
        setIsDayBlocked(false);
        setLoadingTimes(false);
        return;
      }

      if (alive) setLoadingTimes(true);

      try {
        // 1) blocked day؟
        const dayBlockRef = doc(db, "blockedDays", selectedDate);
        const dayBlockSnap = await getDoc(dayBlockRef);

        const blocked = dayBlockSnap.exists();
        if (!alive) return;

        setIsDayBlocked(blocked);

        if (blocked) {
          setAvailableTimes([]);
          return;
        }

        // 2) ساعات العمل الأساسية حسب اليوم
        const d = new Date(`${selectedDate}T00:00:00`);
        const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
        const hours = workingHours?.[weekday] || null;

        if (!hours?.from || !hours?.to) {
          setAvailableTimes([]);
          return;
        }

        // 3) slotExtras (زيادة/نقصان عدد الأدوار)
        let extraSlots = 0;
        try {
          const extrasSnap = await getDoc(doc(db, "slotExtras", selectedDate));
          if (extrasSnap.exists()) {
            const data = extrasSnap.data() || {};
            const n = Number(data.extraSlots);
            extraSlots = Number.isFinite(n) ? n : 0;
          }
        } catch {
          extraSlots = 0;
        }

        const baseSlots = generateSlots30Min(hours.from, hours.to);

        let slots = baseSlots;
        if (extraSlots !== 0) {
          if (extraSlots > 0) {
            const extraCount = Math.floor(extraSlots);
            const last = baseSlots[baseSlots.length - 1];
            const extras = [];
            for (let i = 1; i <= extraCount; i++) {
              extras.push(addMinutesToHHMM(last, i * 30));
            }
            slots = [...baseSlots, ...extras];
          } else {
            const cut = Math.abs(Math.floor(extraSlots));
            slots = baseSlots.slice(0, Math.max(0, baseSlots.length - cut));
          }
        }

        // 4) blockedTimes لهذا اليوم
        const blockedTimesSnap = await getDoc(
          doc(db, "blockedTimes", selectedDate)
        );
        const blockedTimes =
          blockedTimesSnap.exists() &&
          Array.isArray(blockedTimesSnap.data()?.times)
            ? blockedTimesSnap.data().times
            : [];

        // 5) الحجوزات لنفس التاريخ (ونعتبر cancelledAt غير فعّال)
        const qBookings = query(
          collection(db, "bookings"),
          where("selectedDate", "==", selectedDate)
        );
        const bookingsSnap = await getDocs(qBookings);
        const bookedSet = new Set();
        bookingsSnap.docs.forEach((docu) => {
          const b = docu.data();
          if (!b?.cancelledAt && b?.selectedTime) {
            bookedSet.add(b.selectedTime);
          }
        });

        // 6) فلترة: احذف المحجوز + المحظور + الماضي لليوم الحالي
        const now = new Date();
        const todayStr = now.toLocaleDateString("sv-SE"); // YYYY-MM-DD
        const isToday = selectedDate === todayStr;

        const blockedSet = new Set(blockedTimes);

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

        if (!alive) return;
        setAvailableTimes(finalSlots);
      } catch (e) {
        console.error("useAvailableTimes error:", e);
        if (!alive) return;
        setIsDayBlocked(false);
        setAvailableTimes([]);
      } finally {
        // ✅ أهم نقطة: ممنوع أي return هون
        if (alive) setLoadingTimes(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [selectedDate, workingHours]);

  return useMemo(
    () => ({ availableTimes, isDayBlocked, loadingTimes }),
    [availableTimes, isDayBlocked, loadingTimes]
  );
}
