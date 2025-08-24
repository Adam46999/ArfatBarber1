// src/components/booking/parts/OpeningStatusCard.jsx
import React from "react";
import { FaClock, FaDoorOpen, FaDoorClosed } from "react-icons/fa";
import { useTranslation } from "react-i18next";

/**
 * Props:
 * - status?: { isOpen?: boolean, nextOpen?: Date }  (اختياري)
 * - workingHours: { Sunday:null|{from,to}, Monday:..., ... }
 */
export default function OpeningStatusCard({ status, workingHours }) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();

  // ترتيب الأيام (مفاتيح كائن ساعات العمل)
  const dayKeys = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // أسماء الأيام من الترجمة (مصفوفة)
  const dayLabels = t("weekdays", { returnObjects: true });

  const now = new Date();
  const todayIdx = now.getDay(); // 0=Sunday
  const todayKey = dayKeys[todayIdx];
  const todayHours = workingHours?.[todayKey] || null;

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

  // إغلاق اليوم (إن كان مفتوحًا)
  const closesAtText = isOpenNow && todayHours ? todayHours.to : null;

  // موعد الفتح القادم (لو مغلق الآن)
  const nextOpen = (() => {
    // لو اليوم فيه ساعات لكن قبل الفتح
    if (todayHours) {
      const from = toTodayTime(todayHours.from);
      if (now < from) return { dayIdx: todayIdx, from: todayHours.from };
    }
    // أول يوم قادم فيه ساعات
    for (let offset = 1; offset <= 7; offset++) {
      const idx = (todayIdx + offset) % 7;
      const key = dayKeys[idx];
      const hours = workingHours?.[key];
      if (hours && hours.from) return { dayIdx: idx, from: hours.from };
    }
    return null;
  })();

  const statusLine = isOpenNow
    ? {
        text: t("shop_open_now"),
        sub: closesAtText ? `${t("open_until")} ${closesAtText}` : null,
        color: "text-emerald-600",
        icon: <FaDoorOpen className="text-emerald-600" />,
      }
    : {
        text: t("shop_closed_now"),
        sub: nextOpen
          ? `${t("opens_at")} ${dayLabels?.[nextOpen.dayIdx]} ${nextOpen.from}`
          : null,
        color: "text-rose-600",
        icon: <FaDoorClosed className="text-rose-600" />,
      };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      dir={dir}
      lang={i18n.language}
    >
      {/* الرأس */}
      <div className="flex items-center gap-2 px-5 pt-4">
        <FaClock className="text-[#3B82F6]" />
        <h3 className="text-lg font-bold text-[#1F2937]">
          {t("working_hours")}
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
                className={`flex items-center justify-between px-4 py-3 ${
                  isToday ? "bg-slate-50" : "bg-white"
                }`}
              >
                <span
                  className={`text-sm ${
                    isToday ? "font-semibold text-[#1F2937]" : "text-gray-600"
                  }`}
                >
                  {dayLabels?.[i]}
                </span>

                {closed ? (
                  <span className="text-sm font-semibold text-rose-600">
                    {t("closed_all_day")}
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
