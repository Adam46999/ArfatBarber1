// src/components/CalendarGrid.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format
} from "date-fns";

export default function CalendarGrid() {
  // State للأيام المحظورة
  const [blockedDays, setBlockedDays] = useState([]);

  // 1️⃣ جلب blockedDays من Firestore عند الظهور
  useEffect(() => {
    const fetchBlocked = async () => {
      try {
        const snap = await getDocs(collection(db, "blockedDays"));
        setBlockedDays(snap.docs.map(d => d.id));
      } catch (err) {
        console.error("خطأ بجلب الأيام المحجورة:", err);
      }
    };
    fetchBlocked();
  }, []);

  // 2️⃣ توليد كل أيام الشهر الحالي
  const today = new Date();
  const start = startOfMonth(today);
  const end   = endOfMonth(today);
  const allDays = eachDayOfInterval({ start, end });

  // 3️⃣ دالة تبديل حالة اليوم
  const toggleBlocked = async (isoDate) => {
    const ref = doc(db, "blockedDays", isoDate);
    if (blockedDays.includes(isoDate)) {
      await deleteDoc(ref);
      setBlockedDays(prev => prev.filter(d => d !== isoDate));
    } else {
      await setDoc(ref, {});
      setBlockedDays(prev => [...prev, isoDate]);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-2">إدارة أيام الإغلاق</h3>
      <div className="grid grid-cols-7 gap-1">
        {allDays.map(day => {
          const iso = format(day, "yyyy-MM-dd");
          const isBlocked = blockedDays.includes(iso);
          return (
            <div
              key={iso}
              onClick={() => toggleBlocked(iso)}
              className={`
                p-2 text-center cursor-pointer select-none
                ${isBlocked ? "bg-red-400" : "bg-green-300"}
                hover:opacity-80 rounded
              `}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
