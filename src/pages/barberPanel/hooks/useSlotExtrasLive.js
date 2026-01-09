// src/pages/barberPanel/hooks/useSlotExtrasLive.js
import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  safeInt,
  generateSlots30Min,
  applyExtraSlots,
} from "../../../utils/slots";
import { getWeekdayNameEN } from "../utils/dates";
import { buildTargets } from "../utils/targets";

export default function useSlotExtrasLive({
  selectedDate,
  workingHours,
  activeBookings,
}) {
  const [extraSlots, setExtraSlots] = useState(0);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [savingExtras, setSavingExtras] = useState(false);

  useEffect(() => {
    if (!selectedDate) {
      setExtraSlots(0);
      setLoadingExtras(false);
      return;
    }

    setLoadingExtras(true);

    const ref = doc(db, "slotExtras", selectedDate);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setExtraSlots(snap.exists() ? safeInt(snap.data()?.extraSlots, 0) : 0);
        setLoadingExtras(false);
      },
      (err) => {
        console.error("slotExtras onSnapshot error:", err);
        setExtraSlots(0);
        setLoadingExtras(false);
      }
    );

    return () => unsub();
  }, [selectedDate]);

  const applyExtraSlotsChange = async ({
    nextValue,
    applyMode,
    applyUntil,
    setStatusMessage,
    selectedDate,
  }) => {
    if (!selectedDate) return;

    const value = safeInt(nextValue, 0);
    if (value < -10 || value > 10) {
      alert("⚠️ مسموح من -10 إلى +10 فقط (كل رقم = 30 دقيقة).");
      return;
    }

    const targets = buildTargets({ applyMode, selectedDate, applyUntil });
    if (!targets) {
      alert("⚠️ اختَر تاريخ نهاية صحيح (لازم يكون بعد/يساوي تاريخ البداية).");
      return;
    }

    // منع تقليل أدوار إذا رح ينحذف دور عليه حجز
    if (value < 0) {
      for (const ymd of targets) {
        const weekday = getWeekdayNameEN(ymd);
        const hours = workingHours?.[weekday] || null;
        if (!hours?.from || !hours?.to) continue;

        const base = generateSlots30Min(hours.from, hours.to);

        const currentExtraSnap = await getDoc(doc(db, "slotExtras", ymd));
        const currentExtra = currentExtraSnap.exists()
          ? safeInt(currentExtraSnap.data()?.extraSlots, 0)
          : 0;

        const currentSlots = applyExtraSlots(base, currentExtra);
        const nextSlots = applyExtraSlots(base, value);

        const removed = currentSlots.filter((s) => !nextSlots.includes(s));
        if (removed.length) {
          const hasBookingOnRemoved = activeBookings.some(
            (b) => b.selectedDate === ymd && removed.includes(b.selectedTime)
          );
          if (hasBookingOnRemoved) {
            alert(
              `⚠️ لا يمكن تقليل الأدوار في ${ymd} لأن هناك حجز على دور سيتم حذفه.\n(حلّها: الغِ الحجز أو غيّر التعديل)`
            );
            return;
          }
        }
      }
    }

    try {
      setSavingExtras(true);
      await Promise.all(
        targets.map((ymd) =>
          setDoc(
            doc(db, "slotExtras", ymd),
            { extraSlots: value },
            { merge: true }
          )
        )
      );

      // ملاحظة: extraSlots رح يتحدث لحاله من onSnapshot
      const weekdayOfSelected = getWeekdayNameEN(selectedDate);

      setStatusMessage?.(
        applyMode === "THIS_DATE"
          ? `✅ تم تطبيق التعديل على ${selectedDate}`
          : applyMode === "SAME_WEEKDAY_UNTIL"
          ? `✅ تم تطبيق التعديل على كل ${weekdayOfSelected} حتى ${applyUntil}`
          : `✅ تم تطبيق التعديل على كل الأيام حتى ${applyUntil}`
      );
    } catch (e) {
      console.error("save slotExtras error:", e);
      alert("حدث خطأ أثناء حفظ التعديل. حاول مرة أخرى.");
    } finally {
      setSavingExtras(false);
      setTimeout(() => setStatusMessage?.(""), 2500);
    }
  };

  return {
    extraSlots,
    loadingExtras,
    savingExtras,
    applyExtraSlotsChange,
  };
}
