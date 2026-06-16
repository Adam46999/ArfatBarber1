import { useEffect, useMemo, useState } from "react";
import {
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

const AR_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function ymd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function parseYmd(value) {
  if (!value || typeof value !== "string") return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  return date;
}

function bookingDateTime(booking) {
  const date = parseYmd(booking?.selectedDate);

  if (!date) return null;

  const [hours, minutes] = String(booking?.selectedTime || "00:00")
    .split(":")
    .map(Number);

  date.setHours(hours || 0, minutes || 0, 0, 0);

  return date;
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfWeek(date) {
  const result = startOfDay(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function endOfWeek(date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 0, 0, 0, 0);
}

function previousMonthSameMoment(now) {
  const previousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  const lastDay = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth() + 1,
    0,
  ).getDate();

  previousMonth.setDate(Math.min(now.getDate(), lastDay));

  return previousMonth;
}

function inRange(date, from, to) {
  return Boolean(date && date >= from && date <= to);
}

function isCancelled(booking) {
  return Boolean(
    booking?.cancelledAt ||
    booking?.canceledAt ||
    booking?.cancelled === true ||
    booking?.isCancelled === true ||
    booking?.status === "cancelled" ||
    booking?.status === "canceled",
  );
}

function getCustomerName(booking) {
  return (
    booking?.customerName ||
    booking?.userName ||
    booking?.name ||
    booking?.fullName ||
    "زبون"
  );
}

function formatDate(value, options = {}) {
  const date = parseYmd(value);

  if (!date) return value || "";

  return date.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...options,
  });
}

function formatShortDate(value) {
  const date = parseYmd(value);

  if (!date) return value || "";

  return date.toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonth(date) {
  return date.toLocaleDateString("ar-EG", {
    month: "long",
    year: "numeric",
  });
}

function relativeDateLabel(value, todayValue) {
  const date = parseYmd(value);
  const today = parseYmd(todayValue);

  if (!date || !today) return formatDate(value);

  if (ymd(date) === ymd(today)) return "اليوم";

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (ymd(date) === ymd(tomorrow)) return "غدًا";

  return formatDate(value);
}

function remainingTime(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "الآن";
  }

  const totalMinutes = Math.ceil(milliseconds / 60000);

  if (totalMinutes < 60) {
    return `بعد ${totalMinutes} دقيقة`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `بعد ${hours} ساعة`;
  }

  return `بعد ${hours} ساعة و${minutes} دقيقة`;
}

function comparison(current, previous) {
  const difference = current - previous;

  if (previous === 0) {
    return {
      difference,
      percentage: current === 0 ? 0 : 100,
    };
  }

  return {
    difference,
    percentage: Math.round((difference / previous) * 100),
  };
}

function sortBookings(items) {
  return [...items].sort((first, second) => {
    const firstDate = bookingDateTime(first);
    const secondDate = bookingDateTime(second);

    return (firstDate?.getTime() || 0) - (secondDate?.getTime() || 0);
  });
}

function buildPeriodStats(bookings, from, to, now) {
  const periodBookings = bookings.filter((booking) => {
    return inRange(bookingDateTime(booking), from, to);
  });

  const passed = periodBookings.filter((booking) => {
    const date = bookingDateTime(booking);
    return date && date <= now;
  });

  const upcoming = periodBookings.filter((booking) => {
    const date = bookingDateTime(booking);
    return date && date > now;
  });

  return {
    total: periodBookings.length,
    passed: passed.length,
    upcoming: upcoming.length,
    bookings: periodBookings,
  };
}

function getBusiestDays(bookings) {
  const counts = bookings.reduce((result, booking) => {
    if (!booking.selectedDate) return result;

    result[booking.selectedDate] = (result[booking.selectedDate] || 0) + 1;

    return result;
  }, {});

  const entries = Object.entries(counts);

  if (entries.length === 0) {
    return {
      count: 0,
      days: [],
    };
  }

  const highestCount = Math.max(...entries.map(([, count]) => count));

  return {
    count: highestCount,
    days: entries
      .filter(([, count]) => count === highestCount)
      .map(([date]) => ({
        date,
        label: AR_DAYS[parseYmd(date)?.getDay() || 0],
      })),
  };
}

function normalizeBlockedDays(snapshot) {
  return snapshot.docs.map((snapshotDocument) => ({
    id: snapshotDocument.id,
    ...snapshotDocument.data(),
  }));
}

