// src/services/barberWeeklyHours.js
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const DOC_PATH = ["barberSettings", "hours"];

// Reads the doc { weekly, updatedAt }
export async function getWeeklyHoursDoc() {
  const ref = doc(db, ...DOC_PATH);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Ensures default exists only if doc is missing OR weekly missing
export async function ensureDefaultWeeklyHours(defaultWeekly) {
  const ref = doc(db, ...DOC_PATH);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      { weekly: defaultWeekly, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return { weekly: defaultWeekly, ensured: true };
  }

  const data = snap.data() || {};
  if (!data.weekly) {
    await setDoc(
      ref,
      { weekly: defaultWeekly, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return { weekly: defaultWeekly, ensured: true };
  }

  return { weekly: data.weekly, ensured: false };
}

export async function saveWeeklyHours(weekly) {
  const ref = doc(db, ...DOC_PATH);
  await setDoc(ref, { weekly, updatedAt: serverTimestamp() }, { merge: true });
}

export async function resetWeeklyHoursToDefault(defaultWeekly) {
  const ref = doc(db, ...DOC_PATH);
  await setDoc(
    ref,
    { weekly: defaultWeekly, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
