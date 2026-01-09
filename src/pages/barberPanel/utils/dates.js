// src/pages/barberPanel/utils/dates.js

export function addDaysYMD(ymd, days) {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toISOString().slice(0, 10);
}

export function getWeekdayNameEN(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

export function todayYMD() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
}
