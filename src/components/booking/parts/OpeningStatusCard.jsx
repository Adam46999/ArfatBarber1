// src/components/booking/parts/OpeningStatusCard.jsx

import { FaClock, FaDoorClosed, FaDoorOpen } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const DAY_KEYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const FALLBACK_DAY_LABELS = {
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  he: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
};

function timeToToday(time) {
  const [hours, minutes] = String(time || "00:00")
    .split(":")
    .map(Number);

  const date = new Date();

  date.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );

  return date;
}

function normalizeLanguage(language) {
  if (language?.startsWith("he")) return "he";
  if (language?.startsWith("en")) return "en";

  return "ar";
}

function getDayLabels(t, language) {
  const translatedLabels = t("weekdays", {
    returnObjects: true,
    defaultValue: FALLBACK_DAY_LABELS[language],
  });

  if (Array.isArray(translatedLabels) && translatedLabels.length >= 7) {
    return translatedLabels;
  }

  return FALLBACK_DAY_LABELS[language];
}

function formatHours(hours) {
  if (!hours?.from || !hours?.to) return null;

  return `${hours.from} – ${hours.to}`;
}

export default function OpeningStatusCard({ status, workingHours = {} }) {
  const { t, i18n } = useTranslation();

  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const isRTL = language === "ar" || language === "he";
  const dayLabels = getDayLabels(t, language);

  const now = new Date();
  const todayIndex = now.getDay();
  const todayKey = DAY_KEYS[todayIndex];
  const todayHours = workingHours?.[todayKey] || null;

  const calculatedIsOpen = (() => {
    if (!todayHours?.from || !todayHours?.to) {
      return false;
    }

    const opensAt = timeToToday(todayHours.from);
    const closesAt = timeToToday(todayHours.to);

    return now >= opensAt && now < closesAt;
  })();

  const isOpenNow =
    typeof status?.isOpen === "boolean" ? status.isOpen : calculatedIsOpen;

  const nextOpening = (() => {
    if (status?.nextOpen instanceof Date) {
      const nextOpenDate = status.nextOpen;

      if (!Number.isNaN(nextOpenDate.getTime())) {
        return {
          dayIndex: nextOpenDate.getDay(),
          time: `${String(nextOpenDate.getHours()).padStart(2, "0")}:${String(
            nextOpenDate.getMinutes(),
          ).padStart(2, "0")}`,
        };
      }
    }

    if (todayHours?.from) {
      const opensAt = timeToToday(todayHours.from);

      if (now < opensAt) {
        return {
          dayIndex: todayIndex,
          time: todayHours.from,
        };
      }
    }

    for (let offset = 1; offset <= 7; offset += 1) {
      const dayIndex = (todayIndex + offset) % 7;
      const hours = workingHours?.[DAY_KEYS[dayIndex]];

      if (hours?.from) {
        return {
          dayIndex,
          time: hours.from,
        };
      }
    }

    return null;
  })();

  const statusDescription = (() => {
    if (isOpenNow && todayHours?.to) {
      return t("open_until", {
        time: todayHours.to,
        defaultValue: `مفتوح حتى ${todayHours.to}`,
      });
    }

    if (!nextOpening) {
      return t("opening_time_unavailable", {
        defaultValue: "موعد الفتح القادم غير محدد",
      });
    }

    const nextDayLabel =
      nextOpening.dayIndex === todayIndex
        ? t("today", {
            defaultValue:
              language === "he"
                ? "היום"
                : language === "en"
                  ? "Today"
                  : "اليوم",
          })
        : dayLabels[nextOpening.dayIndex];

    return t("opens_next", {
      day: nextDayLabel,
      time: nextOpening.time,
      defaultValue:
        language === "he"
          ? `נפתח ${nextDayLabel} בשעה ${nextOpening.time}`
          : language === "en"
            ? `Opens ${nextDayLabel} at ${nextOpening.time}`
            : `يفتح ${nextDayLabel} الساعة ${nextOpening.time}`,
    });
  })();

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#e3ded4] bg-white shadow-[0_10px_28px_rgba(35,29,20,0.06)]"
      dir={isRTL ? "rtl" : "ltr"}
      aria-label={t("working_hours", {
        defaultValue: "ساعات العمل",
      })}
    >
      <div className="border-b border-[#eee9df] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5ead0] text-[#99701c]">
            <FaClock className="h-4 w-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-slate-900">
              {t("working_hours", {
                defaultValue: "ساعات العمل",
              })}
            </h3>

            <div className="mt-1 flex items-center gap-2">
              <span
                className={[
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  isOpenNow ? "bg-emerald-500" : "bg-red-500",
                ].join(" ")}
                aria-hidden="true"
              />

              <p
                className={[
                  "text-sm font-extrabold",
                  isOpenNow ? "text-emerald-700" : "text-red-600",
                ].join(" ")}
              >
                {isOpenNow
                  ? t("shop_open_now", {
                      defaultValue: "المحل مفتوح الآن",
                    })
                  : t("shop_closed_now", {
                      defaultValue: "المحل مغلق الآن",
                    })}
              </p>
            </div>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {statusDescription}
            </p>
          </div>

          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              isOpenNow
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-500",
            ].join(" ")}
            aria-hidden="true"
          >
            {isOpenNow ? (
              <FaDoorOpen className="h-4 w-4" />
            ) : (
              <FaDoorClosed className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 sm:px-4">
        {DAY_KEYS.map((dayKey, index) => {
          const hours = workingHours?.[dayKey] || null;
          const isToday = index === todayIndex;

          return (
            <div
              key={dayKey}
              className={[
                "relative flex min-h-[44px] items-center justify-between gap-4",
                "border-b border-slate-100 px-3 py-2.5 last:border-b-0",
                isToday ? "rounded-xl bg-[#faf6ec]" : "bg-transparent",
              ].join(" ")}
              aria-current={isToday ? "date" : undefined}
            >
              {isToday && (
                <span
                  className={[
                    "absolute inset-y-2 w-[3px] rounded-full bg-[#c79d3f]",
                    isRTL ? "right-0" : "left-0",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}

              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={[
                    "text-sm",
                    isToday
                      ? "font-black text-slate-900"
                      : "font-semibold text-slate-600",
                  ].join(" ")}
                >
                  {dayLabels[index]}
                </span>

                {isToday && (
                  <span className="rounded-full bg-[#ead8a9] px-2 py-0.5 text-[10px] font-black text-[#72520f]">
                    {t("today", {
                      defaultValue:
                        language === "he"
                          ? "היום"
                          : language === "en"
                            ? "Today"
                            : "اليوم",
                    })}
                  </span>
                )}
              </div>

              {hours ? (
                <span
                  className={[
                    "shrink-0 text-sm tabular-nums",
                    isToday
                      ? "font-black text-slate-900"
                      : "font-semibold text-slate-700",
                  ].join(" ")}
                  dir="ltr"
                >
                  {formatHours(hours)}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                  {t("closed_all_day", {
                    defaultValue: "مغلق طوال اليوم",
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
