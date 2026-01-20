// ✅ src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function ymd(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function fmtMonthTitle(date) {
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
}

// ✅ قراءة موحّدة وآمنة لعداد الشهر
function readMonthlyTotal(snap) {
  if (!snap?.exists?.()) return 0;
  const data = snap.data?.() || {};
  const v = data.activeTotal ?? data.total ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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

  const [monthStats, setMonthStats] = useState({ title: "", total: 0 });
  const [prevMonthStats, setPrevMonthStats] = useState({ title: "", total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const todayStr = ymd(now);

      // ===== blocked days (المستقبل فقط) =====
      const closedSnap = await getDocs(collection(db, "blockedDays"));
      const futureClosed = closedSnap.docs
        .map((d) => d.id)
        .filter((date) => date >= todayStr)
        .sort();
      setClosedDates(futureClosed);

      // ===== blocked times (المستقبل فقط) =====
      const timesSnap = await getDocs(collection(db, "blockedTimes"));
      const result = {};
      timesSnap.docs.forEach((docu) => {
        const date = docu.id;
        const data = docu.data();
        if (data?.times?.length && date >= todayStr) {
          result[date] = data.times.sort();
        }
      });
      setBlockedByDay(result);

      // ===== bookings (active فقط) =====
      const bookingsSnap = await getDocs(collection(db, "bookings"));
      const bookings = bookingsSnap.docs
        .map((d) => d.data())
        .filter((b) => !b.cancelledAt);

      setTotalBookings(bookings.length);

      // ===== اليوم =====
      const todayBookings = bookings.filter((b) => b.selectedDate === todayStr);
      const passedToday = todayBookings.filter(
        (b) => new Date(`${b.selectedDate}T${b.selectedTime}:00`) <= now
      );
      const upcomingToday = todayBookings.filter(
        (b) => new Date(`${b.selectedDate}T${b.selectedTime}:00`) > now
      );
      const sortedTimes = todayBookings
        .map((b) => b.selectedTime)
        .sort((a, b) => a.localeCompare(b));

      setTodayStats({
        total: todayBookings.length,
        passed: passedToday.length,
        upcoming: upcomingToday.length,
        firstTime: sortedTimes[0] || null,
        lastTime: sortedTimes[sortedTimes.length - 1] || null,
      });

      // ===== الأسبوع (من الأحد للسبت) =====
      const day = now.getDay(); // 0 Sunday
      const diffToSunday = day === 0 ? 0 : day;

      const start = new Date(now);
      start.setDate(now.getDate() - diffToSunday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const fromStr = ymd(start);
      const toStr = ymd(end);

      const weekBookings = bookings.filter(
        (b) => b.selectedDate >= fromStr && b.selectedDate <= toStr
      );

      let weekPassed = 0;
      let weekUpcoming = 0;

      weekBookings.forEach((b) => {
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

      // ===== ✅ الشهر الحالي + الشهر الماضي (موحّد) =====
      const curKey = ymd(now).slice(0, 7); // YYYY-MM
      const prevKey = ymd(addMonths(now, -1)).slice(0, 7);

      const curSnap = await getDoc(doc(db, "statsMonthly", curKey));
      const prevSnap = await getDoc(doc(db, "statsMonthly", prevKey));

      const curTotal = readMonthlyTotal(curSnap);
      const prevTotal = readMonthlyTotal(prevSnap);

      setMonthStats({ title: fmtMonthTitle(now), total: curTotal });
      setPrevMonthStats({
        title: fmtMonthTitle(addMonths(now, -1)),
        total: prevTotal,
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

  const monthDelta = useMemo(() => {
    const a = monthStats.total;
    const b = prevMonthStats.total;

    const diff = a - b;
    const pct = b === 0 ? (a === 0 ? 0 : 100) : Math.round((diff / b) * 100);

    return { diff, pct };
  }, [monthStats.total, prevMonthStats.total]);

  return (
    <section
      className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 pt-36 pb-24 px-4 font-ar"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-yellow-700 tracking-tight">
            📊 لوحة الإحصائيات
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← الرجوع
          </button>
        </div>

        {/* ✅ كرت التقرير الشهري */}
        <div className="mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  📅 التقرير الشهري
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  مقارنة الشهر الحالي مع الشهر الماضي بشكل مباشر وواضح.
                </p>
              </div>

              <div className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="font-bold text-slate-800">
                  الفرق:{" "}
                  <span
                    className={
                      monthDelta.diff >= 0 ? "text-emerald-700" : "text-red-700"
                    }
                  >
                    {monthDelta.diff >= 0
                      ? `+${monthDelta.diff}`
                      : monthDelta.diff}
                  </span>{" "}
                  (
                  {monthDelta.pct >= 0
                    ? `+${monthDelta.pct}%`
                    : `${monthDelta.pct}%`}
                  )
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  *النسبة تعتمد على عدد حجوزات الشهر الماضي.
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <CardBox color="blue" title={`هذا الشهر: ${monthStats.title}`}>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    📊 العدد الكلي:{" "}
                    <span className="font-semibold text-slate-900">
                      {monthStats.total}
                    </span>
                  </li>
                </ul>
              </CardBox>

              <CardBox
                color="yellow"
                title={`الشهر الماضي: ${prevMonthStats.title}`}
              >
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    📊 العدد الكلي:{" "}
                    <span className="font-semibold text-slate-900">
                      {prevMonthStats.total}
                    </span>
                  </li>
                </ul>
              </CardBox>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CardBox color="blue" title="إحصائيات الأسبوع">
            <p className="text-sm text-gray-500 mb-3">
              من {formatDate(weekStats.from)} إلى {formatDate(weekStats.to)}
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                🧮 عدد الأدوار الكلي:{" "}
                <span className="text-purple-700 font-semibold">
                  {totalBookings}
                </span>
              </li>

              <li>
                📊 عدد الحجوزات هذا الأسبوع:{" "}
                <span className="font-semibold">{weekStats.total}</span>
              </li>
              <li>
                ✅ الأدوار التي مرّت:{" "}
                <span className="text-green-700 font-semibold">
                  {weekStats.passed}
                </span>
              </li>
              <li>
                ⏳ الأدوار القادمة:{" "}
                <span className="text-blue-700 font-semibold">
                  {weekStats.upcoming}
                </span>
              </li>
            </ul>
          </CardBox>

          <CardBox color="green" title="إحصائيات اليوم">
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                📋 عدد الحجوزات اليوم:{" "}
                <span className="font-semibold">{todayStats.total}</span>
              </li>
              <li>
                ✅ الأدوار التي مرّت:{" "}
                <span className="text-green-700 font-semibold">
                  {todayStats.passed}
                </span>
              </li>
              <li>
                ⏳ الأدوار القادمة:{" "}
                <span className="text-blue-700 font-semibold">
                  {todayStats.upcoming}
                </span>
              </li>
              {todayStats.firstTime && (
                <li>
                  🕒 أول حجز:{" "}
                  <span className="font-semibold text-gray-800">
                    {todayStats.firstTime}
                  </span>
                </li>
              )}
              {todayStats.lastTime && (
                <li>
                  🕔 آخر حجز:{" "}
                  <span className="font-semibold text-gray-800">
                    {todayStats.lastTime}
                  </span>
                </li>
              )}
            </ul>
          </CardBox>

          <CardBox color="red" title="الأوقات المحظورة">
            {Object.keys(blockedByDay).length === 0 && (
              <p className="text-sm text-gray-500">لا توجد أوقات محظورة.</p>
            )}
            {Object.entries(blockedByDay).map(([date, times]) => (
              <div key={date} className="mb-3">
                <p className="text-red-700 font-semibold mb-1">
                  📅 {formatDate(date)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {times.map((time) => (
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

          <CardBox color="yellow" title="الأيام المغلقة القادمة">
            <p className="text-sm text-gray-500 mb-2">
              عدد الأيام: {closedDates.length}
            </p>
            <ul className="space-y-1">
              {closedDates.map((date) => (
                <li key={date} className="text-red-700 text-sm">
                  🔒 {formatDate(date)}
                </li>
              ))}
              {closedDates.length === 0 && (
                <li className="text-sm text-gray-500">
                  لا توجد أيام مغلقة قادمة.
                </li>
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
    <div
      className={`bg-white p-6 rounded-2xl border ${border} shadow-md transition-all hover:shadow-lg`}
    >
      <h2 className={`text-lg font-bold mb-3 ${titleColor}`}>{title}</h2>
      {children}
    </div>
  );
}
