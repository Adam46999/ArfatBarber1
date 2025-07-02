// ✅ src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const [closedDates, setClosedDates] = useState([]);
  const [blockedByDay, setBlockedByDay] = useState({});
  const [todayStats, setTodayStats] = useState({
    total: 0,
    passed: 0,
    upcoming: 0,
    firstTime: null,
    lastTime: null,
  });
  const [weekStats, setWeekStats] = useState({
    total: 0,
    passed: 0,
    upcoming: 0,
    from: "",
    to: "",
  });
const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      const closedSnap = await getDocs(collection(db, "blockedDays"));
      const futureClosed = closedSnap.docs
        .map(doc => doc.id)
        .filter(date => date >= todayStr)
        .sort();
      setClosedDates(futureClosed);

      const timesSnap = await getDocs(collection(db, "blockedTimes"));
      const result = {};
      timesSnap.docs.forEach(doc => {
        const date = doc.id;
        const data = doc.data();
        if (data?.times?.length && date >= todayStr) {
          result[date] = data.times.sort();
        }
      });
      setBlockedByDay(result);

      const bookingsSnap = await getDocs(collection(db, "bookings"));
      const bookings = bookingsSnap.docs.map(doc => doc.data()).filter(b => !b.cancelledAt);
setTotalBookings(bookings.length);

      const todayBookings = bookings.filter(b => b.selectedDate === todayStr);
      const passed = todayBookings.filter(b => new Date(`${b.selectedDate}T${b.selectedTime}:00`) <= now);
      const upcoming = todayBookings.filter(b => new Date(`${b.selectedDate}T${b.selectedTime}:00`) > now);
      const sortedTimes = todayBookings.map(b => b.selectedTime).sort((a, b) => a.localeCompare(b));
      const firstTime = sortedTimes[0] || null;
      const lastTime = sortedTimes[sortedTimes.length - 1] || null;

      setTodayStats({
        total: todayBookings.length,
        passed: passed.length,
        upcoming: upcoming.length,
        firstTime,
        lastTime,
      });

      const day = now.getDay();
      const diffToSunday = day === 0 ? 0 : day;
      const start = new Date(now);
      start.setDate(now.getDate() - diffToSunday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const fromStr = start.toISOString().slice(0, 10);
      const toStr = end.toISOString().slice(0, 10);

      const weekBookings = bookings.filter(b => b.selectedDate >= fromStr && b.selectedDate <= toStr);
      let weekPassed = 0, weekUpcoming = 0;
      weekBookings.forEach(b => {
        const bookingTime = new Date(`${b.selectedDate}T${b.selectedTime}:00`);
        if (bookingTime < now) weekPassed++;
        else weekUpcoming++;
      });

      setWeekStats({
        total: weekBookings.length,
        passed: weekPassed,
        upcoming: weekUpcoming,
        from: fromStr,
        to: toStr,
      });
    };

    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const weekday = date.toLocaleDateString("ar-EG", { weekday: "long" });
    const formatted = date.toLocaleDateString("ar-EG");
    return `${weekday} ${formatted}`;
  };

  return (
<section className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 pt-36 pb-24 px-4 font-ar" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-yellow-700 tracking-tight">📊 لوحة الإحصائيات</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← الرجوع
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Weekly Stats */}
          <CardBox color="blue" title="إحصائيات الأسبوع">
            <p className="text-sm text-gray-500 mb-3">من {formatDate(weekStats.from)} إلى {formatDate(weekStats.to)}</p>
            <ul className="space-y-2 text-sm text-gray-700">
            <li>🧮 عدد الأدوار الكلي: <span className="text-purple-700 font-semibold">{totalBookings}</span></li>

              <li>📊  عدد الحجوزات هذا الاسبوع: <span className="font-semibold">{weekStats.total}</span></li>
              <li>✅ الأدوار التي مرّت: <span className="text-green-700 font-semibold">{weekStats.passed}</span></li>
              <li>⏳ الأدوار القادمة: <span className="text-blue-700 font-semibold">{weekStats.upcoming}</span></li>
            </ul>
          </CardBox>

          {/* Today Stats */}
          <CardBox color="green" title="إحصائيات اليوم">
            <ul className="space-y-2 text-sm text-gray-700">
              <li>📋 عدد الحجوزات اليوم: <span className="font-semibold">{todayStats.total}</span></li>
              <li>✅ الأدوار التي مرّت: <span className="text-green-700 font-semibold">{todayStats.passed}</span></li>
              <li>⏳ الأدوار القادمة: <span className="text-blue-700 font-semibold">{todayStats.upcoming}</span></li>
              {todayStats.firstTime && <li>🕒 أول حجز: <span className="font-semibold text-gray-800">{todayStats.firstTime}</span></li>}
              {todayStats.lastTime && <li>🕔 آخر حجز: <span className="font-semibold text-gray-800">{todayStats.lastTime}</span></li>}
            </ul>
          </CardBox>

          {/* Blocked Times */}
          <CardBox color="red" title="الأوقات المحظورة">
            {Object.keys(blockedByDay).length === 0 && (
              <p className="text-sm text-gray-500">لا توجد أوقات محظورة.</p>
            )}
            {Object.entries(blockedByDay).map(([date, times]) => (
              <div key={date} className="mb-3">
                <p className="text-red-700 font-semibold mb-1">📅 {formatDate(date)}</p>
                <div className="flex flex-wrap gap-2">
                  {times.map(time => (
                    <span
                      key={time}
                      className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs"
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardBox>

          {/* Closed Days */}
          <CardBox color="yellow" title="الأيام المغلقة القادمة">
            <p className="text-sm text-gray-500 mb-2">عدد الأيام: {closedDates.length}</p>
            <ul className="space-y-1">
              {closedDates.map(date => (
                <li key={date} className="text-red-700 text-sm">
                  🔒 {formatDate(date)}
                </li>
              ))}
              {closedDates.length === 0 && (
                <li className="text-sm text-gray-500">لا توجد أيام مغلقة قادمة.</li>
              )}
            </ul>
          </CardBox>

        </div>
      </div>
    </section>
  );
}

function CardBox({ color = "gray", title, children }) {
  const border = {
    blue: "border-blue-100",
    green: "border-green-100",
    red: "border-red-100",
    yellow: "border-yellow-100",
    gray: "border-gray-200",
  }[color];

  const titleColor = {
    blue: "text-blue-900",
    green: "text-green-900",
    red: "text-red-900",
    yellow: "text-yellow-900",
    gray: "text-gray-900",
  }[color];

  return (
    <div className={`bg-white p-6 rounded-2xl border ${border} shadow-md transition-all hover:shadow-lg`}>
      <h2 className={`text-lg font-bold mb-3 ${titleColor}`}>{title}</h2>
      {children}
    </div>
  );
}