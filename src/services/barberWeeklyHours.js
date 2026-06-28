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
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function valuesEqual(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function getAllDayKeys(...weeklyObjects) {
  const keys = new Set();

  weeklyObjects.forEach((weekly) => {
    if (!isObject(weekly)) return;

    Object.keys(weekly).forEach((key) => {
      keys.add(key);
    });
  });

  return [...keys];
}

/**
 * الأيام التي عدّلها الحلاق فعليًا مقارنة بالنسخة
 * التي كانت موجودة عندما فتح شاشة التعديل.
 */
function getChangedDays(nextWeekly, baseWeekly) {
  return getAllDayKeys(nextWeekly, baseWeekly).filter((dayKey) => {
    return !valuesEqual(nextWeekly?.[dayKey], baseWeekly?.[dayKey]);
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
  const snap = await getDoc(ref);

  return snap.exists() ? snap.data() : null;
}

/**
 * إنشاء الجدول الافتراضي فقط إذا لم يكن هناك جدول أصلًا.
 *
 * هذه الدالة يجب استخدامها من لوحة الحلاق فقط،
 * وليس من صفحة حجز الزبون.
 */
export async function ensureDefaultWeeklyHours(defaultWeekly) {
  if (!isObject(defaultWeekly)) {
    throw new Error("Invalid default weekly hours.");
  }

  const ref = getHoursRef();

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);

    if (snap.exists()) {
      const currentData = snap.data() || {};

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
      { merge: true },
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
 * الجدول الذي كان ظاهرًا للحلاق عندما بدأ التعديل.
 *
 * النتيجة:
 * - نكتب فقط الأيام التي عدّلها الحلاق.
 * - نحافظ على تعديلات الأيام الأخرى التي تمت من جهاز آخر.
 * - إذا تغيّر نفس اليوم من جهاز آخر، نوقف الحفظ بدل إرجاع ساعات قديمة.
 */
export async function saveWeeklyHours(nextWeekly, baseWeekly = null) {
  if (!isObject(nextWeekly)) {
    throw new Error("Invalid weekly hours.");
  }

  const ref = getHoursRef();

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const currentData = snap.exists() ? snap.data() || {} : {};

    const latestWeekly = isObject(currentData.weekly)
      ? cloneValue(currentData.weekly)
      : {};

    /**
     * دعم مؤقت للاستدعاءات القديمة:
     * إذا لم يتم تمرير baseWeekly، نحفظ الجدول كاملًا.
     *
     * في الملف القادم سنمرر baseWeekly من المحرر،
     * وعندها تصبح الحماية من النسخ القديمة فعالة بالكامل.
     */
    if (!isObject(baseWeekly)) {
      const nextRevision = Number(currentData.revision || 0) + 1;
      const savedWeekly = cloneValue(nextWeekly);

      transaction.set(
        ref,
        {
          weekly: savedWeekly,
          revision: nextRevision,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      return {
        weekly: savedWeekly,
        revision: nextRevision,
        changedDays: Object.keys(savedWeekly),
      };
    }

    const changedDays = getChangedDays(nextWeekly, baseWeekly);

    if (changedDays.length === 0) {
      return {
        weekly: latestWeekly,
        revision: Number(currentData.revision || 0),
        changedDays: [],
      };
    }

    /**
     * إذا تغيّر نفس اليوم في Firebase بعد فتح المحرر،
     * نمنع النسخة القديمة من الكتابة فوق التعديل الجديد.
     */
    const conflictingDays = changedDays.filter((dayKey) => {
      const latestDay = latestWeekly?.[dayKey];
      const originalDay = baseWeekly?.[dayKey];
      const requestedDay = nextWeekly?.[dayKey];

      const remoteChanged = !valuesEqual(latestDay, originalDay);
      const alreadySameAsRequested = valuesEqual(latestDay, requestedDay);

      return remoteChanged && !alreadySameAsRequested;
    });

    if (conflictingDays.length > 0) {
      throw createConflictError(conflictingDays);
    }

    /**
     * نبدأ بآخر نسخة حقيقية في Firebase،
     * ثم نطبق فقط الأيام التي عدّلها الحلاق.
     */
    const mergedWeekly = cloneValue(latestWeekly);

    changedDays.forEach((dayKey) => {
      const nextDayValue = cloneValue(nextWeekly[dayKey]);

      if (nextDayValue === undefined) {
        delete mergedWeekly[dayKey];
      } else {
        mergedWeekly[dayKey] = nextDayValue;
      }
    });

    const nextRevision = Number(currentData.revision || 0) + 1;

    transaction.set(
      ref,
      {
        weekly: mergedWeekly,
        revision: nextRevision,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      weekly: mergedWeekly,
      revision: nextRevision,
      changedDays,
    };
  });
}

/**
 * إرجاع الجدول الافتراضي بشكل مقصود من لوحة الحلاق.
 */
export async function resetWeeklyHoursToDefault(defaultWeekly) {
  if (!isObject(defaultWeekly)) {
    throw new Error("Invalid default weekly hours.");
  }

  const ref = getHoursRef();

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const currentData = snap.exists() ? snap.data() || {} : {};

    const nextRevision = Number(currentData.revision || 0) + 1;
    const weekly = cloneValue(defaultWeekly);

    transaction.set(
      ref,
      {
        weekly,
        revision: nextRevision,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      weekly,
      revision: nextRevision,
    };
  });
}
