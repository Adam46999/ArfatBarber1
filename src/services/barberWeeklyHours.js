// src/services/barberWeeklyHours.js

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

const DOC_PATH = ["barberSettings", "hours"];

function getHoursRef() {
  return doc(db, ...DOC_PATH);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * توحيد شكل اليوم قبل المقارنة.
 *
 * اليوم له حالتان:
 *
 * 1. مغلق:
 * null / undefined / object بدون from و to صحيحين.
 *
 * 2. مفتوح:
 * {
 *   from: "HH:mm",
 *   to: "HH:mm"
 * }
 *
 * بهذا لا تتأثر المقارنة باختلاف:
 * - ترتيب خصائص Object.
 * - null و undefined.
 * - خصائص قديمة إضافية لا تدخل في ساعات اليوم.
 */
function normalizeDayForComparison(dayValue) {
  if (!isObject(dayValue)) {
    return null;
  }

  const from = typeof dayValue.from === "string" ? dayValue.from.trim() : "";

  const to = typeof dayValue.to === "string" ? dayValue.to.trim() : "";

  if (!from || !to) {
    return null;
  }

  return {
    from,
    to,
  };
}

/**
 * مقارنة دلالية بين يومين.
 *
 * لا نستخدم JSON.stringify على البيانات الخام،
 * لأن ترتيب الخصائص قد يختلف رغم أن الساعات نفسها متطابقة.
 */
function dayValuesEqual(firstValue, secondValue) {
  const firstDay = normalizeDayForComparison(firstValue);
  const secondDay = normalizeDayForComparison(secondValue);

  if (firstDay === null && secondDay === null) {
    return true;
  }

  if (firstDay === null || secondDay === null) {
    return false;
  }

  return firstDay.from === secondDay.from && firstDay.to === secondDay.to;
}

function getAllDayKeys(...weeklyObjects) {
  const keys = new Set();

  weeklyObjects.forEach((weekly) => {
    if (!isObject(weekly)) {
      return;
    }

    Object.keys(weekly).forEach((key) => {
      keys.add(key);
    });
  });

  return [...keys];
}

/**
 * الأيام التي عدّلها الحلاق فعليًا مقارنة بالنسخة
 * التي كانت ظاهرة عندما فتح شاشة التعديل.
 */
function getChangedDays(nextWeekly, baseWeekly) {
  return getAllDayKeys(nextWeekly, baseWeekly).filter((dayKey) => {
    return !dayValuesEqual(nextWeekly?.[dayKey], baseWeekly?.[dayKey]);
  });
}

function createConflictError(conflictingDays) {
  const error = new Error(
    "Weekly hours were changed from another device or tab.",
  );

  error.code = "weekly-hours-conflict";
  error.conflictingDays = conflictingDays;

  return error;
}

/**
 * قراءة مستند ساعات العمل.
 */
export async function getWeeklyHoursDoc() {
  const ref = getHoursRef();
  const snapshot = await getDoc(ref);

  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * إنشاء الجدول الافتراضي فقط إذا لم يكن هناك جدول محفوظ أصلًا.
 *
 * هذه الدالة تُستخدم من لوحة الحلاق،
 * ولا يجب استدعاؤها من صفحة حجز الزبون.
 */
export async function ensureDefaultWeeklyHours(defaultWeekly) {
  if (!isObject(defaultWeekly)) {
    throw new Error("Invalid default weekly hours.");
  }

  const ref = getHoursRef();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (snapshot.exists()) {
      const currentData = snapshot.data() || {};

      if (isObject(currentData.weekly)) {
        return {
          weekly: cloneValue(currentData.weekly),
          revision: Number(currentData.revision || 0),
          ensured: false,
        };
      }
    }

    const initialWeekly = cloneValue(defaultWeekly);

    transaction.set(
      ref,
      {
        weekly: initialWeekly,
        revision: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      },
    );

    return {
      weekly: initialWeekly,
      revision: 1,
      ensured: true,
    };
  });
}

