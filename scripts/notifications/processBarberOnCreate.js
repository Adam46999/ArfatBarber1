// scripts/notifications/processBarberOnCreate.js

/**
 * Processor مستقل لإشعار الحلاق عند إنشاء حجز جديد.
 *
 * مهم جدًا:
 * - هذا الملف غير مربوط بـ runReminders.js حتى الآن.
 * - مجرد وجوده لا يشغّل أي إرسال.
 * - فشل إشعار الحلاق لا يغيّر الحجز ولا مسار إشعار الزبون.
 */

import {
  claimBarberOnCreate,
  getNewBookingsForBarberOnCreate,
  markBookingUpdated,
} from "./firestoreBookings.js";

import { sendBarberNewBookingNotification } from "./barberNotifications.js";

function createClaimId(bookingId) {
  return [
    "barber-on-create",
    bookingId,
    process.pid,
    Date.now(),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

export async function processBarberOnCreate() {
  const bookings = await getNewBookingsForBarberOnCreate();

  let claimed = 0;
  let sent = 0;
  let notDelivered = 0;
  let noDevices = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of bookings) {
    const claimId = createClaimId(booking.id);

    try {
      const didClaim = await claimBarberOnCreate(
        booking.id,
        claimId,
      );

      if (!didClaim) {
        skipped += 1;
        continue;
      }

      claimed += 1;

      const result = await sendBarberNewBookingNotification(booking);

      if (!result.attempted && result.reason === "no-barber-devices") {
        noDevices += 1;

        /*
         * لا نضع barberOnCreateSentAt هنا.
         *
         * إذا سجّل الحلاق جهازه خلال نافذة الحجز الجديدة،
         * يستطيع التشغيل القادم المحاولة من جديد.
         */
        await markBookingUpdated(booking.id, {
          "notify.barberOnCreateClaimId": null,
          "notify.barberOnCreateClaimedAt": null,
          "notify.barberOnCreateStatus": "waiting-for-device",
        });

        continue;
      }

      if (!result.attempted) {
        failed += 1;

        await markBookingUpdated(booking.id, {
          "notify.barberOnCreateClaimId": null,
          "notify.barberOnCreateClaimedAt": null,
          "notify.barberOnCreateStatus":
            result.reason || "not-attempted",
        });

        continue;
      }

      const delivered = Number(result.sent || 0);

      if (delivered > 0) {
        sent += delivered;
      } else {
        notDelivered += 1;
      }

      /*
       * مثل مسار إشعار الزبون:
       * بعد محاولة FCM نغلق الحدث حتى لا نكرره بلا نهاية.
       */
      await markBookingUpdated(booking.id, {
        "notify.barberOnCreateSentAt": Date.now(),
        "notify.barberOnCreateStatus":
          delivered > 0 ? "sent" : "not-delivered",
        "notify.barberOnCreateClaimId": null,
        "notify.barberOnCreateClaimedAt": null,
      });

      console.log(
        [
          "[barberOnCreate]",
          `booking=${booking.id}`,
          `sent=${delivered}`,
          `invalid=${result.invalid?.length || 0}`,
        ].join(" "),
      );
    } catch (error) {
      failed += 1;

      console.error(
        `[barberOnCreate] failed booking=${booking.id}`,
        error,
      );

      /*
       * Best effort فقط.
       *
       * حتى لو فشل تحرير الـ claim، الـ lease في Firestore
       * يسمح بإعادة المحاولة لاحقًا بدل أن يبقى عالقًا للأبد.
       */
      try {
        await markBookingUpdated(booking.id, {
          "notify.barberOnCreateClaimId": null,
          "notify.barberOnCreateClaimedAt": null,
          "notify.barberOnCreateStatus": "failed",
        });
      } catch (releaseError) {
        console.error(
          `[barberOnCreate] failed to release claim booking=${booking.id}`,
          releaseError,
        );
      }
    }
  }

  const summary = {
    processed: bookings.length,
    claimed,
    sent,
    notDelivered,
    noDevices,
    skipped,
    failed,
  };

  console.log(
    [
      "[barberOnCreate summary]",
      `processed=${summary.processed}`,
      `claimed=${summary.claimed}`,
      `sent=${summary.sent}`,
      `notDelivered=${summary.notDelivered}`,
      `noDevices=${summary.noDevices}`,
      `skipped=${summary.skipped}`,
      `failed=${summary.failed}`,
    ].join(" "),
  );

  return summary;
}

export default processBarberOnCreate;