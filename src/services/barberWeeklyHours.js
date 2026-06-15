// src/services/barberWeeklyHours.js
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../firebase";

const DOC_PATH = ["barberSettings", "hours"];

function getHoursRef() {
  return doc(db, ...DOC_PATH);
}

// قراءة ساعات العمل
export async function getWeeklyHoursDoc() {
  const ref = getHoursRef();
  const snap = await getDoc(ref);

  return snap.exists() ? snap.data() : null;
}

// إنشاء الساعات الافتراضية فقط إذا لم تكن موجودة
export async function ensureDefaultWeeklyHours(defaultWeekly) {
  const ref = getHoursRef();
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        weekly: defaultWeekly,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      weekly: defaultWeekly,
      ensured: true,
    };
  }

  const data = snap.data() || {};

  if (!data.weekly) {
    await setDoc(
      ref,
      {
        weekly: defaultWeekly,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      weekly: defaultWeekly,
      ensured: true,
    };
  }

  return {
    weekly: data.weekly,
    ensured: false,
  };
}

// حفظ ساعات العمل
export async function saveWeeklyHours(weekly) {
  const ref = getHoursRef();

  await setDoc(
    ref,
    {
      weekly,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return true;
}

// إرجاع الساعات الافتراضية
export async function resetWeeklyHoursToDefault(defaultWeekly) {
  const ref = getHoursRef();

  await setDoc(
    ref,
    {
      weekly: defaultWeekly,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return true;
}
