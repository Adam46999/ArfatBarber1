// src/hooks/useAvailableTimes.js
import { useEffect, useState } from "react";
import { localYMD, generateTimeSlots } from "../utils/dateTime";
import {
  fetchBlockedDay,
  fetchBlockedTimes,
  fetchActiveBookingsByDate,
} from "../services/bookingService";

export default function useAvailableTimes(selectedDate, workingHours) {
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isDayBlocked, setIsDayBlocked] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false); // ✅ جديد

  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([]);
      setIsDayBlocked(false);
      setLoadingTimes(false);
      return;
    }

    const run = async () => {
      try {
        setLoadingTimes(true); // ✅ بدء التحميل

        const dayBlocked = await fetchBlockedDay(selectedDate);
        if (dayBlocked) {
          setIsDayBlocked(true);
          setAvailableTimes([]);
          return;
        } else {
          setIsDayBlocked(false);
        }

        const [yyyy, mm, dd] = selectedDate.split("-");
        const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        const weekday = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
        });

        const dayHours = workingHours?.[weekday] || null;
        if (weekday === "Sunday" || !dayHours) {
          setAvailableTimes([]);
          return;
        }

        const allSlots = generateTimeSlots(dayHours.from, dayHours.to);

        const [blocked, active] = await Promise.all([
          fetchBlockedTimes(selectedDate),
          fetchActiveBookingsByDate(selectedDate),
        ]);
        const booked = active.map((b) => b.selectedTime);
        const unavailable = Array.from(
          new Set([...(blocked || []), ...booked])
        );

        let available = allSlots.filter((t) => !unavailable.includes(t));

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
      } finally {
        setLoadingTimes(false); // ✅ إنهاء التحميل (مهما صار)
      }
    };

    run();
  }, [selectedDate, workingHours]);

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

  return {
    availableTimes,
    isDayBlocked,
    bookings,
    reloadBookings,
    loadingTimes,
  }; // ✅
}
