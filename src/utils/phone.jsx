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
  return String(str).replace(/[٠-٩۰-۹]/g, (d) => map[d] || d);
}

// 2) إزالة كل شيء عدا + والأرقام
export function stripNonPhoneChars(str = "") {
  return String(str).replace(/[^\d+]/g, "");
}

// 3) تحويل أي صيغة شائعة إلى قياسية لإسرائيل: 9725XXXXXXXX (بدون +)
export function normalizeILToCanonical(raw = "") {
  let s = normalizeDigits(raw).trim();
  s = stripNonPhoneChars(s);

  if (s.startsWith("+")) s = s.slice(1); // +972... -> 972...
  if (s.startsWith("00972")) s = "972" + s.slice(5); // 00972... -> 972...
  if (s.startsWith("9720")) s = "972" + s.slice(4); // 9720X -> 972X
  if (s.startsWith("0")) s = "972" + s.slice(1); // 05... -> 9725...
  if (/^5\d{8}$/.test(s)) s = "972" + s; // 5XXXXXXXX -> 9725...

  return s; // متوقع: 9725XXXXXXXX (11 رقم)
}

// 4) بناء متغيّرات محتملة لبحث متوافق مع بيانات قديمة
export function buildILPhoneVariants(input = "") {
  const variants = new Set();

  const raw = normalizeDigits(input);
  const rawNoSpacesDashes = raw.replace(/[\s-]/g, "");
  const justDigitsPlus = stripNonPhoneChars(raw);
  const canonical = normalizeILToCanonical(justDigitsPlus);

  variants.add(canonical); // 9725XXXXXXXX
  variants.add("+" + canonical); // +9725XXXXXXXX
  variants.add("0" + canonical.slice(3)); // 05XXXXXXXX
  variants.add("00972" + canonical.slice(3)); // 009725XXXXXXXX
  variants.add(justDigitsPlus); // الإدخال بدون محارف غريبة
  if (justDigitsPlus.startsWith("+")) variants.add(justDigitsPlus.slice(1));
  variants.add(rawNoSpacesDashes); // إزالة المسافات/الشرطات

  return Array.from(variants).slice(0, 10); // حد Firestore 'in'
}

// 5) فحص سريع لأن الرقم يبدو موبايل IL صالح (اختياري)
export function isLikelyILMobile(canonical = "") {
  return /^9725\d{8}$/.test(canonical);
}