function normalizeBlockedTimes(snapshot) {
  const result = {};

  snapshot.docs.forEach((snapshotDocument) => {
    const data = snapshotDocument.data() || {};

    result[snapshotDocument.id] = Array.isArray(data.times) ? data.times : [];
  });

  return result;
}

function mergeConsecutiveTimes(times) {
  const sortedTimes = [...new Set(times)].sort();

  if (sortedTimes.length === 0) return [];

  const toMinutes = (time) => {
    const [hours, minutes] = String(time).split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const groups = [];
  let currentGroup = [sortedTimes[0]];

  for (let index = 1; index < sortedTimes.length; index += 1) {
    const previous = sortedTimes[index - 1];
    const current = sortedTimes[index];

    if (toMinutes(current) - toMinutes(previous) === 30) {
      currentGroup.push(current);
    } else {
      groups.push(currentGroup);
      currentGroup = [current];
    }
  }

  groups.push(currentGroup);

  return groups.map((group) => ({
    start: group[0],
    end: group[group.length - 1],
    times: group,
    label:
      group.length === 1
        ? group[0]
        : `${group[0]} – ${group[group.length - 1]}`,
  }));
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black text-amber-600">{eyebrow}</p>

      <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

function PassedAndRemaining({ passed, remaining }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
        <p className="text-[10px] font-bold text-slate-400">مرّ</p>
        <p className="mt-0.5 text-sm font-black text-slate-800">{passed}</p>
      </div>

      <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
        <p className="text-[10px] font-bold text-slate-400">باقي</p>
        <p className="mt-0.5 text-sm font-black text-slate-800">{remaining}</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, suffix, badge, accent = "blue", children }) {
  const accents = {
    emerald: {
      border: "border-emerald-100",
      badge: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
    },
    blue: {
      border: "border-blue-100",
      badge: "bg-blue-50 text-blue-700",
      value: "text-blue-700",
    },
    amber: {
      border: "border-amber-100",
      badge: "bg-amber-50 text-amber-700",
      value: "text-amber-700",
    },
    violet: {
      border: "border-violet-100",
      badge: "bg-violet-50 text-violet-700",
      value: "text-violet-700",
    },
  };

  const currentAccent = accents[accent] || accents.blue;

  return (
    <article
      className={`min-w-0 rounded-3xl border bg-white p-4 shadow-sm sm:p-5 ${currentAccent.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-500 sm:text-sm">
            {title}
          </p>

          <div className="mt-2 flex items-end gap-1.5">
            <span
              className={`text-3xl font-black leading-none sm:text-4xl ${currentAccent.value}`}
            >
              {value}
            </span>

            <span className="pb-0.5 text-xs font-bold text-slate-400">
              {suffix}
            </span>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-xl px-2 py-1 text-[10px] font-black ${currentAccent.badge}`}
        >
          {badge}
        </span>
      </div>

      <div className="mt-4">{children}</div>
    </article>
  );
}

function SmallInfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="shrink-0 font-bold text-slate-400">{label}</span>
      <span className="text-left font-black text-slate-700">{value}</span>
    </div>
  );
}

function ComparisonText({ current, previous, result }) {
  const positive = result.difference > 0;
  const negative = result.difference < 0;

  let text = "نفس العدد";
  let color = "text-slate-600";

  if (positive) {
    text = `أعلى بـ ${result.difference} (${result.percentage}%)`;
    color = "text-emerald-700";
  }

  if (negative) {
    text = `أقل بـ ${Math.abs(result.difference)} (${Math.abs(
      result.percentage,
    )}%)`;

    color = "text-red-700";
  }

  return (
    <div>
      <p className={`text-xs font-black leading-5 ${color}`}>{text}</p>

      <p className="mt-0.5 text-[10px] font-bold text-slate-400">
        الحالي: {current} • السابق: {previous}
      </p>
    </div>
  );
}

function PerformanceCard({
  title,
  subtitle,
  total,
  passed,
  remaining,
  children,
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>

          <p className="mt-1 text-xs font-bold text-slate-400">{subtitle}</p>
        </div>

        <div className="shrink-0 rounded-2xl bg-slate-950 px-4 py-3 text-center text-white">
          <p className="text-[10px] font-bold text-slate-400">المجموع</p>

          <p className="mt-0.5 text-2xl font-black">{total}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-bold text-emerald-600">مرّ</p>

          <p className="mt-1 text-2xl font-black text-emerald-800">{passed}</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-bold text-blue-600">باقي</p>

          <p className="mt-1 text-2xl font-black text-blue-800">{remaining}</p>
        </div>
      </div>

      {children}
    </article>
  );
}

