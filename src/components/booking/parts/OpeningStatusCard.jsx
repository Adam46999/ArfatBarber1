import React from "react";
import { FaClock, FaDoorOpen, FaDoorClosed } from "react-icons/fa";

/**
 * Props:
 * - t: دالة الترجمة (اختياري)
 * - status: كائن حالة جاهز من util (اختياري: { isOpen?: boolean })
 * - workingHours: كائن أيام الأسبوع:
 *    { Sunday: null | { from:"12:00", to:"20:00" }, Monday: {...}, ... }
 */
export default function OpeningStatusCard({ t, status, workingHours }) {
  const dir = (typeof document !== "undefined" && document?.dir) || "rtl";

  // ترتيب الأيام (يبدأ الأحد مثل ما هو عندك في المشروع)
  const dayKeys = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayLabelsAR = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  const now = new Date();
  const todayIdx = now.getDay(); // 0=Sunday
  const todayKey = dayKeys[todayIdx];
  const todayHours = workingHours?.[todayKey] || null;

  // محوّل "HH:MM" -> Date اليوم بهذه الساعة
  const toTodayTime = (hhmm) => {
    const [h, m] = String(hhmm || "00:00")
      .split(":")
      .map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  // هل مفتوح الآن؟ (لو status?.isOpen موجود نستخدمه، وإلا نحسب)
  const isOpenNow =
    typeof status?.isOpen === "boolean"
      ? status.isOpen
      : (() => {
          if (!todayHours) return false;
          const from = toTodayTime(todayHours.from);
          const to = toTodayTime(todayHours.to);
          return now >= from && now <= to;
        })();

  // متى يُغلق اليوم (إن كان مفتوحًا)
  const closesAtText = (() => {
    if (!isOpenNow || !todayHours) return null;
    return todayHours.to;
  })();

  // ما هو موعد الفتح القادم (لو مغلق الآن)
  const nextOpen = (() => {
    // لو اليوم فيه ساعات لكن قبل الفتح
    if (todayHours) {
      const from = toTodayTime(todayHours.from);
      if (now < from) {
        return { dayIdx: todayIdx, from: todayHours.from };
      }
    }
    // دوّر على أول يوم فيه ساعات بدءًا من الغد
    for (let offset = 1; offset <= 7; offset++) {
      const idx = (todayIdx + offset) % 7;
      const key = dayKeys[idx];
      const hours = workingHours?.[key];
      if (hours && hours.from) {
        return { dayIdx: idx, from: hours.from };
      }
    }
    return null;
  })();

  // نص الحالة أعلى البطاقة
  const statusLine = isOpenNow
    ? {
        text: (t && t("shop_open_now")) || "المحل مفتوح الآن",
        sub: closesAtText
          ? ((t && t("open_until")) || "مفتوح حتى") + ` ${closesAtText}`
          : null,
        color: "text-emerald-600",
        icon: <FaDoorOpen className="text-emerald-600" />,
      }
    : {
        text: (t && t("shop_closed_now")) || "المحل مغلق الآن",
        sub: nextOpen
          ? ((t && t("opens_at")) || "يفتح") +
            ` ${dayLabelsAR[nextOpen.dayIdx]} ${nextOpen.from}`
          : null,
        color: "text-rose-600",
        icon: <FaDoorClosed className="text-rose-600" />,
      };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      dir={dir}
    >
      {/* الرأس */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <FaClock className="text-[#3B82F6]" />
        <h3 className="text-lg font-bold text-[#1F2937]">
          {(t && t("working_hours")) || "ساعات العمل"}
        </h3>
      </div>

      {/* سطر الحالة */}
      <div className="px-5 pb-3">
        <p
          className={`mt-1 text-sm font-semibold ${statusLine.color} flex items-center gap-2`}
        >
          {statusLine.icon}
          <span>{statusLine.text}</span>
        </p>
        {statusLine.sub && (
          <p className="text-xs text-gray-500 mt-1">{statusLine.sub}</p>
        )}
      </div>

      {/* جدول الأيام */}
      <div className="px-3 pb-4">
        <ul className="divide-y divide-gray-100 rounded-xl overflow-hidden bg-white">
          {dayKeys.map((k, i) => {
            const hours = workingHours?.[k] || null;
            const isToday = i === todayIdx;
            const closed = !hours;

            return (
              <li
                key={k}
                className={`flex items-center justify-between px-4 py-3
                  ${isToday ? "bg-slate-50" : "bg-white"}
                `}
              >
                <span
                  className={`text-sm ${
                    isToday ? "font-semibold text-[#1F2937]" : "text-gray-600"
                  }`}
                >
                  {dayLabelsAR[i]}
                </span>

                {closed ? (
                  <span className="text-sm font-semibold text-rose-600">
                    {(t && t("closed")) || "مغلق"}
                  </span>
                ) : (
                  <span
                    className={`text-sm ${
                      isToday ? "font-semibold text-gray-700" : "text-gray-700"
                    }`}
                  >
                    {hours.from} – {hours.to}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
