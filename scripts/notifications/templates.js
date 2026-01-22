// scripts/notifications/templates.js

/**
 * هذا الملف مسؤول فقط عن:
 * - نصوص الإشعارات
 * - شكل الرسالة
 *
 * لا يوجد Firestore
 * لا يوجد إرسال
 * فقط Templates
 */

// تنسيق الوقت للعرض
function prettyTime(time) {
  return time || "";
}

/**
 * إشعار "عند الحجز"
 */
export function buildOnCreatePayload(booking) {
  const code = booking.bookingCode || "";
  const title = "✅ تم تأكيد الحجز";
  const body = `كود الحجز: ${code} • ${booking.selectedDate} ${prettyTime(
    booking.selectedTime,
  )} • ${booking.selectedService || ""}`;

  return {
    title,
    body,
    data: {
      type: "BOOKING_CREATED",
      bookingId: booking.id || "",
      bookingCode: code,
    },
  };
}

/**
 * إشعار تذكير قبل الموعد
 */
export function buildReminderPayload(booking, minutesBefore) {
  const code = booking.bookingCode || "";
  const title = "⏰ تذكير بالموعد";
  const body = `بعد ${minutesBefore} دقيقة • ${booking.selectedDate} ${prettyTime(
    booking.selectedTime,
  )} • ${booking.selectedService || ""} • كود: ${code}`;

  return {
    title,
    body,
    data: {
      type: "BOOKING_REMINDER",
      bookingId: booking.id || "",
      bookingCode: code,
      minutesBefore: String(minutesBefore),
    },
  };
}
