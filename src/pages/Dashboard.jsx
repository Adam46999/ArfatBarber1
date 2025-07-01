import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const [closedDates, setClosedDates] = useState([]);         // الأيام المغلقة القادمة
  const [blockedByDay, setBlockedByDay] = useState({});
  const [todayStats, setTodayStats] = useState({
  total: 0,
  passed: 0,
  upcoming: 0,
  firstTime: null,
  lastTime: null,
});
    // الأوقات المحظورة

  useEffect(() => {
    const fetchData = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);

      // ✅ جلب الأيام المغلقة القادمة
      const closedSnap = await getDocs(collection(db, "blockedDays"));
      const futureClosed = closedSnap.docs
        .map(doc => doc.id)
        .filter(date => date >= todayStr)
        .sort();
      setClosedDates(futureClosed);

      // ✅ جلب الأوقات المحظورة
      const timesSnap = await getDocs(collection(db, "blockedTimes"));
      const result = {};
      timesSnap.docs.forEach(doc => {
        const date = doc.id;
        const data = doc.data();
        if (data?.times?.length && date >= todayStr) {
          result[date] = data.times.sort(); // ترتيب الأوقات
        }
      });
      setBlockedByDay(result);
      const bookingsSnap = await getDocs(collection(db, "bookings"));
const today = new Date();

const todayBookings = bookingsSnap.docs
  .map(doc => doc.data())
  .filter(b => b.selectedDate === todayStr && !b.cancelledAt);
const passed = todayBookings.filter(b => {
  const bookingTime = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
  return bookingTime <= today;
});

const upcoming = todayBookings.filter(b => {
  const bookingTime = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
  return bookingTime > today;
});

const sortedTimes = todayBookings
  .map(b => b.selectedTime)
  .sort((a, b) => a.localeCompare(b));

const firstTime = sortedTimes[0] || null;
const lastTime = sortedTimes[sortedTimes.length - 1] || null;
setTodayStats({
  total: todayBookings.length,
  passed: passed.length,
  upcoming: upcoming.length,
  firstTime,
  lastTime,
});

    };

    fetchData();
  }, []);

  // ✅ تنسيق التاريخ
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const weekday = date.toLocaleDateString("ar-EG", { weekday: "long" });
    const formatted = date.toLocaleDateString("ar-EG");
    return `${weekday} ${formatted}`;
  };

  return (
    <section className="min-h-screen p-6 pt-24 bg-gray-100 font-ar" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow space-y-6">

        {/* 🔙 زر الرجوع */}
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:underline"
        >
          ← الرجوع
        </button>
َ
        <h1 className="text-2xl font-bold text-gold mb-4">لوحة الإحصائيات</h1>

        {/* ✅ الأيام المغلقة القادمة */}
        <div className="bg-yellow-50 p-4 rounded-xl shadow border">
          <h2 className="text-xl font-semibold text-black mb-2">📛 الأيام المغلقة القادمة</h2>
          <p className="text-sm text-gray-600 mb-2">عدد الأيام: {closedDates.length}</p>
          <ul className="space-y-1">
            {closedDates.map(date => (
              <li key={date} className="text-red-700 font-medium">
                🔒 {formatDate(date)}
              </li>
            ))}
            {closedDates.length === 0 && (
              <li className="text-sm text-gray-500">لا توجد أيام مغلقة قادمة.</li>
            )}
          </ul>
        </div>
{/* ✅ إحصائيات اليوم */}
<div className="bg-green-50 p-4 rounded-xl shadow border">
  <h2 className="text-xl font-semibold text-black mb-2">📅 إحصائيات اليوم</h2>
  <ul className="space-y-1 text-sm text-gray-700">
    <li>🔢 عدد الحجوزات: <span className="font-bold">{todayStats.total}</span></li>
    <li>✅ عدد الأدوار التي مرّت: <span className="text-green-700 font-bold">{todayStats.passed}</span></li>
    <li>⏳ عدد الأدوار القادمة: <span className="text-blue-700 font-bold">{todayStats.upcoming}</span></li>
    {todayStats.firstTime && (
      <li>🕒 أول حجز اليوم: <span className="text-black font-bold">{todayStats.firstTime}</span></li>
    )}
    {todayStats.lastTime && (
      <li>🕔 آخر حجز اليوم: <span className="text-black font-bold">{todayStats.lastTime}</span></li>
    )}
  </ul>
</div>

        {/* ✅ الأوقات المحظورة القادمة */}
        <div className="bg-red-50 p-4 rounded-xl shadow border">
          <h2 className="text-xl font-semibold text-black mb-3">⛔ الأوقات المحظورة</h2>
          {Object.keys(blockedByDay).length === 0 && (
            <p className="text-sm text-gray-500">لا توجد أوقات محظورة.</p>
          )}
          {Object.entries(blockedByDay).map(([date, times]) => (
            <div key={date} className="mb-3">
              <p className="text-red-700 font-semibold mb-1">
                📅 {formatDate(date)}
              </p>
              <div className="flex flex-wrap gap-2">
                {times.map(time => (
                  <span
                    key={time}
                    className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm"
                  >
                    {time}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        

      </div>
    </section>
  );
}
