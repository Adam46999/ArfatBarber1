// src/hooks/useWeeklyWorkingHours.js

import { useCallback, useEffect, useMemo, useState } from "react";

import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import defaultWorkingHours from "../constants/workingHours";

/**
 * مكان حفظ ساعات العمل الأسبوعية في Firestore.
 */
const WEEKLY_HOURS_DOC = ["barberSettings", "hours"];

/**
 * أسماء أيام الأسبوع المعتمدة في المشروع.
 */
const DAY_KEYS = Object.keys(defaultWorkingHours);

/**
 * إنشاء نسخة مستقلة من الساعات.
 *
 * حتى لا نعدّل الكائن الأصلي المستورد بالخطأ.
 */
function cloneWeeklyHours(weeklyHours) {
  return DAY_KEYS.reduce((result, dayKey) => {
    const dayHours = weeklyHours?.[dayKey];

    result[dayKey] =
      dayHours === null
        ? null
        : dayHours
          ? {
              from: dayHours.from,
              to: dayHours.to,
            }
          : null;

    return result;
  }, {});
}

/**
 * إنشاء أسبوع مغلق بالكامل.
 *
 * نستخدمه فقط عندما يكون مستند Firebase موجودًا،
 * لكن البيانات داخله تالفة أو ناقصة.
 *
 * الأفضل أن نغلق اليوم بدل أن نفتحه بساعات غير مؤكدة.
 */
function createClosedWeek() {
  return DAY_KEYS.reduce((result, dayKey) => {
    result[dayKey] = null;
    return result;
  }, {});
}

/**
 * فحص أن القيمة عبارة عن كائن عادي.
 */
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * فحص الوقت بصيغة HH:mm.
 *
 * أمثلة صحيحة:
 * 09:00
 * 12:30
 * 23:59
 */
function isValidTime(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return false;
  }

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

/**
 * تحويل الوقت إلى دقائق للمقارنة.
 */
function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

/**
 * استخراج جدول الساعات من مستند Firestore.
 *
 * الشكل الحالي في المشروع:
 *
 * {
 *   weekly: {
 *     Monday: { from: "12:00", to: "20:00" }
 *   }
 * }
 *
 * أبقينا دعم أشكال أقدم محتملة حتى لا نرجّع
 * أي ميزة أو بيانات قديمة إلى الخلف.
 */
function extractWeeklyHours(documentData) {
  if (!isPlainObject(documentData)) {
    return null;
  }

  if (isPlainObject(documentData.weekly)) {
    return documentData.weekly;
  }

  if (isPlainObject(documentData.weeklyHours)) {
    return documentData.weeklyHours;
  }

  const looksLikeDirectWeeklyObject = DAY_KEYS.some((dayKey) =>
    Object.prototype.hasOwnProperty.call(documentData, dayKey),
  );

  if (looksLikeDirectWeeklyObject) {
    return documentData;
  }

  return null;
}

/**
 * تنظيف وفحص ساعات العمل القادمة من Firebase.
 *
 * القواعد:
 *
 * - null يعني أن اليوم مغلق.
 * - from و to يجب أن يكونا بصيغة HH:mm.
 * - وقت البداية يجب أن يكون قبل وقت النهاية.
 * - اليوم الناقص أو الخاطئ يصبح مغلقًا.
 *
 * نعيد أيضًا قائمة بالأيام التي تحتوي مشكلة،
 * حتى تستطيع الواجهة معرفة أن البيانات غير سليمة.
 */
function sanitizeWeeklyHours(input) {
  if (!isPlainObject(input)) {
    return {
      weeklyHours: createClosedWeek(),
      invalidDays: [...DAY_KEYS],
      isValid: false,
    };
  }

  const invalidDays = [];

  const weeklyHours = DAY_KEYS.reduce((result, dayKey) => {
    const dayHours = input[dayKey];

    /**
     * اليوم مغلق بشكل صريح.
     */
    if (dayHours === null) {
      result[dayKey] = null;
      return result;
    }

    /**
     * اليوم غير موجود أو ليس كائنًا صالحًا.
     */
    if (!isPlainObject(dayHours)) {
      result[dayKey] = null;
      invalidDays.push(dayKey);
      return result;
    }

    const from = String(dayHours.from || "").trim();

    const to = String(dayHours.to || "").trim();

    const validRange =
      isValidTime(from) &&
      isValidTime(to) &&
      timeToMinutes(from) < timeToMinutes(to);

    if (!validRange) {
      result[dayKey] = null;
      invalidDays.push(dayKey);
      return result;
    }

    result[dayKey] = {
      from,
      to,
    };

    return result;
  }, {});

  return {
    weeklyHours,
    invalidDays,
    isValid: invalidDays.length === 0,
  };
}

/**
 * الحالة الأولية.
 *
 * weeklyHours تبقى null أثناء التحميل.
 * بهذا لا تظهر ساعات مؤقتة وغير مؤكدة للمستخدم.
 */
const INITIAL_STATE = {
  weeklyHours: null,
  loading: true,
  error: "",
  invalidDays: [],
  source: "loading",
  hasLoaded: false,
  isStale: false,
};

/**
 * Hook قراءة ساعات العمل الأسبوعية.
 *
 * الخيارات:
 *
 * live: true
 * يستمع إلى تغييرات Firestore مباشرة.
 *
 * live: false
 * يقرأ البيانات مرة واحدة فقط.
 */
