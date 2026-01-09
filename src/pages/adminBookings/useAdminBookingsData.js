// src/pages/adminBookings/useAdminBookingsData.js
import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  deleteField,
} from "firebase/firestore";

export function useAdminBookingsData() {
  const [upcoming, setUpcoming] = useState([]);
  const [recentPast, setRecentPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let alive = true;

    async function fetchAndClassify() {
      try {
        const now = new Date();
        const snap = await getDocs(query(collection(db, "bookings")));

        const up = [];
        const past = [];

        for (const d of snap.docs) {
          const data = d.data();
          const when = new Date(`${data.selectedDate}T${data.selectedTime}:00`);
          const diffH = (now - when) / (1000 * 60 * 60);

          // نفس منطقك: بعد 2 ساعات من الموعد => حذف نهائي
          if (diffH > 2) {
            await deleteDoc(doc(db, "bookings", d.id));
            continue;
          }

          if (data.cancelledAt || diffH >= 0) {
            past.push({ id: d.id, ...data });
          } else {
            up.push({ id: d.id, ...data });
          }
        }

        up.sort((a, b) => {
          const da = new Date(`${a.selectedDate}T${a.selectedTime}:00`);
          const dbb = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
          return da - dbb;
        });

        if (!alive) return;
        setUpcoming(up);
        setRecentPast(past);
        setLoading(false);
        setLastUpdated(new Date());
      } catch (e) {
        console.error("fetchAndClassify error:", e);
        if (!alive) return;
        setLoading(false);
      }
    }

    fetchAndClassify();
    const interval = setInterval(() => fetchAndClassify(), 60000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const actions = useMemo(() => {
    return {
      async cancelBooking(b) {
        const cancelledAt = new Date().toISOString();
        await updateDoc(doc(db, "bookings", b.id), { cancelledAt });
        setUpcoming((u) => u.filter((x) => x.id !== b.id));
        setRecentPast((p) => [{ ...b, cancelledAt }, ...p]);
      },

      async restoreBooking(b, upcomingList) {
        // 1) لا تسترجع إذا في upcoming بنفس الموعد
        if (
          upcomingList.some(
            (x) =>
              x.selectedDate === b.selectedDate &&
              x.selectedTime === b.selectedTime
          )
        ) {
          alert("لا يمكن استرجاع هذا الحجز؛ الموعد محجوز حالياً.");
          return;
        }

        // 2) تحقق من فايرستور: أي حجز غير ملغي على نفس الموعد؟
        const conflictQ = query(
          collection(db, "bookings"),
          where("selectedDate", "==", b.selectedDate),
          where("selectedTime", "==", b.selectedTime)
        );
        const conflictSnap = await getDocs(conflictQ);
        const activeConflicts = conflictSnap.docs
          .map((d) => d.data())
          .filter((data) => !data.cancelledAt);

        if (activeConflicts.length > 0) {
          alert("لا يمكن استرجاع هذا الحجز؛ تم حجز هذا الموعد من قبل.");
          return;
        }

        // UI optimistic
        setRecentPast((p) => p.filter((x) => x.id !== b.id));
        setUpcoming((u) =>
          [...u, b].sort((a, c) => {
            const da = new Date(`${a.selectedDate}T${a.selectedTime}:00`);
            const dc = new Date(`${c.selectedDate}T${c.selectedTime}:00`);
            return da - dc;
          })
        );

        await updateDoc(doc(db, "bookings", b.id), {
          cancelledAt: deleteField(),
        });

        // مثل كودك السابق (حتى لو مو ضروري): نخليه عشان ما نغيّر سلوك
        window.location.reload();
      },

      async deleteBookingForever(b) {
        const ok = window.confirm("متأكد بدك حذف نهائي؟ (ما بنقدر نرجّعه)");
        if (!ok) return;
        await deleteDoc(doc(db, "bookings", b.id));
        setRecentPast((p) => p.filter((x) => x.id !== b.id));
      },
    };
  }, []);

  return {
    upcoming,
    recentPast,
    loading,
    lastUpdated,
    actions,
  };
}
