// src/utils/validators.js

// src/utils/validators.js

// 1) تحويل الأرقام الشرقية (العربية/الفارسية) إلى ASCII
const easternToAscii = (s = "") =>
  s
    // عربية-هندية U+0660..U+0669  (٠١٢٣٤٥٦٧٨٩)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    // فارسية U+06F0..U+06F9 (۰۱۲۳۴۵۶۷۸۹)
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

// 2) إزالة أي شيء غير رقم (بعد تحويل الشرقية إلى ASCII)
export const normalizePhone = (v) =>
  easternToAscii(v || "").replace(/[^\p{Nd}]/gu, "");

// 3) الفحص النهائي: يبدأ بـ 05 وطوله 10 أرقام
export const isPhoneValid = (v) => {
  const digits = normalizePhone(v);
  return /^05\d{8}$/.test(digits);
};

// اسم: حرفين فأكثر (أحرف عربية/لاتينية + مسافات/'-)
export const isNameValid = (v) => {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length < 2) return false;
  return /^[\p{L}\s'-]{2,}$/u.test(s);
};

export const isDateValid = (v) => typeof v === "string" && v.trim().length > 0;
export const isTimeValid = (v) => typeof v === "string" && v.trim().length > 0;
export const isServiceValid = (v) =>
  typeof v === "string" && v.trim().length > 0;

export const validateForm = (form) => {
  const errors = {};
  if (!isNameValid(form.fullName)) errors.fullName = "invalid_name";
  if (!isPhoneValid(form.phoneNumber)) errors.phoneNumber = "invalid_phone";
  if (!isDateValid(form.selectedDate)) errors.selectedDate = "invalid_date";
  if (!isTimeValid(form.selectedTime)) errors.selectedTime = "invalid_time";
  if (!isServiceValid(form.selectedService))
    errors.selectedService = "invalid_service";
  return errors;
};
