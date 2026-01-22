// src/pages/barberPanel/utils/weeklyHoursUX.js

export const DAYS = [
  { key: "Sunday", ar: "الأحد", en: "Sunday" },
  { key: "Monday", ar: "الإثنين", en: "Monday" },
  { key: "Tuesday", ar: "الثلاثاء", en: "Tuesday" },
  { key: "Wednesday", ar: "الأربعاء", en: "Wednesday" },
  { key: "Thursday", ar: "الخميس", en: "Thursday" },
  { key: "Friday", ar: "الجمعة", en: "Friday" },
  { key: "Saturday", ar: "السبت", en: "Saturday" },
];

// ✅ RTL حسب اللغة، مش ثابت
export function isRtlLang(lang = "") {
  const l = String(lang || "").toLowerCase();
  return (
    l.startsWith("ar") ||
    l.startsWith("he") ||
    l.startsWith("fa") ||
    l.startsWith("ur")
  );
}

export function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function normalizeWeekly(weekly) {
  const out = {};
  for (const d of DAYS) out[d.key] = weekly?.[d.key] ?? null;
  return out;
}

function isHHmm(v) {
  return typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm)
    .split(":")
    .map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function msg(isArabic, ar, en) {
  return isArabic ? ar : en;
}

// ✅ bilingual validate
export function validateWeekly(weekly, isArabic = true) {
  const errors = {};
  for (const d of DAYS) {
    const v = weekly?.[d.key] ?? null;
    if (v === null) continue;

    if (!isHHmm(v.from) || !isHHmm(v.to)) {
      errors[d.key] = msg(
        isArabic,
        "صيغة الوقت لازم تكون HH:mm",
        "Time format must be HH:mm",
      );
      continue;
    }
    if (!(toMinutes(v.from) < toMinutes(v.to))) {
      errors[d.key] = msg(
        isArabic,
        '"من" لازم تكون قبل "إلى"',
        '"From" must be before "To"',
      );
      continue;
    }
  }
  return errors;
}

// ✅ range format (general)
export function formatRange(v, isArabic = true) {
  if (!v) return msg(isArabic, "مغلق طوال اليوم", "Closed all day");
  return isArabic ? `من ${v.from} إلى ${v.to}` : `${v.from} → ${v.to}`;
}

// backward compatibility
export function formatRangeArabic(v) {
  return formatRange(v, true);
}

export function getTodayKey() {
  const map = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return map[new Date().getDay()];
}
