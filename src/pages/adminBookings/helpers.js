// src/pages/adminBookings/helpers.js
export function formatDateArabic(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatDateTime(value) {
  const d =
    typeof value === "string" ? new Date(value) : value?.toDate?.() ?? value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function getDateLabel(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "اليوم";
  if (dateStr === tomorrow) return "بكرا";
  return "";
}

export function serviceLabel(key) {
  return key === "haircut"
    ? "قص شعر"
    : key === "beard"
    ? "تعليم لحية"
    : "قص + لحية";
}

export function serviceBadgeClasses(key) {
  if (key === "haircut") return "bg-blue-50 text-blue-700 border-blue-200";
  if (key === "beard") return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

export function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

export function dayBadgeClasses(label) {
  if (label === "اليوم")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (label === "بكرا") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}
