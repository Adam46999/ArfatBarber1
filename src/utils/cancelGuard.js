// ثابت: نافذة الإلغاء بالدقائق
export const CANCELLATION_WINDOW_MIN = 50;

// فرق الدقائق بين تاريخين
export function diffMinutes(fromDate, toDate) {
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / 60000);
}

/**
 * تحقّق إمكانية الإلغاء (حد ثابت 50 دقيقة).
 * @param {Date} startAt - وقت الموعد (Date من Firestore Timestamp via toDate())
 * @returns {{ok: boolean, reason?: string}}
 */
export function canCancelFixed(startAt) {
  if (!(startAt instanceof Date) || isNaN(startAt)) {
    return { ok: false, reason: "بيانات الموعد غير صالحة." };
  }
  const now = new Date();
  const left = diffMinutes(now, startAt);
  if (left < CANCELLATION_WINDOW_MIN) {
    return {
      ok: false,
      reason: `لا يمكن الإلغاء: تبقّى أقل من ${CANCELLATION_WINDOW_MIN} دقيقة على موعدك.`,
    };
  }
  return { ok: true };
}
