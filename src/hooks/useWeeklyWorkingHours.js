// src/hooks/useWeeklyWorkingHours.js

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import defaultWorkingHours from "../constants/workingHours";

const WEEKLY_HOURS_DOC = ["barberSettings", "hours"];
const DAY_KEYS = Object.keys(defaultWorkingHours);

/**
 * التحقق من الوقت بصيغة HH:mm.
 */
function isValidHHmm(value) {
  if (typeof value !== "string") return false;

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * أسبوع مغلق بالكامل.
 *
 * نستخدمه فقط عندما تكون البيانات الموجودة في Firebase ناقصة أو تالفة،
 * حتى لا نفتح يومًا بالخطأ اعتمادًا على الساعات الافتراضية.
 */
function createClosedWeek() {
  return DAY_KEYS.reduce((result, day) => {
    result[day] = null;
    return result;
  }, {});
}

/**
 * تنظيف البيانات القادمة من Firebase.
 *
 * مهم:
 * - null تعني اليوم مغلق وتبقى null.
 * - اليوم الناقص أو ذو الساعات الخاطئة يصبح مغلقًا.
 * - لا نستبدل يومًا ناقصًا بالساعات الافتراضية؛ لأن ذلك قد يفتحه بالخطأ.
 */
function sanitizeWeeklyHours(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return createClosedWeek();
  }

  return DAY_KEYS.reduce((result, day) => {
    const dayHours = input[day];

    if (dayHours === null) {
      result[day] = null;
      return result;
    }

    const from = dayHours?.from;
    const to = dayHours?.to;

    if (
      isValidHHmm(from) &&
      isValidHHmm(to) &&
      timeToMinutes(from) < timeToMinutes(to)
    ) {
      result[day] = { from, to };
    } else {
      // لا نفتح اليوم بالافتراضي إذا كانت بياناته ناقصة أو خاطئة.
      result[day] = null;
    }

    return result;
  }, {});
}

/**
 * قراءة ساعات العمل الأسبوعية.
 *
 * هذا الـ Hook للقراءة فقط:
 * - لا ينشئ مستندًا.
 * - لا يكتب الساعات الافتراضية.
 * - لا يستبدل الساعات المحفوظة عند حصول خطأ.
 * - يستمع للتحديثات المباشرة من Firebase عند live=true.
 */
export default function useWeeklyWorkingHours({ live = true } = {}) {
  const [weeklyHours, setWeeklyHours] = useState(null);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [weeklyHoursError, setWeeklyHoursError] = useState(null);

  useEffect(() => {
    const hoursRef = doc(db, ...WEEKLY_HOURS_DOC);

    let alive = true;
    let unsubscribe = null;

    const applySnapshot = (snapshot) => {
      if (!alive) return;

      /**
       * أول Snapshot قد يأتي من Cache قديم.
       * لا نعتمد "المستند غير موجود" من Cache حتى يصل الرد الحقيقي من السيرفر.
       */
      if (!snapshot.exists() && snapshot.metadata?.fromCache) {
        return;
      }

      if (!snapshot.exists()) {
        /**
         * المستند غير موجود فعلًا:
         * نستخدم الافتراضي داخل الواجهة فقط، بدون أي كتابة إلى Firebase.
         *
         * إنشاء المستند يجب أن يحصل فقط من لوحة الحلاق أو إعداد أولي مخصص.
         */
        setWeeklyHours(defaultWorkingHours);
        setWeeklyHoursError("weekly-hours-document-missing");
        setLoadingWeekly(false);
        return;
      }

      const savedWeekly = snapshot.data()?.weekly;

      if (!savedWeekly || typeof savedWeekly !== "object") {
        /**
         * المستند موجود لكن weekly ناقص أو تالف.
         * نغلق الأيام احتياطيًا بدل فتحها بالافتراضي.
         */
        setWeeklyHours(createClosedWeek());
        setWeeklyHoursError("weekly-hours-data-invalid");
        setLoadingWeekly(false);
        return;
      }

      setWeeklyHours(sanitizeWeeklyHours(savedWeekly));
      setWeeklyHoursError(null);
      setLoadingWeekly(false);
    };

    const handleError = (error) => {
      console.error("Weekly hours read error:", error);

      if (!alive) return;

      /**
       * لا نضع defaultWorkingHours هنا.
       * إذا كان عندنا جدول مقروء سابقًا، نبقيه كما هو.
       * وإذا لم نقرأ شيئًا بعد، تبقى weeklyHours = null.
       */
      setWeeklyHoursError(error);
      setLoadingWeekly(false);
    };

    if (live) {
      setLoadingWeekly(true);

      unsubscribe = onSnapshot(
        hoursRef,
        { includeMetadataChanges: true },
        applySnapshot,
        handleError,
      );
    } else {
      setLoadingWeekly(true);

      getDoc(hoursRef)
        .then((snapshot) => {
          applySnapshot(snapshot);
        })
        .catch(handleError);
    }

    return () => {
      alive = false;

      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [live]);

  return useMemo(
    () => ({
      weeklyHours,
      loadingWeekly,
      weeklyHoursError,
    }),
    [weeklyHours, loadingWeekly, weeklyHoursError],
  );
}