/**
 * حفظ ساعات العمل بأمان.
 *
 * nextWeekly:
 * الجدول الجديد بعد تعديل الحلاق.
 *
 * baseWeekly:
 * الجدول الذي كان ظاهرًا عندما بدأ الحلاق التعديل.
 *
 * النظام:
 * - يكتشف الأيام التي عدّلها الحلاق فقط.
 * - يحافظ على تعديلات الأيام الأخرى.
 * - يمنع الحفظ فقط عند وجود تعارض حقيقي على نفس اليوم.
 */
export async function saveWeeklyHours(nextWeekly, baseWeekly = null) {
  if (!isObject(nextWeekly)) {
    throw new Error("Invalid weekly hours.");
  }

  const ref = getHoursRef();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    const currentData = snapshot.exists() ? snapshot.data() || {} : {};

    const latestWeekly = isObject(currentData.weekly)
      ? cloneValue(currentData.weekly)
      : {};

    /**
     * دعم أي استدعاء قديم لا يمرر baseWeekly.
     *
     * في هذه الحالة يتم حفظ الجدول كاملًا.
     */
    if (!isObject(baseWeekly)) {
      const savedWeekly = cloneValue(nextWeekly);

      const nextRevision = Number(currentData.revision || 0) + 1;

      transaction.set(
        ref,
        {
          weekly: savedWeekly,
          revision: nextRevision,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        },
      );

      return {
        weekly: savedWeekly,
        revision: nextRevision,
        changedDays: Object.keys(savedWeekly),
      };
    }

    const changedDays = getChangedDays(nextWeekly, baseWeekly);

    /**
     * لا توجد تغييرات فعلية.
     */
    if (changedDays.length === 0) {
      return {
        weekly: latestWeekly,
        revision: Number(currentData.revision || 0),
        changedDays: [],
      };
    }

    /**
     * تعارض حقيقي فقط:
     *
     * 1. نفس اليوم تغير في Firebase مقارنة بالنسخة الأصلية.
     * 2. وقيمة Firebase ليست أصلًا نفس القيمة التي يريد الحلاق حفظها.
     */
    const conflictingDays = changedDays.filter((dayKey) => {
      const latestDay = latestWeekly?.[dayKey];
      const originalDay = baseWeekly?.[dayKey];
      const requestedDay = nextWeekly?.[dayKey];

      const remoteChanged = !dayValuesEqual(latestDay, originalDay);

      const alreadySameAsRequested = dayValuesEqual(latestDay, requestedDay);

      return remoteChanged && !alreadySameAsRequested;
    });

    if (conflictingDays.length > 0) {
      throw createConflictError(conflictingDays);
    }

    /**
     * نبدأ من آخر نسخة موجودة في Firebase،
     * ثم نطبق فقط الأيام التي عدّلها الحلاق.
     */
    const mergedWeekly = cloneValue(latestWeekly);

    changedDays.forEach((dayKey) => {
      const normalizedDay = normalizeDayForComparison(nextWeekly?.[dayKey]);

      if (normalizedDay === null) {
        /**
         * توحيد اليوم المغلق على null.
         */
        mergedWeekly[dayKey] = null;
        return;
      }

      mergedWeekly[dayKey] = {
        from: normalizedDay.from,
        to: normalizedDay.to,
      };
    });

    const nextRevision = Number(currentData.revision || 0) + 1;

    transaction.set(
      ref,
      {
        weekly: mergedWeekly,
        revision: nextRevision,
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      },
    );

    return {
      weekly: mergedWeekly,
      revision: nextRevision,
      changedDays,
    };
  });
}

/**
 * إرجاع جميع ساعات الأسبوع إلى الجدول الافتراضي.
 */
export async function resetWeeklyHoursToDefault(defaultWeekly) {
  if (!isObject(defaultWeekly)) {
    throw new Error("Invalid default weekly hours.");
  }

  const ref = getHoursRef();

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    const currentData = snapshot.exists() ? snapshot.data() || {} : {};

    const nextRevision = Number(currentData.revision || 0) + 1;

    const weekly = cloneValue(defaultWeekly);

    transaction.set(
      ref,
      {
        weekly,
        revision: nextRevision,
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      },
    );

    return {
      weekly,
      revision: nextRevision,
    };
  });
}
