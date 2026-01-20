// src/utils/workingHours.js

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function isHHmm(v) {
  return typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function isRangeValid(from, to) {
  if (!isHHmm(from) || !isHHmm(to)) return false;
  return toMinutes(from) < toMinutes(to);
}

// يضمن شكل أسبوعي ثابت + يرجّع fallback لو غلط
export function sanitizeWeeklyHours(input, fallback) {
  const out = { ...fallback };
  if (!input || typeof input !== "object") return out;

  for (const day of Object.keys(fallback)) {
    const v = input[day];

    if (v === null) {
      out[day] = null;
      continue;
    }

    if (v && typeof v === "object") {
      const from = isHHmm(v.from) ? v.from : fallback[day]?.from ?? null;
      const to = isHHmm(v.to) ? v.to : fallback[day]?.to ?? null;

      if (from && to && isRangeValid(from, to)) out[day] = { from, to };
      else out[day] = fallback[day] ?? null;

      continue;
    }

    out[day] = fallback[day] ?? null;
  }

  return out;
}

// normalize اللي بدنا نخزّنه بالـ DB
export function normalizeWeeklyHours(weekly, fallback) {
  return sanitizeWeeklyHours(weekly, fallback);
}

export function isTimeWithinDayRange(hhmm, range) {
  if (!range?.from || !range?.to) return false;
  if (!isHHmm(hhmm)) return false;
  const t = toMinutes(hhmm);
  return t >= toMinutes(range.from) && t < toMinutes(range.to);
}
