// src/pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaHistory,
  FaPhone,
  FaRedoAlt,
  FaTimes,
  FaUndo,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";
import barberDefaultWeeklyHours from "../constants/barberDefaultWeeklyHours";

import {
  AUTO_ARCHIVE_AFTER_MS,
  COMPLETED_STATS_COLLECTION,
  archiveExpiredBooking,
  getBookingStartDate,
  isBookingCancelled,
  syncPassedBookingsForCompletedStats,
} from "../services/completedStats";

const WEEKDAY_KEYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTH_NAMES = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function ymd(date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  date.setHours(0, 0, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options = {}) {
  const date = parseYmd(value);

  if (!date) return value || "";

  return date.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  });
}

function formatMonthTitle(date) {
  return date.toLocaleDateString("ar-EG", {
    month: "long",
    year: "numeric",
  });
}

function relativeDateLabel(value, todayValue) {
  if (value === todayValue) {
    return "اليوم";
  }

  const date = parseYmd(value);
  const today = parseYmd(todayValue);

  if (!date || !today) {
    return formatDate(value);
  }

  const tomorrow = new Date(today);

  tomorrow.setDate(tomorrow.getDate() + 1);

  if (ymd(tomorrow) === value) {
    return "بكرا";
  }

  return formatDate(value, {
    year: undefined,
  });
}

function getCustomerName(booking) {
  return (
    booking?.fullName ||
    booking?.customerName ||
    booking?.userName ||
    booking?.name ||
    "زبون"
  );
}

function remainingTime(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "الآن";
  }

  const totalMinutes = Math.ceil(milliseconds / 60000);

  const days = Math.floor(totalMinutes / 1440);

  const hours = Math.floor((totalMinutes % 1440) / 60);

  const minutes = totalMinutes % 60;

  if (days > 0) {
    const dayText = days === 1 ? "يوم" : days === 2 ? "يومين" : `${days} أيام`;

    if (hours === 0) {
      return `بعد ${dayText}`;
    }

    const hourText =
      hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : `${hours} ساعات`;

    return `بعد ${dayText} و${hourText}`;
  }

  if (hours > 0) {
    const hourText =
      hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : `${hours} ساعات`;

    if (minutes === 0) {
      return `بعد ${hourText}`;
    }

    return `بعد ${hourText} و${minutes} دقيقة`;
  }

  return `بعد ${minutes} دقيقة`;
}

function getOriginalHours(weeklyHours, dateValue) {
  const date = parseYmd(dateValue);

  if (!date) {
    return "غير معروف";
  }

  const weekdayKey = WEEKDAY_KEYS[date.getDay()];

  const hours = weeklyHours?.[weekdayKey] ?? null;

  if (!hours?.from || !hours?.to) {
    return "مغلق بالجدول الأسبوعي";
  }

  return `${hours.from} – ${hours.to}`;
}