function ComparisonBox({
  title,
  currentLabel,
  previousLabel,
  current,
  previous,
  result,
}) {
  const positive = result.difference > 0;
  const negative = result.difference < 0;

  let badge = "بدون تغيير";
  let badgeClass = "bg-slate-100 text-slate-600";

  if (positive) {
    badge = `+${result.difference} • +${result.percentage}%`;
    badgeClass = "bg-emerald-100 text-emerald-700";
  }

  if (negative) {
    badge = `${result.difference} • ${result.percentage}%`;
    badgeClass = "bg-red-100 text-red-700";
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black text-slate-900">{title}</p>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400">{currentLabel}</p>

          <p className="mt-1 text-xl font-black text-slate-950">{current}</p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400">
            {previousLabel}
          </p>

          <p className="mt-1 text-xl font-black text-slate-600">{previous}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [blockedDays, setBlockedDays] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        setBookings(
          snapshot.docs.map((snapshotDocument) => ({
            id: snapshotDocument.id,
            ...snapshotDocument.data(),
          })),
        );

        setLoading(false);
      },
      (error) => {
        console.error("Failed to read bookings:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "blockedDays"),
      (snapshot) => {
        setBlockedDays(normalizeBlockedDays(snapshot));
      },
      (error) => {
        console.error("Failed to read blocked days:", error);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "blockedTimes"),
      (snapshot) => {
        setBlockedTimes(normalizeBlockedTimes(snapshot));
      },
      (error) => {
        console.error("Failed to read blocked times:", error);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [message]);

  const statistics = useMemo(() => {
    const now = currentTime;
    const todayValue = ymd(now);

    const activeBookings = sortBookings(
      bookings.filter((booking) => !isCancelled(booking)),
    );

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const previousMonthDate = addMonths(monthStart, -1);
    const previousMonthStart = startOfMonth(previousMonthDate);
    const previousMonthEnd = endOfMonth(previousMonthDate);

    const previousSameMoment = previousMonthSameMoment(now);

    const today = buildPeriodStats(activeBookings, todayStart, todayEnd, now);

    const week = buildPeriodStats(activeBookings, weekStart, weekEnd, now);

    const month = buildPeriodStats(activeBookings, monthStart, monthEnd, now);

    const previousMonth = buildPeriodStats(
      activeBookings,
      previousMonthStart,
      previousMonthEnd,
      previousSameMoment,
    );

    const monthUntilNow = activeBookings.filter((booking) => {
      const date = bookingDateTime(booking);

      return date && date >= monthStart && date <= now;
    });

    const previousMonthUntilSameMoment = activeBookings.filter((booking) => {
      const date = bookingDateTime(booking);

      return date && date >= previousMonthStart && date <= previousSameMoment;
    });

    const futureBookings = activeBookings.filter((booking) => {
      const date = bookingDateTime(booking);
      return date && date > now;
    });

    const todayUpcoming = today.bookings.filter((booking) => {
      const date = bookingDateTime(booking);
      return date && date > now;
    });

    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
    nextWeekEnd.setHours(23, 59, 59, 999);

    const nextWeekCount = activeBookings.filter((booking) => {
      return inRange(bookingDateTime(booking), nextWeekStart, nextWeekEnd);
    }).length;

    return {
      now,
      todayValue,
      today: {
        ...today,
        nextBooking: todayUpcoming[0] || null,
      },
      week: {
        ...week,
        from: ymd(weekStart),
        to: ymd(weekEnd),
        busiest: getBusiestDays(week.bookings),
      },
      month: {
        ...month,
        title: formatMonth(now),
      },
      previousMonth: {
        ...previousMonth,
        title: formatMonth(previousMonthDate),
      },
      monthComparison: {
        full: comparison(month.total, previousMonth.total),
        toDate: comparison(
          monthUntilNow.length,
          previousMonthUntilSameMoment.length,
        ),
        currentToDate: monthUntilNow.length,
        previousToDate: previousMonthUntilSameMoment.length,
      },
      future: {
        total: futureBookings.length,
        closest: futureBookings[0] || null,
        last:
          futureBookings.length > 0
            ? futureBookings[futureBookings.length - 1]
            : null,
        nextWeekCount,
      },
    };
  }, [bookings, currentTime]);

  const futureClosures = useMemo(() => {
    const todayValue = ymd(currentTime);

    const closedDayIds = new Set(
      blockedDays
        .map((blockedDay) => blockedDay.id)
        .filter((date) => date >= todayValue),
    );

    const dates = new Set([
      ...closedDayIds,
      ...Object.keys(blockedTimes).filter((date) => date >= todayValue),
    ]);

    return [...dates]
      .sort()
      .map((date) => {
        const fullDay = closedDayIds.has(date);

        const times = (blockedTimes[date] || [])
          .filter((time) => {
            if (date > todayValue) return true;

            const timeDate = bookingDateTime({
              selectedDate: date,
              selectedTime: time,
            });

            return timeDate && timeDate > currentTime;
          })
          .sort();

        return {
          date,
          fullDay,
          times,
          groups: mergeConsecutiveTimes(times),
        };
      })
      .filter((closure) => closure.fullDay || closure.times.length > 0);
  }, [blockedDays, blockedTimes, currentTime]);

  async function restoreDay(date) {
    const accepted = window.confirm(
      `هل تريد إعادة فتح يوم ${formatDate(date)} بالكامل؟`,
    );

    if (!accepted) return;

    try {
      setActionLoading(`day-${date}`);

      await deleteDoc(doc(db, "blockedDays", date));

      setMessage("تمت إعادة فتح اليوم بنجاح");
    } catch (error) {
      console.error("Failed to restore day:", error);
      setMessage("حدث خطأ أثناء إعادة فتح اليوم");
    } finally {
      setActionLoading("");
    }
  }

  async function restoreTime(date, time) {
    const accepted = window.confirm(
      `هل تريد إعادة فتح الساعة ${time} يوم ${formatDate(date)}؟`,
    );

    if (!accepted) return;

    try {
      setActionLoading(`time-${date}-${time}`);

      const currentTimes = blockedTimes[date] || [];

      if (currentTimes.length <= 1) {
        await deleteDoc(doc(db, "blockedTimes", date));
      } else {
        await updateDoc(doc(db, "blockedTimes", date), {
          times: arrayRemove(time),
        });
      }

      setMessage("تمت إعادة فتح الساعة بنجاح");
    } catch (error) {
      console.error("Failed to restore time:", error);
      setMessage("حدث خطأ أثناء إعادة فتح الساعة");
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 px-4 pb-20 pt-28">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-9 w-40 rounded-xl bg-slate-200" />

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-52 rounded-3xl bg-white" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const nextBookingTime = statistics.today.nextBooking
    ? bookingDateTime(statistics.today.nextBooking)
    : null;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-3 pb-24 pt-28 sm:px-5 sm:pt-32"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-amber-600">لوحة الإدارة</p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              الإحصائيات
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              متابعة واضحة لليوم، الأسبوع، الشهر والحجوزات القادمة.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm active:scale-95"
          >
            رجوع
          </button>
        </header>

        <section className="mb-9">
          <SectionTitle
            eyebrow="نظرة سريعة"
            title="أهم الأرقام"
            description="الحجوزات الملغية من الحلاق أو الزبون لا تدخل بالحساب."
          />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              accent="emerald"
              badge="اليوم"
              title="أدوار اليوم"
              value={statistics.today.total}
              suffix="دور"
            >
              <PassedAndRemaining
                passed={statistics.today.passed}
                remaining={statistics.today.upcoming}
              />

              <div className="mt-4 border-t border-slate-100 pt-3">
                {statistics.today.nextBooking ? (
                  <>
                    <p className="text-[10px] font-bold text-slate-400">
                      الدور القادم
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-slate-900">
                      {getCustomerName(statistics.today.nextBooking)}
                    </p>

                    <p className="mt-1 text-xs font-black text-emerald-700">
                      {statistics.today.nextBooking.selectedTime}
                    </p>
                  </>
                ) : statistics.today.total > 0 ? (
                  <p className="text-xs font-black leading-5 text-emerald-700">
                    خلص اليوم — تم إنجاز {statistics.today.passed} أدوار
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-400">
                    لا توجد أدوار اليوم
                  </p>
                )}
              </div>
            </StatCard>

            <StatCard
              accent="blue"
              badge="الأسبوع"
              title="هذا الأسبوع"
              value={statistics.week.total}
              suffix="دور"
            >
              <PassedAndRemaining
                passed={statistics.week.passed}
                remaining={statistics.week.upcoming}
              />

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400">
                  أكثر يوم مزدحم
                </p>

                {statistics.week.busiest.days.length > 0 ? (
                  <>
                    <p className="mt-1 line-clamp-2 text-xs font-black leading-5 text-slate-800">
                      {statistics.week.busiest.days
                        .map((day) => day.label)
                        .join("، ")}
                    </p>

                    <p className="mt-1 text-xs font-black text-blue-700">
                      {statistics.week.busiest.count} أدوار
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    لا توجد حجوزات
                  </p>
                )}
              </div>
            </StatCard>

            <StatCard
              accent="amber"
              badge="الشهر"
              title="هذا الشهر"
              value={statistics.month.total}
              suffix="دور"
            >
              <PassedAndRemaining
                passed={statistics.month.passed}
                remaining={statistics.month.upcoming}
              />

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-1 text-[10px] font-bold text-slate-400">
                  مقارنة بالشهر الماضي
                </p>

                <ComparisonText
                  current={statistics.month.total}
                  previous={statistics.previousMonth.total}
                  result={statistics.monthComparison.full}
                />
              </div>
            </StatCard>

            <StatCard
              accent="violet"
              badge="قادم"
              title="الحجوزات القادمة"
              value={statistics.future.total}
              suffix="حجز"
            >
              <div className="space-y-3">
                <SmallInfoRow
                  label="الأقرب"
                  value={
                    statistics.future.closest
                      ? `${formatShortDate(
                          statistics.future.closest.selectedDate,
                        )} • ${statistics.future.closest.selectedTime}`
                      : "لا يوجد"
                  }
                />

                <SmallInfoRow
                  label="الأسبوع القادم"
                  value={`${statistics.future.nextWeekCount} حجوزات`}
                />

                <SmallInfoRow
                  label="آخر موعد"
                  value={
                    statistics.future.last
                      ? `${formatShortDate(
                          statistics.future.last.selectedDate,
                        )} • ${statistics.future.last.selectedTime}`
                      : "لا يوجد"
                  }
                />
              </div>
            </StatCard>
          </div>
        </section>

        <section className="mb-9">
          <SectionTitle
            eyebrow="العمل الآن"
            title="وضع اليوم"
            description="كم دور مرّ، كم بقي، ومن هو الزبون القادم."
          />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-5 py-6 text-white sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-amber-400">
                    {formatDate(statistics.todayValue)}
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    {statistics.today.total > 0
                      ? `${statistics.today.total} أدوار اليوم`
                      : "لا توجد أدوار اليوم"}
                  </h2>
                </div>

                <div className="rounded-2xl bg-white/10 px-3 py-2 text-center">
                  <p className="text-[10px] font-bold text-slate-300">
                    الوقت الآن
                  </p>

                  <p className="mt-0.5 text-sm font-black">
                    {statistics.now.toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs font-bold text-slate-300">مرّ</p>

                  <p className="mt-1 text-3xl font-black">
                    {statistics.today.passed}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs font-bold text-slate-300">باقي</p>

                  <p className="mt-1 text-3xl font-black">
                    {statistics.today.upcoming}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {statistics.today.nextBooking ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-400">
                        الدور القادم
                      </p>

                      <p className="mt-1 truncate text-xl font-black text-slate-950">
                        {getCustomerName(statistics.today.nextBooking)}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
                      <p className="text-xl font-black text-emerald-700">
                        {statistics.today.nextBooking.selectedTime}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-black text-emerald-800">
                      {remainingTime(
                        nextBookingTime?.getTime() - statistics.now.getTime(),
                      )}
                    </p>
                  </div>
                </>
              ) : statistics.today.total > 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
                  <p className="text-lg font-black text-emerald-800">
                    خلص اليوم — تم إنجاز {statistics.today.passed} أدوار
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="font-black text-slate-700">
                    لا توجد حجوزات فعالة اليوم
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-9">
          <SectionTitle
            eyebrow="أداء الحجوزات"
            title="الأسبوع والشهر"
            description="الحجز يعتبر مرّ أول ما يمر وقت بدايته."
          />

          <div className="space-y-4">
            <PerformanceCard
              title="هذا الأسبوع"
              subtitle={`${formatShortDate(
                statistics.week.from,
              )} – ${formatShortDate(statistics.week.to)}`}
              total={statistics.week.total}
              passed={statistics.week.passed}
              remaining={statistics.week.upcoming}
            >
              <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3">
                <p className="text-xs font-bold text-blue-500">
                  أكثر يوم مزدحم
                </p>

                {statistics.week.busiest.days.length > 0 ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-blue-950">
                      {statistics.week.busiest.days
                        .map((day) => day.label)
                        .join("، ")}
                    </p>

                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700">
                      {statistics.week.busiest.count} أدوار
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-bold text-blue-700">
                    لا توجد حجوزات هذا الأسبوع
                  </p>
                )}
              </div>
            </PerformanceCard>

            <PerformanceCard
              title={`التقرير الشهري — ${statistics.month.title}`}
              subtitle="مقارنة كاملة ومقارنة لنفس المدة"
              total={statistics.month.total}
              passed={statistics.month.passed}
              remaining={statistics.month.upcoming}
            >
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ComparisonBox
                  title="الشهر كامل"
                  currentLabel={statistics.month.title}
                  previousLabel={statistics.previousMonth.title}
                  current={statistics.month.total}
                  previous={statistics.previousMonth.total}
                  result={statistics.monthComparison.full}
                />

                <ComparisonBox
                  title="من بداية الشهر حتى الآن"
                  currentLabel="هذا الشهر حتى الآن"
                  previousLabel="نفس المدة الشهر الماضي"
                  current={statistics.monthComparison.currentToDate}
                  previous={statistics.monthComparison.previousToDate}
                  result={statistics.monthComparison.toDate}
                />
              </div>
            </PerformanceCard>
          </div>
        </section>

        <section className="mb-9">
          <SectionTitle
            eyebrow="إدارة سريعة"
            title="الأيام والساعات المسكّرة"
            description="اضغط على اليوم أو الساعة لإعادتها بعد التأكيد."
          />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-black text-slate-900">
                  كل الإغلاقات القادمة
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  مرتبة من الأقرب إلى الأبعد
                </p>
              </div>

              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                {futureClosures.length} أيام
              </span>
            </div>

            {futureClosures.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-black text-emerald-700">
                  ✓
                </div>

                <p className="mt-4 font-black text-slate-800">
                  لا توجد أيام أو ساعات مسكّرة قادمة
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {futureClosures.map((closure) => {
                  const dayLoading = actionLoading === `day-${closure.date}`;

                  return (
                    <div key={closure.date} className="px-4 py-5 sm:px-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-lg font-black text-red-700">
                          {parseYmd(closure.date)?.getDate()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-950">
                                {relativeDateLabel(
                                  closure.date,
                                  statistics.todayValue,
                                )}
                              </p>

                              <p className="mt-0.5 text-xs font-bold text-slate-400">
                                {formatShortDate(closure.date)}
                              </p>
                            </div>

                            {closure.fullDay ? (
                              <button
                                type="button"
                                disabled={dayLoading}
                                onClick={() => restoreDay(closure.date)}
                                className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white shadow-sm active:scale-95 disabled:opacity-60"
                              >
                                {dayLoading
                                  ? "جاري الفتح..."
                                  : "مغلق طوال اليوم"}
                              </button>
                            ) : null}
                          </div>

                          {closure.times.length > 0 ? (
                            <div className="mt-4">
                              <p className="mb-2 text-[11px] font-bold text-slate-400">
                                اضغط على الساعة لإعادة فتحها
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {closure.times.map((time) => {
                                  const timeLoading =
                                    actionLoading ===
                                    `time-${closure.date}-${time}`;

                                  return (
                                    <button
                                      key={`${closure.date}-${time}`}
                                      type="button"
                                      disabled={timeLoading}
                                      onClick={() =>
                                        restoreTime(closure.date, time)
                                      }
                                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 active:scale-95 disabled:opacity-50"
                                    >
                                      {timeLoading ? "..." : time}
                                    </button>
                                  );
                                })}
                              </div>

                              {closure.groups.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {closure.groups.map((group) => (
                                    <span
                                      key={`${closure.date}-${group.label}`}
                                      className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500"
                                    >
                                      فترة: {group.label}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {message ? (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white shadow-2xl">
          {message}
        </div>
      ) : null}
    </main>
  );
}
