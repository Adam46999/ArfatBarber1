// src/utils/timeSlots.js

/**
 * يولّد أدوار كل 30 دقيقة بين from و to
 * - from/to بصيغة "HH:mm"
 * - includeEnd: لو true بيشمل خانة to نفسها (الافتراضي false عشان ما نطلع دور على وقت الإغلاق بالضبط)
 */
export function generateTimeSlots30(from, to, { includeEnd = false } = {}) {
  if (!from || !to) return [];

  const [fh, fm] = String(from).split(":").map(Number);
  const [th, tm] = String(to).split(":").map(Number);
  if (![fh, fm, th, tm].every((n) => Number.isFinite(n))) return [];

  const start = new Date();
  start.setHours(fh, fm, 0, 0);

  const end = new Date();
  end.setHours(th, tm, 0, 0);

  // لو from بعد to (غلط) نرجّع فاضي
  if (start > end) return [];

  const out = [];
  const cur = new Date(start);

  while (cur < end || (includeEnd && cur <= end)) {
    out.push(cur.toTimeString().slice(0, 5));
    cur.setMinutes(cur.getMinutes() + 30);
  }

  return out;
}

/** يزيد وقت "HH:mm" بعدد دقائق (مثلاً 30) ويرجع "HH:mm" */
export function addMinutesHHmm(hhmm, minutesToAdd) {
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;

  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setMinutes(d.getMinutes() + (Number(minutesToAdd) || 0));
  return d.toTimeString().slice(0, 5);
}

export function getWeekdayNameEN(dateYMD) {
  // dateYMD: "YYYY-MM-DD"
  try {
    const [y, mo, da] = dateYMD.split("-").map(Number);
    const d = new Date(y, mo - 1, da);
    if (!(d instanceof Date) || isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
}

export function isTodayYMD(dateYMD) {
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
  return dateYMD === today;
}
