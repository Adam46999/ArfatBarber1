// scripts/notifications/barberNotifications.js

/**
 * إرسال إشعارات خاصة بالحلاق.
 *
 * مهم:
 * - هذا الملف غير مربوط بأي event حاليًا.
 * - مجرد استدعاء الملف لا يرسل أي إشعار.
 * - الإرسال يحدث فقط عند استدعاء الدالة صراحة.
 */

import {
  getBarberDeviceTokens,
  removeBarberDeviceTokens,
} from "./barberDevices.js";
import { buildBarberNewBookingPayload } from "./barberTemplates.js";
import { sendToTokens } from "./sendFcm.js";

/**
 * إرسال إشعار للحلاق عند وجود حجز جديد.
 *
 * @param {object} booking
 * @returns {Promise<{
 *   attempted: boolean,
 *   sent: number,
 *   invalid: string[],
 *   reason?: string
 * }>}
 */
export async function sendBarberNewBookingNotification(booking) {
  if (!booking?.id) {
    return {
      attempted: false,
      sent: 0,
      invalid: [],
      reason: "missing-booking-id",
    };
  }

  const tokens = await getBarberDeviceTokens();

  if (tokens.length === 0) {
    return {
      attempted: false,
      sent: 0,
      invalid: [],
      reason: "no-barber-devices",
    };
  }

  const payload = buildBarberNewBookingPayload(booking);

  const result = await sendToTokens(tokens, payload);

  /*
   * تنظيف invalid tokens هو Best Effort فقط.
   *
   * مهم جدًا:
   * إذا نجح إرسال FCM ثم فشل التنظيف، لا نرمي الخطأ.
   * بهذا لا يعتقد الـ processor أن الإرسال فشل
   * ولا يحاول إرسال نفس Notification مرة أخرى.
   */
  if (result.invalid.length > 0) {
    try {
      await removeBarberDeviceTokens(result.invalid);
    } catch (cleanupError) {
      console.error(
        "[barberNotification] invalid-token cleanup failed",
        cleanupError,
      );
    }
  }

  return {
    attempted: true,
    sent: result.sent,
    invalid: result.invalid,
  };
}