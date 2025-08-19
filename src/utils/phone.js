// src/utils/phone.js
export function formatPhoneInput(value) {
  let digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length > 10) digitsOnly = digitsOnly.slice(0, 10);

  // لازم يبدأ بـ 05
  if (digitsOnly.length >= 1 && digitsOnly[0] !== "0") digitsOnly = "";
  if (digitsOnly.length >= 2 && digitsOnly.slice(0, 2) !== "05") {
    digitsOnly = digitsOnly.slice(0, 1);
  }

  if (digitsOnly.length > 3) {
    const part1 = digitsOnly.slice(0, 3); // 05X
    const part2 = digitsOnly.slice(3); // باقي الأرقام
    return `${part1}-${part2}`;
  }
  return digitsOnly;
}
