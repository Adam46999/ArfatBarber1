// src/utils/phone.js

// 1) تحويل الأرقام العربية/الفارسية إلى إنجليزية
export function normalizeDigits(str = "") {
  const map = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };
  return String(str).replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d);
}

// 2) إزالة كل شيء عدا + والأرقام
export function stripNonPhoneChars(str = "") {
  return String(str).replace(/[^\d+]/g, "");
}

/**
 * 3) تحويل أي صيغة شائعة إلى E.164 لإسرائيل: +9725XXXXXXXX
 * يقبل: 05xxxxxxxx / 5xxxxxxxx / 9725xxxxxxxx / +9725xxxxxxxx / 00…
 */
export function toILPhoneE164(raw = "") {
  let s = normalizeDigits(raw).trim();
  s = stripNonPhoneChars(s);

  // 00 → +
  if (s.startsWith("00")) s = "+" + s.slice(2);

  // جاهز؟
  if (/^\+9725\d{8}$/.test(s)) return s;
  if (/^9725\d{8}$/.test(s)) return "+" + s;

  // 05xxxxxxxx → +9725xxxxxxxx
  if (/^05\d{8}$/.test(s)) return s.replace(/^0/, "+972");

  // 5xxxxxxxx → +9725xxxxxxxx
  if (/^5\d{8}$/.test(s)) return "+972" + s;

  // غير صالح
  return "";
}

// 4) فحص أن الناتج فعلاً رقم موبايل IL صالح
export function isILPhoneE164(p) {
  return /^\+9725\d{8}$/.test(p || "");
}

// 5) مقارنة أرقام بعد التطبيع
export function sameILPhone(a, b) {
  return toILPhoneE164(a) === toILPhoneE164(b);
}

// 6) (اختياري للعرض) تحويل E.164 إلى 05x-xxx-xxxx
export function e164ToLocalPretty(p) {
  const m = /^\+972(5\d)(\d{3})(\d{4})$/.exec(p || "");
  return m ? `0${m[1]}-${m[2]}-${m[3]}` : p || "";
}
