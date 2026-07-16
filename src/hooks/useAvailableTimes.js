// src/hooks/useAvailableTimes.js

import { useCallback, useEffect, useMemo, useState } from "react";

import { collection, doc, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../firebase";

import { generateSlots30Min, applyExtraSlots, safeInt } from "../utils/slots";

/**
 * تحويل التاريخ والساعة إلى Date صالح.
 */
function toDateAt(dateYMD, timeHHMM) {
  const date = new Date(`${dateYMD}T${timeHHMM}:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * مصادر البيانات التي يجب أن تنتهي كلها
 * قبل عرض المواعيد للمستخدم.
 */
const SOURCE_KEYS = ["day", "times", "extras", "bookings"];

/**
 * فحص هل كل مصادر البيانات جاهزة.
 */
function allSourcesReady(readiness) {
  return SOURCE_KEYS.every((sourceKey) => readiness[sourceKey]);
}

/**
 * إرجاع أول مصدر فشل.
 */
function firstSourceError(errors) {
  return SOURCE_KEYS.find((sourceKey) => errors[sourceKey]) || null;
}

/**
 * إنشاء تاريخ اليوم المحلي بصيغة:
 * YYYY-MM-DD
 *
 * لا نستخدم UTC حتى لا يحدث اختلاف
 * قبل أو بعد منتصف الليل.
 */
function getTodayYMD() {
  const now = new Date();

  return [
    now.getFullYear(),

    String(now.getMonth() + 1).padStart(2, "0"),

    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * ترتيب وتنظيف مصفوفة الساعات.
 */
function normalizeTimes(times) {
  if (!Array.isArray(times)) {
    return [];
  }

  return [
    ...new Set(
      times
        .filter(
          (time) => typeof time === "string" && /^\d{2}:\d{2}$/.test(time),
        )
        .map((time) => time.trim()),
    ),
  ].sort();
}

/**
 * Hook المواعيد المتاحة.
 *
 * يعتمد على:
 *
 * - ساعات العمل الأسبوعية.
 * - الأيام المغلقة.
 * - الساعات المغلقة.
 * - الساعات الإضافية.
 * - الحجوزات الحالية.
 */
export default function useAvailableTimes(selectedDate, workingHours) {
  const [availableTimes, setAvailableTimes] = useState([]);

  const [isDayBlocked, setIsDayBlocked] = useState(false);

  const [loadingTimes, setLoadingTimes] = useState(false);

  /**
   * هل كل مصادر Firebase أعطت نتيجة؟
   */
  const [timesReady, setTimesReady] = useState(false);

  /**
   * اسم المصدر الذي فشل.
   *
   * القيم الممكنة:
   *
   * null
   * day
   * times
   * extras
   * bookings
   * recompute
   */
  const [timesError, setTimesError] = useState(null);

  /**
   * آخر وقت تم فيه حساب المواعيد بنجاح.
   */
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * تغيير هذه القيمة يعيد إنشاء
   * كل مستمعي Firebase.
   */
  const [refreshNonce, setRefreshNonce] = useState(0);

  /**
   * إعادة تحميل المواعيد يدويًا.
   */
  const refreshTimes = useCallback(() => {
    setRefreshNonce((currentValue) => currentValue + 1);
  }, []);

  useEffect(() => {
    /**
     * لا يوجد تاريخ مختار.
     */
    if (!selectedDate) {
      setAvailableTimes([]);
      setIsDayBlocked(false);
      setLoadingTimes(false);
      setTimesReady(false);
      setTimesError(null);
      setLastUpdated(null);

      return undefined;
    }

    /**
     * ساعات العمل الأسبوعية
     * لم تنتهِ من التحميل بعد.
     *
     * لا نعرض ساعات افتراضية مؤقتة.
     */
    if (!workingHours || typeof workingHours !== "object") {
      setAvailableTimes([]);
      setIsDayBlocked(false);
      setLoadingTimes(true);
      setTimesReady(false);
      setTimesError(null);
      setLastUpdated(null);

      return undefined;
    }

    let isActive = true;

    /**
     * البيانات الحالية القادمة
     * من مستمعي Firebase.
     */
    let dayBlocked = false;
    let blockedTimes = [];
    let extraSlots = 0;
    let bookedTimes = new Set();

    /**
     * جاهزية كل مصدر.
     */
    const readiness = {
      day: false,
      times: false,
      extras: false,
      bookings: false,
    };

    /**
     * أخطاء كل مصدر.
     */
    const sourceErrors = {
      day: null,
      times: null,
      extras: null,
      bookings: null,
    };

    /**
     * عند تغيير التاريخ:
     *
     * نخفي المواعيد القديمة فورًا،
     * حتى لا تظهر ساعات اليوم السابق
     * أثناء تحميل اليوم الجديد.
     */
    setAvailableTimes([]);
    setIsDayBlocked(false);
    setLoadingTimes(true);
    setTimesReady(false);
    setTimesError(null);
    setLastUpdated(null);

    /**
     * إعادة حساب المواعيد.
     *
     * لا يتم الحساب إلا بعد أن تنتهي
     * كل مصادر Firebase من إعطاء نتيجة.
     */
    const recompute = () => {
      if (!isActive) return;

      const ready = allSourcesReady(readiness);

      setTimesReady(ready);

      /**
       * لا يزال أحد المصادر قيد التحميل.
       */
      if (!ready) {
        setLoadingTimes(true);
        return;
      }

      /**
       * أحد المصادر فشل.
       *
       * لا نفترض أن كل المواعيد متاحة.
       * نخفي الساعات ونظهر خيار إعادة المحاولة.
       */
      const failedSource = firstSourceError(sourceErrors);

      if (failedSource) {
        setAvailableTimes([]);
        setIsDayBlocked(false);
        setTimesError(failedSource);
        setLoadingTimes(false);
        setLastUpdated(null);

        return;
      }

      try {
        /**
         * تحديد يوم الأسبوع.
         */
        const selectedDay = new Date(`${selectedDate}T00:00:00`);

        if (Number.isNaN(selectedDay.getTime())) {
          throw new Error("INVALID_SELECTED_DATE");
        }

        const weekday = selectedDay.toLocaleDateString("en-US", {
          weekday: "long",
        });

        const dayHours = workingHours?.[weekday] || null;

        /**
         * اليوم مغلق يدويًا،
         * أو مغلق في الجدول الأسبوعي.
         */
        if (dayBlocked || !dayHours?.from || !dayHours?.to) {
          setIsDayBlocked(true);
          setAvailableTimes([]);
          setTimesError(null);
          setLoadingTimes(false);
          setLastUpdated(Date.now());

          return;
        }

        /**
         * إنشاء المواعيد الأساسية.
         */
        const baseSlots = generateSlots30Min(dayHours.from, dayHours.to);

        /**
         * إضافة أو إنقاص المواعيد
         * حسب إعداد slotExtras.
         */
        const slotsWithExtras = applyExtraSlots(baseSlots, extraSlots);

        const blockedSet = new Set(normalizeTimes(blockedTimes));

        const now = new Date();

        const isToday = selectedDate === getTodayYMD();

        /**
         * تنظيف وترتيب جميع المواعيد
         * قبل الفلترة.
         */
        const normalizedSlots = normalizeTimes(slotsWithExtras);

        /**
         * استبعاد:
         *
         * - الساعات المغلقة.
         * - الساعات المحجوزة.
         * - الساعات التي انتهت إذا كان اليوم هو اليوم.
         */
        const finalSlots = normalizedSlots.filter((time) => {
          if (blockedSet.has(time)) {
            return false;
          }

          if (bookedTimes.has(time)) {
            return false;
          }

          if (!isToday) {
            return true;
          }

          const appointmentDate = toDateAt(selectedDate, time);

          return Boolean(appointmentDate && appointmentDate > now);
        });

        setIsDayBlocked(false);
        setAvailableTimes(finalSlots);
        setTimesError(null);
        setLoadingTimes(false);
        setLastUpdated(Date.now());
      } catch (error) {
        console.error("Available times recompute error:", error);

        setAvailableTimes([]);
        setIsDayBlocked(false);
        setTimesError("recompute");
        setLoadingTimes(false);
        setLastUpdated(null);
      }
    };

    /**
     * تعليم مصدر بأنه نجح.
     */
    const markSuccess = (sourceKey) => {
      readiness[sourceKey] = true;
      sourceErrors[sourceKey] = null;

      recompute();
    };

    /**
     * تعليم مصدر بأنه فشل.
     */
    const markError = (sourceKey, error) => {
      console.error(`${sourceKey} availability snapshot error:`, error);

      readiness[sourceKey] = true;

      sourceErrors[sourceKey] = error || true;

      recompute();
    };

    /**
     * الاستماع لحالة إغلاق اليوم.
     */
    const unsubscribeDay = onSnapshot(
      doc(db, "blockedDays", selectedDate),

      (snapshot) => {
        dayBlocked = snapshot.exists();

        markSuccess("day");
      },

      (error) => {
        markError("day", error);
      },
    );

    /**
     * الاستماع للساعات المغلقة.
     */
    const unsubscribeTimes = onSnapshot(
      doc(db, "blockedTimes", selectedDate),

      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : null;

        blockedTimes = Array.isArray(data?.times) ? data.times : [];

        markSuccess("times");
      },

      (error) => {
        markError("times", error);
      },
    );

    /**
     * الاستماع للساعات الإضافية.
     */
    const unsubscribeExtras = onSnapshot(
      doc(db, "slotExtras", selectedDate),

      (snapshot) => {
        extraSlots = snapshot.exists()
          ? safeInt(snapshot.data()?.extraSlots, 0)
          : 0;

        markSuccess("extras");
      },

      (error) => {
        markError("extras", error);
      },
    );

    /**
     * جلب حجوزات اليوم المختار.
     */
    const bookingsQuery = query(
      collection(db, "bookings"),

      where("selectedDate", "==", selectedDate),
    );

    /**
     * الاستماع للحجوزات مباشرة.
     *
     * إذا قام شخص بحجز موعد،
     * يختفي الموعد من عند المستخدمين
     * الموجودين على الصفحة فورًا.
     */
    const unsubscribeBookings = onSnapshot(
      bookingsQuery,

      (snapshot) => {
        const nextBookedTimes = new Set();

        snapshot.docs.forEach((bookingDocument) => {
          const booking = bookingDocument.data();

          /**
           * الحجز الملغى لا يحجز الساعة.
           */
          if (booking?.cancelledAt) {
            return;
          }

          const selectedTime = booking?.selectedTime;

          if (
            typeof selectedTime !== "string" ||
            !/^\d{2}:\d{2}$/.test(selectedTime)
          ) {
            return;
          }

          nextBookedTimes.add(selectedTime);
        });

        bookedTimes = nextBookedTimes;

        markSuccess("bookings");
      },

      (error) => {
        markError("bookings", error);
      },
    );

    /**
     * تنظيف المستمعين عند:
     *
     * - تغيير التاريخ.
     * - تغيير ساعات العمل.
     * - مغادرة الصفحة.
     * - الضغط على إعادة المحاولة.
     */
    return () => {
      isActive = false;

      unsubscribeDay();
      unsubscribeTimes();
      unsubscribeExtras();
      unsubscribeBookings();
    };
  }, [selectedDate, workingHours, refreshNonce]);

  /**
   * نتيجة ثابتة لتقليل إعادة الرسم
   * غير الضرورية في BookingSection.
   */
  return useMemo(
    () => ({
      availableTimes,
      isDayBlocked,
      loadingTimes,

      /**
       * true عندما انتهت كل القراءات،
       * حتى لو كانت إحداها فشلت.
       */
      timesReady,

      /**
       * null إذا كل شيء سليم.
       */
      timesError,

      /**
       * وقت آخر تحديث ناجح.
       */
      lastUpdated,

      /**
       * إعادة تحميل كل المصادر.
       */
      refreshTimes,
    }),

    [
      availableTimes,
      isDayBlocked,
      loadingTimes,
      timesReady,
      timesError,
      lastUpdated,
      refreshTimes,
    ],
  );
}