export default function useWeeklyWorkingHours({ live = true } = {}) {
  const [state, setState] = useState(INITIAL_STATE);

  /**
   * تغيير هذه القيمة يعيد تشغيل القراءة
   * عند الضغط على إعادة المحاولة.
   */
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * مرجع المستند ثابت ولا يُنشأ من جديد
   * مع كل Render.
   */
  const weeklyHoursRef = useMemo(() => doc(db, ...WEEKLY_HOURS_DOC), []);

  /**
   * الساعات الافتراضية النظيفة.
   *
   * لا تُستخدم أثناء التحميل.
   * تُستخدم فقط بعد التأكد أن مستند Firebase
   * غير موجود أصلًا.
   */
  const safeDefaultWorkingHours = useMemo(
    () => cloneWeeklyHours(defaultWorkingHours),
    [],
  );

  /**
   * تطبيق بيانات مستند Firestore على الحالة.
   */
  const applySnapshot = useCallback(
    (snapshot) => {
      /**
       * المستند غير موجود فعلًا.
       *
       * هنا فقط نستعمل الجدول الافتراضي،
       * لأننا انتهينا من التحميل وتأكدنا
       * أنه لا توجد ساعات محفوظة.
       */
      if (!snapshot.exists()) {
        setState({
          weeklyHours: safeDefaultWorkingHours,

          loading: false,
          error: "",
          invalidDays: [],
          source: "default",
          hasLoaded: true,
          isStale: false,
        });

        return;
      }

      const documentData = snapshot.data() || {};

      const extractedWeeklyHours = extractWeeklyHours(documentData);

      const sanitized = sanitizeWeeklyHours(extractedWeeklyHours);

      /**
       * المستند موجود لكن بعض الأيام تالفة.
       *
       * لا نفتحها بالافتراضي.
       * نغلق الأيام غير الصالحة ونخبر الواجهة
       * أن هناك خطأ في البيانات.
       */
      if (!sanitized.isValid) {
        setState({
          weeklyHours: sanitized.weeklyHours,

          loading: false,
          error: "WEEKLY_HOURS_INVALID",

          invalidDays: sanitized.invalidDays,

          source: "firestore",
          hasLoaded: true,
          isStale: false,
        });

        return;
      }

      /**
       * البيانات سليمة.
       */
      setState({
        weeklyHours: sanitized.weeklyHours,

        loading: false,
        error: "",
        invalidDays: [],
        source: "firestore",
        hasLoaded: true,
        isStale: false,
      });
    },
    [safeDefaultWorkingHours],
  );

  /**
   * معالجة خطأ القراءة.
   *
   * إذا كانت لدينا ساعات محمّلة سابقًا،
   * نبقيها ظاهرة ونعلّمها بأنها قديمة.
   *
   * إذا لم نحمّل أي بيانات بعد،
   * لا نعرض ساعات افتراضية أو وهمية.
   */
  const applyLoadError = useCallback((error) => {
    console.error("Weekly working hours load failed:", error);

    setState((previousState) => {
      const hasPreviousHours = previousState.weeklyHours !== null;

      return {
        ...previousState,

        weeklyHours: hasPreviousHours ? previousState.weeklyHours : null,

        loading: false,

        error: "WEEKLY_HOURS_LOAD_FAILED",

        hasLoaded: previousState.hasLoaded,

        isStale: hasPreviousHours,
      };
    });
  }, []);

  useEffect(() => {
    let active = true;

    /**
     * عند أول تحميل أو عند إعادة المحاولة:
     *
     * - إذا لم توجد بيانات سابقة نظهر Loading.
     * - إذا توجد بيانات سابقة نبقيها ظاهرة
     *   أثناء تحديثها حتى لا تومض الواجهة.
     */
    setState((previousState) => ({
      ...previousState,

      loading: previousState.weeklyHours === null,

      error: "",
      isStale: false,
    }));

    /**
     * الاستماع المباشر.
     */
    if (live) {
      const unsubscribe = onSnapshot(
        weeklyHoursRef,

        (snapshot) => {
          if (!active) return;

          applySnapshot(snapshot);
        },

        (error) => {
          if (!active) return;

          applyLoadError(error);
        },
      );

      return () => {
        active = false;
        unsubscribe();
      };
    }

    /**
     * قراءة لمرة واحدة.
     */
    const loadOnce = async () => {
      try {
        const snapshot = await getDoc(weeklyHoursRef);

        if (!active) return;

        applySnapshot(snapshot);
      } catch (error) {
        if (!active) return;

        applyLoadError(error);
      }
    };

    loadOnce();

    return () => {
      active = false;
    };
  }, [live, weeklyHoursRef, applySnapshot, applyLoadError, reloadKey]);

  /**
   * إعادة محاولة التحميل.
   */
  const retry = useCallback(() => {
    setReloadKey((currentValue) => currentValue + 1);
  }, []);

  return {
    /**
     * null أثناء التحميل الأول.
     */
    weeklyHours: state.weeklyHours,

    /**
     * true فقط عندما لا توجد بيانات جاهزة بعد.
     */
    loading: state.loading,

    /**
     * القيم الممكنة:
     *
     * ""
     * WEEKLY_HOURS_INVALID
     * WEEKLY_HOURS_LOAD_FAILED
     */
    error: state.error,

    /**
     * أسماء الأيام التي تحتوي ساعات تالفة.
     */
    invalidDays: state.invalidDays,

    /**
     * firestore:
     * الساعات جاءت من Firebase.
     *
     * default:
     * المستند غير موجود واستُخدم الافتراضي.
     *
     * loading:
     * لم تنتهِ القراءة بعد.
     */
    source: state.source,

    /**
     * هل نجحت قراءة واحدة على الأقل؟
     */
    hasLoaded: state.hasLoaded,

    /**
     * true إذا بقيت آخر بيانات ناجحة ظاهرة
     * بعد حدوث خطأ جديد.
     */
    isStale: state.isStale,

    /**
     * زر إعادة المحاولة سيستخدم هذه الدالة.
     */
    retry,
  };
}
