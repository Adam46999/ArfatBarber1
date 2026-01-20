// src/hooks/useWeeklyWorkingHours.js
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import defaultWorkingHours from "../constants/workingHours";

/** تحقق بسيط من HH:mm */
function isHHmm(v) {
  return typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
}

function sanitizeWeeklyHours(input, fallback) {
  const out = { ...fallback };
  if (!input || typeof input !== "object") return out;

  for (const day of Object.keys(fallback)) {
    const v = input[day];

    if (v === null) {
      out[day] = null;
      continue;
    }

    const from = v?.from;
    const to = v?.to;

    // لازم يكونوا HH:mm وبترتيب منطقي
    if (isHHmm(from) && isHHmm(to)) {
      // مقارنة زمنية بسيطة باستخدام Date
      const a = new Date(`2000-01-01T${from}:00`);
      const b = new Date(`2000-01-01T${to}:00`);
      if (a < b) out[day] = { from, to };
      else out[day] = fallback[day] ?? null;
    } else {
      out[day] = fallback[day] ?? null;
    }
  }

  return out;
}

/**
 * useWeeklyWorkingHours:
 * - يقرأ barberSettings/hours.weekly
 * - لو مش موجود/فيه مشكلة -> يرجع defaultWorkingHours
 * - (optional) createIfMissing: ينشئ doc لأول مرة بدون ما يغيّر شي ثاني
 */
export default function useWeeklyWorkingHours({
  live = true,
  createIfMissing = true,
} = {}) {
  const [weeklyHours, setWeeklyHours] = useState(defaultWorkingHours);
  const [loadingWeekly, setLoadingWeekly] = useState(true);

  useEffect(() => {
    const ref = doc(db, "barberSettings", "hours");

    let unsub = null;
    let alive = true;

    async function ensureExists() {
      try {
        const snap = await getDoc(ref);
        if (!alive) return;

        if (!snap.exists() && createIfMissing) {
          await setDoc(ref, { weekly: defaultWorkingHours }, { merge: true });
        }

        const weekly = snap.exists() ? snap.data()?.weekly : null;
        setWeeklyHours(sanitizeWeeklyHours(weekly, defaultWorkingHours));
      } catch (e) {
        console.warn("useWeeklyWorkingHours getDoc error:", e);
        setWeeklyHours(defaultWorkingHours);
      } finally {
        if (alive) setLoadingWeekly(false);
      }
    }

    if (!live) {
      ensureExists();
      return () => {
        alive = false;
      };
    }

    // LIVE sync
    setLoadingWeekly(true);
    unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!alive) return;

        if (!snap.exists() && createIfMissing) {
          try {
            await setDoc(ref, { weekly: defaultWorkingHours }, { merge: true });
            // eslint-disable-next-line no-unused-vars
          } catch (e) {
            // ignore
          }
          setWeeklyHours(defaultWorkingHours);
          setLoadingWeekly(false);
          return;
        }

        const weekly = snap.exists() ? snap.data()?.weekly : null;
        setWeeklyHours(sanitizeWeeklyHours(weekly, defaultWorkingHours));
        setLoadingWeekly(false);
      },
      (err) => {
        console.warn("useWeeklyWorkingHours onSnapshot error:", err);
        setWeeklyHours(defaultWorkingHours);
        setLoadingWeekly(false);
      }
    );

    return () => {
      alive = false;
      if (unsub) unsub();
    };
  }, [live, createIfMissing]);

  return useMemo(
    () => ({ weeklyHours, loadingWeekly }),
    [weeklyHours, loadingWeekly]
  );
}
