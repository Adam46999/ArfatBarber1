// src/pages/barberPanel/utils/weeklyHoursUX.js

export const DAYS = [
  { key: "Sunday", ar: "الأحد" },
  { key: "Monday", ar: "الإثنين" },
  { key: "Tuesday", ar: "الثلاثاء" },
  { key: "Wednesday", ar: "الأربعاء" },
  { key: "Thursday", ar: "الخميس" },
  { key: "Friday", ar: "الجمعة" },
  { key: "Saturday", ar: "السبت" },
];

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

export function validateWeekly(weekly) {
  const errors = {};
  for (const d of DAYS) {
    const v = weekly?.[d.key] ?? null;
    if (v === null) continue;

    if (!isHHmm(v.from) || !isHHmm(v.to)) {
      errors[d.key] = "صيغة الوقت لازم تكون HH:mm";
      continue;
    }
    if (!(toMinutes(v.from) < toMinutes(v.to))) {
      errors[d.key] = '"من" لازم تكون قبل "إلى"';
      continue;
    }
  }
  return errors;
}

export function formatRangeArabic(v) {
  if (!v) return "مغلق طوال اليوم";
  return `من ${v.from} إلى ${v.to}`;
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
