// scripts/notifications/runReminders.js

/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

/**
 * هذا هو الملف الرئيسي:
 * - يقرأ الحجوزات من Firestore
 * - يحدد أي إشعار لازم ينرسل
 * - يبعث الإشعارات عبر FCM
 * - يحدّث flags لمنع التكرار
 *
 * يُشغّل من GitHub Actions فقط (Node.js)
 */

import { CONFIG } from "./config.js";
import {
  getNewBookingsForOnCreate,
  getBookingsForReminder,
  markBookingUpdated,
} from "./firestoreBookings.js";
import { buildOnCreatePayload, buildReminderPayload } from "./templates.js";
import { sendToTokens } from "./sendFcm.js";

// إزالة التكرار
function unique(arr) {
  return Array.from(new Set(arr || []));
}

// استخراج كل الـ tokens
function extractTokens(booking) {
  const arr = Array.isArray(booking.fcmTokens) ? booking.fcmTokens : [];
  const legacy = booking.fcmToken ? [booking.fcmToken] : [];
  return unique([...arr, ...legacy]);
}

// إشعار "عند الحجز"
async function processOnCreate() {
  const bookings = await getNewBookingsForOnCreate();
  let totalSent = 0;

  for (const booking of bookings) {
    const tokens = extractTokens(booking);

    if (tokens.length === 0) {
      await markBookingUpdated(booking.id, {
        "notify.onCreateSentAt": Date.now(),
      });
      continue;
    }

    const payload = buildOnCreatePayload(booking);
    const { sent, invalid } = await sendToTokens(tokens, payload);

    totalSent += sent;

    await markBookingUpdated(booking.id, {
      "notify.onCreateSentAt": Date.now(),
      ...(invalid.length
        ? {
            fcmTokens: tokens.filter((t) => !invalid.includes(t)),
          }
        : {}),
    });
  }

  console.log(`[onCreate] processed=${bookings.length} sent=${totalSent}`);
}

// إشعارات التذكير
async function processReminders() {
  for (const r of CONFIG.REMINDERS) {
    const { bookings, flagField } = await getBookingsForReminder(
      r.minutesBefore,
    );

    let totalSent = 0;

    for (const booking of bookings) {
      const tokens = extractTokens(booking);

      if (tokens.length === 0) {
        await markBookingUpdated(booking.id, {
          [flagField]: Date.now(),
        });
        continue;
      }

      const payload = buildReminderPayload(booking, r.minutesBefore);
      const { sent, invalid } = await sendToTokens(tokens, payload);

      totalSent += sent;

      await markBookingUpdated(booking.id, {
        [flagField]: Date.now(),
        ...(invalid.length
          ? {
              fcmTokens: tokens.filter((t) => !invalid.includes(t)),
            }
          : {}),
      });
    }

    console.log(
      `[reminder ${r.minutesBefore}m] processed=${bookings.length} sent=${totalSent}`,
    );
  }
}

// التشغيل
(async function main() {
  try {
    await processOnCreate();
    await processReminders();
    console.log("✅ reminders run completed");
  } catch (err) {
    console.error("❌ reminders run failed:", err);
    process.exit(1); // Node.js فقط
  }
})();
