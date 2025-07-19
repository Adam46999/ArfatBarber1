import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc} from "firebase/firestore";
import { FaPhone, FaClock, FaCut, FaUser } from "react-icons/fa";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" });
}

function getTimeLeft(dateStr, timeStr) {
  const now = new Date();
  const target = new Date(`${dateStr}T${timeStr}:00`);
  const diffMin = Math.round((target - now) / 60000);
  return diffMin > 0 ? `بعد ${diffMin} دقيقة` : `الآن`;
}

export default function AdminBookingsStyled() {
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "bookings"));
      const upcoming = {};
      const now = new Date();

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.cancelledAt) continue;

        const dateKey = data.selectedDate;
        const timeObj = new Date(`${dateKey}T${data.selectedTime}:00`);
        if (timeObj < now) continue;

        if (!upcoming[dateKey]) upcoming[dateKey] = [];
        upcoming[dateKey].push({ id: docSnap.id, ...data });
      }

      for (const date in upcoming) {
        upcoming[date].sort((a, b) => a.selectedTime.localeCompare(b.selectedTime));
      }

      setGrouped(upcoming);
    };

    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (b) => {
    await updateDoc(doc(db, "bookings", b.id), { cancelledAt: new Date().toISOString() });
    setGrouped(prev => {
      const updated = { ...prev };
      updated[b.selectedDate] = updated[b.selectedDate].filter(x => x.id !== b.id);
      return updated;
    });
  };

  return (
    <section className="min-h-screen bg-[#f7f8fc] py-20 px-4 font-ar" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-yellow-700">📋 لوحة الحجوزات الجديدة</h1>

        {Object.keys(grouped).length === 0 ? (
          <p className="text-center text-gray-500">لا توجد حجوزات قادمة.</p>
        ) : (
          Object.entries(grouped).sort().map(([date, bookings]) => (
            <div key={date} className="bg-white shadow-md border rounded-2xl p-4 space-y-3">
              <div className="text-lg font-bold text-yellow-700 mb-2">📅 {formatDate(date)}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.map(b => (
                  <div key={b.id} className="border rounded-xl p-3 flex justify-between items-center bg-gray-50">
                    <div className="text-sm space-y-1">
                      <p><FaUser className="inline mr-1 text-gold" /> {b.fullName}</p>
                      <p><FaPhone className="inline mr-1 text-gray-500" /> {b.phoneNumber}</p>
                      <p><FaClock className="inline mr-1 text-gray-500" /> {b.selectedTime} ⏳ {getTimeLeft(b.selectedDate, b.selectedTime)}</p>
                      <p><FaCut className="inline mr-1 text-gray-500" /> {b.selectedService}</p>
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-right">
                      <button onClick={() => handleCancel(b)} className="text-red-600 hover:underline">إلغاء</button>
                      <a href={`tel:${b.phoneNumber}`} className="text-pink-600 hover:underline">اتصال</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}