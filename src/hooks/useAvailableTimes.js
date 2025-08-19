// src/hooks/useAvailableTimes.js
import { useEffect, useState } from "react";
import { localYMD, generateTimeSlots } from "../utils/dateTime";
import {
  fetchBlockedDay,
  fetchBlockedTimes,
  fetchActiveBookingsByDate,
} from "../services/bookingService";

/**
 * يحسب الساعات المتاحة لليوم المحدد + يجلب حجوزات ذلك اليوم
 * يُخرج: availableTimes, isDayBlocked, bookings, reload()
 */
export default function useAvailableTimes(selectedDate, workingHours) {
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [bookings, setBookings] = useState([]);

  // احسب الساعات المتاحة
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([]);
      setIsDayBlocked(false);
      return;
    }

    const run = async () => {
      try {
        // 1) يوم محجوب بالكامل؟
        const dayBlocked = await fetchBlockedDay(selectedDate);
        if (dayBlocked) {
          setIsDayBlocked(true);
          setAvailableTimes([]);
          return;
        } else {
          setIsDayBlocked(false);
        }

        // 2) تحديد اليوم والساعات
        const [yyyy, mm, dd] = selectedDate.split("-");
        const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        const weekday = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
        });

        // إغلاق الأحد — أو أي يوم لا يملك ساعات معرفة
        const dayHours = workingHours?.[weekday] || null;
        if (weekday === "Sunday" || !dayHours) {
          setAvailableTimes([]);
          return;
        }

        const allSlots = generateTimeSlots(dayHours.from, dayHours.to);

        // 3) محظورات + حجوزات فعّالة
        const [blocked, active] = await Promise.all([
          fetchBlockedTimes(selectedDate),
          fetchActiveBookingsByDate(selectedDate),
        ]);
        const booked = active.map((b) => b.selectedTime);
        const unavailable = Array.from(
          new Set([...(blocked || []), ...booked])
        );

        let available = allSlots.filter((t) => !unavailable.includes(t));

        // 4) استثناء الأوقات الماضية إذا اليوم هو اليوم الحالي (محلي)
        const isToday = selectedDate === localYMD(new Date());
        if (isToday) {
          const now = new Date();
          const h = now.getHours();
          const m = now.getMinutes();
          available = available.filter((time) => {
            const [hour, minute] = time.split(":").map(Number);
            return hour > h || (hour === h && minute > m);
          });
        }

        setAvailableTimes(available);
      } catch (e) {
        console.error("useAvailableTimes error:", e);
        setAvailableTimes([]);
        setIsDayBlocked(false);
      }
    };

    run();
  }, [selectedDate, workingHours]);

  // جلب حجوزات نفس اليوم (لعرض "حجوزاتك الحالية")
  const reloadBookings = async () => {
    if (!selectedDate) {
      setBookings([]);
      return;
    }
    try {
      const active = await fetchActiveBookingsByDate(selectedDate);
      setBookings(active);
    } catch (e) {
      console.error("useAvailableTimes bookings error:", e);
      setBookings([]);
    }
  };

  useEffect(() => {
    reloadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return { availableTimes, isDayBlocked, bookings, reloadBookings };
}