function timeDate(dateValue, time) {
  const parsed = new Date(`${dateValue}T${time}:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeBlockedDays(snapshot) {
  const result = {};

  snapshot.docs.forEach((snapshotDocument) => {
    result[snapshotDocument.id] = snapshotDocument.data() || {};
  });

  return result;
}

function normalizeBlockedTimes(snapshot) {
  const result = {};

  snapshot.docs.forEach((snapshotDocument) => {
    const data = snapshotDocument.data() || {};

    result[snapshotDocument.id] = Array.isArray(data.times)
      ? [...new Set(data.times)].sort()
      : [];
  });

  return result;
}

function buildClosures({ blockedDays, blockedTimes, currentTime }) {
  const todayValue = ymd(currentTime);

  const currentMonthStart = `${monthKey(currentTime)}-01`;

  const dates = new Set([
    ...Object.keys(blockedDays),
    ...Object.keys(blockedTimes),
  ]);

  const upcoming = [];
  const past = [];

  [...dates]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()
    .forEach((date) => {
      /*
       * لا نعرض ولا نحتفظ بصريًا
       * بإغلاقات أقدم من الشهر الحالي.
       */
      if (date < currentMonthStart) {
        return;
      }

      const fullDay = Boolean(blockedDays[date]);

      const allTimes = blockedTimes[date] || [];

      const futureTimes = [];
      const pastTimes = [];

      allTimes.forEach((time) => {
        const parsed = timeDate(date, time);

        if (!parsed) return;

        if (parsed.getTime() >= currentTime.getTime()) {
          futureTimes.push(time);
        } else {
          pastTimes.push(time);
        }
      });

      /*
       * تاريخ مستقبلي:
       * كل الإغلاق يعتبر قادمًا.
       */
      if (date > todayValue) {
        upcoming.push({
          date,
          fullDay,
          times: allTimes,
        });

        return;
      }

      /*
       * تاريخ سابق من الشهر الحالي:
       * يظهر داخل الإغلاقات السابقة.
       */
      if (date < todayValue) {
        past.push({
          date,
          fullDay,
          times: allTimes,
        });

        return;
      }

      /*
       * اليوم:
       *
       * - اليوم الكامل يعتبر إغلاقًا حاليًا.
       * - الساعات القادمة تظهر بالحالي.
       * - الساعات التي مرّت تظهر بالسابق.
       */
      if (fullDay || futureTimes.length > 0) {
        upcoming.push({
          date,
          fullDay,
          times: futureTimes,
        });
      }

      if (pastTimes.length > 0) {
        past.push({
          date,
          fullDay: false,
          times: pastTimes,
        });
      }
    });

  return {
    upcoming,
    past,
  };
}

function MonthComparison({ currentMonth, previousMonth, current, previous }) {
  const difference = current - previous;

  let differenceText = "نفس العدد";

  let differenceClass = "bg-slate-100 text-slate-700";

  if (difference > 0) {
    differenceText = `أكثر بـ ${difference}`;

    differenceClass = "bg-emerald-100 text-emerald-800";
  } else if (difference < 0) {
    differenceText = `أقل بـ ${Math.abs(difference)}`;

    differenceClass = "bg-red-100 text-red-800";
  }

  return (
    <section
      className="
        rounded-3xl
        border border-slate-200
        bg-white
        p-5 shadow-sm
        sm:p-6
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-amber-600">مقارنة الأشهر</p>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            الشهر الحالي والشهر الماضي
          </h2>

          <p
            className="
              mt-1
              text-xs font-bold
              leading-5 text-slate-400
            "
          >
            العدد يشمل فقط الأدوار التي بدأ وقتها ولم تُلغَ.
          </p>
        </div>

        <span
          className={`
            shrink-0
            rounded-full
            px-3 py-1.5
            text-xs font-black
            ${differenceClass}
          `}
        >
          {differenceText}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div
          className="
            rounded-2xl
            border border-amber-200
            bg-amber-50
            p-4
          "
        >
          <p className="text-xs font-black text-amber-700">{currentMonth}</p>

          <p className="mt-2 text-4xl font-black text-slate-950">{current}</p>

          <p className="mt-1 text-[11px] font-black text-amber-700">
            لحد اليوم
          </p>
        </div>

        <div
          className="
            rounded-2xl
            border border-slate-200
            bg-slate-50
            p-4
          "
        >
          <p className="text-xs font-black text-slate-500">{previousMonth}</p>

          <p className="mt-2 text-4xl font-black text-slate-800">{previous}</p>

          <p className="mt-1 text-[11px] font-bold text-slate-400">
            الشهر كامل
          </p>
        </div>
      </div>
    </section>
  );
}

function NextBookingCard({ booking, currentTime }) {
  const bookingTime = booking ? getBookingStartDate(booking) : null;

  return (
    <section
      className="
        overflow-hidden
        rounded-3xl
        bg-slate-950
        text-white
        shadow-xl
      "
    >
      <div className="relative p-5 sm:p-7">
        <div
          className="
            pointer-events-none
            absolute
            -left-16 -top-20
            h-52 w-52
            rounded-full
            bg-amber-400/10
            blur-3xl
          "
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-amber-400">الدور الجاي</p>

              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                {booking ? getCustomerName(booking) : "ما في أدوار جاية"}
              </h2>
            </div>

            {booking ? (
              <a
                href={`tel:${booking.phoneNumber || ""}`}
                className="
                  inline-flex
                  h-12 w-12
                  shrink-0
                  items-center justify-center
                  rounded-2xl
                  bg-emerald-500
                  text-lg text-white
                  shadow-lg
                  active:scale-95
                "
                aria-label={`اتصال بـ ${getCustomerName(booking)}`}
                title="اتصال"
              >
                <FaPhone />
              </a>
            ) : null}
          </div>

          {booking ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-[11px] font-bold text-slate-300">الموعد</p>

                  <p className="mt-1 text-xl font-black">
                    {booking.selectedTime}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-[11px] font-bold text-slate-300">
                    التاريخ
                  </p>

                  <p className="mt-1 truncate text-sm font-black">
                    {relativeDateLabel(booking.selectedDate, ymd(currentTime))}
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-3
                  flex items-center gap-3
                  rounded-2xl
                  border border-amber-400/20
                  bg-amber-400/10
                  px-4 py-3
                "
              >
                <FaClock className="shrink-0 text-amber-400" />

                <p className="text-sm font-black text-amber-100">
                  {remainingTime(
                    (bookingTime?.getTime() || 0) - currentTime.getTime(),
                  )}
                </p>
              </div>
            </>
          ) : (
            <p
              className="
                mt-5
                rounded-2xl
                bg-white/10
                px-4 py-4
                text-sm font-bold
                text-slate-300
              "
            >
              أول حجز جديد رح يظهر هون مباشرة.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ClosureCard({
  closure,
  todayValue,
  weeklyHours,
  actionLoading,
  onRestoreDay,
  onRestoreTime,
  onRestoreAllTimes,
  readOnly = false,
}) {
  const dayLoading = actionLoading === `day-${closure.date}`;

  const allTimesLoading = actionLoading === `all-times-${closure.date}`;

  return (
    <article
      className="
        rounded-2xl
        border border-slate-200
        bg-white
        p-4 shadow-sm
        sm:p-5
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="
              flex h-11 w-11
              shrink-0
              items-center justify-center
              rounded-2xl
              bg-red-50
              text-lg font-black
              text-red-700
            "
          >
            {parseYmd(closure.date)?.getDate() || "–"}
          </div>

          <div className="min-w-0">
            <p className="font-black text-slate-950">
              {relativeDateLabel(closure.date, todayValue)}
            </p>

            <p className="mt-0.5 text-xs font-bold text-slate-400">
              {formatDate(closure.date)}
            </p>
          </div>
        </div>

        {readOnly ? (
          <span
            className="
              shrink-0
              rounded-full
              bg-slate-100
              px-3 py-1
              text-[10px] font-black
              text-slate-500
            "
          >
            انتهى
          </span>
        ) : null}
      </div>

      {closure.fullDay ? (
        <div
          className="
            mt-4
            rounded-2xl
            border border-red-200
            bg-red-50
            p-4
          "
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-red-800">اليوم مسكّر بالكامل</p>

              <p className="mt-1 text-xs font-bold text-red-600">
                ساعات الدوام الأصلية:{" "}
                {getOriginalHours(weeklyHours, closure.date)}
              </p>
            </div>

            {!readOnly ? (
              <button
                type="button"
                disabled={dayLoading}
                onClick={() => onRestoreDay(closure.date)}
                className="
                  shrink-0
                  rounded-xl
                  bg-red-600
                  px-3 py-2
                  text-xs font-black
                  text-white
                  active:scale-95
                  disabled:opacity-60
                "
              >
                {dayLoading ? "جاري..." : "استعادة اليوم"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!closure.fullDay && closure.times.length > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black text-slate-500">
              الساعات المسكّرة
            </p>

            {!readOnly && closure.times.length > 1 ? (
              <button
                type="button"
                disabled={allTimesLoading}
                onClick={() => onRestoreAllTimes(closure.date, closure.times)}
                className="
                  rounded-xl
                  border border-emerald-200
                  bg-emerald-50
                  px-3 py-1.5
                  text-[11px] font-black
                  text-emerald-800
                  active:scale-95
                  disabled:opacity-60
                "
              >
                {allTimesLoading ? "جاري..." : "استعادة كل الساعات"}
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {closure.times.map((time) => {
              const loading = actionLoading === `time-${closure.date}-${time}`;

              return (
                <div
                  key={`${closure.date}-${time}`}
                  className="
                      inline-flex
                      items-center
                      overflow-hidden
                      rounded-xl
                      border border-red-200
                      bg-red-50
                    "
                >
                  <span className="px-3 py-2 text-xs font-black text-red-800">
                    {time}
                  </span>

                  {!readOnly ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onRestoreTime(closure.date, time)}
                      className="
                          border-r
                          border-red-200
                          bg-white
                          px-2.5 py-2
                          text-[10px] font-black
                          text-emerald-700
                          active:scale-95
                          disabled:opacity-60
                        "
                    >
                      {loading ? "..." : "استعادة"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ClosuresSection({
  closures,
  pastClosures,
  todayValue,
  weeklyHours,
  actionLoading,
  onRestoreDay,
  onRestoreTime,
  onRestoreAllTimes,
}) {
  const [showAll, setShowAll] = useState(false);

  const [showPast, setShowPast] = useState(false);

  const visibleClosures = showAll ? closures : closures.slice(0, 10);

  return (
    <section
      className="
        rounded-3xl
        border border-slate-200
        bg-slate-100/70
        p-4
        sm:p-5
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-red-600">إدارة سريعة</p>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            الأيام والساعات المسكّرة
          </h2>

          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            الأقرب أولًا، والاستعادة من نفس المكان بدون الرجوع لإدارة الساعات.
          </p>
        </div>

        <span
          className="
            shrink-0
            rounded-full
            bg-white
            px-3 py-1.5
            text-xs font-black
            text-red-700
            shadow-sm
          "
        >
          {closures.length}
        </span>
      </div>

      {closures.length === 0 ? (
        <div
          className="
            mt-4
            rounded-2xl
            border border-emerald-200
            bg-white
            p-5 text-center
          "
        >
          <p className="font-black text-emerald-800">ما في إغلاقات حاليًا</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleClosures.map((closure) => (
            <ClosureCard
              key={`${closure.date}-upcoming`}
              closure={closure}
              todayValue={todayValue}
              weeklyHours={weeklyHours}
              actionLoading={actionLoading}
              onRestoreDay={onRestoreDay}
              onRestoreTime={onRestoreTime}
              onRestoreAllTimes={onRestoreAllTimes}
            />
          ))}

          {closures.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="
                inline-flex w-full
                items-center justify-center
                gap-2
                rounded-2xl
                border border-slate-200
                bg-white
                px-4 py-3
                text-sm font-black
                text-slate-700
                active:scale-[0.99]
              "
            >
              {showAll ? <FaChevronUp /> : <FaChevronDown />}

              {showAll ? "عرض أقل" : `عرض الكل (${closures.length})`}
            </button>
          ) : null}
        </div>
      )}

      {pastClosures.length > 0 ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setShowPast((current) => !current)}
            className="
              inline-flex w-full
              items-center justify-between
              gap-3
              rounded-2xl
              bg-white
              px-4 py-3
              text-sm font-black
              text-slate-700
              shadow-sm
            "
          >
            <span className="inline-flex items-center gap-2">
              <FaHistory className="text-slate-400" />
              إغلاقات سابقة من هذا الشهر
            </span>

            <span className="inline-flex items-center gap-2 text-xs text-slate-400">
              {pastClosures.length}

              {showPast ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </button>

          {showPast ? (
            <div className="mt-3 space-y-3">
              {pastClosures.map((closure) => (
                <ClosureCard
                  key={`${closure.date}-past-${closure.times.join("-")}`}
                  closure={closure}
                  todayValue={todayValue}
                  weeklyHours={weeklyHours}
                  actionLoading=""
                  readOnly
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function MonthlyHistory({
  monthlyStats,
  selectedYear,
  setSelectedYear,
  years,
}) {
  const [open, setOpen] = useState(false);

  const now = new Date();

  const currentMonthKey = monthKey(now);

  return (
    <section
      className="
        overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white
        shadow-sm
      "
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="
          flex w-full
          items-center justify-between
          gap-4
          px-5 py-4
          text-right
          sm:px-6
        "
      >
        <span>
          <span className="block text-xs font-black text-violet-600">
            المدى الطويل
          </span>

          <span className="mt-1 block text-lg font-black text-slate-950">
            سجل الأشهر
          </span>

          <span className="mt-1 block text-xs font-bold text-slate-400">
            افتحه فقط لما تحتاج تقارن بين أشهر وسنوات قديمة.
          </span>
        </span>

        <span
          className="
            flex h-10 w-10
            shrink-0
            items-center justify-center
            rounded-2xl
            bg-slate-100
            text-slate-600
          "
        >
          {open ? <FaChevronUp /> : <FaChevronDown />}
        </span>
      </button>

      {open ? (
        <div
          className="
            border-t border-slate-100
            px-5 pb-5 pt-4
            sm:px-6 sm:pb-6
          "
        >
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="stats-year"
              className="text-sm font-black text-slate-700"
            >
              السنة
            </label>

            <select
              id="stats-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="
                rounded-xl
                border border-slate-200
                bg-slate-50
                px-3 py-2
                text-sm font-black
                text-slate-800
                outline-none
                focus:border-amber-400
              "
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div
            className="
              mt-4
              grid grid-cols-2
              gap-3
              sm:grid-cols-3
              lg:grid-cols-4
            "
          >
            {MONTH_NAMES.map((name, index) => {
              const key = `${selectedYear}-${pad(index + 1)}`;

              const total = monthlyStats[key] || 0;

              const isCurrent = key === currentMonthKey;

              return (
                <article
                  key={key}
                  className={`
                      rounded-2xl
                      border
                      p-4
                      ${
                        isCurrent
                          ? "border-amber-300 bg-amber-50"
                          : total === 0
                            ? "border-slate-100 bg-slate-50/70"
                            : "border-slate-200 bg-white"
                      }
                    `}
                >
                  <p
                    className={`
                        text-xs font-black
                        ${
                          total === 0 && !isCurrent
                            ? "text-slate-400"
                            : "text-slate-700"
                        }
                      `}
                  >
                    {name}
                  </p>

                  <p
                    className={`
                        mt-2
                        text-3xl font-black
                        ${
                          total === 0 && !isCurrent
                            ? "text-slate-300"
                            : "text-slate-950"
                        }
                      `}
                  >
                    {total}
                  </p>

                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    {isCurrent ? "لحد اليوم" : "دور"}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const undoTimerRef = useRef(null);

  const cleanupStartedRef = useRef(false);

  const [bookings, setBookings] = useState([]);

  const [monthlyStats, setMonthlyStats] = useState({});

  const [blockedDays, setBlockedDays] = useState({});

  const [blockedTimes, setBlockedTimes] = useState({});

  const [weeklyHours, setWeeklyHours] = useState(barberDefaultWeeklyHours);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [statsLoading, setStatsLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState("");

  const [toast, setToast] = useState(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  /*
   * تحديث الوقت كل دقيقة.
   *
   * هذا يحدّث:
   * - الوقت المتبقي للدور الجاي.
   * - انتقال الساعات من الحالية للسابقة.
   * - احتساب الأدوار التي بدأ وقتها.
   */
  useEffect(() => {
    const timer = window.setInterval(
      () => setCurrentTime(new Date()),
      60 * 1000,
    );

    return () => window.clearInterval(timer);
  }, []);

  /*
   * الاستماع للحجوزات مباشرة.
   */
  useEffect(() => {
    return onSnapshot(
      collection(db, "bookings"),

      (snapshot) => {
        setBookings(
          snapshot.docs.map((snapshotDocument) => ({
            id: snapshotDocument.id,

            ...snapshotDocument.data(),
          })),
        );

        setBookingsLoading(false);
      },

      (error) => {
        console.error("Failed to read bookings:", error);

        setBookingsLoading(false);
      },
    );
  }, []);

  /*
   * قراءة أعداد الأدوار الشهرية.
   */
  useEffect(() => {
    return onSnapshot(
      collection(db, COMPLETED_STATS_COLLECTION),

      (snapshot) => {
        const result = {};

        snapshot.docs.forEach((snapshotDocument) => {
          result[snapshotDocument.id] = Math.max(
            0,

            Number(snapshotDocument.data()?.completedTotal) || 0,
          );
        });

        setMonthlyStats(result);

        setStatsLoading(false);
      },

      (error) => {
        console.error("Failed to read completed monthly stats:", error);

        setStatsLoading(false);
      },
    );
  }, []);

  /*
   * قراءة الأيام المسكّرة.
   */
  useEffect(() => {
    return onSnapshot(
      collection(db, "blockedDays"),

      (snapshot) => setBlockedDays(normalizeBlockedDays(snapshot)),

      (error) => console.error("Failed to read blocked days:", error),
    );
  }, []);

  /*
   * قراءة الساعات المسكّرة.
   */
  useEffect(() => {
    return onSnapshot(
      collection(db, "blockedTimes"),

      (snapshot) => setBlockedTimes(normalizeBlockedTimes(snapshot)),

      (error) => console.error("Failed to read blocked times:", error),
    );
  }, []);

  /*
   * قراءة ساعات الدوام الأسبوعية،
   * حتى نعرضها عند اليوم المسكّر بالكامل.
   */
  useEffect(() => {
    return onSnapshot(
      doc(db, "barberSettings", "hours"),

      (snapshot) => {
        const savedWeekly = snapshot.data()?.weekly;

        setWeeklyHours(savedWeekly || barberDefaultWeeklyHours);
      },

      (error) => {
        console.error("Failed to read weekly hours:", error);

        setWeeklyHours(barberDefaultWeeklyHours);
      },
    );
  }, []);

  /*
   * فحص الأدوار:
   *
   * - أول ما يبدأ وقت الدور ينحسب.
   * - إذا مرّ ساعتان تنحذف تفاصيله.
   * - يبقى العدد الشهري فقط.
   */
  useEffect(() => {
    if (bookingsLoading || bookings.length === 0) {
      return;
    }

    const nowMs = currentTime.getTime();

    const expired = bookings.filter((booking) => {
      const start = getBookingStartDate(booking);

      return start && nowMs - start.getTime() > AUTO_ARCHIVE_AFTER_MS;
    });

    syncPassedBookingsForCompletedStats(bookings, nowMs).catch((error) => {
      console.error("Failed to sync completed stats:", error);
    });

    if (expired.length > 0) {
      Promise.allSettled(
        expired.map((booking) => archiveExpiredBooking(booking.id, nowMs)),
      ).catch((error) => {
        console.error("Failed to archive expired bookings:", error);
      });
    }
  }, [bookings, bookingsLoading, currentTime]);

  /*
   * حذف سجلات الإغلاقات الأقدم
   * من بداية الشهر الحالي.
   *
   * إغلاقات الشهر الحالي السابقة
   * تبقى ظاهرة داخل القسم السابق.
   */
  useEffect(() => {
    if (cleanupStartedRef.current) {
      return;
    }

    const keys = new Set([
      ...Object.keys(blockedDays),

      ...Object.keys(blockedTimes),
    ]);

    if (keys.size === 0) {
      return;
    }

    cleanupStartedRef.current = true;

    const currentMonthStart = `${monthKey(new Date())}-01`;

    const oldDates = [...keys].filter(
      (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date < currentMonthStart,
    );

    if (oldDates.length === 0) {
      return;
    }

    const batch = writeBatch(db);

    oldDates.forEach((date) => {
      batch.delete(doc(db, "blockedDays", date));

      batch.delete(doc(db, "blockedTimes", date));
    });

    batch.commit().catch((error) => {
      console.error("Failed to clean old closures:", error);
    });
  }, [blockedDays, blockedTimes]);

  /*
   * تنظيف مؤقت التراجع
   * عند الخروج من الصفحة.
   */
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  /*
   * أقرب دور قادم،
   * حتى لو كان غدًا أو بعد عدة أيام.
   */
  const nextBooking = useMemo(() => {
    return bookings
      .filter((booking) => !isBookingCancelled(booking))
      .map((booking) => ({
        booking,

        start: getBookingStartDate(booking),
      }))
      .filter(
        (item) => item.start && item.start.getTime() > currentTime.getTime(),
      )
      .sort((first, second) => first.start - second.start)[0]?.booking;
  }, [bookings, currentTime]);

  /*
   * تجهيز الإغلاقات الحالية والسابقة.
   */
  const closures = useMemo(
    () =>
      buildClosures({
        blockedDays,
        blockedTimes,
        currentTime,
      }),

    [blockedDays, blockedTimes, currentTime],
  );

  const currentMonthDate = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth(),
    1,
  );

  const previousMonthDate = new Date(
    currentTime.getFullYear(),
    currentTime.getMonth() - 1,
    1,
  );

  const currentMonthKey = monthKey(currentMonthDate);

  const previousMonthKey = monthKey(previousMonthDate);

  const currentMonthTotal = monthlyStats[currentMonthKey] || 0;

  const previousMonthTotal = monthlyStats[previousMonthKey] || 0;

  /*
   * السنوات المتوفرة في الإحصائيات.
   */
  const availableYears = useMemo(() => {
    const years = Object.keys(monthlyStats)
      .filter((key) => /^\d{4}-\d{2}$/.test(key))
      .map((key) => Number(key.slice(0, 4)))
      .filter(Number.isFinite);

    years.push(currentTime.getFullYear());

    return [...new Set(years)].sort((first, second) => second - first);
  }, [monthlyStats, currentTime]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || currentTime.getFullYear());
    }
  }, [availableYears, currentTime, selectedYear]);

  function showUndoToast(message, undo) {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }

    setToast({
      message,
      undo,
    });

    undoTimerRef.current = window.setTimeout(() => {
      setToast(null);

      undoTimerRef.current = null;
    }, 8000);
  }

  async function handleUndo() {
    if (!toast?.undo) return;

    try {
      setActionLoading("undo");

      await toast.undo();

      setToast({
        message: "تم التراجع بنجاح",

        undo: null,
      });

      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
      }

      undoTimerRef.current = window.setTimeout(() => setToast(null), 2500);
    } catch (error) {
      console.error("Undo closure restore failed:", error);

      setToast({
        message: "تعذر التراجع، حاول مرة أخرى",

        undo: null,
      });
    } finally {
      setActionLoading("");
    }
  }

  /*
   * استعادة يوم كامل.
   */
  async function restoreDay(date) {
    const accepted = window.confirm(
      `متأكد بدك تفتح يوم ${formatDate(
        date,
      )} بالكامل؟\nسيتم أيضًا فتح الساعات المسكّرة داخل نفس اليوم.`,
    );

    if (!accepted) return;

    const oldDayData = blockedDays[date] || {};

    const oldTimes = blockedTimes[date] || [];

    try {
      setActionLoading(`day-${date}`);

      const batch = writeBatch(db);

      batch.delete(doc(db, "blockedDays", date));

      batch.delete(doc(db, "blockedTimes", date));

      await batch.commit();

      showUndoToast(
        "تمت استعادة اليوم بالكامل",

        async () => {
          const undoBatch = writeBatch(db);

          undoBatch.set(
            doc(db, "blockedDays", date),

            oldDayData,
          );

          if (oldTimes.length > 0) {
            undoBatch.set(
              doc(db, "blockedTimes", date),

              {
                times: oldTimes,
              },
            );
          }

          await undoBatch.commit();
        },
      );
    } catch (error) {
      console.error("Failed to restore day:", error);

      setToast({
        message: "حدث خطأ أثناء استعادة اليوم",

        undo: null,
      });
    } finally {
      setActionLoading("");
    }
  }

  /*
   * استعادة ساعة واحدة.
   */
  async function restoreTime(date, time) {
    const accepted = window.confirm(
      `متأكد بدك تفتح الساعة ${time} يوم ${formatDate(date)}؟`,
    );

    if (!accepted) return;

    const oldTimes = blockedTimes[date] || [];

    const nextTimes = oldTimes.filter((current) => current !== time);

    try {
      setActionLoading(`time-${date}-${time}`);

      if (nextTimes.length === 0) {
        await deleteDoc(doc(db, "blockedTimes", date));
      } else {
        await setDoc(
          doc(db, "blockedTimes", date),

          {
            times: nextTimes,
          },
        );
      }

      showUndoToast(
        `تمت استعادة الساعة ${time}`,

        async () => {
          await setDoc(
            doc(db, "blockedTimes", date),

            {
              times: oldTimes,
            },
          );
        },
      );
    } catch (error) {
      console.error("Failed to restore time:", error);

      setToast({
        message: "حدث خطأ أثناء استعادة الساعة",

        undo: null,
      });
    } finally {
      setActionLoading("");
    }
  }

  /*
   * استعادة كل الساعات الظاهرة
   * في كرت اليوم.
   */
  async function restoreAllTimes(date, timesToRestore) {
    const oldTimes = blockedTimes[date] || [];

    const restoreSet = new Set(timesToRestore || oldTimes);

    const nextTimes = oldTimes.filter((time) => !restoreSet.has(time));

    if (restoreSet.size === 0) {
      return;
    }

    const accepted = window.confirm(
      `متأكد بدك تفتح كل الساعات المسكّرة يوم ${formatDate(date)}؟`,
    );

    if (!accepted) return;

    try {
      setActionLoading(`all-times-${date}`);

      if (nextTimes.length === 0) {
        await deleteDoc(doc(db, "blockedTimes", date));
      } else {
        await setDoc(
          doc(db, "blockedTimes", date),

          {
            times: nextTimes,
          },
        );
      }

      showUndoToast(
        "تمت استعادة الساعات المحددة",

        async () => {
          await setDoc(
            doc(db, "blockedTimes", date),

            {
              times: oldTimes,
            },
          );
        },
      );
    } catch (error) {
      console.error("Failed to restore all times:", error);

      setToast({
        message: "حدث خطأ أثناء استعادة الساعات",

        undo: null,
      });
    } finally {
      setActionLoading("");
    }
  }

  if (bookingsLoading || statsLoading) {
    return (
      <main
        dir="rtl"
        className="
          min-h-screen
          bg-slate-50
          px-4 pb-24 pt-28
        "
      >
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-8 w-36 rounded-xl bg-slate-200" />

          <div className="h-64 rounded-3xl bg-slate-900" />

          <div className="h-72 rounded-3xl bg-slate-200" />

          <div className="h-52 rounded-3xl bg-white" />
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="
        min-h-screen
        bg-slate-50
        px-3 pb-28 pt-24
        sm:px-5 sm:pt-28
      "
    >
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-amber-600">لوحة الحلاق</p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              الإحصائيات
            </h1>

            <p className="mt-1 text-sm font-bold text-slate-500">
              أهم شيء للشغل، بدون أرقام مكررة أو تشتيت.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              shrink-0
              rounded-2xl
              border border-slate-200
              bg-white
              px-4 py-2.5
              text-sm font-black
              text-slate-700
              shadow-sm
              active:scale-95
            "
          >
            رجوع
          </button>
        </header>

        <div className="space-y-5">
          <NextBookingCard booking={nextBooking} currentTime={currentTime} />

          <ClosuresSection
            closures={closures.upcoming}
            pastClosures={closures.past}
            todayValue={ymd(currentTime)}
            weeklyHours={weeklyHours}
            actionLoading={actionLoading}
            onRestoreDay={restoreDay}
            onRestoreTime={restoreTime}
            onRestoreAllTimes={restoreAllTimes}
          />

          <MonthComparison
            currentMonth={formatMonthTitle(currentMonthDate)}
            previousMonth={formatMonthTitle(previousMonthDate)}
            current={currentMonthTotal}
            previous={previousMonthTotal}
          />

          <MonthlyHistory
            monthlyStats={monthlyStats}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            years={availableYears}
          />
        </div>
      </div>

      {toast ? (
        <div
          className="
            fixed bottom-5
            left-1/2
            z-[90]
            flex
            w-[calc(100%-24px)]
            max-w-md
            -translate-x-1/2
            items-center
            justify-between
            gap-3
            rounded-2xl
            bg-slate-950
            px-4 py-3
            text-white
            shadow-2xl
          "
        >
          <p className="text-sm font-black">{toast.message}</p>

          <div className="flex shrink-0 items-center gap-2">
            {toast.undo ? (
              <button
                type="button"
                disabled={actionLoading === "undo"}
                onClick={handleUndo}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-amber-400
                  px-3 py-2
                  text-xs font-black
                  text-slate-950
                  disabled:opacity-60
                "
              >
                {actionLoading === "undo" ? <FaRedoAlt /> : <FaUndo />}
                تراجع
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setToast(null)}
              className="
                flex h-8 w-8
                items-center
                justify-center
                rounded-xl
                bg-white/10
                text-xs
              "
              aria-label="إغلاق الرسالة"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
