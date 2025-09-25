// src/utils/dateTime.js
export function localYMD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function makeDateFromYMDHM(ymd, hhmm) {
  const [yyyy, mm, dd] = ymd.split("-").map(Number);
  const [hh, min] = hhmm.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
}

export function generateTimeSlots(from, to) {
  const slots = [];
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const cur = new Date();
  cur.setHours(fh, fm, 0, 0);
  const end = new Date();
  end.setHours(th, tm, 0, 0);
  while (cur <= end) {
    slots.push(cur.toTimeString().slice(0, 5));
    cur.setMinutes(cur.getMinutes() + 30);
  }
  return slots;
}

export function getWeekdayFromYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}

export function getOpeningStatus(workingHours) {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const hours = workingHours[dayName];
  if (!hours) return "close";
  const [fh, fm] = hours.from.split(":").map(Number);
  const [th, tm] = hours.to.split(":").map(Number);
  const from = new Date();
  from.setHours(fh, fm, 0, 0);
  const to = new Date();
  to.setHours(th, tm, 0, 0);
  const mOpen = (from - now) / 60000;
  const mClose = (to - now) / 60000;
  if (now < from && mOpen <= 60 && mOpen > 0) return "opening_soon";
  if (now >= from && now <= to && mClose <= 60 && mClose > 0)
    return "closing_soon";
  if (now >= from && now < to) return "open";
  return "close";
}
