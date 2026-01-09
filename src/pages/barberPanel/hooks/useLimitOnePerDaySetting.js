// src/pages/barberPanel/hooks/useLimitOnePerDaySetting.js
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function useLimitOnePerDaySetting() {
  const [limitOnePerDay, setLimitOnePerDay] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const ref = doc(db, "barberSettings", "global");
        const snap = await getDoc(ref);

        if (!alive) return;

        if (snap.exists()) {
          const data = snap.data();
          const value =
            typeof data.limitOneBookingPerDayPerPhone === "boolean"
              ? data.limitOneBookingPerDayPerPhone
              : !!data.limitOneBookingPerDay;
          setLimitOnePerDay(value);
        } else {
          setLimitOnePerDay(false);
        }
      } catch (err) {
        console.error("fetch barberSettings error:", err);
        if (!alive) return;
        setLimitOnePerDay(false);
      } finally {
        if (alive) setLoadingSettings(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const toggleLimitOnePerDay = async () => {
    if (loadingSettings || savingSettings) return;

    try {
      setSavingSettings(true);
      const ref = doc(db, "barberSettings", "global");
      await setDoc(
        ref,
        { limitOneBookingPerDayPerPhone: !limitOnePerDay },
        { merge: true }
      );
      setLimitOnePerDay((p) => !p);
    } catch (err) {
      console.error("update barberSettings error:", err);
      alert("حدث خطأ أثناء تحديث الإعداد. حاول مرة أخرى.");
    } finally {
      setSavingSettings(false);
    }
  };

  return {
    limitOnePerDay,
    loadingSettings,
    savingSettings,
    toggleLimitOnePerDay,
  };
}
