/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * هذا هو الملف الرئيسي لنظام التذكيرات:
 *
 * - يقرأ الحجوزات من Firestore.
 * - يرسل إشعار تأكيد الحجز.
 * - يرسل التذكيرات قبل الموعد.
 * - ينظف رموز الإشعارات غير الصالحة.
 * - يشغل إشعارات الاختبار الخاصة بالحلاق.
 *
 * هذا الملف يعمل من GitHub Actions فقط.
 */

import { CONFIG } from "./config.js";

import {
  getNewBookingsForOnCreate,
  getBookingsForReminder,
  markBookingUpdated,
} from "./firestoreBookings.js";

import { buildOnCreatePayload, buildReminderPayload } from "./templates.js";

import { sendToTokens } from "./sendFcm.js";

import runTestNotifications from "./runTestNotifications.js";

/**
 * حذف القيم المكررة والفارغة.
 */
function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

/**
 * استخراج جميع FCM Tokens المرتبطة بالحجز.
 *
 * ندعم:
 *
 * - fcmTokens: الشكل الجديد.
 * - fcmToken: الشكل القديم.
 *
 * حتى لا نخسر دعم الحجوزات القديمة.
 */
function extractTokens(booking) {
  const currentTokens = Array.isArray(booking?.fcmTokens)
    ? booking.fcmTokens
    : [];

  const legacyTokens = booking?.fcmToken ? [booking.fcmToken] : [];

  return unique([...currentTokens, ...legacyTokens]);
}

/**
 * تنظيف Tokens غير الصالحة من الحجز.
 */
function buildTokenCleanupUpdate(tokens, invalidTokens) {
  if (!Array.isArray(invalidTokens) || invalidTokens.length === 0) {
    return {};
  }

  const validTokens = tokens.filter((token) => !invalidTokens.includes(token));

  return {
    fcmTokens: validTokens,

    /**
     * نحافظ على الحقل القديم إذا كان صالحًا،
     * ونزيله إذا أصبح غير صالح.
     */
    fcmToken: validTokens[0] || null,
  };
}

/**
 * هل لا يزال الحجز داخل مهلة انتظار Token؟
 *
 * أصبح المتصفح يطلب رمز الإشعارات بعد نجاح الحجز،
 * حتى لا يتأخر الحجز الأساسي.
 *
 * لذلك نعطي المتصفح 15 دقيقة لإضافة Token.
 */
function isInsideTokenGracePeriod(booking) {
  const createdAtMs = Number(booking?.createdAtMs || 0);

  if (!createdAtMs) {
    return false;
  }

  const tokenGraceMs = 15 * 60 * 1000;

  return Date.now() - createdAtMs < tokenGraceMs;
}

/**
 * معالجة إشعار تأكيد الحجز.
 */
async function processOnCreate() {
  const bookings = await getNewBookingsForOnCreate();

  let totalSent = 0;
  let waitingForToken = 0;
  let skippedWithoutToken = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      const tokens = extractTokens(booking);

      /**
       * لا يوجد Token بعد.
       *
       * إذا كان الحجز جديدًا، ننتظر تشغيل GitHub
       * القادم بدل تعليم الإشعار كأنه تم.
       */
      if (tokens.length === 0) {
        if (isInsideTokenGracePeriod(booking)) {
          waitingForToken += 1;

          console.log(`[onCreate] waiting for token booking=${booking.id}`);

          continue;
        }

        /**
         * انتهت مهلة إضافة Token.
         *
         * لا يوجد جهاز يمكن إرسال الإشعار إليه،
         * لذلك نعلّم العملية منتهية حتى لا نعيد
         * محاولة نفس الحجز إلى الأبد.
         */
        await markBookingUpdated(booking.id, {
          "notify.onCreateSentAt": Date.now(),

          "notify.onCreateStatus": "no-token",
        });

        skippedWithoutToken += 1;

        console.log(`[onCreate] skipped without token booking=${booking.id}`);

        continue;
      }

      const payload = buildOnCreatePayload(booking);

      const { sent, invalid } = await sendToTokens(tokens, payload);

      totalSent += sent;

      await markBookingUpdated(booking.id, {
        "notify.onCreateSentAt": Date.now(),

        "notify.onCreateStatus": sent > 0 ? "sent" : "not-delivered",

        ...buildTokenCleanupUpdate(tokens, invalid),
      });

      console.log(
        [
          "[onCreate]",
          `booking=${booking.id}`,
          `sent=${sent}`,
          `invalid=${invalid.length}`,
        ].join(" "),
      );
    } catch (error) {
      failed += 1;

      /**
       * لا نضع onCreateSentAt عند الخطأ.
       *
       * بهذا يعيد GitHub Actions المحاولة
       * في التشغيل القادم.
       */
      console.error(`[onCreate] failed booking=${booking.id}`, error);
    }
  }

  console.log(
    [
      "[onCreate summary]",
      `processed=${bookings.length}`,
      `sent=${totalSent}`,
      `waiting=${waitingForToken}`,
      `noToken=${skippedWithoutToken}`,
      `failed=${failed}`,
    ].join(" "),
  );
}

/**
 * معالجة التذكيرات:
 *
 * - قبل 24 ساعة.
 * - قبل ساعتين.
 * - قبل 30 دقيقة.
 */
async function processReminders() {
  for (const reminder of CONFIG.REMINDERS) {
    const { bookings, flagField } = await getBookingsForReminder(
      reminder.minutesBefore,
    );

    let totalSent = 0;
    let skippedWithoutToken = 0;
    let failed = 0;

    for (const booking of bookings) {
      try {
        /**
         * لا نرسل تذكيرًا لحجز ملغى.
         *
         * نختم Flag حتى لا يبقى يعاد فحصه.
         */
        if (booking?.cancelledAt) {
          await markBookingUpdated(booking.id, {
            [flagField]: Date.now(),
          });

          continue;
        }

        const tokens = extractTokens(booking);

        /**
         * لا يوجد جهاز لإرسال التذكير إليه.
         */
        if (tokens.length === 0) {
          await markBookingUpdated(booking.id, {
            [flagField]: Date.now(),
          });

          skippedWithoutToken += 1;

          continue;
        }

        const payload = buildReminderPayload(booking, reminder.minutesBefore);

        const { sent, invalid } = await sendToTokens(tokens, payload);

        totalSent += sent;

        await markBookingUpdated(booking.id, {
          [flagField]: Date.now(),

          ...buildTokenCleanupUpdate(tokens, invalid),
        });

        console.log(
          [
            `[reminder ${reminder.minutesBefore}m]`,
            `booking=${booking.id}`,
            `sent=${sent}`,
            `invalid=${invalid.length}`,
          ].join(" "),
        );
      } catch (error) {
        failed += 1;

        /**
         * لا نحدّث Flag عند الخطأ،
         * حتى يعاد إرسال التذكير في التشغيل القادم.
         */
        console.error(
          [
            `[reminder ${reminder.minutesBefore}m]`,
            `failed booking=${booking.id}`,
          ].join(" "),
          error,
        );
      }
    }

    console.log(
      [
        `[reminder ${reminder.minutesBefore}m summary]`,
        `processed=${bookings.length}`,
        `sent=${totalSent}`,
        `noToken=${skippedWithoutToken}`,
        `failed=${failed}`,
      ].join(" "),
    );
  }
}

/**
 * تشغيل النظام.
 */
async function main() {
  try {
    await processOnCreate();

    await processReminders();

    /**
     * إشعارات الاختبار من لوحة الحلاق.
     */
    await runTestNotifications();

    console.log("✅ reminders run completed");
  } catch (error) {
    console.error("❌ reminders run failed:", error);

    process.exit(1);
  }
}

void main();
